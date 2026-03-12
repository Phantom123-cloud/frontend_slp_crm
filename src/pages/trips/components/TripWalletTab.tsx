import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Typography,
  message,
  Spin,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Popconfirm,
  Tooltip,
  Image,
  Upload,
  Row,
  Col,
  Divider,
  Switch,
  Dropdown,
  Descriptions,
} from "antd";
import {
  PlusOutlined,
  MinusOutlined,
  SwapOutlined,
  RetweetOutlined,
  LockOutlined,
  UnlockOutlined,
  PaperClipOutlined,
  CloseOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { walletsApi } from "../../../api/wallets";
import { directoriesApi } from "../../../api/directories";
import { filesApi } from "../../../api/files";
import { useTableFilters } from "../../../utils/tableFilters";

const { Text } = Typography;

const COMMON_CURRENCIES = [
  "USD", "EUR", "RUB", "UZS", "KZT", "TRY", "GBP", "CNY", "JPY", "AED",
  "UAH", "BYN", "GEL", "AMD", "AZN", "KGS", "TJS", "TMT",
];

const TX_TYPE_COLORS: Record<string, string> = {
  INCOME: "green",
  EXPENSE: "red",
  TRANSFER_OUT: "orange",
  TRANSFER_IN: "blue",
  CONVERSION: "purple",
};

interface Props {
  walletId: string;
  canTransact: boolean; // ГА/МВ_ГА + право на транзакции
  canAudit: boolean;    // wallets.auditor
}

export default function TripWalletTab({ walletId, canTransact, canAudit }: Props) {
  const { t } = useTranslation();
  const { colEnum } = useTableFilters();

  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allWallets, setAllWallets] = useState<any[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [txPage, setTxPage] = useState(1);

  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [conversionOpen, setConversionOpen] = useState(false);

  const [incomeForm] = Form.useForm();
  const [expenseForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [conversionForm] = Form.useForm();

  const [incomeImages, setIncomeImages] = useState<string[]>([]);
  const [expenseImages, setExpenseImages] = useState<string[]>([]);
  const [transferImages, setTransferImages] = useState<string[]>([]);
  const [conversionImages, setConversionImages] = useState<string[]>([]);
  const [customRate, setCustomRate] = useState(false);

  // Модалка просмотра/редактирования транзакции
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [txEditForm] = Form.useForm();
  const [txEditImages, setTxEditImages] = useState<string[]>([]);
  const [keptImages, setKeptImages] = useState<{ id: string; url: string }[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [wRes, txRes, allWRes, etRes] = await Promise.all([
        walletsApi.getById(walletId),
        walletsApi.getTransactions(walletId),
        walletsApi.list(),
        directoriesApi.getExpenseTypes(),
      ]);
      setWallet(wRes.data);
      setTransactions(txRes.data);
      setAllWallets(allWRes.data.filter((w: any) => w.id !== walletId));
      setExpenseTypes(etRes.data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [walletId]);

  const fetchRate = async (from: string, to: string) => {
    if (!from || !to || from === to || customRate) return;
    try {
      const resp = await fetch(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from.toLowerCase()}.json`,
      );
      const data = await resp.json();
      const rate = data[from.toLowerCase()]?.[to.toLowerCase()];
      if (rate) {
        conversionForm.setFieldValue("rate", Number(rate.toFixed(6)));
        const fromAmount = conversionForm.getFieldValue("fromAmount");
        if (fromAmount) {
          conversionForm.setFieldValue("toAmount", Number((fromAmount * rate).toFixed(4)));
        }
      }
    } catch {}
  };

  const handleIncome = async (values: any) => {
    try {
      await walletsApi.income(walletId, { ...values, images: incomeImages });
      message.success(t("common.success"));
      setIncomeOpen(false); incomeForm.resetFields(); setIncomeImages([]);
      loadAll();
    } catch (e: any) { message.error(t(e.response?.data?.message || "common.error")); }
  };

  const handleExpense = async (values: any) => {
    try {
      await walletsApi.expense(walletId, { ...values, images: expenseImages });
      message.success(t("common.success"));
      setExpenseOpen(false); expenseForm.resetFields(); setExpenseImages([]);
      loadAll();
    } catch (e: any) { message.error(t(e.response?.data?.message || "common.error")); }
  };

  const handleTransfer = async (values: any) => {
    try {
      await walletsApi.transfer(walletId, { ...values, images: transferImages });
      message.success(t("common.success"));
      setTransferOpen(false); transferForm.resetFields(); setTransferImages([]);
      loadAll();
    } catch (e: any) { message.error(t(e.response?.data?.message || "common.error")); }
  };

  const handleConversion = async (values: any) => {
    try {
      await walletsApi.conversion(walletId, {
        fromCurrency: values.fromCurrency, fromAmount: values.fromAmount,
        toCurrency: values.toCurrency, toAmount: values.toAmount,
        rate: values.rate, isCustomRate: customRate, description: values.description,
        images: conversionImages,
      });
      message.success(t("common.success"));
      setConversionOpen(false); conversionForm.resetFields(); setConversionImages([]); setCustomRate(false);
      loadAll();
    } catch (e: any) { message.error(t(e.response?.data?.message || "common.error")); }
  };

  const openTxView = (record: any) => {
    setSelectedTx(record);
    txEditForm.setFieldsValue({
      description: record.description,
      expenseTypeId: record.expenseType?.id,
    });
    setKeptImages(record.images ?? []);
    setTxEditImages([]);
  };

  const closeTxModal = () => {
    setSelectedTx(null);
    txEditForm.resetFields();
    setTxEditImages([]);
    setKeptImages([]);
  };

  const handleUpdateTx = async (values: any) => {
    if (!selectedTx) return;
    try {
      const images = [...keptImages.map((img) => img.url), ...txEditImages];
      await walletsApi.updateTransaction(selectedTx.id, {
        description: values.description,
        expenseTypeId: values.expenseTypeId || null,
        images,
      });
      message.success(t("common.success"));
      closeTxModal();
      loadAll();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleClose = async (txId: string) => {
    try {
      await walletsApi.closeTransaction(txId);
      message.success(t("common.success"));
      loadAll();
    } catch (e: any) { message.error(t(e.response?.data?.message || "common.error")); }
  };

  const handleReopen = async (txId: string) => {
    try {
      await walletsApi.reopenTransaction(txId);
      message.success(t("common.success"));
      // Если открыли из модалки — обновить selectedTx
      if (selectedTx?.id === txId) setSelectedTx((prev: any) => prev ? { ...prev, isClosed: false, closedAt: null, closedBy: null } : null);
      loadAll();
    } catch (e: any) { message.error(t(e.response?.data?.message || "common.error")); }
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setExporting(true);
    try {
      const res = await walletsApi.exportTransactions(walletId, format);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error(t("common.error"));
    } finally {
      setExporting(false);
    }
  };

  const txColumns = [
    {
      title: t("wallets.tx.type"),
      dataIndex: "type",
      key: "type",
      ...colEnum(
        [
          { text: t("wallets.tx.INCOME"), value: "INCOME" },
          { text: t("wallets.tx.EXPENSE"), value: "EXPENSE" },
          { text: t("wallets.tx.TRANSFER_OUT"), value: "TRANSFER_OUT" },
          { text: t("wallets.tx.TRANSFER_IN"), value: "TRANSFER_IN" },
          { text: t("wallets.tx.CONVERSION"), value: "CONVERSION" },
        ],
        (v, r: any) => r.type === v,
      ),
      render: (type: string) => (
        <Tag color={TX_TYPE_COLORS[type]}>{t(`wallets.tx.${type}`)}</Tag>
      ),
    },
    {
      title: t("wallets.tx.amount"),
      key: "amount",
      render: (_: any, r: any) => {
        if (r.type === "CONVERSION") {
          return (
            <span>
              <Text delete style={{ color: "#ff4d4f" }}>-{Number(r.amount).toLocaleString()} {r.currency}</Text>
              {" → "}
              <Text style={{ color: "#52c41a" }}>+{Number(r.toAmount).toLocaleString()} {r.toCurrency}</Text>
              {r.isCustomRate && <Tag style={{ marginLeft: 4 }} color="orange">{t("wallets.customRate")}</Tag>}
            </span>
          );
        }
        const sign = r.type === "INCOME" || r.type === "TRANSFER_IN" ? "+" : "-";
        const color = r.type === "INCOME" || r.type === "TRANSFER_IN" ? "#52c41a" : "#ff4d4f";
        return <Text style={{ color }}>{sign}{Number(r.amount).toLocaleString()} {r.currency}</Text>;
      },
    },
    {
      title: t("wallets.tx.rate"),
      key: "rate",
      width: 110,
      render: (_: any, r: any) => {
        if (r.type !== "CONVERSION" || !r.rate) return "—";
        return (
          <span style={{ fontSize: 12 }}>
            {Number(r.rate).toLocaleString(undefined, { maximumFractionDigits: 6 })}
            <br />
            <span style={{ color: "#8c8c8c" }}>{r.currency}/{r.toCurrency}</span>
          </span>
        );
      },
    },
    {
      title: t("wallets.tx.counterpart"),
      key: "counterpart",
      render: (_: any, r: any) => {
        if (r.transferOut) {
          const tw = r.transferOut.toWallet;
          return `→ ${tw?.name || (tw?.trip ? tw.trip.name : `#${tw?.id?.slice(-6)}`)}`;
        }
        if (r.transferIn) {
          const fw = r.transferIn.fromWallet;
          return `← ${fw?.name || (fw?.trip ? fw.trip.name : `#${fw?.id?.slice(-6)}`)}`;
        }
        return r.expenseType ? r.expenseType.name : "—";
      },
    },
    {
      title: t("wallets.tx.description"),
      dataIndex: "description",
      key: "description",
      render: (v: string) => v || "—",
    },
    {
      title: t("wallets.tx.images"),
      key: "images",
      render: (_: any, r: any) =>
        r.images?.length ? (
          <Image.PreviewGroup>
            <Space>
              {r.images.map((img: any) => (
                <Image key={img.id} width={36} height={36} src={img.url} style={{ objectFit: "cover", borderRadius: 4 }} />
              ))}
            </Space>
          </Image.PreviewGroup>
        ) : "—",
    },
    {
      title: t("wallets.tx.date"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => new Date(v).toLocaleDateString("ru"),
    },
    {
      title: t("wallets.tx.status"),
      key: "isClosed",
      render: (_: any, r: any) =>
        r.isClosed ? (
          <Tag color="red" icon={<LockOutlined />}>{t("wallets.tx.closed")}</Tag>
        ) : (
          <Tag color="green">{t("wallets.tx.open")}</Tag>
        ),
    },
    ...(canAudit ? [{
      title: "",
      key: "closeAction",
      render: (_: any, r: any) =>
        r.isClosed ? (
          <Popconfirm
            title={t("wallets.tx.confirmReopen")}
            onConfirm={(e) => { e?.stopPropagation(); handleReopen(r.id); }}
            okText={t("common.yes")}
            cancelText={t("common.no")}
          >
            <Button size="small" icon={<UnlockOutlined />} onClick={(e) => e.stopPropagation()}>{t("wallets.tx.reopen")}</Button>
          </Popconfirm>
        ) : (
          <Popconfirm
            title={t("wallets.tx.confirmClose")}
            onConfirm={(e) => { e?.stopPropagation(); handleClose(r.id); }}
            okText={t("common.yes")}
            cancelText={t("common.no")}
          >
            <Button size="small" icon={<LockOutlined />} onClick={(e) => e.stopPropagation()}>{t("wallets.tx.close")}</Button>
          </Popconfirm>
        ),
    }] : []),
  ];

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>;

  return (
    <div>
      {/* Балансы */}
      <Card style={{ marginBottom: 16 }}>
        <Space size={8} wrap>
          {wallet?.balances?.length > 0 ? (
            wallet.balances.map((b: any) => (
              <Tag key={b.currency} color={Number(b.amount) < 0 ? "red" : "blue"} style={{ fontSize: 14, padding: "4px 12px" }}>
                {Number(b.amount).toLocaleString()} {b.currency}
              </Tag>
            ))
          ) : (
            <Text type="secondary">{t("wallets.noBalances")}</Text>
          )}
        </Space>
        {canTransact && !wallet?.isBlocked && (
          <div style={{ marginTop: 12 }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIncomeOpen(true)}>
                {t("wallets.tx.income")}
              </Button>
              <Button danger icon={<MinusOutlined />} onClick={() => setExpenseOpen(true)}>
                {t("wallets.tx.expense")}
              </Button>
              <Button icon={<SwapOutlined />} onClick={() => setTransferOpen(true)}>
                {t("wallets.tx.transfer")}
              </Button>
              <Button icon={<RetweetOutlined />} onClick={() => setConversionOpen(true)}>
                {t("wallets.tx.conversion")}
              </Button>
            </Space>
          </div>
        )}
      </Card>

      {/* Транзакции — заголовок с кнопкой экспорта */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Typography.Text strong style={{ fontSize: 16 }}>{t("wallets.transactions")}</Typography.Text>
        <Dropdown
          menu={{
            items: [
              { key: 'xlsx', label: t("wallets.exportExcel"), icon: <DownloadOutlined /> },
              { key: 'csv',  label: t("wallets.exportCsv"),   icon: <DownloadOutlined /> },
            ],
            onClick: ({ key }) => handleExport(key as 'xlsx' | 'csv'),
          }}
        >
          <Button icon={<DownloadOutlined />} loading={exporting} size="small">
            {t("wallets.exportData")}
          </Button>
        </Dropdown>
      </div>

      {/* Транзакции */}
      <Table
        columns={txColumns}
        dataSource={transactions}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => openTxView(record),
          style: { cursor: "pointer" },
        })}
        pagination={{
          current: txPage,
          pageSize: 20,
          onChange: setTxPage,
          showSizeChanger: false,
          showTotal: (total) => t("common.totalItems", { count: total }),
        }}
      />

      {/* Модалка прихода */}
      <Modal open={incomeOpen} title={t("wallets.tx.incomeTitle")}
        onCancel={() => { setIncomeOpen(false); incomeForm.resetFields(); setIncomeImages([]); }}
        onOk={() => incomeForm.submit()} okText={t("common.save")} cancelText={t("common.cancel")} width={520}>
        <Form form={incomeForm} onFinish={handleIncome} layout="vertical">
          <Form.Item name="currency" label={t("wallets.currency")} rules={[{ required: true }]}>
            <Select showSearch options={COMMON_CURRENCIES.map((c) => ({ label: c, value: c }))}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "8px 0" }} />
                  <div style={{ padding: "0 8px 4px" }}>
                    <Input placeholder={t("wallets.enterCurrencyCode")}
                      onKeyDown={(e) => e.stopPropagation()}
                      onBlur={(e) => { const v = e.target.value.trim().toUpperCase(); if (v) incomeForm.setFieldValue("currency", v); }} />
                  </div>
                </>
              )} />
          </Form.Item>
          <Form.Item name="amount" label={t("wallets.amount")} rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} min={0.0001} precision={4} />
          </Form.Item>
          <Form.Item name="description" label={t("wallets.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label={t("wallets.images")}>
            <Upload listType="picture-card" multiple
              beforeUpload={async (file) => {
                if (incomeImages.length >= 15) { message.error(t("wallets.tooManyImages")); return false; }
                try { const form = new FormData(); form.append("file", file); const { data } = await filesApi.upload(form); setIncomeImages((p) => [...p, data.url]); } catch {}
                return false;
              }}
              onRemove={() => setIncomeImages((p) => p.slice(0, -1))}>
              {incomeImages.length < 15 && <div><PaperClipOutlined /><div>{t("wallets.upload")}</div></div>}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модалка расхода */}
      <Modal open={expenseOpen} title={t("wallets.tx.expenseTitle")}
        onCancel={() => { setExpenseOpen(false); expenseForm.resetFields(); setExpenseImages([]); }}
        onOk={() => expenseForm.submit()} okText={t("common.save")} cancelText={t("common.cancel")} width={520}>
        <Form form={expenseForm} onFinish={handleExpense} layout="vertical">
          <Form.Item name="currency" label={t("wallets.currency")} rules={[{ required: true }]}>
            <Select showSearch placeholder={t("wallets.selectCurrency")}
              options={(wallet?.balances ?? [])
                .filter((b: any) => Number(b.amount) > 0)
                .map((b: any) => ({ label: `${b.currency} (${Number(b.amount).toLocaleString()})`, value: b.currency }))} />
          </Form.Item>
          <Form.Item name="amount" label={t("wallets.amount")} rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} min={0.0001} precision={4} />
          </Form.Item>
          <Form.Item name="expenseTypeId" label={t("wallets.expenseType")}>
            <Select allowClear options={expenseTypes.map((et) => ({ label: et.name, value: et.id }))} />
          </Form.Item>
          <Form.Item name="description" label={t("wallets.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label={t("wallets.images")}>
            <Upload listType="picture-card" multiple
              beforeUpload={async (file) => {
                if (expenseImages.length >= 15) { message.error(t("wallets.tooManyImages")); return false; }
                try { const form = new FormData(); form.append("file", file); const { data } = await filesApi.upload(form); setExpenseImages((p) => [...p, data.url]); } catch {}
                return false;
              }}
              onRemove={() => setExpenseImages((p) => p.slice(0, -1))}>
              {expenseImages.length < 15 && <div><PaperClipOutlined /><div>{t("wallets.upload")}</div></div>}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модалка перевода */}
      <Modal open={transferOpen} title={t("wallets.tx.transferTitle")}
        onCancel={() => { setTransferOpen(false); transferForm.resetFields(); setTransferImages([]); }}
        onOk={() => transferForm.submit()} okText={t("common.save")} cancelText={t("common.cancel")} width={520}>
        <Form form={transferForm} onFinish={handleTransfer} layout="vertical">
          <Form.Item name="toWalletId" label={t("wallets.tx.toWallet")} rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={allWallets.map((w) => ({ label: w.name || (w.trip ? w.trip.name : `#${w.id.slice(-6)}`), value: w.id }))} />
          </Form.Item>
          <Form.Item name="currency" label={t("wallets.currency")} rules={[{ required: true }]}>
            <Select showSearch options={COMMON_CURRENCIES.map((c) => ({ label: c, value: c }))} />
          </Form.Item>
          <Form.Item name="amount" label={t("wallets.amount")} rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} min={0.0001} precision={4} />
          </Form.Item>
          <Form.Item name="description" label={t("wallets.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label={t("wallets.images")}>
            <Upload listType="picture-card" multiple
              beforeUpload={async (file) => {
                if (transferImages.length >= 15) { message.error(t("wallets.tooManyImages")); return false; }
                try { const form = new FormData(); form.append("file", file); const { data } = await filesApi.upload(form); setTransferImages((p) => [...p, data.url]); } catch {}
                return false;
              }}
              onRemove={() => setTransferImages((p) => p.slice(0, -1))}>
              {transferImages.length < 15 && <div><PaperClipOutlined /><div>{t("wallets.upload")}</div></div>}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модалка конвертации */}
      <Modal open={conversionOpen} title={t("wallets.tx.conversionTitle")}
        onCancel={() => { setConversionOpen(false); conversionForm.resetFields(); setConversionImages([]); setCustomRate(false); }}
        onOk={() => conversionForm.submit()} okText={t("common.save")} cancelText={t("common.cancel")} width={560}>
        <Form form={conversionForm} onFinish={handleConversion} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fromCurrency" label={t("wallets.fromCurrency")} rules={[{ required: true }]}>
                <Select showSearch
                  options={(wallet?.balances ?? [])
                    .filter((b: any) => Number(b.amount) > 0)
                    .map((b: any) => ({
                      label: `${b.currency} (${Number(b.amount).toLocaleString()})`,
                      value: b.currency,
                    }))}
                  onChange={() => { const from = conversionForm.getFieldValue("fromCurrency"); const to = conversionForm.getFieldValue("toCurrency"); if (from && to) fetchRate(from, to); }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="toCurrency" label={t("wallets.toCurrency")} rules={[{ required: true }]}>
                <Select showSearch options={COMMON_CURRENCIES.map((c) => ({ label: c, value: c }))}
                  onChange={() => { const from = conversionForm.getFieldValue("fromCurrency"); const to = conversionForm.getFieldValue("toCurrency"); if (from && to) fetchRate(from, to); }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fromAmount" label={t("wallets.fromAmount")} rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} min={0.0001} precision={4}
                  onChange={(val) => { if (!val) return; const rate = conversionForm.getFieldValue("rate"); if (rate) conversionForm.setFieldValue("toAmount", Number((val * rate).toFixed(4))); }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="toAmount" label={t("wallets.toAmount")} rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} min={0.0001} precision={4} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12} align="middle">
            <Col span={16}>
              <Form.Item name="rate" label={t("wallets.rate")} rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} min={0.000001} precision={6} disabled={!customRate}
                  onChange={(val) => { if (!val) return; const fa = conversionForm.getFieldValue("fromAmount"); if (fa) conversionForm.setFieldValue("toAmount", Number((fa * val).toFixed(4))); }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={t("wallets.customRate")}>
                <Switch checked={customRate} onChange={setCustomRate} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label={t("wallets.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label={t("wallets.images")}>
            <Upload listType="picture-card" multiple
              beforeUpload={async (file) => {
                if (conversionImages.length >= 15) { message.error(t("wallets.tooManyImages")); return false; }
                try { const form = new FormData(); form.append("file", file); const { data } = await filesApi.upload(form); setConversionImages((p) => [...p, data.url]); } catch {}
                return false;
              }}
              onRemove={() => setConversionImages((p) => p.slice(0, -1))}>
              {conversionImages.length < 15 && <div><PaperClipOutlined /><div>{t("wallets.upload")}</div></div>}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Просмотр / редактирование транзакции */}
      <Modal
        open={!!selectedTx}
        title={
          selectedTx ? (
            <Space>
              <Tag color={TX_TYPE_COLORS[selectedTx.type] || "default"}>
                {t(`wallets.tx.${selectedTx.type}`)}
              </Tag>
              <span>{new Date(selectedTx.createdAt).toLocaleDateString("ru")}</span>
            </Space>
          ) : ""
        }
        onCancel={closeTxModal}
        footer={
          !selectedTx?.isClosed && canTransact
            ? [
                <Button key="cancel" onClick={closeTxModal}>{t("common.cancel")}</Button>,
                <Button key="save" type="primary" onClick={() => txEditForm.submit()}>{t("common.save")}</Button>,
              ]
            : [
                ...(selectedTx?.isClosed && canAudit
                  ? [
                      <Popconfirm
                        key="reopen"
                        title={t("wallets.tx.confirmReopen")}
                        onConfirm={() => handleReopen(selectedTx.id)}
                        okText={t("common.yes")}
                        cancelText={t("common.no")}
                      >
                        <Button icon={<UnlockOutlined />}>{t("wallets.tx.reopen")}</Button>
                      </Popconfirm>,
                    ]
                  : []),
                <Button key="close" type="primary" onClick={closeTxModal}>{t("common.close")}</Button>,
              ]
        }
        width={580}
        destroyOnClose
      >
        {selectedTx && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              {/* Сумма */}
              <Descriptions.Item label={t("wallets.tx.amount")}>
                {selectedTx.type === "CONVERSION" ? (
                  <span>
                    <Text delete style={{ color: "#ff4d4f" }}>
                      -{Number(selectedTx.amount).toLocaleString()} {selectedTx.currency}
                    </Text>
                    {" → "}
                    <Text style={{ color: "#52c41a" }}>
                      +{Number(selectedTx.toAmount).toLocaleString()} {selectedTx.toCurrency}
                    </Text>
                    {selectedTx.isCustomRate && (
                      <Tag style={{ marginLeft: 4 }} color="orange">{t("wallets.customRate")}</Tag>
                    )}
                  </span>
                ) : (
                  <Text style={{ color: selectedTx.type === "INCOME" || selectedTx.type === "TRANSFER_IN" ? "#52c41a" : "#ff4d4f" }}>
                    {selectedTx.type === "INCOME" || selectedTx.type === "TRANSFER_IN" ? "+" : "-"}
                    {Number(selectedTx.amount).toLocaleString()} {selectedTx.currency}
                  </Text>
                )}
              </Descriptions.Item>

              {/* Курс (только для конвертации) */}
              {selectedTx.type === "CONVERSION" && selectedTx.rate && (
                <Descriptions.Item label={t("wallets.tx.rate")}>
                  {Number(selectedTx.rate).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  {" "}{selectedTx.currency}/{selectedTx.toCurrency}
                </Descriptions.Item>
              )}

              {/* Контрагент */}
              {(selectedTx.transferOut || selectedTx.transferIn || selectedTx.expenseType) && (
                <Descriptions.Item label={t("wallets.tx.counterpart")}>
                  {selectedTx.transferOut
                    ? `→ ${selectedTx.transferOut.toWallet?.name || (selectedTx.transferOut.toWallet?.trip ? selectedTx.transferOut.toWallet.trip.name : "—")}`
                    : selectedTx.transferIn
                    ? `← ${selectedTx.transferIn.fromWallet?.name || (selectedTx.transferIn.fromWallet?.trip ? selectedTx.transferIn.fromWallet.trip.name : "—")}`
                    : selectedTx.expenseType?.name}
                </Descriptions.Item>
              )}

              {/* Автор */}
              <Descriptions.Item label={t("wallets.tx.createdBy")}>
                {selectedTx.createdBy
                  ? `${selectedTx.createdBy.lastName} ${selectedTx.createdBy.firstName}`
                  : "—"}
              </Descriptions.Item>

              {/* Статус */}
              <Descriptions.Item label={t("wallets.tx.status")}>
                {selectedTx.isClosed ? (
                  <Tag color="red" icon={<LockOutlined />}>{t("wallets.tx.closed")}</Tag>
                ) : (
                  <Tag color="green">{t("wallets.tx.open")}</Tag>
                )}
              </Descriptions.Item>

              {/* Кто закрыл */}
              {selectedTx.isClosed && selectedTx.closedBy && (
                <Descriptions.Item label={t("wallets.tx.closedBy")}>
                  {selectedTx.closedBy.lastName} {selectedTx.closedBy.firstName}
                  {selectedTx.closedAt ? `, ${new Date(selectedTx.closedAt).toLocaleDateString("ru")}` : ""}
                </Descriptions.Item>
              )}

              {/* Read-only поля (если закрыта или нет прав) */}
              {(selectedTx.isClosed || !canTransact) && (
                <>
                  <Descriptions.Item label={t("wallets.description")}>
                    {selectedTx.description || "—"}
                  </Descriptions.Item>
                  {selectedTx.expenseType && (
                    <Descriptions.Item label={t("wallets.expenseType")}>
                      {selectedTx.expenseType.name}
                    </Descriptions.Item>
                  )}
                </>
              )}
            </Descriptions>

            {/* Фото read-only */}
            {(selectedTx.isClosed || !canTransact) && selectedTx.images?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                  {t("wallets.images")}
                </Text>
                <Image.PreviewGroup>
                  <Space wrap>
                    {selectedTx.images.map((img: any) => (
                      <Image key={img.id} width={64} height={64} src={img.url}
                        style={{ objectFit: "cover", borderRadius: 6 }} />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              </div>
            )}

            {/* Форма редактирования (только если не закрыта и есть права) */}
            {!selectedTx.isClosed && canTransact && (
              <>
                <Divider style={{ margin: "0 0 16px" }} />
                <Form form={txEditForm} onFinish={handleUpdateTx} layout="vertical">
                  <Form.Item name="description" label={t("wallets.description")}>
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  {(selectedTx.type === "INCOME" || selectedTx.type === "EXPENSE") && (
                    <Form.Item name="expenseTypeId" label={t("wallets.expenseType")}>
                      <Select
                        allowClear
                        placeholder={t("wallets.selectExpenseType")}
                        options={expenseTypes.map((et) => ({ label: et.name, value: et.id }))}
                      />
                    </Form.Item>
                  )}
                  <Form.Item label={t("wallets.images")}>
                    {/* Существующие фото с кнопкой удаления */}
                    {keptImages.length > 0 && (
                      <Space wrap style={{ marginBottom: 8 }}>
                        {keptImages.map((img) => (
                          <div key={img.id} style={{ position: "relative", display: "inline-block" }}>
                            <Image width={64} height={64} src={img.url}
                              style={{ objectFit: "cover", borderRadius: 6 }} />
                            <Button
                              size="small" type="primary" danger
                              icon={<CloseOutlined />}
                              style={{
                                position: "absolute", top: -6, right: -6,
                                width: 20, height: 20, minWidth: 0,
                                padding: 0, borderRadius: "50%",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setKeptImages((prev) => prev.filter((i) => i.id !== img.id));
                              }}
                            />
                          </div>
                        ))}
                      </Space>
                    )}
                    {/* Загрузка новых фото */}
                    <Upload
                      listType="picture-card" multiple
                      beforeUpload={async (file) => {
                        if (keptImages.length + txEditImages.length >= 15) {
                          message.error(t("wallets.tooManyImages")); return false;
                        }
                        try {
                          const form = new FormData();
                          form.append("file", file);
                          const { data } = await filesApi.upload(form);
                          setTxEditImages((prev) => [...prev, data.url]);
                        } catch {}
                        return false;
                      }}
                      onRemove={() => setTxEditImages((prev) => prev.slice(0, -1))}
                    >
                      {keptImages.length + txEditImages.length < 15 && (
                        <div><PaperClipOutlined /><div>{t("wallets.upload")}</div></div>
                      )}
                    </Upload>
                  </Form.Item>
                </Form>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
