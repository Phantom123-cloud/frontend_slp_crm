import { useState } from "react";
import {
  DatePicker,
  Select,
  Tabs,
  Table,
  Spin,
  Space,
  Typography,
  Tag,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { statsApi } from "../../api/stats";
import type { StatsRow } from "../../api/stats";

const { Title } = Typography;
const { RangePicker } = DatePicker;

// Роли на русском
const ROLE_LABELS: Record<string, string> = {
  LEADER: "Ведущий",
  MV: "МВ",
  GA: "ГА",
  MV_GA: "МВ/ГА",
  TRADER: "Трейдер",
};

// Цвета ролей
const ROLE_COLORS: Record<string, string> = {
  LEADER: "blue",
  MV: "purple",
  GA: "green",
  MV_GA: "cyan",
  TRADER: "orange",
};

// Рендер числа или прочерка
const num = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : v;

// Колонки таблицы (общие для всех вкладок)
function buildColumns(tab: string) {
  const cols: any[] = [
    {
      title: tab === "dates" ? "Период" : "Имя",
      dataIndex: "label",
      key: "label",
      width: 200,
      fixed: "left" as const,
      ellipsis: true,
    },
  ];

  // Роль — только для вкладки "Индивидуально"
  if (tab === "individual") {
    cols.push({
      title: "Роль",
      dataIndex: "role",
      key: "role",
      width: 90,
      render: (role: string) =>
        role ? (
          <Tag color={ROLE_COLORS[role] || "default"}>
            {ROLE_LABELS[role] || role}
          </Tag>
        ) : (
          "—"
        ),
    });
  }

  // Количество презентаций
  cols.push({
    title: "Презент.",
    dataIndex: "presentationsCount",
    key: "presentationsCount",
    width: 80,
    align: "center" as const,
  });

  // Гостевые метрики
  cols.push(
    {
      title: "Пригл.",
      dataIndex: "invited",
      key: "invited",
      width: 70,
      align: "center" as const,
    },
    {
      title: "Приход",
      key: "arrived",
      width: 90,
      align: "center" as const,
      render: (_: any, r: StatsRow) => `${r.arrived} (${r.pctArrived}%)`,
    },
    {
      title: "Пары",
      dataIndex: "arrivedPairs",
      key: "arrivedPairs",
      width: 65,
      align: "center" as const,
    },
    {
      title: "у/Пар",
      key: "leftGuests",
      width: 80,
      align: "center" as const,
      render: (_: any, r: StatsRow) =>
        r.leftGuests > 0 ? (
          <span style={{ color: "#ff4d4f" }}>
            {r.leftGuests}/{r.leftPairs}
          </span>
        ) : (
          <span style={{ color: "#595959" }}>
            {r.leftGuests}/{r.leftPairs}
          </span>
        ),
    },
    {
      title: "н/Пар",
      key: "notLetGuests",
      width: 80,
      align: "center" as const,
      render: (_: any, r: StatsRow) =>
        r.notLetGuests > 0 ? (
          <span style={{ color: "#fa8c16" }}>
            {r.notLetGuests}/{r.notLetPairs}
          </span>
        ) : (
          <span style={{ color: "#595959" }}>
            {r.notLetGuests}/{r.notLetPairs}
          </span>
        ),
    },
    {
      title: "В зале г/п",
      key: "inHallGuests",
      width: 100,
      align: "center" as const,
      render: (_: any, r: StatsRow) => (
        <span style={{ color: "#52c41a" }}>
          {r.inHallGuests}/{r.inHallPairs}
        </span>
      ),
    }
  );

  // Итоговые метрики
  cols.push(
    {
      title: "Успешных",
      dataIndex: "successApproach",
      key: "successApproach",
      width: 90,
      align: "center" as const,
      render: num,
    },
    {
      title: "Часовка всех",
      dataIndex: "totalApproach",
      key: "totalApproach",
      width: 110,
      align: "center" as const,
      render: num,
    },
    {
      title: "Кол. отказов",
      dataIndex: "refusalCount",
      key: "refusalCount",
      width: 110,
      align: "center" as const,
      render: num,
    },
    {
      title: "Знач. отказа",
      dataIndex: "refusalValue",
      key: "refusalValue",
      width: 110,
      align: "center" as const,
      render: num,
    },
    {
      title: "Кол. перепис.",
      dataIndex: "rewriteCount",
      key: "rewriteCount",
      width: 115,
      align: "center" as const,
      render: num,
    },
    {
      title: "Ценность перепис.",
      dataIndex: "rewriteValue",
      key: "rewriteValue",
      width: 140,
      align: "center" as const,
      render: num,
    }
  );

  return cols;
}

export default function StatsPresentationsPage() {

  // Дефолт: текущий месяц
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [groupBy, setGroupBy] = useState("month");
  const [activeTab, setActiveTab] = useState("dates");

  const from = dateRange[0].format("YYYY-MM-DD");
  const to = dateRange[1].format("YYYY-MM-DD");

  const { data, isLoading } = useQuery({
    queryKey: ["stats", "presentations", from, to, groupBy, activeTab],
    queryFn: () =>
      statsApi.getPresentationStats({ from, to, groupBy, tab: activeTab }),
    enabled: !!from && !!to,
  });

  const columns = buildColumns(activeTab);

  const tableProps = {
    dataSource: data || [],
    columns,
    rowKey: "key",
    size: "small" as const,
    scroll: { x: 1600 },
    pagination: {
      pageSize: 50,
      pageSizeOptions: ["50", "100", "500"],
      showSizeChanger: true,
    },
    loading: isLoading,
  };

  return (
    <div style={{ padding: "0 24px 24px" }}>
      <Title level={4} style={{ marginBottom: 16 }}>
        Статистика презентаций
      </Title>

      {/* Фильтры */}
      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker
          value={dateRange}
          onChange={(v) => {
            if (v && v[0] && v[1]) setDateRange([v[0], v[1]]);
          }}
          format="DD.MM.YYYY"
          allowClear={false}
        />
        <Select
          value={groupBy}
          onChange={setGroupBy}
          style={{ width: 140 }}
          options={[
            { value: "day", label: "День" },
            { value: "week", label: "Неделя" },
            { value: "month", label: "Месяц" },
            { value: "year", label: "Год" },
            { value: "trip", label: "Выезд" },
          ]}
        />
        {groupBy === "trip" && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Выезды, пересекающие диапазон, включаются целиком
          </Typography.Text>
        )}
      </Space>

      {/* Вкладки */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={[
          {
            key: "dates",
            label: "По датам",
            children: (
              <Spin spinning={isLoading}>
                <Table {...tableProps} />
              </Spin>
            ),
          },
          {
            key: "leaders",
            label: "По ведущим",
            children: (
              <Spin spinning={isLoading}>
                <Table {...tableProps} />
              </Spin>
            ),
          },
          {
            key: "coordinators",
            label: "По координаторам",
            children: (
              <Spin spinning={isLoading}>
                <Table {...tableProps} />
              </Spin>
            ),
          },
          {
            key: "individual",
            label: "Индивидуально",
            children: (
              <Spin spinning={isLoading}>
                <Table {...tableProps} />
              </Spin>
            ),
          },
        ]}
      />
    </div>
  );
}
