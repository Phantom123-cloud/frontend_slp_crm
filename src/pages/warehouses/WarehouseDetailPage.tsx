import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Typography,
  Spin,
  message,
  Breadcrumb,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Descriptions,
} from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { warehousesApi } from "../../api/warehouses";
import { directoriesApi } from "../../api/directories";
import { usersApi } from "../../api/users";
import { useAnyPermission, usePermission } from "../../hooks/usePermission";
import TransactionCreateModal from "./components/TransactionCreateModal";
import TransactionsTable from "./components/TransactionsTable";

const { Title, Text } = Typography;

export default function WarehouseDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const canManage = useAnyPermission(["warehouses.manage", "trips.admin"]);
  const canTransaction = usePermission("warehouses.transaction");
  const canTransact = canManage || canTransaction;

  const [warehouse, setWarehouse] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();

  const loadAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [wRes, txRes, allWRes, prodRes, usersRes] = await Promise.all([
        warehousesApi.getById(id),
        warehousesApi.getTransactions(id),
        warehousesApi.list(),
        directoriesApi.getProducts(),
        usersApi.getAll({ limit: 1000 }),
      ]);
      setWarehouse(wRes.data);
      setTransactions(txRes.data);
      setWarehouses(allWRes.data);
      setProducts(prodRes.data);
      setUsers(usersRes.data.data || []);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (wh: any) => {
    editForm.setFieldsValue({
      name: wh.name,
      ownerId: wh.owner?.id,
    });
    setEditModalOpen(true);
  };

  const handleEdit = async (values: any) => {
    try {
      const payload: any = { ownerId: values.ownerId };
      // For PERSONAL, if only owner changed, backend auto-generates name.
      // If name was explicitly changed by user, send it.
      if (warehouse.type !== "PERSONAL" || values.name !== warehouse.name) {
        payload.name = values.name;
      }
      await warehousesApi.update(id!, payload);
      message.success(t("common.success"));
      setEditModalOpen(false);
      loadAll();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  if (loading) return <Spin style={{ margin: 40 }} />;
  if (!warehouse) return null;

  const stockColumns = [
    {
      title: t("warehouses.product"),
      dataIndex: ["product", "name"],
      key: "product",
    },
    {
      title: t("directories.unit"),
      dataIndex: ["product", "unit"],
      key: "unit",
      width: 80,
    },
    {
      title: t("warehouses.quantity"),
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      render: (v: any) => {
        const n = Number(v);
        return (
          <Text style={{ color: n < 0 ? "red" : undefined }}>{n}</Text>
        );
      },
    },
  ];

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate("/warehouses")}>{t("warehouses.title")}</a> },
          { title: warehouse.name },
        ]}
      />

      <Space style={{ marginBottom: 8 }} align="center">
        <Title level={3} style={{ margin: 0 }}>
          {warehouse.name}
        </Title>
        <Tag>{t(`warehouses.type_${warehouse.type}`)}</Tag>
        {!warehouse.isActive && <Tag color="red">{t("users.inactive")}</Tag>}
        {canManage && (
          <Button icon={<EditOutlined />} size="small" onClick={() => openEditModal(warehouse)}>
            {t("common.edit")}
          </Button>
        )}
      </Space>

      <Descriptions size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label={t("warehouses.owner")}>
          {warehouse.owner
            ? `${warehouse.owner.lastName} ${warehouse.owner.firstName}`
            : "—"}
        </Descriptions.Item>
      </Descriptions>

      <Card
        title={t("warehouses.stock")}
        style={{ marginBottom: 24 }}
        extra={
          canTransact && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setTxModalOpen(true)}
            >
              {t("warehouses.addTransaction")}
            </Button>
          )
        }
      >
        <Table
          dataSource={warehouse.stock}
          columns={stockColumns}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: t("warehouses.noStock") }}
        />
      </Card>

      <Card title={t("warehouses.transactions")}>
        <TransactionsTable
          transactions={transactions}
          warehouseId={id!}
          canTransact={canTransact}
          onRefresh={loadAll}
        />
      </Card>

      <TransactionCreateModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        onSuccess={loadAll}
        warehouseId={id!}
        warehouses={warehouses}
        products={products}
        stock={warehouse.stock}
      />

      <Modal
        title={t("warehouses.editWarehouse")}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => editForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
      >
        <Form form={editForm} onFinish={handleEdit} layout="vertical">
          {warehouse.type !== "PERSONAL" && (
            <Form.Item name="name" label={t("warehouses.name")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          )}
          <Form.Item
            name="ownerId"
            label={t("warehouses.owner")}
            rules={[{ required: true }]}
            extra={warehouse.type === "PERSONAL" ? t("warehouses.personalNameHint") : undefined}
          >
            <Select
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={users.map((u: any) => ({
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
