import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
  Tabs,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  StopOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { warehousesApi } from "../../api/warehouses";
import { usersApi } from "../../api/users";
import { useAnyPermission, usePermission } from "../../hooks/usePermission";
import { useTableFilters } from "../../utils/tableFilters";

const { Title } = Typography;

const TYPE_COLORS: Record<string, string> = {
  CENTRAL: "blue",
  PERSONAL: "purple",
  TRIP: "green",
};

export default function WarehousesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const canCreate = useAnyPermission(["warehouses.create", "warehouses.manage"]);
  const canManage = usePermission("warehouses.manage");

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [selectedType, setSelectedType] = useState<string>("CENTRAL");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const { colSearch, colEnum } = useTableFilters();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await warehousesApi.list();
      setWarehouses(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await usersApi.getAll({ limit: 1000 });
      setUsers(data.data || []);
    } catch {}
  };

  useEffect(() => {
    load();
    if (canCreate) loadUsers();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      const payload: any = { type: values.type, ownerId: values.ownerId };
      if (values.type === "CENTRAL") payload.name = values.name;
      await warehousesApi.create(payload);
      message.success(t("common.success"));
      setCreateModalOpen(false);
      createForm.resetFields();
      setSelectedType("CENTRAL");
      load();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await warehousesApi.deactivate(id);
      message.success(t("common.success"));
      load();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await warehousesApi.reactivate(id);
      message.success(t("common.success"));
      load();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await warehousesApi.delete(id);
      message.success(t("common.success"));
      load();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const filteredWarehouses =
    activeTab === "all"
      ? warehouses
      : warehouses.filter((w) => w.type === activeTab.toUpperCase());

  const columns = [
    {
      title: t("warehouses.name"),
      dataIndex: "name",
      key: "name",
      ...colSearch((r: any) => r.name ?? ""),
      render: (name: string, record: any) => (
        <Space>
          <a onClick={() => navigate(`/warehouses/${record.id}`)}>{name}</a>
          {!record.isActive && (
            <Tag color="red" style={{ fontSize: 11 }}>
              {t("warehouses.blocked")}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: t("warehouses.type"),
      dataIndex: "type",
      key: "type",
      width: 140,
      ...colEnum(
        ["TRIP", "CENTRAL", "PERSONAL"].map((type) => ({
          text: t(`warehouses.type_${type}`),
          value: type,
        })),
        (v, r: any) => r.type === v,
      ),
      render: (v: string) => (
        <Tag color={TYPE_COLORS[v] || "default"}>
          {t(`warehouses.type_${v}`)}
        </Tag>
      ),
    },
    {
      title: t("warehouses.owner"),
      key: "owner",
      width: 200,
      ...colSearch((r: any) =>
        r.owner ? `${r.owner.lastName} ${r.owner.firstName}` : "",
      ),
      render: (_: any, r: any) =>
        r.owner ? `${r.owner.lastName} ${r.owner.firstName}` : "—",
    },
    {
      title: t("warehouses.stock"),
      key: "stockCount",
      width: 100,
      render: (_: any, r: any) => r._count?.stock ?? 0,
    },
    ...(canManage
      ? [
          {
            title: t("users.actions"),
            key: "actions",
            width: 120,
            render: (_: any, record: any) => {
              const hasTransactions =
                (record._count?.outgoing ?? 0) +
                  (record._count?.incoming ?? 0) >
                0;
              const isTrip = record.type === "TRIP";

              return (
                <Space onClick={(e) => e.stopPropagation()}>
                  {/* Reactivate if blocked */}
                  {!record.isActive && (
                    <Popconfirm
                      title={t("warehouses.reactivate") + "?"}
                      onConfirm={() => handleReactivate(record.id)}
                      okText={t("common.yes")}
                      cancelText={t("common.cancel")}
                    >
                      <Tooltip title={t("warehouses.reactivate")}>
                        <Button
                          type="text"
                          icon={<CheckCircleOutlined />}
                          size="small"
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
                  {/* Deactivate: only if active and not TRIP */}
                  {record.isActive && !isTrip && (
                    <Popconfirm
                      title={t("warehouses.deactivateConfirm")}
                      onConfirm={() => handleDeactivate(record.id)}
                      okText={t("common.yes")}
                      cancelText={t("common.cancel")}
                    >
                      <Tooltip title={t("warehouses.deactivate")}>
                        <Button
                          type="text"
                          icon={<StopOutlined />}
                          size="small"
                          danger
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
                  {/* Delete: only if never had transactions and not TRIP */}
                  {!hasTransactions && !isTrip && (
                    <Popconfirm
                      title={t("warehouses.deleteConfirmPermanent")}
                      onConfirm={() => handleDelete(record.id)}
                      okText={t("common.yes")}
                      cancelText={t("common.cancel")}
                    >
                      <Tooltip title={t("common.delete")}>
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          size="small"
                          danger
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
                </Space>
              );
            },
          },
        ]
      : []),
  ];

  const tabItems = [
    { key: "all", label: t("common.all") },
    { key: "trip", label: t("warehouses.type_TRIP") },
    { key: "central", label: t("warehouses.type_CENTRAL") },
    { key: "personal", label: t("warehouses.type_PERSONAL") },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} align="center">
        <Title level={3} style={{ margin: 0 }}>
          {t("warehouses.title")}
        </Title>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            {t("warehouses.create")}
          </Button>
        )}
      </Space>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setPage(1);
        }}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      <Table
        scroll={{ x: "max-content" }}
        dataSource={filteredWarehouses}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        onRow={(record) => ({
          onClick: () => navigate(`/warehouses/${record.id}`),
          style: { cursor: "pointer" },
        })}
        onChange={(pg, filters) => {
          const hasFilter = Object.values(filters).some(
            (f) => f && (f as any[]).length > 0,
          );
          setPage(hasFilter ? 1 : (pg.current ?? 1));
        }}
        pagination={{
          pageSize: 20,
          showSizeChanger: false,
          current: page,
        }}
      />

      <Modal
        title={t("warehouses.create")}
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
          setSelectedType("CENTRAL");
        }}
        onOk={() => createForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
      >
        <Form form={createForm} onFinish={handleCreate} layout="vertical">
          <Form.Item
            name="type"
            label={t("warehouses.type")}
            initialValue="CENTRAL"
            rules={[{ required: true }]}
          >
            <Select
              onChange={(v) => {
                setSelectedType(v);
                createForm.resetFields(["name", "ownerId"]);
              }}
              options={[
                { value: "CENTRAL", label: t("warehouses.type_CENTRAL") },
                { value: "PERSONAL", label: t("warehouses.type_PERSONAL") },
              ]}
            />
          </Form.Item>
          {selectedType === "CENTRAL" && (
            <Form.Item
              name="name"
              label={t("warehouses.nameSuffix")}
              rules={[{ required: true }]}
              extra={t("warehouses.centralNameHint")}
            >
              <Input addonBefore="Центральный склад" />
            </Form.Item>
          )}
          <Form.Item
            name="ownerId"
            label={t("warehouses.owner")}
            rules={[{ required: true }]}
            extra={
              selectedType === "PERSONAL"
                ? t("warehouses.personalNameHint")
                : undefined
            }
          >
            <Select
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string)
                  ?.toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={users.map((u) => ({
                value: u.id,
                label: `${u.lastName} ${u.firstName}`,
              }))}
              placeholder={t("warehouses.owner")}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
