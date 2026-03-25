import { useState } from "react";
import {
  Card, Col, DatePicker, Row, Spin, Statistic, Typography, theme, Tabs,
  Select,
} from "antd";
import {
  FileTextOutlined, DollarOutlined, RollbackOutlined, RiseOutlined,
  FundOutlined, TeamOutlined, PercentageOutlined, TableOutlined, BarChartOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Line, Area, AreaChart, LabelList,
} from "recharts";
import { statsApi } from "../../api/stats";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const COLORS = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981",
  "#f43f5e", "#a78bfa", "#34d399", "#fb923c",
  "#60a5fa", "#e879f9",
];

const fmt = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K`
  : String(Math.round(v));

const fmtFull = (v: number) => Math.round(v).toLocaleString("ru-RU");

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1f1f2e", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      {label && <div style={{ color: "#aaa", marginBottom: 4 }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color ?? "#fff" }}>{p.name}: <b>{fmtFull(p.value)}</b></div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: "#1f1f2e", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: d.payload.fill }}>{d.name}</div>
      <div style={{ color: "#fff" }}>Реал. деньги: <b>{fmtFull(d.value)}</b></div>
      <div style={{ color: "#aaa" }}>{((d.value / d.payload.total) * 100).toFixed(1)}%</div>
    </div>
  );
};

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#fff" fontWeight={600}>
      {name.length > 8 ? name.slice(0, 8) + "…" : name} {(percent * 100).toFixed(0)}%
    </text>
  );
};

export default function StatsContractsPage() {
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState("charts");

  // Состояние фильтра таблицы
  const [filterType, setFilterType] = useState<"period" | "speaker" | "employee">("period");
  const [filterId, setFilterId] = useState<string | undefined>(undefined);

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  const from = dateRange[0].format("YYYY-MM-DD");
  const to   = dateRange[1].format("YYYY-MM-DD");

  // Основной запрос (без фильтра — для диаграмм и списков сотрудников)
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "contracts", from, to],
    queryFn: () => statsApi.getContractStats({ from, to }),
    enabled: !!from && !!to,
  });

  // Запрос для таблицы (с фильтром по сотруднику если выбран)
  const tableFilterBy = filterType === "period" ? undefined : filterType; // "speaker" | "employee"
  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ["stats", "contracts", from, to, filterType, filterId],
    queryFn: () => statsApi.getContractStats({ from, to, filterBy: tableFilterBy, userId: filterId }),
    enabled: !!from && !!to,
  });

  const cardStyle = {
    background: token.colorBgElevated,
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
  };

  const pieData = (data?.bankStats ?? []).map((b: any) => ({
    name: b.name,
    value: Math.round(b.realMoney),
    total: Math.round(data?.totalRealMoney ?? 1),
  }));

  const barData = (data?.bankStats ?? []).map((b: any) => ({
    name: b.name.length > 10 ? b.name.slice(0, 10) + "…" : b.name,
    fullName: b.name,
    "Аванс": Math.round(b.advance),
    "Реал. деньги": Math.round(b.realMoney),
  }));

  const lineData = (data?.byDate ?? []).map((d: any) => ({
    date: dayjs(d.date).format("DD.MM"),
    "Кол-во": d.count,
    "Сумма (тыс.)": Math.round(d.amount / 1000),
    "Реал. деньги (тыс.)": Math.round(d.realMoney / 1000),
  }));

  // "Сотрудники по обороту" — те кто числится как Оформил (signedById → byManager)
  const managerData = (data?.byManager ?? []).map((m: any) => ({
    name: m.name.length > 18 ? m.name.slice(0, 18) + "…" : m.name,
    fullName: m.name,
    "Оборот": m.turnover,
    "Реал. деньги": m.realMoney,
    count: m.count,
  }));

  // "Ведущие по обороту" — те кто числится как Ведущий в договоре (speakerId → bySpeaker)
  const speakerData = (data?.bySpeaker ?? []).map((s: any) => ({
    name: s.name.length > 18 ? s.name.slice(0, 18) + "…" : s.name,
    fullName: s.name,
    "Оборот": s.turnover,
    "Реал. деньги": s.realMoney,
    count: s.count,
  }));

  // Кол-во презентаций для деления средней
  const presCount = data?.presentationsCount || 1;

  // "Ведущие по средней" — оборот ведущего / кол-во презентаций за период
  const speakerAvgData = (data?.bySpeaker ?? [])
    .filter((s: any) => s.count > 0)
    .map((s: any) => ({
      name: s.name.length > 18 ? s.name.slice(0, 18) + "…" : s.name,
      fullName: s.name,
      "Средняя на презентацию": Math.round(s.turnover / presCount),
      turnover: s.turnover,
      count: s.count,
      presCount,
    }))
    .sort((a: any, b: any) => b["Средняя на презентацию"] - a["Средняя на презентацию"]);

  // "Сотрудники по средней" — оборот сотрудника / кол-во презентаций за период
  const managerAvgData = (data?.byManager ?? [])
    .filter((m: any) => m.count > 0)
    .map((m: any) => ({
      name: m.name.length > 18 ? m.name.slice(0, 18) + "…" : m.name,
      fullName: m.name,
      "Средняя на презентацию": Math.round(m.turnover / presCount),
      turnover: m.turnover,
      count: m.count,
      presCount,
    }))
    .sort((a: any, b: any) => b["Средняя на презентацию"] - a["Средняя на презентацию"]);

  const saleTypePieData = (data?.bySaleType ?? []).map((s: any, i: number) => ({
    name: s.label, value: s.count, turnover: s.turnover,
    total: (data?.bySaleType ?? []).reduce((acc: number, x: any) => acc + x.count, 0) || 1,
    fill: COLORS[(i + 4) % COLORS.length],
  }));

  const conversion = data?.presentationsCount > 0 && data?.total > 0
    ? Math.min(100, Math.round((data.total / data.presentationsCount) * 100))
    : 0;

  // tableData — данные для таблицы (с фильтром)
  const td = tableData ?? data; // fallback на общие данные пока фильтрованные грузятся

  // Сводные данные для таблицы (используем td вместо data)
  const totalRefundAmount  = (td?.bankStats ?? []).reduce((s: number, b: any) => s + (b.refundAmount ?? 0), 0);
  const totalPartialAmount = (td?.bankStats ?? []).reduce((s: number, b: any) => s + (b.partialRefundAmount ?? 0), 0);
  const totalRefunds       = totalRefundAmount + totalPartialAmount;
  const avgRealMoney       = (td?.total ?? 0) > 0 ? Math.round((td?.totalRealMoney ?? 0) / td.total) : 0;

  // Строки сводной таблицы
  const summaryRows = [
    { label: "Количество договоров",          value: String(td?.total ?? 0),                              highlight: false },
    { label: "Количество презентаций",         value: String(td?.presentationsCount ?? 0),                 highlight: false },
    { label: "Оборот до возвратов",            value: fmtFull(td?.turnoverBefore ?? 0),                   highlight: false },
    { label: "Средний оборот до возвратов",    value: fmtFull((td?.total ?? 0) > 0 ? Math.round((td?.turnoverBefore ?? 0) / td.total) : 0), highlight: false },
    { label: "Оборот после возвратов",         value: fmtFull(td?.turnoverAfter ?? 0),                    highlight: false },
    { label: "Средний оборот после возвратов", value: fmtFull((td?.total ?? 0) > 0 ? Math.round((td?.turnoverAfter ?? 0) / td.total) : 0),  highlight: false },
    { label: "Средний оборот от реальных денег", value: fmtFull(avgRealMoney),                              highlight: false },
    { label: "Сумма возвратов (полных)",       value: fmtFull(totalRefundAmount),                           highlight: true  },
    { label: "Количество возвратов (полных)",  value: String(td?.refundsCount ?? 0),                      highlight: true  },
    { label: "Сумма возвратов (частичных)",    value: fmtFull(totalPartialAmount),                          highlight: true  },
    { label: "Количество возвратов (частичных)", value: String(td?.partialRefundsCount ?? 0),             highlight: true  },
    { label: "Сумма возвратов (общая)",        value: fmtFull(totalRefunds),                                highlight: true  },
  ];

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Заголовок и фильтр */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Отчёт по договорам</Title>
          <Text type="secondary">{dateRange[0].format("DD.MM.YYYY")} — {dateRange[1].format("DD.MM.YYYY")}</Text>
        </Col>
        <Col>
          <RangePicker
            value={dateRange}
            onChange={(v) => v && setDateRange(v as [Dayjs, Dayjs])}
            format="DD.MM.YYYY"
            style={{ width: 260 }}
          />
        </Col>
      </Row>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          items={[
            {
              key: "charts",
              label: <span><BarChartOutlined /> Диаграммы</span>,
              children: (
                <>
                  {/* KPI карточки */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} md={8}>
                      <Card style={cardStyle} size="small">
                        <Statistic title="Договоров" value={data?.total ?? 0}
                          prefix={<FileTextOutlined style={{ color: "#6366f1" }} />}
                          valueStyle={{ color: "#6366f1" }} />
                      </Card>
                    </Col>
                    <Col xs={12} md={8}>
                      <Card style={cardStyle} size="small">
                        <Statistic title="Презентаций" value={data?.presentationsCount ?? 0}
                          prefix={<FundOutlined style={{ color: "#fb923c" }} />}
                          valueStyle={{ color: "#fb923c" }} />
                      </Card>
                    </Col>
                    <Col xs={12} md={8}>
                      <Card style={cardStyle} size="small">
                        <Statistic title="Конверсия (договоров / презентаций)" value={`${conversion}%`}
                          prefix={<PercentageOutlined style={{ color: "#e879f9" }} />}
                          valueStyle={{ color: "#e879f9" }} />
                      </Card>
                    </Col>
                    <Col xs={12} md={8}>
                      <Card style={cardStyle} size="small">
                        <Statistic title="Оборот до возврата" value={fmtFull(data?.turnoverBefore ?? 0)}
                          prefix={<RiseOutlined style={{ color: "#10b981" }} />}
                          valueStyle={{ color: "#10b981", fontSize: 16 }} />
                      </Card>
                    </Col>
                    <Col xs={12} md={8}>
                      <Card style={cardStyle} size="small">
                        <Statistic title="Оборот после возврата" value={fmtFull(data?.turnoverAfter ?? 0)}
                          prefix={<RiseOutlined style={{ color: "#34d399" }} />}
                          valueStyle={{ color: "#34d399", fontSize: 16 }} />
                      </Card>
                    </Col>
                    <Col xs={12} md={8}>
                      <Card style={cardStyle} size="small">
                        <Statistic title="Возвраты / Частичные"
                          value={`${data?.refundsCount ?? 0} / ${data?.partialRefundsCount ?? 0}`}
                          prefix={<RollbackOutlined style={{ color: "#f43f5e" }} />}
                          valueStyle={{ color: "#f43f5e" }} />
                      </Card>
                    </Col>
                    <Col xs={12} md={8}>
                      <Card style={cardStyle} size="small">
                        <Statistic title="Реал. деньги до возврата" value={fmtFull(data?.totalRealMoneyBefore ?? 0)}
                          prefix={<DollarOutlined style={{ color: "#a78bfa" }} />}
                          valueStyle={{ color: "#a78bfa", fontSize: 16 }} />
                      </Card>
                    </Col>
                    <Col xs={12} md={8}>
                      <Card style={cardStyle} size="small">
                        <Statistic title="Реал. деньги после возврата" value={fmtFull(data?.totalRealMoney ?? 0)}
                          prefix={<DollarOutlined style={{ color: "#22d3ee" }} />}
                          valueStyle={{ color: "#22d3ee", fontSize: 16 }} />
                      </Card>
                    </Col>
                    <Col xs={12} md={8}>
                      <Card style={cardStyle} size="small">
                        <Statistic title="Ср. оборот / презентацию (до)" value={fmtFull(data?.avgPerPresentation ?? 0)}
                          prefix={<RiseOutlined style={{ color: "#10b981" }} />}
                          valueStyle={{ color: "#10b981", fontSize: 15 }} />
                      </Card>
                    </Col>
                    <Col xs={12} md={8}>
                      <Card style={cardStyle} size="small">
                        <Statistic title="Ср. оборот / презентацию (после)" value={fmtFull(data?.avgPerPresentationAfter ?? 0)}
                          prefix={<RiseOutlined style={{ color: "#34d399" }} />}
                          valueStyle={{ color: "#34d399", fontSize: 15 }} />
                      </Card>
                    </Col>
                    <Col xs={12} md={8}>
                      <Card style={cardStyle} size="small">
                        <Statistic title="Топ менеджер" value={managerData[0]?.fullName ?? "—"}
                          prefix={<TeamOutlined style={{ color: "#60a5fa" }} />}
                          valueStyle={{ color: "#60a5fa", fontSize: 14 }}
                          suffix={managerData[0]
                            ? <span style={{ fontSize: 12, color: "#aaa", fontWeight: 400, marginLeft: 8 }}>
                                {fmtFull(managerData[0]?.["Оборот"] ?? 0)} сум
                              </span>
                            : null} />
                      </Card>
                    </Col>
                  </Row>

                  {/* Пайчарты: Реальные деньги по источникам + По типам сделок */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} lg={12}>
                      <Card title="Реальные деньги по источникам" style={cardStyle} size="small">
                        {pieData.length === 0
                          ? <div style={{ textAlign: "center", padding: 40, color: "#666" }}>Нет данных</div>
                          : <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                  outerRadius={110} innerRadius={55} paddingAngle={2} labelLine={false} label={renderPieLabel}>
                                  {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <ReTooltip content={<PieTooltip />} />
                                <Legend formatter={(v) => <span style={{ fontSize: 11, color: "#ccc" }}>{v}</span>} />
                              </PieChart>
                            </ResponsiveContainer>
                        }
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card title="По типам сделок" style={cardStyle} size="small">
                        {saleTypePieData.length === 0
                          ? <div style={{ textAlign: "center", padding: 30, color: "#666" }}>Нет данных</div>
                          : <ResponsiveContainer width="100%" height={300}>
                              <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                                <Pie data={saleTypePieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                  outerRadius={100} innerRadius={50} paddingAngle={3} labelLine={false}
                                  label={({ name, percent, value }) => `${name} (${value}) ${(percent * 100).toFixed(0)}%`}>
                                  {saleTypePieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                                </Pie>
                                <ReTooltip content={({ active, payload }: any) => {
                                  if (!active || !payload?.length) return null;
                                  const d = payload[0].payload;
                                  return (
                                    <div style={{ background: "#1f1f2e", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                                      <div style={{ color: d.fill }}>{d.name}</div>
                                      <div style={{ color: "#fff" }}>Договоров: <b>{d.value}</b></div>
                                      <div style={{ color: "#aaa" }}>Оборот: <b>{fmtFull(d.turnover)}</b></div>
                                    </div>
                                  );
                                }} />
                              </PieChart>
                            </ResponsiveContainer>
                        }
                      </Card>
                    </Col>
                  </Row>

                  {/* Аванс vs Реальные деньги */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24}>
                      <Card title="Аванс vs Реальные деньги" style={cardStyle} size="small">
                        {barData.length === 0
                          ? <div style={{ textAlign: "center", padding: 40, color: "#666" }}>Нет данных</div>
                          : <ResponsiveContainer width="100%" height={280}>
                              <BarChart data={barData} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                                <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11 }} />
                                <YAxis tickFormatter={fmt} tick={{ fill: "#888", fontSize: 11 }} />
                                <ReTooltip content={<CustomTooltip />} />
                                <Legend formatter={(v) => <span style={{ fontSize: 11, color: "#ccc" }}>{v}</span>} />
                                <Bar dataKey="Аванс" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="Аванс" position="top" formatter={fmt} style={{ fill: "#a78bfa", fontSize: 10 }} />
                                </Bar>
                                <Bar dataKey="Реал. деньги" fill="#22d3ee" radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="Реал. деньги" position="top" formatter={fmt} style={{ fill: "#67e8f9", fontSize: 10 }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                        }
                      </Card>
                    </Col>
                  </Row>

                  {/* Area chart */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24}>
                      <Card title="Динамика договоров по дням" style={cardStyle} size="small">
                        {lineData.length === 0
                          ? <div style={{ textAlign: "center", padding: 40, color: "#666" }}>Нет данных</div>
                          : <ResponsiveContainer width="100%" height={260}>
                              <AreaChart data={lineData} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorSum" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                                <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} />
                                <YAxis yAxisId="left" tickFormatter={fmt} tick={{ fill: "#888", fontSize: 11 }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#888", fontSize: 11 }} />
                                <ReTooltip content={<CustomTooltip />} />
                                <Legend formatter={(v) => <span style={{ fontSize: 11, color: "#ccc" }}>{v}</span>} />
                                <Area yAxisId="left" type="monotone" dataKey="Сумма (тыс.)" stroke="#6366f1" fill="url(#colorSum)" strokeWidth={2}
                                  dot={{ r: 3, fill: "#6366f1" }}
                                  label={{ position: "top", formatter: fmt, style: { fill: "#818cf8", fontSize: 10 } }} />
                                <Area yAxisId="left" type="monotone" dataKey="Реал. деньги (тыс.)" stroke="#22d3ee" fill="url(#colorReal)" strokeWidth={2}
                                  dot={{ r: 3, fill: "#22d3ee" }}
                                  label={{ position: "top", formatter: fmt, style: { fill: "#67e8f9", fontSize: 10 } }} />
                                <Line yAxisId="right" type="monotone" dataKey="Кол-во" stroke="#f59e0b" strokeWidth={2}
                                  dot={{ r: 4, fill: "#f59e0b" }}
                                  label={{ position: "top", style: { fill: "#fbbf24", fontSize: 11, fontWeight: 600 } }} />
                              </AreaChart>
                            </ResponsiveContainer>
                        }
                      </Card>
                    </Col>
                  </Row>

                  {/* Таблица источников + Возвраты + Типы */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} lg={16}>
                      <Card title="Детализация по источникам" style={cardStyle} size="small">
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                                <th style={{ textAlign: "left", padding: "6px 12px", color: "#888", fontWeight: 500 }}>Источник</th>
                                <th style={{ textAlign: "right", padding: "6px 12px", color: "#aaa", fontWeight: 500 }}>Аванс (до)</th>
                                <th style={{ textAlign: "right", padding: "6px 12px", color: "#666", fontWeight: 500 }}>Аванс (после)</th>
                                <th style={{ textAlign: "right", padding: "6px 12px", color: "#a78bfa", fontWeight: 500 }}>Реал. деньги (до)</th>
                                <th style={{ textAlign: "right", padding: "6px 12px", color: "#22d3ee", fontWeight: 500 }}>Реал. деньги (после)</th>
                                <th style={{ textAlign: "right", padding: "6px 12px", color: "#888", fontWeight: 500 }}>Комиссия</th>
                                <th style={{ textAlign: "right", padding: "6px 12px", color: "#f43f5e", fontWeight: 500 }}>Возвраты</th>
                                <th style={{ textAlign: "right", padding: "6px 12px", color: "#f59e0b", fontWeight: 500 }}>Частичные</th>
                                <th style={{ textAlign: "right", padding: "6px 12px", color: "#888", fontWeight: 500 }}>Доля</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(data?.bankStats ?? []).map((b: any, i: number) => {
                                const commission = b.advance - b.realMoney;
                                const pct = data?.totalRealMoney > 0
                                  ? ((b.realMoney / data.totalRealMoney) * 100).toFixed(1) : "0.0";
                                return (
                                  <tr key={b.name} style={{
                                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                    background: i % 2 === 0 ? "transparent" : token.colorFillAlter,
                                  }}>
                                    <td style={{ padding: "8px 12px" }}>
                                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length], marginRight: 8 }} />
                                      {b.name}
                                    </td>
                                    <td style={{ textAlign: "right", padding: "8px 12px", color: "#aaa" }}>{fmtFull(b.advanceBefore ?? b.advance)}</td>
                                    <td style={{ textAlign: "right", padding: "8px 12px", color: "#555" }}>{fmtFull(b.advance)}</td>
                                    <td style={{ textAlign: "right", padding: "8px 12px", color: "#a78bfa", fontWeight: 600 }}>{fmtFull(b.realMoneyBefore ?? b.realMoney)}</td>
                                    <td style={{ textAlign: "right", padding: "8px 12px", color: "#22d3ee", fontWeight: 600 }}>{fmtFull(b.realMoney)}</td>
                                    <td style={{ textAlign: "right", padding: "8px 12px", color: commission > 0 ? "#f43f5e" : "#555" }}>
                                      {commission > 0 ? `−${fmtFull(commission)}` : "—"}
                                    </td>
                                    <td style={{ textAlign: "right", padding: "8px 12px", color: b.refundAmount > 0 ? "#f43f5e" : "#555" }}>
                                      {b.refundAmount > 0 ? fmtFull(b.refundAmount) : "—"}
                                    </td>
                                    <td style={{ textAlign: "right", padding: "8px 12px", color: b.partialRefundAmount > 0 ? "#f59e0b" : "#555" }}>
                                      {b.partialRefundAmount > 0 ? fmtFull(b.partialRefundAmount) : "—"}
                                    </td>
                                    <td style={{ textAlign: "right", padding: "8px 12px" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                                        <div style={{ width: 60, height: 6, background: "#2a2a3a", borderRadius: 3, overflow: "hidden" }}>
                                          <div style={{ width: `${pct}%`, height: "100%", background: COLORS[i % COLORS.length], borderRadius: 3 }} />
                                        </div>
                                        <span style={{ color: "#aaa", fontSize: 12, minWidth: 36 }}>{pct}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr style={{ borderTop: `2px solid ${token.colorBorderSecondary}`, fontWeight: 600 }}>
                                <td style={{ padding: "8px 12px" }}>ИТОГО</td>
                                <td style={{ textAlign: "right", padding: "8px 12px", color: "#aaa" }}>{fmtFull(data?.totalAdvanceBefore ?? 0)}</td>
                                <td style={{ textAlign: "right", padding: "8px 12px", color: "#555" }}>
                                  {fmtFull((data?.bankStats ?? []).reduce((s: number, b: any) => s + b.advance, 0))}
                                </td>
                                <td style={{ textAlign: "right", padding: "8px 12px", color: "#a78bfa" }}>{fmtFull(data?.totalRealMoneyBefore ?? 0)}</td>
                                <td style={{ textAlign: "right", padding: "8px 12px", color: "#22d3ee" }}>{fmtFull(data?.totalRealMoney ?? 0)}</td>
                                <td style={{ textAlign: "right", padding: "8px 12px", color: "#f43f5e" }}>
                                  {(() => { const d = (data?.bankStats ?? []).reduce((s: number, b: any) => s + b.advance, 0) - (data?.totalRealMoney ?? 0); return d > 0 ? `−${fmtFull(d)}` : "—"; })()}
                                </td>
                                <td style={{ textAlign: "right", padding: "8px 12px", color: "#f43f5e" }}>{fmtFull(totalRefundAmount)}</td>
                                <td style={{ textAlign: "right", padding: "8px 12px", color: "#f59e0b" }}>{fmtFull(totalPartialAmount)}</td>
                                <td style={{ textAlign: "right", padding: "8px 12px", color: "#aaa" }}>100%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </Col>

                    <Col xs={24} lg={8}>
                      <Card title="Возвраты по источникам" style={cardStyle} size="small">
                        {(data?.refundChart ?? []).length === 0
                          ? <div style={{ textAlign: "center", padding: 40, color: "#666" }}>Нет возвратов</div>
                          : <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={data?.refundChart ?? []} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" horizontal={false} />
                                <XAxis type="number" tickFormatter={fmt} tick={{ fill: "#888", fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: "#ccc", fontSize: 11 }} width={70} />
                                <ReTooltip content={<CustomTooltip />} />
                                <Legend formatter={(v) => <span style={{ fontSize: 11, color: "#ccc" }}>{v}</span>} />
                                <Bar dataKey="refundAmount" name="Возврат" fill="#f43f5e" radius={[0, 4, 4, 0]}>
                                  <LabelList dataKey="refundAmount" position="right" formatter={fmt} style={{ fill: "#fca5a5", fontSize: 10 }} />
                                </Bar>
                                <Bar dataKey="partialRefundAmount" name="Частичный" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                                  <LabelList dataKey="partialRefundAmount" position="right" formatter={fmt} style={{ fill: "#fcd34d", fontSize: 10 }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                        }
                      </Card>
                    </Col>
                  </Row>

                  {/* Ведущие: оборот + средняя на презентацию */}
                  {speakerData.length > 0 && (
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                      <Col xs={24} lg={12}>
                        <Card title={<span><TeamOutlined style={{ color: "#34d399", marginRight: 8 }} />Ведущие по обороту</span>} style={cardStyle} size="small">
                          <ResponsiveContainer width="100%" height={Math.max(200, speakerData.length * 52)}>
                            <BarChart data={speakerData} layout="vertical" margin={{ top: 4, right: 100, left: 16, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" horizontal={false} />
                              <XAxis type="number" tickFormatter={fmt} tick={{ fill: "#888", fontSize: 11 }} />
                              <YAxis type="category" dataKey="name" tick={{ fill: "#ccc", fontSize: 12 }} width={140} />
                              <ReTooltip content={({ active, payload }: any) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                  <div style={{ background: "#1f1f2e", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                                    <div style={{ color: "#ccc", marginBottom: 4 }}>{d.fullName}</div>
                                    <div style={{ color: "#34d399" }}>Оборот: <b>{fmtFull(d["Оборот"])}</b></div>
                                    <div style={{ color: "#22d3ee" }}>Реал. деньги: <b>{fmtFull(d["Реал. деньги"])}</b></div>
                                    <div style={{ color: "#aaa" }}>Договоров: <b>{d.count}</b></div>
                                  </div>
                                );
                              }} />
                              <Legend formatter={(v) => <span style={{ fontSize: 11, color: "#ccc" }}>{v}</span>} />
                              <Bar dataKey="Оборот" fill="#34d399" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="Оборот" position="right" formatter={fmt} style={{ fill: "#6ee7b7", fontSize: 11 }} />
                              </Bar>
                              <Bar dataKey="Реал. деньги" fill="#22d3ee" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="Реал. деньги" position="right" formatter={fmt} style={{ fill: "#67e8f9", fontSize: 11 }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Card>
                      </Col>
                      {speakerAvgData.length > 0 && (
                        <Col xs={24} lg={12}>
                          <Card title={<span><TeamOutlined style={{ color: "#f59e0b", marginRight: 8 }} />Ведущие по средней на презентацию</span>} style={cardStyle} size="small">
                            <ResponsiveContainer width="100%" height={Math.max(200, speakerAvgData.length * 52)}>
                              <BarChart data={speakerAvgData} layout="vertical" margin={{ top: 4, right: 100, left: 16, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" horizontal={false} />
                                <XAxis type="number" tickFormatter={fmt} tick={{ fill: "#888", fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: "#ccc", fontSize: 12 }} width={140} />
                                <ReTooltip content={({ active, payload }: any) => {
                                  if (!active || !payload?.length) return null;
                                  const d = payload[0].payload;
                                  return (
                                    <div style={{ background: "#1f1f2e", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                                      <div style={{ color: "#ccc", marginBottom: 4 }}>{d.fullName}</div>
                                      <div style={{ color: "#f59e0b" }}>Средняя на презентацию: <b>{fmtFull(d["Средняя на презентацию"])}</b></div>
                                      <div style={{ color: "#34d399" }}>Оборот: <b>{fmtFull(d.turnover)}</b></div>
                                      <div style={{ color: "#aaa" }}>Договоров: <b>{d.count}</b></div>
                                      <div style={{ color: "#888" }}>Презентаций: <b>{d.presCount}</b></div>
                                    </div>
                                  );
                                }} />
                                <Bar dataKey="Средняя на презентацию" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                                  <LabelList dataKey="Средняя на презентацию" position="right" formatter={fmt} style={{ fill: "#fcd34d", fontSize: 11 }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </Card>
                        </Col>
                      )}
                    </Row>
                  )}

                  {/* Сотрудники: оборот + средняя на презентацию */}
                  {managerData.length > 0 && (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={12}>
                        <Card title={<span><TeamOutlined style={{ color: "#60a5fa", marginRight: 8 }} />Сотрудники по обороту</span>} style={cardStyle} size="small">
                          <ResponsiveContainer width="100%" height={Math.max(200, managerData.length * 52)}>
                            <BarChart data={managerData} layout="vertical" margin={{ top: 4, right: 100, left: 16, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" horizontal={false} />
                              <XAxis type="number" tickFormatter={fmt} tick={{ fill: "#888", fontSize: 11 }} />
                              <YAxis type="category" dataKey="name" tick={{ fill: "#ccc", fontSize: 12 }} width={140} />
                              <ReTooltip content={({ active, payload }: any) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                  <div style={{ background: "#1f1f2e", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                                    <div style={{ color: "#ccc", marginBottom: 4 }}>{d.fullName}</div>
                                    <div style={{ color: "#6366f1" }}>Оборот: <b>{fmtFull(d["Оборот"])}</b></div>
                                    <div style={{ color: "#22d3ee" }}>Реал. деньги: <b>{fmtFull(d["Реал. деньги"])}</b></div>
                                    <div style={{ color: "#aaa" }}>Договоров: <b>{d.count}</b></div>
                                  </div>
                                );
                              }} />
                              <Legend formatter={(v) => <span style={{ fontSize: 11, color: "#ccc" }}>{v}</span>} />
                              <Bar dataKey="Оборот" fill="#6366f1" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="Оборот" position="right" formatter={fmt} style={{ fill: "#a78bfa", fontSize: 11 }} />
                              </Bar>
                              <Bar dataKey="Реал. деньги" fill="#22d3ee" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="Реал. деньги" position="right" formatter={fmt} style={{ fill: "#67e8f9", fontSize: 11 }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Card>
                      </Col>
                      {managerAvgData.length > 0 && (
                        <Col xs={24} lg={12}>
                          <Card title={<span><TeamOutlined style={{ color: "#fb923c", marginRight: 8 }} />Сотрудники по средней на презентацию</span>} style={cardStyle} size="small">
                            <ResponsiveContainer width="100%" height={Math.max(200, managerAvgData.length * 52)}>
                              <BarChart data={managerAvgData} layout="vertical" margin={{ top: 4, right: 100, left: 16, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" horizontal={false} />
                                <XAxis type="number" tickFormatter={fmt} tick={{ fill: "#888", fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: "#ccc", fontSize: 12 }} width={140} />
                                <ReTooltip content={({ active, payload }: any) => {
                                  if (!active || !payload?.length) return null;
                                  const d = payload[0].payload;
                                  return (
                                    <div style={{ background: "#1f1f2e", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                                      <div style={{ color: "#ccc", marginBottom: 4 }}>{d.fullName}</div>
                                      <div style={{ color: "#fb923c" }}>Средняя на презентацию: <b>{fmtFull(d["Средняя на презентацию"])}</b></div>
                                      <div style={{ color: "#6366f1" }}>Оборот: <b>{fmtFull(d.turnover)}</b></div>
                                      <div style={{ color: "#aaa" }}>Договоров: <b>{d.count}</b></div>
                                      <div style={{ color: "#888" }}>Презентаций: <b>{d.presCount}</b></div>
                                    </div>
                                  );
                                }} />
                                <Bar dataKey="Средняя на презентацию" fill="#fb923c" radius={[0, 4, 4, 0]}>
                                  <LabelList dataKey="Средняя на презентацию" position="right" formatter={fmt} style={{ fill: "#fdba74", fontSize: 11 }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </Card>
                        </Col>
                      )}
                    </Row>
                  )}
                </>
              ),
            },
            {
              key: "table",
              label: <span><TableOutlined /> Таблица</span>,
              children: (
                <>
                  {/* Фильтр таблицы */}
                  <Row gutter={12} style={{ marginBottom: 16 }} align="middle">
                    <Col>
                      <Select
                        value={filterType}
                        onChange={(v) => { setFilterType(v); setFilterId(undefined); }}
                        style={{ width: 180 }}
                        options={[
                          { value: "period",   label: "Период (общее)" },
                          { value: "speaker",  label: "Ведущий" },
                          { value: "employee", label: "Сотрудник (Оформил)" },
                        ]}
                      />
                    </Col>
                    {filterType !== "period" && (
                      <Col>
                        <Select
                          placeholder={
                            filterType === "speaker" ? "Выберите ведущего"
                            : "Выберите сотрудника"
                          }
                          value={filterId}
                          onChange={setFilterId}
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          style={{ width: 240 }}
                          options={(
                            filterType === "speaker" ? (data?.bySpeaker ?? [])
                            : (data?.byManager ?? [])
                          ).map((p: any) => ({
                            value: p.id,
                            label: p.name,
                          }))}
                        />
                      </Col>
                    )}
                    {tableLoading && <Col><Spin size="small" /></Col>}
                  </Row>

                  <Card style={cardStyle} size="small">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <tbody>
                      {/* Секция: Реальные деньги по источникам */}
                      <tr>
                        <td colSpan={2} style={{
                          padding: "10px 16px", fontWeight: 700, fontSize: 15,
                          background: token.colorFillSecondary,
                          borderBottom: `1px solid ${token.colorBorderSecondary}`,
                          color: token.colorText,
                        }}>
                          Реальные деньги по источникам
                        </td>
                      </tr>
                      {(td?.bankStats ?? []).map((b: any, i: number) => (
                        <tr key={b.name} style={{
                          borderBottom: `1px solid ${token.colorBorderSecondary}`,
                          background: i % 2 === 0 ? "transparent" : token.colorFillAlter,
                        }}>
                          <td style={{ padding: "9px 16px", color: token.colorTextSecondary }}>
                            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length], marginRight: 10 }} />
                            Реальные деньги {b.name}
                          </td>
                          <td style={{ padding: "9px 16px", textAlign: "right", fontWeight: 600, color: "#22d3ee", fontSize: 15 }}>
                            {fmtFull(b.realMoney)}
                          </td>
                        </tr>
                      ))}
                      {/* Итого реальные деньги */}
                      <tr style={{ borderBottom: `2px solid ${token.colorBorderSecondary}` }}>
                        <td style={{ padding: "10px 16px", fontWeight: 700, color: token.colorText, background: token.colorFillTertiary }}>
                          ИТОГО РЕАЛЬНЫЕ ДЕНЬГИ
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: "#22d3ee", fontSize: 16, background: token.colorFillTertiary }}>
                          {fmtFull(td?.totalRealMoney ?? 0)}
                        </td>
                      </tr>

                      {/* Разделитель */}
                      <tr><td colSpan={2} style={{ height: 8 }} /></tr>

                      {/* Секция: Сводные показатели */}
                      <tr>
                        <td colSpan={2} style={{
                          padding: "10px 16px", fontWeight: 700, fontSize: 15,
                          background: token.colorFillSecondary,
                          borderBottom: `1px solid ${token.colorBorderSecondary}`,
                          color: token.colorText,
                        }}>
                          Сводные показатели
                        </td>
                      </tr>
                      {summaryRows.map((row, i) => (
                        <tr key={row.label} style={{
                          borderBottom: `1px solid ${token.colorBorderSecondary}`,
                          background: i % 2 === 0 ? "transparent" : token.colorFillAlter,
                        }}>
                          <td style={{ padding: "9px 16px", color: row.highlight ? "#f43f5e" : token.colorTextSecondary, fontWeight: row.highlight ? 500 : 400 }}>
                            {row.label}
                          </td>
                          <td style={{ padding: "9px 16px", textAlign: "right", fontWeight: 600, color: row.highlight ? "#f43f5e" : token.colorText, fontSize: 15 }}>
                            {row.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
                </>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
