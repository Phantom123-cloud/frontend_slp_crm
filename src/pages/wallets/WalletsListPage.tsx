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
  WalletOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { walletsApi } from "../../api/wallets";
import { usersApi } from "../../api/users";
import { useAnyPermission, usePermission } from "../../hooks/usePermission";
import { useTableFilters } from "../../utils/tableFilters";

const { Title } = Typography;

const TYPE_COLORS: Record<string, string> = {
  PERSONAL: "purple",
  TRIP: "green",
};

export default function WalletsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const canCreate = useAnyPermission(["wallets.create", "wallets.manage"]);
  const canManage = usePermission("wallets.manage");

  const [wallets, setWallets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const { colSearch, colEnum } = useTableFilters();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await walletsApi.list();
      setWallets(data);
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
      await walletsApi.create(values);
      message.success(t("common.success"));
      setCreateModalOpen(false);
      createForm.resetFields();
      load();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleBlock = async (id: string) => {
    try {
      await walletsApi.block(id);
      message.success(t("common.success"));
      load();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      await walletsApi.unblock(id);
      message.success(t("common.success"));
      load();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await walletsApi.delete(id);
      message.success(t("common.success"));
      load();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  // Фильтруем по вкладке
  const filtered = wallets.filter((w) => {
    if (activeTab === "all") return true;
    return w.type === activeTab;
  });

  const columns = [
    {
      title: t("wallets.name"),
      dataIndex: "name",
      key: "name",
      ...colSearch("name"),
      render: (name: string, record: any) => (
        <a onClick={() => navigate(`/wallets/${record.id}`)}>
          {name ||
            (record.trip
              ? `${t("wallets.tripWallet")}: ${record.trip.name}`
              : `${t("wallets.wallet")} #${record.id.slice(-6)}`)}
        </a>
      ),
    },
    {
      title: t("wallets.type"),
      dataIndex: "type",
      key: "type",
      ...colEnum("type", [
        { text: t("wallets.personal"), value: "PERSONAL" },
        { text: t("wallets.trip"), value: "TRIP" },
      ]),
      render: (type: string) => (
        <Tag color={TYPE_COLORS[type] || "default"}>
          {t(`wallets.${type.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t("wallets.owner"),
      key: "owner",
      render: (_: any, record: any) => {
        if (record.owner) {
          return `${record.owner.lastName} ${record.owner.firstName}`;
        }
        if (record.trip) {
          return record.trip.name;
        }
        return "—";
      },
    },
    {
      title: t("wallets.balances"),
      key: "balances",
      render: (_: any, record: any) => {
        if (!record.balances || record.balances.length === 0) {
          return <span style={{ color: "#999" }}>—</span>;
        }
        return (
          <Space size={4} wrap>
            {record.balances.map((b: any) => (
              <Tag key={b.currency} color={Number(b.amount) < 0 ? "red" : "blue"}>
                {Number(b.amount).toLocaleString()} {b.currency}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: t("wallets.status"),
      key: "isBlocked",
      ...colEnum("isBlocked", [
        { text: t("wallets.active"), value: false },
        { text: t("wallets.blocked"), value: true },
      ]),
      render: (_: any, record: any) =>
        record.isBlocked ? (
          <Tag color="red">{t("wallets.blocked")}</Tag>
        ) : (
          <Tag color="green">{t("wallets.active")}</Tag>
        ),
    },
    ...(canManage
      ? [
          {
            title: t("common.actions"),
            key: "actions",
            render: (_: any, record: any) => (
              <Space>
                {record.type === "PERSONAL" && !record.isBlocked && (
                  <Popconfirm
                    title={t("wallets.confirmBlock")}
                    onConfirm={() => handleBlock(record.id)}
                    okText={t("common.yes")}
                    cancelText={t("common.no")}
                  >
                    <Tooltip title={t("wallets.block")}>
                      <Button icon={<StopOutlined />} size="small" danger />
                    </Tooltip>
                  </Popconfirm>
                )}
                {record.isBlocked && (
                  <Tooltip title={t("wallets.unblock")}>
                    <Button
                      icon={<CheckCircleOutlined />}
                      size="small"
                      onClick={() => handleUnblock(record.id)}
                    />
                  </Tooltip>
                )}
                {record.type === "PERSONAL" && (record._count?.transactions ?? 0) === 0 && (
                  <Popconfirm
                    title={t("wallets.confirmDelete")}
                    onConfirm={() => handleDelete(record.id)}
                    okText={t("common.yes")}
                    cancelText={t("common.no")}
                  >
                    <Tooltip title={t("common.delete")}>
                      <Button icon={<DeleteOutlined />} size="small" danger />
                    </Tooltip>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]
      : []),
  ];

  const tabItems = [
    { key: "all", label: t("wallets.all") },
    { key: "PERSONAL", label: t("wallets.personal") },
    { key: "TRIP", label: t("wallets.trip") },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          <WalletOutlined style={{ marginRight: 8 }} />
          {t("wallets.title")}
        </Title>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            {t("wallets.create")}
          </Button>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setPage(1);
        }}
        items={tabItems}
        style={{ marginBottom: 0 }}
      />

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total) => t("common.totalItems", { count: total }),
        }}
        style={{ marginTop: 8 }}
      />

      {/* Модалка создания */}
      <Modal
        open={createModalOpen}
        title={t("wallets.createTitle")}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        okText={t("common.create")}
        cancelText={t("common.cancel")}
      >
        <Form form={createForm} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label={t("wallets.name")}>
            <Input placeholder={t("wallets.namePlaceholder")} />
          </Form.Item>
          <Form.Item name="ownerId" label={t("wallets.responsible")}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={t("wallets.responsiblePlaceholder")}
              allowClear
              options={users.map((u) => ({
                label: `${u.lastName} ${u.firstName}`,
                value: u.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
