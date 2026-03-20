import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Tag, Radio, Typography, message, Button, Tooltip } from "antd";
import { EyeOutlined, CalendarOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { presentationsApi } from "../../api/trips";
import { useTableFilters } from "../../utils/tableFilters";
import dayjs from "dayjs";

const { Title } = Typography;

const PRES_STATUS_COLORS: Record<string, string> = {
  PLANNED: "blue",
  ACTIVE: "green",
  COMPLETED: "default",
  CANCELLED: "red",
};

const getEffectivePresStatus = (pres: any): string => {
  if (pres.status === "CANCELLED") return "CANCELLED";
  const today = dayjs().startOf("day");
  const presDate = dayjs(pres.date).startOf("day");
  if (presDate.isSame(today)) return "ACTIVE";
  if (presDate.isBefore(today)) return "COMPLETED";
  return "PLANNED";
};

export default function PresentationsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { colSearch, colEnum } = useTableFilters();

  const [presentations, setPresentations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [tablePage, setTablePage] = useState(1);

  const loadPresentations = async () => {
    setLoading(true);
    try {
      const { data } = await presentationsApi.listAll(
        filter === "all" ? undefined : filter,
      );
      setPresentations(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPresentations();
    setTablePage(1);
  }, [filter]);

  const columns = [
    {
      title: "#",
      dataIndex: "number",
      key: "number",
      width: 50,
    },
    {
      title: t("trips.presentationName"),
      key: "name",
      ...colSearch((r: any) => r.name || ""),
      render: (_: any, r: any) => (
        <a onClick={() => navigate(`/presentations/${r.id}`)}>{r.name}</a>
      ),
    },
    {
      title: t("trips.name"),
      key: "trip",
      ...colSearch((r: any) => r.trip?.name || ""),
      render: (_: any, r: any) =>
        r.trip ? (
          <a onClick={() => navigate(`/trips/${r.trip.id}`)}>{r.trip.name}</a>
        ) : (
          "—"
        ),
    },
    {
      title: t("trips.presentationDate"),
      key: "date",
      ...colSearch((r: any) => dayjs(r.date).format("DD.MM.YYYY")),
      render: (_: any, r: any) => dayjs(r.date).format("DD.MM.YYYY"),
    },
    { title: t("trips.presentationTime"), dataIndex: "time", key: "time" },
    {
      title: t("trips.presentationType"),
      key: "type",
      ...colSearch((r: any) => r.type?.name || ""),
      render: (_: any, r: any) => r.type?.name || "—",
    },
    {
      title: t("trips.venue"),
      key: "venue",
      ...colSearch((r: any) =>
        r.venue ? `${r.venue.city} / ${r.venue.venueName}` : "",
      ),
      render: (_: any, r: any) =>
        r.venue ? `${r.venue.city} / ${r.venue.venueName}` : "—",
    },
    {
      title: t("trips.status"),
      key: "status",
      ...colEnum(
        [
          { text: t("trips.presStatus_PLANNED"), value: "PLANNED" },
          { text: t("trips.presStatus_ACTIVE"), value: "ACTIVE" },
          { text: t("trips.presStatus_COMPLETED"), value: "COMPLETED" },
          { text: t("trips.presStatus_CANCELLED"), value: "CANCELLED" },
        ],
        (v, r: any) => getEffectivePresStatus(r) === v,
      ),
      render: (_: any, r: any) => {
        const eff = getEffectivePresStatus(r);
        return (
          <Tag color={PRES_STATUS_COLORS[eff]}>{t(`trips.presStatus_${eff}`)}</Tag>
        );
      },
    },
    {
      title: t("trips.crewCount"),
      key: "crew",
      render: (_: any, r: any) => r.crew?.length ?? 0,
    },
    {
      title: t("users.actions"),
      key: "actions",
      width: 60,
      render: (_: any, r: any) => (
        <Tooltip title={t("trips.view")}>
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/presentations/${r.id}`)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          <CalendarOutlined style={{ marginRight: 8 }} />
          {t("menu.presentations")}
        </Title>
      </div>

      <Radio.Group
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: 16 }}
      >
        <Radio.Button value="all">{t("trips.presFilter_all")}</Radio.Button>
        <Radio.Button value="active">{t("trips.presFilter_active")}</Radio.Button>
        <Radio.Button value="planned">{t("trips.presFilter_planned")}</Radio.Button>
        <Radio.Button value="completed">{t("trips.presFilter_completed")}</Radio.Button>
        <Radio.Button value="cancelled">{t("trips.presFilter_cancelled")}</Radio.Button>
      </Radio.Group>

      <Table
        scroll={{ x: "max-content" }}
        dataSource={presentations}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, current: tablePage }}
        onChange={(pg, filters) => {
          const hasFilter = Object.values(filters).some(
            (f) => f && f.length > 0,
          );
          setTablePage(hasFilter ? 1 : (pg.current ?? 1));
        }}
        size="small"
      />
    </div>
  );
}
