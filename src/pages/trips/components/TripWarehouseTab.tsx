import { useState, useEffect } from "react";
import {
  Table,
  Card,
  Button,
  Tag,
  Typography,
  message,
  Spin,
  Collapse,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { warehousesApi } from "../../../api/warehouses";
import { directoriesApi } from "../../../api/directories";
import TransactionCreateModal from "../../warehouses/components/TransactionCreateModal";

const { Text } = Typography;

const TX_TYPE_COLORS: Record<string, string> = {
  INCOMING: "green",
  SALE: "blue",
  GIFT: "purple",
  CONTRACT: "cyan",
  WRITE_OFF: "orange",
  TRANSFER_OUT: "volcano",
  TRANSFER_IN: "geekblue",
};

interface Props {
  warehouseId: string;
  canTransact: boolean;
}

export default function TripWarehouseTab({ warehouseId, canTransact }: Props) {
  const { t } = useTranslation();

  const [warehouse, setWarehouse] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txModalOpen, setTxModalOpen] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [wRes, txRes, prodRes] = await Promise.all([
        warehousesApi.getById(warehouseId),
        warehousesApi.getTransactions(warehouseId),
        directoriesApi.getProducts(),
      ]);
      setWarehouse(wRes.data);
      setTransactions(txRes.data);
      setProducts(prodRes.data);

      if (canTransact) {
        const allWRes = await warehousesApi.list();
        setWarehouses(allWRes.data);
      }
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [warehouseId]);

  if (loading) return <Spin style={{ margin: 24 }} />;
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
        return <Text style={{ color: n < 0 ? "red" : undefined }}>{n}</Text>;
      },
    },
  ];

  const txColumns = [
    {
      title: t("common.date"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (v: string) => new Date(v).toLocaleString("ru"),
    },
    {
      title: t("common.type"),
      dataIndex: "type",
      key: "type",
      width: 160,
      render: (v: string) => (
        <Tag color={TX_TYPE_COLORS[v] || "default"}>
          {t(`warehouses.transType_${v}`)}
        </Tag>
      ),
    },
    {
      title: t("warehouses.product"),
      key: "items",
      render: (_: any, record: any) => (
        <Collapse
          ghost
          size="small"
          items={[
            {
              key: "1",
              label: `${record.items.length} ${t("warehouses.product")}`,
              children: record.items.map((item: any) => (
                <div key={item.id}>
                  {item.product.name} — {Number(item.quantity)} {item.product.unit}
                </div>
              )),
            },
          ]}
        />
      ),
    },
    {
      title: t("warehouses.note"),
      dataIndex: "note",
      key: "note",
      render: (v: any) => v || "—",
    },
    {
      title: t("users.name"),
      key: "createdBy",
      render: (_: any, r: any) =>
        r.createdBy
          ? `${r.createdBy.lastName} ${r.createdBy.firstName}`
          : "—",
    },
  ];

  return (
    <div>
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
        <Table
          dataSource={transactions}
          columns={txColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
        />
      </Card>

      <TransactionCreateModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        onSuccess={loadAll}
        warehouseId={warehouseId}
        warehouses={warehouses}
        products={products}
        stock={warehouse.stock}
      />
    </div>
  );
}
