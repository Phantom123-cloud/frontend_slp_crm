import { useState, useEffect } from "react";
import {
  Table,
  Card,
  Button,
  Typography,
  message,
  Spin,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { warehousesApi } from "../../../api/warehouses";
import { directoriesApi } from "../../../api/directories";
import TransactionCreateModal from "../../warehouses/components/TransactionCreateModal";
import TransactionsTable from "../../warehouses/components/TransactionsTable";

const { Text } = Typography;

interface Props {
  warehouseId: string;
  canTransact: boolean;
  // Право редактировать примечание транзакций (warehouses.edit)
  canEdit?: boolean;
}

export default function TripWarehouseTab({ warehouseId, canTransact, canEdit = false }: Props) {
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
        scroll={{ x: "max-content" }}
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
          warehouseId={warehouseId}
          canTransact={canTransact}
          canEdit={canEdit}
          onRefresh={loadAll}
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
