import { useState } from "react";
import {
  Table,
  Tag,
  Button,
  Popconfirm,
  Space,
  Collapse,
  Modal,
  Input,
  Select,
  Form,
} from "antd";
import { CheckOutlined, CloseOutlined, EditOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import { useTranslation } from "react-i18next";
import { warehousesApi } from "../../../api/warehouses";
import { message } from "antd";
import { useTableFilters } from "../../../utils/tableFilters";
import dayjs from "dayjs";

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

const TX_TYPES = [
  "INCOMING",
  "SALE",
  "GIFT",
  "CONTRACT",
  "WRITE_OFF",
  "TRANSFER_OUT",
  "TRANSFER_IN",
];

interface Props {
  transactions: any[];
  warehouseId: string;
  canTransact: boolean;
  // Право редактировать примечание (warehouses.edit) — помимо canTransact (manage/transaction тоже могут)
  canEdit?: boolean;
  onRefresh: () => void;
  pagination?: boolean;
}

export default function TransactionsTable({
  transactions,
  warehouseId,
  canTransact,
  canEdit = false,
  onRefresh,
  pagination = true,
}: Props) {
  const { t } = useTranslation();
  const { colSearch, colEnum } = useTableFilters();
  const [page, setPage] = useState(1);

  // Состояние модалки редактирования примечания
  const [editTx, setEditTx] = useState<any>(null);
  const [editNoteOpen, setEditNoteOpen] = useState(false);
  const [editNoteLoading, setEditNoteLoading] = useState(false);
  const [noteForm] = Form.useForm();

  // Может редактировать примечание: manage/transaction (canTransact) или warehouses.edit (canEdit)
  const canEditNote = canTransact || canEdit;

  const openNoteEdit = (record: any) => {
    setEditTx(record);
    noteForm.setFieldsValue({ note: record.note || "", source: record.source || undefined });
    setEditNoteOpen(true);
  };

  const handleNoteSubmit = async (values: { note: string; source?: string }) => {
    if (!editTx) return;
    setEditNoteLoading(true);
    try {
      await warehousesApi.updateTransaction(editTx.id, {
        note: values.note || undefined,
        source: editTx.type === "INCOMING" ? (values.source || undefined) : undefined,
      });
      message.success(t("warehouses.noteEdited"));
      setEditNoteOpen(false);
      setEditTx(null);
      onRefresh();
    } catch (e: any) {
      message.error(t(e?.response?.data?.message || "common.error"));
    } finally {
      setEditNoteLoading(false);
    }
  };

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
      ...colSearch((r: any) =>
        dayjs(r.createdAt).format("DD.MM.YYYY HH:mm"),
      ),
      render: (v: string) => dayjs(v).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: t("common.type"),
      dataIndex: "type",
      key: "type",
      width: 190,
      ...colEnum(
        TX_TYPES.map((type) => ({
          text: t(`warehouses.transType_${type}`),
          value: type,
        })),
        (v, r: any) => r.type === v,
      ),
      render: (v: string, record: any) => (
        <Space direction="vertical" size={2}>
          <Tag color={TX_TYPE_COLORS[v] || "default"}>
            {t(`warehouses.transType_${v}`)}
          </Tag>
          {v === "TRANSFER_OUT" && record.transferStatus && (
            <Tag
              color={STATUS_COLORS[record.transferStatus] || "default"}
              style={{ fontSize: 11 }}
            >
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
      ...colSearch((r: any) => {
        if (r.type === "TRANSFER_OUT") return r.toWarehouse?.name ?? "";
        if (r.type === "TRANSFER_IN") return r.fromWarehouse?.name ?? "";
        return "";
      }),
      render: (_: any, record: any) => {
        if (record.type === "TRANSFER_OUT") {
          return record.toWarehouse ? (
            <Text type="secondary">{`→ ${record.toWarehouse.name}`}</Text>
          ) : null;
        }
        if (record.type === "TRANSFER_IN") {
          return record.fromWarehouse ? (
            <Text type="secondary">{`← ${record.fromWarehouse.name}`}</Text>
          ) : null;
        }
        return null;
      },
    },
    {
      title: t("warehouses.source"),
      key: "source",
      width: 120,
      ...colEnum(
        [
          { text: t("warehouses.source_SUPPLIER"), value: "SUPPLIER" },
          { text: t("warehouses.source_SPV"), value: "SPV" },
        ],
        (v, r: any) => r.source === v,
      ),
      render: (_: any, record: any) =>
        record.type === "INCOMING" && record.source
          ? <Tag>{t(`warehouses.source_${record.source}`)}</Tag>
          : null,
    },
    {
      title: t("warehouses.product"),
      key: "items",
      ...colSearch((r: any) =>
        (r.items || []).map((i: any) => i.product?.name ?? "").join(" "),
      ),
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
                  {item.product.name} — {Number(item.quantity)}{" "}
                  {item.product.unit}
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
      ...colSearch((r: any) => r.note ?? ""),
      render: (v: any, record: any) => (
        <Space size={4}>
          <span>{v || "—"}</span>
          {canEditNote && (
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => openNoteEdit(record)}
            />
          )}
        </Space>
      ),
    },
    {
      title: t("users.name"),
      key: "createdBy",
      width: 160,
      ...colSearch(
        (r: any) =>
          r.createdBy
            ? `${r.createdBy.lastName} ${r.createdBy.firstName}`
            : "",
      ),
      render: (_: any, r: any) =>
        r.createdBy
          ? `${r.createdBy.lastName} ${r.createdBy.firstName}`
          : "—",
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
    <>
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
        onChange={(pg, filters) => {
          const hasFilter = Object.values(filters).some(
            (f) => f && (f as any[]).length > 0,
          );
          setPage(hasFilter ? 1 : (pg.current ?? 1));
        }}
        pagination={
          pagination
            ? {
                pageSize: 20,
                showSizeChanger: false,
                current: page,
              }
            : false
        }
      />

      {/* Модалка редактирования примечания транзакции */}
      <Modal
        title={t("warehouses.editNote")}
        open={editNoteOpen}
        onCancel={() => {
          setEditNoteOpen(false);
          setEditTx(null);
        }}
        onOk={() => noteForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        confirmLoading={editNoteLoading}
        destroyOnClose
      >
        <Form form={noteForm} onFinish={handleNoteSubmit} layout="vertical">
          {editTx?.type === "INCOMING" && (
            <Form.Item name="source" label={t("warehouses.source")} rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "SUPPLIER", label: t("warehouses.source_SUPPLIER") },
                  { value: "SPV", label: t("warehouses.source_SPV") },
                ]}
                placeholder={t("warehouses.source")}
              />
            </Form.Item>
          )}
          <Form.Item name="note" label={t("warehouses.note")}>
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
