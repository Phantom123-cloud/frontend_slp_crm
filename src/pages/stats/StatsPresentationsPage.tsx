import { useState } from "react";
import {
  DatePicker,
  Select,
  Tabs,
  Table,
  Spin,
  Space,
  Typography,
  Dropdown,
  Button,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { statsApi } from "../../api/stats";
import type { StatsRow } from "../../api/stats";

const { Title } = Typography;
const { RangePicker } = DatePicker;

// Рендер числа или прочерка
const num = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : v;

// Колонки таблицы (общие для всех вкладок)
function buildColumns(tab: string, groupBy: string) {
  const isPresGroupBy = tab === "dates" && groupBy === "presentation";

  const firstColTitle = isPresGroupBy ? "Название" : tab === "dates" ? "Период" : "Имя";

  const cols: any[] = [
    {
      title: firstColTitle,
      dataIndex: "label",
      key: "label",
      width: 200,
      fixed: "left" as const,
      ellipsis: true,
    },
  ];

  // Доп. колонки для группировки по презентациям
  if (isPresGroupBy) {
    cols.push(
      {
        title: "Дата",
        dataIndex: "presDate",
        key: "presDate",
        width: 100,
      },
      {
        title: "Время",
        dataIndex: "presTime",
        key: "presTime",
        width: 75,
        align: "center" as const,
      },
      {
        title: "Тип",
        dataIndex: "presType",
        key: "presType",
        width: 140,
        ellipsis: true,
      },
      {
        title: "Место",
        dataIndex: "presVenue",
        key: "presVenue",
        width: 180,
        ellipsis: true,
      },
    );
  }

  // Количество презентаций — для вкладки «По датам», кроме группировки по презентациям
  if (tab === "dates" && !isPresGroupBy) cols.push({
    title: "Презент.",
    dataIndex: "presentationsCount",
    key: "presentationsCount",
    width: 80,
    align: "center" as const,
  });

  // Гостевые метрики — скрываем для вкладки «Индивидуально» (дублирует данные)
  if (tab !== "individual") cols.push(
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
    },
    {
      title: "Оборот до возврата",
      dataIndex: "turnoverBefore",
      key: "turnoverBefore",
      width: 150,
      align: "right" as const,
      render: (v: number) => v != null ? v.toLocaleString() : "—",
    },
    {
      title: "Оборот после возврата",
      dataIndex: "turnoverAfter",
      key: "turnoverAfter",
      width: 160,
      align: "right" as const,
      render: (v: number, r: StatsRow) => {
        const after = v != null ? v : null;
        const before = r.turnoverBefore;
        if (after == null) return "—";
        const color = after < before ? "#fa8c16" : undefined;
        return <span style={{ color }}>{after.toLocaleString()}</span>;
      },
    }
  );

  return cols;
}

// Метки вкладок для имени файла
const TAB_LABELS: Record<string, string> = {
  dates: "По датам",
  leaders: "По ведущим",
  coordinators: "По координаторам",
  individual: "Индивидуально",
};

// Преобразовать данные в плоские строки для экспорта
function toExportRows(rows: StatsRow[], tab: string, groupBy: string) {
  const isPresGroupBy = tab === "dates" && groupBy === "presentation";
  return rows.map((r) => {
    const base: Record<string, any> = {
      [isPresGroupBy ? "Название" : tab === "dates" ? "Период" : "Имя"]: r.label,
    };
    if (isPresGroupBy) {
      base["Дата"] = r.presDate ?? "";
      base["Время"] = r.presTime ?? "";
      base["Тип"] = r.presType ?? "";
      base["Место"] = r.presVenue ?? "";
    }
    if (tab === "dates" && !isPresGroupBy) base["Презент."] = r.presentationsCount;
    if (tab !== "individual") {
      base["Пригл."] = r.invited;
      base["Приход"] = r.arrived;
      base["%пр"] = r.pctArrived;
      base["Пары"] = r.arrivedPairs;
      base["у (гости)"] = r.leftGuests;
      base["у (пары)"] = r.leftPairs;
      base["н (гости)"] = r.notLetGuests;
      base["н (пары)"] = r.notLetPairs;
      base["В зале (г)"] = r.inHallGuests;
      base["В зале (п)"] = r.inHallPairs;
    }
    base["Успешных"] = r.successApproach ?? "";
    base["Часовка всех"] = r.totalApproach ?? "";
    base["Кол. отказов"] = r.refusalCount ?? "";
    base["Знач. отказа"] = r.refusalValue ?? "";
    base["Кол. перепис."] = r.rewriteCount ?? "";
    base["Ценность перепис."] = r.rewriteValue ?? "";
    base["Оборот до возврата"] = r.turnoverBefore ?? 0;
    base["Оборот после возврата"] = r.turnoverAfter ?? 0;
    return base;
  });
}

// Скачать файл
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Экспорт в Excel
function exportExcel(rows: StatsRow[], tab: string, from: string, to: string, groupBy: string) {
  const data = toExportRows(rows, tab, groupBy);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, TAB_LABELS[tab] || tab);
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadFile(
    new Blob([buf], { type: "application/octet-stream" }),
    `статистика_${tab}_${from}_${to}.xlsx`
  );
}

// Экспорт в CSV
function exportCsv(rows: StatsRow[], tab: string, from: string, to: string, groupBy: string) {
  const data = toExportRows(rows, tab, groupBy);
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(";"),
    ...data.map((r) =>
      headers.map((h) => String(r[h] ?? "").replace(/;/g, ",")).join(";")
    ),
  ];
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  downloadFile(blob, `статистика_${tab}_${from}_${to}.csv`);
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

  const columns = buildColumns(activeTab, groupBy);

  const tableProps = {
    dataSource: data || [],
    columns,
    rowKey: "key",
    size: "small" as const,
    scroll: { x: 1900 },
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
        {/* Группировка — только для вкладки «По датам» */}
        {activeTab === "dates" && (
          <>
            <Select
              value={groupBy}
              onChange={setGroupBy}
              style={{ width: 140 }}
              options={[
                { value: "presentation", label: "По презентациям" },
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
          </>
        )}
      </Space>

      {/* Вкладки */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        tabBarExtraContent={
          <Dropdown
            menu={{
              items: [
                {
                  key: "excel",
                  label: "Скачать Excel (.xlsx)",
                  onClick: () => exportExcel(data || [], activeTab, from, to, groupBy),
                },
                {
                  key: "csv",
                  label: "Скачать CSV (.csv)",
                  onClick: () => exportCsv(data || [], activeTab, from, to, groupBy),
                },
              ],
            }}
            disabled={!data?.length}
          >
            <Button icon={<DownloadOutlined />} size="small">
              Скачать
            </Button>
          </Dropdown>
        }
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
