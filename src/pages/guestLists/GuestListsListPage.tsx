import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Typography, Button, Tooltip } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { guestListsApi } from "../../api/guestLists";
import { useTableFilters } from "../../utils/tableFilters";
import dayjs from "dayjs";

const { Title } = Typography;

export default function GuestListsListPage() {
  const navigate = useNavigate();
  const { colSearch } = useTableFilters();

  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tablePage, setTablePage] = useState(1);

  useEffect(() => {
    setLoading(true);
    guestListsApi
      .getGlobal()
      .then(setLists)
      .finally(() => setLoading(false));
  }, []);

  // Форматирует заголовок списка: место • дата • времена
  const formatTitle = (r: any) => {
    const datePresentations: any[] = r.datePresentations ?? [];
    const venue = datePresentations[0]?.venue;
    const venuePart = venue?.venueName || venue?.address || "";
    const dateStr = dayjs(r.date).format("DD.MM.YYYY");
    const times = datePresentations
      .map((p: any) => p.time)
      .filter(Boolean)
      .join(", ");
    return [venuePart, dateStr, times].filter(Boolean).join(" • ");
  };

  const columns = [
    {
      title: "Список",
      key: "title",
      ...colSearch((r: any) => formatTitle(r)),
      render: (_: any, r: any) => (
        <a onClick={() => navigate(`/trips/${r.tripId}/guest-lists/${r.id}`)}>
          {formatTitle(r) || "—"}
        </a>
      ),
    },
    {
      title: "Поездка",
      key: "trip",
      ...colSearch((r: any) => r.trip?.name ?? ""),
      render: (_: any, r: any) =>
        r.trip ? (
          <a onClick={() => navigate(`/trips/${r.trip.id}`)}>{r.trip.name}</a>
        ) : (
          "—"
        ),
    },
    {
      title: "Дата",
      key: "date",
      ...colSearch((r: any) => dayjs(r.date).format("DD.MM.YYYY")),
      render: (_: any, r: any) => dayjs(r.date).format("DD.MM.YYYY"),
    },
    {
      title: "Гостей",
      key: "guests",
      width: 80,
      render: (_: any, r: any) => r._count?.guests ?? 0,
    },
    {
      title: "Дата импорта",
      key: "createdAt",
      width: 130,
      ...colSearch((r: any) => dayjs(r.createdAt).format("DD.MM.YY HH:mm")),
      render: (_: any, r: any) => dayjs(r.createdAt).format("DD.MM.YY HH:mm"),
    },
    {
      title: "Кто",
      key: "createdBy",
      width: 140,
      ...colSearch((r: any) =>
        r.createdBy ? `${r.createdBy.lastName} ${r.createdBy.firstName}` : ""
      ),
      render: (_: any, r: any) =>
        r.createdBy
          ? `${r.createdBy.lastName} ${r.createdBy.firstName}`
          : "—",
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_: any, r: any) => (
        <Tooltip title="Открыть">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/trips/${r.tripId}/guest-lists/${r.id}`)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Списки гостей
        </Title>
      </div>

      <Table
        scroll={{ x: "max-content" }}
        dataSource={lists}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20, current: tablePage, showSizeChanger: false }}
        onChange={(pg, filters) => {
          const hasFilter = Object.values(filters).some((f) => f && f.length > 0);
          setTablePage(hasFilter ? 1 : (pg.current ?? 1));
        }}
        locale={{ emptyText: "Нет списков гостей" }}
      />
    </div>
  );
}
