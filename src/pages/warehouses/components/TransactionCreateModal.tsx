import { useState } from "react";
import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  Space,
  InputNumber,
  Alert,
  message,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { warehousesApi } from "../../../api/warehouses";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouseId: string;
  warehouses: any[];
  products: any[];
  stock: any[];
}

const TX_TYPES = [
  { value: "INCOMING", labelKey: "warehouses.transType_INCOMING" },
  { value: "SALE", labelKey: "warehouses.transType_SALE" },
  { value: "GIFT", labelKey: "warehouses.transType_GIFT" },
  { value: "CONTRACT", labelKey: "warehouses.transType_CONTRACT" },
  { value: "WRITE_OFF", labelKey: "warehouses.transType_WRITE_OFF" },
  { value: "TRANSFER", labelKey: "warehouses.transType_TRANSFER_OUT" },
];

export default function TransactionCreateModal({
  open,
  onClose,
  onSuccess,
  warehouseId,
  warehouses,
  products,
  stock,
}: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [txType, setTxType] = useState<string>("INCOMING");
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>(
    [{ productId: "", quantity: 1 }],
  );

  const isIncoming = txType === "INCOMING";

  const getNegativeWarning = () => {
    if (isIncoming) return false;
    return items.some(({ productId, quantity }) => {
      const s = stock.find((s: any) => s.productId === productId);
      const current = s ? Number(s.quantity) : 0;
      return current - quantity < 0;
    });
  };

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1 }]);
  };

  const handleRemoveItem = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i));
  };

  const handleItemChange = (i: number, field: string, value: any) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const validItems = items.filter((it) => it.productId && it.quantity > 0);
      if (validItems.length === 0) {
        message.error(t("warehouses.addItem"));
        return;
      }
      setLoading(true);
      await warehousesApi.createTransaction(warehouseId, {
        type: txType,
        items: validItems,
        toWarehouseId: txType === "TRANSFER" ? values.toWarehouseId : undefined,
        note: values.note,
      });
      message.success(t("common.success"));
      form.resetFields();
      setItems([{ productId: "", quantity: 1 }]);
      setTxType("INCOMING");
      onSuccess();
      onClose();
    } catch (e: any) {
      if (!e?.errorFields) {
        message.error(t(e?.response?.data?.message || "common.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setItems([{ productId: "", quantity: 1 }]);
    setTxType("INCOMING");
    onClose();
  };

  const otherWarehouses = warehouses.filter((w) => w.id !== warehouseId);

  return (
    <Modal
      title={t("warehouses.addTransaction")}
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText={t("common.save")}
      cancelText={t("common.cancel")}
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item label={t("common.type")} required>
          <Select
            value={txType}
            onChange={setTxType}
            options={TX_TYPES.map((t2) => ({
              value: t2.value,
              label: t(t2.labelKey),
            }))}
          />
        </Form.Item>

        {txType === "TRANSFER" && (
          <Form.Item
            name="toWarehouseId"
            label={t("warehouses.destination")}
            rules={[{ required: true }]}
          >
            <Select
              options={otherWarehouses.map((w) => ({
                value: w.id,
                label: w.name,
              }))}
              placeholder={t("warehouses.destination")}
            />
          </Form.Item>
        )}

        <div style={{ marginBottom: 8, fontWeight: 500 }}>{t("warehouses.product")}</div>
        {items.map((item, i) => (
          <Space key={i} style={{ display: "flex", marginBottom: 8 }} align="center">
            <Select
              style={{ width: 220 }}
              value={item.productId || undefined}
              onChange={(v) => handleItemChange(i, "productId", v)}
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.unit})`,
              }))}
              placeholder={t("warehouses.product")}
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
            <InputNumber
              style={{ width: 100 }}
              min={0.001}
              step={1}
              value={item.quantity}
              onChange={(v) => handleItemChange(i, "quantity", v ?? 1)}
            />
            {items.length > 1 && (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveItem(i)}
              />
            )}
          </Space>
        ))}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddItem}
          style={{ marginBottom: 16 }}
        >
          {t("warehouses.addItem")}
        </Button>

        {getNegativeWarning() && (
          <Alert
            type="warning"
            message={t("warehouses.negativeStockWarning")}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item name="note" label={t("warehouses.note")}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
