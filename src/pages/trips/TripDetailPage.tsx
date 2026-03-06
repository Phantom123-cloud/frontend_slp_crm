import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Tag,
  Button,
  Space,
  Table,
  Card,
  Descriptions,
  Popconfirm,
  message,
  Spin,
  Select,
  Modal,
  Tooltip,
  DatePicker,
  Tabs,
  Radio,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  TeamOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { tripsApi, presentationsApi } from "../../api/trips";
import { usePermission, useAnyPermission } from "../../hooks/usePermission";
import { useAuthStore } from "../../store/auth";
import { useTableFilters } from "../../utils/tableFilters";
import CrewModal from "./components/CrewModal";
import PresentationCreateModal from "./components/PresentationCreateModal";
import PresentationSummaryModal from "./components/PresentationSummaryModal";
import PresentationCrewModal from "./components/PresentationCrewModal";
import TripWarehouseTab from "./components/TripWarehouseTab";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "blue",
  ACTIVE: "green",
  CLOSED: "default",
};

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

const CREW_ROLE_COLORS: Record<string, string> = {
  LEADER: "purple",
  MV: "blue",
  GA: "cyan",
  MV_GA: "geekblue",
  TRADER: "orange",
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const canEdit = usePermission("trips.edit");
  const canDelete = usePermission("trips.delete");
  const canAdmin = usePermission("trips.admin");
  const canCreatePresentation = usePermission("presentations.create");
  const canEditPresentation = usePermission("presentations.edit");
  const canDeletePresentation = usePermission("presentations.delete");
  const canViewPresAll = usePermission("presentations.view-all");
  const canViewPresPerson = usePermission("presentations.view-person");
  const canViewPresentations = canViewPresAll || canViewPresPerson;
  const canViewTrips = usePermission("trips.view-person");
  const canViewWarehouses = useAnyPermission([
    "warehouses.view-all",
    "warehouses.view-person",
    "warehouses.manage",
  ]);

  const myId = useAuthStore((s) => s.user?.id);

  const { colSearch, colEnum } = useTableFilters();

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [crewModalOpen, setCrewModalOpen] = useState(false);
  const [presCreateOpen, setPresCreateOpen] = useState(false);
  const [coordinatorModalOpen, setCoordinatorModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>("");
  const [datesModalOpen, setDatesModalOpen] = useState(false);
  const [newDates, setNewDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null,
  );
  const [datesLoading, setDatesLoading] = useState(false);
  const [summaryPresId, setSummaryPresId] = useState<string | null>(null);
  const [crewPresId, setCrewPresId] = useState<string | null>(null);
  const [presTablePage, setPresTablePage] = useState(1);
  const [presStatusFilter, setPresStatusFilter] = useState("all");

  const loadTrip = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await tripsApi.getById(id);
      setTrip(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrip();
  }, [id]);

  const handleStatusChange = async (status: string) => {
    try {
      await tripsApi.updateStatus(id!, status);
      message.success(t("common.success"));
      loadTrip();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleDelete = async () => {
    try {
      await tripsApi.delete(id!);
      message.success(t("common.success"));
      navigate("/trips");
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleDeletePresentation = async (presId: string) => {
    try {
      await presentationsApi.delete(presId);
      message.success(t("common.success"));
      loadTrip();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const openCoordinatorModal = async () => {
    try {
      const { data } = await tripsApi.getAvailableUsers();
      setAvailableUsers(data);
      setSelectedCoordinator(trip?.coordinatorId || "");
      setCoordinatorModalOpen(true);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const openDatesModal = () => {
    setNewDates([dayjs(trip.startDate), dayjs(trip.endDate)]);
    setDatesModalOpen(true);
  };

  const handleDatesUpdate = async () => {
    if (!newDates || !newDates[0] || !newDates[1]) return;
    setDatesLoading(true);
    try {
      await tripsApi.update(id!, {
        startDate: newDates[0].format("YYYY-MM-DD"),
        endDate: newDates[1].format("YYYY-MM-DD"),
      });
      message.success(t("common.success"));
      setDatesModalOpen(false);
      loadTrip();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setDatesLoading(false);
    }
  };

  const handleCoordinatorSave = async () => {
    if (!selectedCoordinator) return;
    try {
      await tripsApi.updateCoordinator(id!, selectedCoordinator);
      message.success(t("common.success"));
      setCoordinatorModalOpen(false);
      loadTrip();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!trip) {
    return <Text>{t("errors.tripNotFound")}</Text>;
  }

  const isClosed = trip.status === "CLOSED";
  const canModify = canEdit && (!isClosed || canAdmin);
  const canModifyPresentations = !isClosed || canAdmin;

  // Роль текущего юзера в составе поездки
  const myTripCrewRole = (trip.crew || []).find(
    (c: any) => c.userId === myId,
  )?.role;
  const isGaInTrip = myTripCrewRole === "GA" || myTripCrewRole === "MV_GA";

  // Редактировать итоги: trips.admin (любые) или (view-презентации + роль GA/МВ_ГА)
  const canSaveItogi = canAdmin || (canViewPresentations && isGaInTrip);

  const filteredPresentations = (trip.presentations || []).filter((p: any) => {
    const eff = getEffectivePresStatus(p);
    if (presStatusFilter === "active") return eff === "ACTIVE";
    if (presStatusFilter === "planned") return eff === "PLANNED";
    if (presStatusFilter === "completed") return eff === "COMPLETED";
    if (presStatusFilter === "cancelled") return eff === "CANCELLED";
    return true;
  });

  const presExpandedRowRender = (record: any) => {
    if (!record.crew?.length) {
      return (
        <Text type="secondary" style={{ paddingLeft: 8 }}>
          {t("trips.noCrew")}
        </Text>
      );
    }
    return (
      <Table
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
              <Tag color={CREW_ROLE_COLORS[r.role]}>
                {t(`trips.role_${r.role}`)}
              </Tag>
            ),
          },
        ]}
      />
    );
  };

  const presColumns = [
    { title: "#", dataIndex: "number", key: "number", width: 50 },
    {
      title: t("trips.presentationName"),
      key: "name",
      ...colSearch((r: any) => r.name || ""),
      render: (_: any, r: any) => (
        <a onClick={() => navigate(`/presentations/${r.id}`)}>{r.name}</a>
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
          <Tag color={PRES_STATUS_COLORS[eff]}>
            {t(`trips.presStatus_${eff}`)}
          </Tag>
        );
      },
    },
    {
      title: t("trips.crewCount"),
      key: "crew",
      render: (_: any, r: any) => r.crew?.length ?? 0,
    },
    {
      title: t("trips.createdBy"),
      key: "createdBy",
      ...colSearch((r: any) =>
        r.createdBy ? `${r.createdBy.lastName} ${r.createdBy.firstName}` : "",
      ),
      render: (_: any, r: any) =>
        r.createdBy ? `${r.createdBy.lastName} ${r.createdBy.firstName}` : "—",
    },
    {
      title: t("users.actions"),
      key: "actions",
      width: 120,
      render: (_: any, r: any) => (
        <Space>
          {canEditPresentation && canModifyPresentations && (
            <Tooltip title={t("trips.enterCrew")}>
              <Button
                type="text"
                icon={<TeamOutlined />}
                size="small"
                onClick={() => setCrewPresId(r.id)}
              />
            </Tooltip>
          )}
          <Tooltip title={t("trips.summaryTitle")}>
            <Button
              type="text"
              icon={<BarChartOutlined />}
              size="small"
              onClick={() => setSummaryPresId(r.id)}
            />
          </Tooltip>
          {canDeletePresentation && canModifyPresentations && (
            <Popconfirm
              title={
                dayjs(r.date).isBefore(dayjs())
                  ? t("trips.cancelPresentationConfirm")
                  : t("trips.deletePresentationConfirm")
              }
              onConfirm={() => handleDeletePresentation(r.id)}
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

  const crewColumns = [
    {
      title: t("users.fullName"),
      key: "name",
      ...colSearch((r: any) => `${r.user.lastName} ${r.user.firstName}`),
      render: (_: any, r: any) => `${r.user.lastName} ${r.user.firstName}`,
    },
    {
      title: t("users.tradeCode"),
      key: "tradeCode",
      ...colSearch((r: any) => r.user.tradeCode || ""),
      render: (_: any, r: any) => r.user.tradeCode || "—",
    },
    {
      title: t("trips.crewRole"),
      key: "role",
      ...colEnum(
        [
          { text: t("trips.role_LEADER"), value: "LEADER" },
          { text: t("trips.role_MV"), value: "MV" },
          { text: t("trips.role_GA"), value: "GA" },
          { text: t("trips.role_MV_GA"), value: "MV_GA" },
          { text: t("trips.role_TRADER"), value: "TRADER" },
        ],
        (v, r: any) => r.role === v,
      ),
      render: (_: any, r: any) => t(`trips.role_${r.role}`),
    },
  ];

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/trips")}
        style={{ marginBottom: 16 }}
      >
        {t("trips.backToList")}
      </Button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Space>
          <Title level={3} style={{ margin: 0 }}>
            {trip.name}
          </Title>
          <Tag color={STATUS_COLORS[trip.status]}>
            {t(`trips.status_${trip.status}`)}
          </Tag>
        </Space>
        <Space wrap>
          {canAdmin && !isClosed && (
            <Popconfirm
              title={t("trips.closeConfirm")}
              onConfirm={() => handleStatusChange("CLOSED")}
            >
              <Button icon={<LockOutlined />}>{t("trips.closeTrip")}</Button>
            </Popconfirm>
          )}
          {canAdmin && isClosed && (
            <Popconfirm
              title={t("trips.openConfirm")}
              onConfirm={() => handleStatusChange("PLANNED")}
            >
              <Button icon={<UnlockOutlined />}>{t("trips.openTrip")}</Button>
            </Popconfirm>
          )}
          {canDelete && trip.presentations?.length === 0 && (
            <Popconfirm
              title={t("trips.deleteConfirm")}
              onConfirm={handleDelete}
            >
              <Button danger icon={<DeleteOutlined />}>
                {t("common.delete")}
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <Descriptions
        bordered
        size="small"
        column={{ xs: 1, sm: 2 }}
        style={{ marginBottom: 24 }}
      >
        <Descriptions.Item label={t("trips.teamName")}>
          {trip.teamName}
        </Descriptions.Item>
        <Descriptions.Item label={t("trips.dates")}>
          <Space>
            {dayjs(trip.startDate).format("DD.MM.YYYY")} —{" "}
            {dayjs(trip.endDate).format("DD.MM.YYYY")}
            {canModify && (
              <Tooltip title={t("trips.editDates")}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={openDatesModal}
                />
              </Tooltip>
            )}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={t("trips.coordinator")}>
          <Space>
            {trip.coordinator
              ? `${trip.coordinator.lastName} ${trip.coordinator.firstName}`
              : "—"}
            {canModify && (
              <Tooltip title={t("trips.changeCoordinator")}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={openCoordinatorModal}
                />
              </Tooltip>
            )}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={t("trips.createdBy")}>
          {trip.createdBy
            ? `${trip.createdBy.lastName} ${trip.createdBy.firstName}`
            : "—"}
        </Descriptions.Item>
      </Descriptions>

      {/* Crew */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            {t("trips.crew")}
          </Space>
        }
        extra={
          canModify && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => setCrewModalOpen(true)}
            >
              {t("trips.editCrew")}
            </Button>
          )
        }
        style={{ marginBottom: 24 }}
        size="small"
      >
        {trip.crew?.length > 0 ? (
          <Table
            dataSource={trip.crew}
            columns={crewColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        ) : (
          <Text type="secondary">{t("trips.noCrew")}</Text>
        )}
      </Card>

      {/* Tabs: Presentations / Warehouse / Wallet / Contracts */}
      <Card size="small" bodyStyle={{ padding: 0 }}>
        <Tabs
          defaultActiveKey="presentations"
          style={{ padding: "0 16px" }}
          items={[
            canViewPresentations && {
              key: "presentations",
              label: t("trips.presentations"),
              children: (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                      marginTop: 8,
                    }}
                  >
                    <Radio.Group
                      value={presStatusFilter}
                      onChange={(e) => {
                        setPresStatusFilter(e.target.value);
                        setPresTablePage(1);
                      }}
                    >
                    <Radio.Button value="all">
                      {t("trips.presFilter_all")}
                    </Radio.Button>
                    <Radio.Button value="active">
                      {t("trips.presFilter_active")}
                    </Radio.Button>
                    <Radio.Button value="planned">
                      {t("trips.presFilter_planned")}
                    </Radio.Button>
                    <Radio.Button value="completed">
                      {t("trips.presFilter_completed")}
                    </Radio.Button>
                    <Radio.Button value="cancelled">
                      {t("trips.presFilter_cancelled")}
                    </Radio.Button>
                  </Radio.Group>
                  {canCreatePresentation && canModifyPresentations && (
                    <Tooltip
                      title={
                        !trip.crew?.length
                          ? t("errors.tripNoCrewForPresentation")
                          : undefined
                      }
                    >
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="small"
                        disabled={!trip.crew?.length}
                        onClick={() => setPresCreateOpen(true)}
                      >
                        {t("trips.createPresentation")}
                      </Button>
                    </Tooltip>
                  )}
                  </div>
                  <Table
                    dataSource={filteredPresentations}
                    columns={presColumns}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: false,
                      current: presTablePage,
                    }}
                    onChange={(pg, filters) => {
                      const hasFilter = Object.values(filters).some(
                        (f) => f && f.length > 0,
                      );
                      setPresTablePage(hasFilter ? 1 : (pg.current ?? 1));
                    }}
                    size="small"
                    expandable={{
                      expandedRowRender: presExpandedRowRender,
                      rowExpandable: () => true,
                    }}
                  />
                </div>
              ),
            },
            (canViewWarehouses ||
              canAdmin ||
              (canViewTrips &&
                (myTripCrewRole === "MV" || myTripCrewRole === "MV_GA"))) && {
              key: "warehouse",
              label: t("trips.warehouse"),
              children: trip.warehouse ? (
                <TripWarehouseTab
                  warehouseId={trip.warehouse.id}
                  canTransact={
                    canAdmin ||
                    (canViewTrips &&
                      (myTripCrewRole === "MV" || myTripCrewRole === "MV_GA"))
                  }
                />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#999",
                  }}
                >
                  {t("trips.tabPlaceholder")}
                </div>
              ),
            },
            {
              key: "wallet",
              label: t("trips.wallet"),
              children: (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#999",
                  }}
                >
                  {t("trips.tabPlaceholder")}
                </div>
              ),
            },
            {
              key: "contracts",
              label: t("trips.contracts"),
              children: (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#999",
                  }}
                >
                  {t("trips.tabPlaceholder")}
                </div>
              ),
            },
          ].filter(Boolean) as any[]}
        />
      </Card>

      {/* Crew modal */}
      <CrewModal
        open={crewModalOpen}
        tripId={id!}
        currentCrew={trip.crew || []}
        onClose={() => setCrewModalOpen(false)}
        onSaved={() => {
          setCrewModalOpen(false);
          loadTrip();
        }}
      />

      {/* Presentation create modal */}
      <PresentationCreateModal
        open={presCreateOpen}
        tripId={id!}
        trip={trip}
        onClose={() => setPresCreateOpen(false)}
        onCreated={() => {
          setPresCreateOpen(false);
          loadTrip();
        }}
      />

      {/* Presentation crew modal */}
      {crewPresId && (
        <PresentationCrewModal
          open={!!crewPresId}
          presentationId={crewPresId}
          currentCrew={
            trip.presentations?.find((p: any) => p.id === crewPresId)?.crew ||
            []
          }
          coordinator={
            trip.presentations?.find((p: any) => p.id === crewPresId)
              ?.coordinator || trip.coordinator
          }
          onClose={() => setCrewPresId(null)}
          onSaved={() => {
            setCrewPresId(null);
            loadTrip();
          }}
        />
      )}

      {/* Presentation summary modal */}
      {summaryPresId && (
        <PresentationSummaryModal
          open={!!summaryPresId}
          presentationId={summaryPresId}
          canSave={canSaveItogi}
          onClose={() => setSummaryPresId(null)}
        />
      )}

      {/* Dates edit modal */}
      <Modal
        title={t("trips.editDates")}
        open={datesModalOpen}
        onCancel={() => setDatesModalOpen(false)}
        onOk={handleDatesUpdate}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        confirmLoading={datesLoading}
      >
        <DatePicker.RangePicker
          value={newDates}
          onChange={(dates) =>
            setNewDates(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)
          }
          format="DD.MM.YYYY"
          style={{ width: "100%" }}
        />
      </Modal>

      {/* Coordinator change modal */}
      <Modal
        title={t("trips.changeCoordinator")}
        open={coordinatorModalOpen}
        onCancel={() => setCoordinatorModalOpen(false)}
        onOk={handleCoordinatorSave}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
      >
        <Select
          value={selectedCoordinator || undefined}
          onChange={setSelectedCoordinator}
          style={{ width: "100%" }}
          showSearch
          optionFilterProp="label"
          placeholder={t("trips.selectCoordinator")}
          options={availableUsers
            .filter((u) => u.isCoordinator)
            .map((u) => ({
              value: u.id,
              label: `${u.lastName} ${u.firstName}${u.tradeCode ? " (" + u.tradeCode + ")" : ""}`,
            }))}
        />
      </Modal>
    </div>
  );
}
