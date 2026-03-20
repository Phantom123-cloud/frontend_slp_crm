import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Tag,
  Space,
  Radio,
  Typography,
  message,
  Popconfirm,
  Tooltip,
  Grid,
} from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined, CarOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { tripsApi } from "../../api/trips";
import { usePermission } from "../../hooks/usePermission";
import TripCreateModal from "./components/TripCreateModal";
import { useTableFilters } from "../../utils/tableFilters";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const ROLE_COLORS: Record<string, string> = {
  LEADER: "purple",
  MV: "blue",
  GA: "cyan",
  MV_GA: "geekblue",
  TRADER: "orange",
};

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "blue",
  ACTIVE: "green",
  CLOSED: "default",
};

export default function TripsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const canCreate = usePermission("trips.create");
  const canDelete = usePermission("trips.delete");
  const canAdmin = usePermission("trips.admin");

  const { colSearch, colEnum } = useTableFilters();

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("active");
  const [tablePage, setTablePage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const { data } = await tripsApi.list(filter);
      setTrips(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
    setTablePage(1);
  }, [filter]);

  const handleDelete = async (id: string) => {
    try {
      await tripsApi.delete(id);
      message.success(t("common.success"));
      loadTrips();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const columns = [
    {
      title: t("trips.name"),
      dataIndex: "name",
      key: "name",
      render: (name: string, record: any) => (
        <a onClick={() => navigate(`/trips/${record.id}`)}>{name}</a>
      ),
      ...colSearch((r: any) => r.name || ""),
    },
    {
      title: t("trips.dates"),
      key: "dates",
      render: (_: any, record: any) =>
        `${dayjs(record.startDate).format("DD.MM.YYYY")} — ${dayjs(record.endDate).format("DD.MM.YYYY")}`,
      ...colSearch(
        (r: any) =>
          `${dayjs(r.startDate).format("DD.MM.YYYY")} ${dayjs(r.endDate).format("DD.MM.YYYY")}`,
      ),
    },
    {
      title: t("trips.status"),
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status]}>{t(`trips.status_${status}`)}</Tag>
      ),
      ...colEnum(
        [
          { text: t("trips.status_PLANNED"), value: "PLANNED" },
          { text: t("trips.status_ACTIVE"), value: "ACTIVE" },
          { text: t("trips.status_CLOSED"), value: "CLOSED" },
        ],
        (value: any, record: any) => record.status === value,
      ),
    },
    {
      title: t("trips.coordinator"),
      key: "coordinator",
      render: (_: any, record: any) =>
        record.coordinator
          ? `${record.coordinator.lastName} ${record.coordinator.firstName}`
          : "—",
      ...colSearch((r: any) =>
        r.coordinator
          ? `${r.coordinator.lastName} ${r.coordinator.firstName}`
          : "",
      ),
    },
    {
      title: t("trips.presentationsCount"),
      key: "presentations",
      render: (_: any, record: any) => record._count?.presentations ?? 0,
    },
    {
      title: t("trips.crewCount"),
      key: "crew",
      render: (_: any, record: any) => record._count?.crew ?? 0,
    },
    {
      title: t("trips.createdBy"),
      key: "createdBy",
      render: (_: any, record: any) =>
        record.createdBy
          ? `${record.createdBy.lastName} ${record.createdBy.firstName}`
          : "—",
      ...colSearch((r: any) =>
        r.createdBy ? `${r.createdBy.lastName} ${r.createdBy.firstName}` : "",
      ),
    },
    {
      title: t("users.actions"),
      key: "actions",
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title={t("trips.view")}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => navigate(`/trips/${record.id}`)}
            />
          </Tooltip>
          {canDelete && record._count?.presentations === 0 && (
            <Popconfirm
              title={t("trips.deleteConfirm")}
              onConfirm={() => handleDelete(record.id)}
              okText={t("users.yes")}
              cancelText={t("users.no")}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tripExpandedRowRender = (record: any) => {
    if (!record.crew?.length) {
      return (
        <Text type="secondary" style={{ paddingLeft: 8 }}>
          {t("trips.noCrew")}
        </Text>
      );
    }
    return (
      <Table
        scroll={{ x: "max-content" }}
        dataSource={record.crew}
        rowKey="id"
        size="small"
        pagination={false}
        style={{ margin: "4px 0" }}
        columns={[
          {
            title: t("users.fullName"),
            key: "name",
            render: (_: any, r: any) =>
              `${r.user.lastName} ${r.user.firstName}${r.user.middleName ? " " + r.user.middleName : ""}`,
          },
          {
            title: t("users.tradeCode"),
            key: "tradeCode",
            render: (_: any, r: any) => r.user.tradeCode || "—",
          },
          {
            title: t("trips.crewRole"),
            key: "role",
            render: (_: any, r: any) => (
              <Tag color={ROLE_COLORS[r.role]}>{t(`trips.role_${r.role}`)}</Tag>
            ),
          },
        ]}
      />
    );
  };

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
          <CarOutlined style={{ marginRight: 8 }} />
          {t("trips.title")}
        </Title>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size={isMobile ? "small" : "middle"}
            onClick={() => setCreateModalOpen(true)}
          >
            {!isMobile && t("trips.create")}
          </Button>
        )}
      </div>

      <Radio.Group
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: 16 }}
      >
        <Radio.Button value="active">{t("trips.filterActive")}</Radio.Button>
        <Radio.Button value="planned">{t("trips.filterPlanned")}</Radio.Button>
        {canAdmin && (
          <Radio.Button value="closed">{t("trips.filterClosed")}</Radio.Button>
        )}
        <Radio.Button value="all">{t("trips.filterAll")}</Radio.Button>
      </Radio.Group>

      <Table
        scroll={{ x: "max-content" }}
        dataSource={trips}
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
        expandable={{
          expandedRowRender: tripExpandedRowRender,
          rowExpandable: (record) => (record.crew?.length ?? 0) > 0,
        }}
      />

      <TripCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          setCreateModalOpen(false);
          loadTrips();
        }}
      />
    </div>
  );
}
