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
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { warehousesApi } from "../../api/warehouses";
import { usersApi } from "../../api/users";
import { useAnyPermission, usePermission } from "../../hooks/usePermission";

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
    if (canManage) loadUsers();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      await warehousesApi.create(values);
      message.success(t("common.success"));
      setCreateModalOpen(false);
      createForm.resetFields();
      setSelectedType("CENTRAL");
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
      render: (name: string, record: any) => (
        <a onClick={() => navigate(`/warehouses/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: t("warehouses.type"),
      dataIndex: "type",
      key: "type",
      width: 140,
      render: (v: string) => (
        <Tag color={TYPE_COLORS[v] || "default"}>
          {t(`warehouses.type_${v}`)}
        </Tag>
      ),
    },
    {
      title: t("warehouses.owner"),
      key: "owner",
      width: 180,
      render: (_: any, r: any) =>
        r.owner
          ? `${r.owner.lastName} ${r.owner.firstName}`
          : "—",
    },
    {
      title: t("warehouses.stock"),
      key: "stockCount",
      width: 120,
      render: (_: any, r: any) => r._count?.stock ?? 0,
    },
    {
      title: t("users.active"),
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (v: boolean) =>
        v ? (
          <Tag color="green">{t("users.yes")}</Tag>
        ) : (
          <Tag color="red">{t("users.no")}</Tag>
        ),
    },
  ];

  const tabItems = [
    { key: "all", label: t("common.all") },
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
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      <Table
        dataSource={filteredWarehouses}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        onRow={(record) => ({
          onClick: () => navigate(`/warehouses/${record.id}`),
          style: { cursor: "pointer" },
        })}
        pagination={{
          pageSize: 20,
          showSizeChanger: false,
          hideOnSinglePage: true,
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
            name="name"
            label={t("warehouses.name")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="type"
            label={t("warehouses.type")}
            initialValue="CENTRAL"
            rules={[{ required: true }]}
          >
            <Select
              onChange={setSelectedType}
              options={[
                { value: "CENTRAL", label: t("warehouses.type_CENTRAL") },
                { value: "PERSONAL", label: t("warehouses.type_PERSONAL") },
              ]}
            />
          </Form.Item>
          {selectedType === "PERSONAL" && (
            <Form.Item
              name="ownerId"
              label={t("warehouses.owner")}
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                filterOption={(input, opt) =>
                  (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={users.map((u) => ({
                  value: u.id,
                  label: `${u.lastName} ${u.firstName}`,
                }))}
                placeholder={t("warehouses.owner")}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
