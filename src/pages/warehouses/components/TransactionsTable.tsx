import { Table, Tag, Button, Popconfirm, Space, Collapse } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import { useTranslation } from "react-i18next";
import { warehousesApi } from "../../../api/warehouses";
import { message } from "antd";

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

const STATUS_COLORS: Record<string, string> = {
  PENDING: "gold",
  COMPLETED: "green",
  CANCELLED: "default",
};

interface Props {
  transactions: any[];
  warehouseId: string;
  canTransact: boolean;
  onRefresh: () => void;
  pagination?: boolean;
}

export default function TransactionsTable({
  transactions,
  warehouseId,
  canTransact,
  onRefresh,
  pagination = true,
}: Props) {
  const { t } = useTranslation();

  const handleAccept = async (txId: string) => {
    try {
      await warehousesApi.acceptTransfer(txId);
      message.success(t("warehouses.transferAccepted"));
      onRefresh();
    } catch (e: any) {
      message.error(t(e?.response?.data?.message || "common.error"));
    }
  };

  const handleCancel = async (txId: string) => {
    try {
      await warehousesApi.cancelTransfer(txId);
      message.success(t("warehouses.transferCancelled"));
      onRefresh();
    } catch (e: any) {
      message.error(t(e?.response?.data?.message || "common.error"));
    }
  };

  const columns = [
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
      width: 180,
      render: (v: string, record: any) => (
        <Space direction="vertical" size={2}>
          <Tag color={TX_TYPE_COLORS[v] || "default"}>
            {t(`warehouses.transType_${v}`)}
          </Tag>
          {v === "TRANSFER_OUT" && record.transferStatus && (
            <Tag color={STATUS_COLORS[record.transferStatus] || "default"} style={{ fontSize: 11 }}>
              {t(`warehouses.transferStatus_${record.transferStatus}`)}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: t("warehouses.counterpart"),
      key: "counterpart",
      width: 160,
      render: (_: any, record: any) => {
        if (record.type === "TRANSFER_OUT") {
          return record.toWarehouse
            ? <Text type="secondary">{`→ ${record.toWarehouse.name}`}</Text>
            : null;
        }
        if (record.type === "TRANSFER_IN") {
          return record.fromWarehouse
            ? <Text type="secondary">{`← ${record.fromWarehouse.name}`}</Text>
            : null;
        }
        return null;
      },
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
      width: 160,
      render: (_: any, r: any) =>
        r.createdBy ? `${r.createdBy.lastName} ${r.createdBy.firstName}` : "—",
    },
    ...(canTransact
      ? [
          {
            title: "",
            key: "actions",
            width: 120,
            render: (_: any, record: any) => {
              if (
                record.type !== "TRANSFER_OUT" ||
                record.transferStatus !== "PENDING"
              )
                return null;

              const isReceiver = record.toWarehouseId === warehouseId;
              const isSender = record.fromWarehouseId === warehouseId;

              return (
                <Space>
                  {isReceiver && (
                    <Popconfirm
                      title={t("warehouses.acceptConfirm")}
                      onConfirm={() => handleAccept(record.id)}
                      okText={t("common.yes")}
                      cancelText={t("common.cancel")}
                    >
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                      >
                        {t("warehouses.acceptTransfer")}
                      </Button>
                    </Popconfirm>
                  )}
                  {isSender && (
                    <Popconfirm
                      title={t("warehouses.cancelConfirm")}
                      onConfirm={() => handleCancel(record.id)}
                      okText={t("common.yes")}
                      cancelText={t("common.cancel")}
                    >
                      <Button danger size="small" icon={<CloseOutlined />}>
                        {t("warehouses.cancelTransfer")}
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <Table
      dataSource={transactions}
      columns={columns}
      rowKey="id"
      size="small"
      rowClassName={(record) =>
        record.type === "TRANSFER_OUT" && record.transferStatus === "PENDING"
          ? "ant-table-row-pending"
          : ""
      }
      pagination={
        pagination
          ? { pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }
          : false
      }
    />
  );
}
