import { useState, useEffect, useCallback } from "react";
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
  InputNumber,
  Descriptions,
  Tabs,
  Popconfirm,
  Tooltip,
  Switch,
  Image,
  Upload,
  Row,
  Col,
  Divider,
} from "antd";
import {
  PlusOutlined,
  MinusOutlined,
  EditOutlined,
  SwapOutlined,
  RetweetOutlined,
  LockOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { walletsApi } from "../../api/wallets";
import { directoriesApi } from "../../api/directories";
import { usersApi } from "../../api/users";
import { filesApi } from "../../api/files";
import { useAnyPermission, usePermission } from "../../hooks/usePermission";
import { useTableFilters } from "../../utils/tableFilters";

const { Title, Text } = Typography;

// Популярные валюты (ISO 4217) — пользователь может вписать любой код вручную
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

export default function WalletDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { colSearch, colEnum } = useTableFilters();

  const canManage = usePermission("wallets.manage");
  const canEdit = useAnyPermission(["wallets.edit", "wallets.manage"]);
  const canAudit = useAnyPermission(["wallets.auditor", "wallets.manage"]);

  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allWallets, setAllWallets] = useState<any[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);

  // Модалки
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [conversionOpen, setConversionOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [incomeForm] = Form.useForm();
  const [expenseForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [conversionForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Загрузка файлов для модалок
  const [incomeImages, setIncomeImages] = useState<string[]>([]);
  const [expenseImages, setExpenseImages] = useState<string[]>([]);
  const [transferImages, setTransferImages] = useState<string[]>([]);
  const [conversionImages, setConversionImages] = useState<string[]>([]);

  // Флаг "свой курс" в конвертации
  const [customRate, setCustomRate] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [wRes, txRes, allWRes, etRes, usersRes] = await Promise.all([
        walletsApi.getById(id),
        walletsApi.getTransactions(id),
        walletsApi.list(),
        directoriesApi.getExpenseTypes(),
        usersApi.getAll({ limit: 1000 }),
      ]);
      setWallet(wRes.data);
      setTransactions(txRes.data);
      setAllWallets(allWRes.data.filter((w: any) => w.id !== id));
      setExpenseTypes(etRes.data);
      setUsers(usersRes.data.data || []);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ==================== Handlers ====================

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      const { data } = await filesApi.upload(form);
      urls.push(data.url);
    }
    return urls;
  };

  const handleIncome = async (values: any) => {
    try {
      await walletsApi.income(id!, {
        ...values,
        images: incomeImages,
      });
      message.success(t("common.success"));
      setIncomeOpen(false);
      incomeForm.resetFields();
      setIncomeImages([]);
      loadAll();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleExpense = async (values: any) => {
    try {
      await walletsApi.expense(id!, { ...values, images: expenseImages });
      message.success(t("common.success"));
      setExpenseOpen(false);
      expenseForm.resetFields();
      setExpenseImages([]);
      loadAll();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleTransfer = async (values: any) => {
    try {
      await walletsApi.transfer(id!, {
        ...values,
        images: transferImages,
      });
      message.success(t("common.success"));
      setTransferOpen(false);
      transferForm.resetFields();
      setTransferImages([]);
      loadAll();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleConversion = async (values: any) => {
    try {
      await walletsApi.conversion(id!, {
        fromCurrency: values.fromCurrency,
        fromAmount: values.fromAmount,
        toCurrency: values.toCurrency,
        toAmount: values.toAmount,
        rate: values.rate,
        isCustomRate: customRate,
        description: values.description,
        images: conversionImages,
      });
      message.success(t("common.success"));
      setConversionOpen(false);
      conversionForm.resetFields();
      setConversionImages([]);
      setCustomRate(false);
      loadAll();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleEdit = async (values: any) => {
    try {
      await walletsApi.update(id!, values);
      message.success(t("common.success"));
      setEditOpen(false);
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
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  // Загружаем курс через open API при смене валют (если не свой)
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
        // Пересчитываем toAmount если fromAmount уже введён
        const fromAmount = conversionForm.getFieldValue("fromAmount");
        if (fromAmount) {
          conversionForm.setFieldValue("toAmount", Number((fromAmount * rate).toFixed(4)));
        }
      }
    } catch {}
  };

  const onConvCurrencyChange = () => {
    if (customRate) return;
    const from = conversionForm.getFieldValue("fromCurrency");
    const to = conversionForm.getFieldValue("toCurrency");
    if (from && to) fetchRate(from, to);
  };

  const onFromAmountChange = (val: number | null) => {
    if (!val) return;
    const rate = conversionForm.getFieldValue("rate");
    if (rate) {
      conversionForm.setFieldValue("toAmount", Number((val * rate).toFixed(4)));
    }
  };

  const onRateChange = (val: number | null) => {
    if (!val) return;
    const fromAmount = conversionForm.getFieldValue("fromAmount");
    if (fromAmount) {
      conversionForm.setFieldValue("toAmount", Number((fromAmount * val).toFixed(4)));
    }
  };

  // ==================== Columns ====================

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
        <Tag color={TX_TYPE_COLORS[type] || "default"}>{t(`wallets.tx.${type}`)}</Tag>
      ),
    },
    {
      title: t("wallets.tx.amount"),
      key: "amount",
      render: (_: any, record: any) => {
        if (record.type === "CONVERSION") {
          return (
            <span>
              <Text delete style={{ color: "#ff4d4f" }}>
                -{Number(record.amount).toLocaleString()} {record.currency}
              </Text>{" "}
              →{" "}
              <Text style={{ color: "#52c41a" }}>
                +{Number(record.toAmount).toLocaleString()} {record.toCurrency}
              </Text>
              {record.isCustomRate && (
                <Tag style={{ marginLeft: 4 }} color="orange">
                  {t("wallets.customRate")}
                </Tag>
              )}
            </span>
          );
        }
        const sign =
          record.type === "INCOME" || record.type === "TRANSFER_IN" ? "+" : "-";
        const color =
          record.type === "INCOME" || record.type === "TRANSFER_IN"
            ? "#52c41a"
            : "#ff4d4f";
        return (
          <Text style={{ color }}>
            {sign}
            {Number(record.amount).toLocaleString()} {record.currency}
          </Text>
        );
      },
    },
    {
      title: t("wallets.tx.rate"),
      key: "rate",
      width: 110,
      render: (_: any, record: any) => {
        if (record.type !== "CONVERSION" || !record.rate) return "—";
        return (
          <span style={{ fontSize: 12 }}>
            {Number(record.rate).toLocaleString(undefined, { maximumFractionDigits: 6 })}
            <br />
            <span style={{ color: "#8c8c8c" }}>{record.currency}/{record.toCurrency}</span>
          </span>
        );
      },
    },
    {
      title: t("wallets.tx.counterpart"),
      key: "counterpart",
      render: (_: any, record: any) => {
        if (record.transferOut) {
          const tw = record.transferOut.toWallet;
          const name = tw?.name || (tw?.trip ? tw.trip.name : `#${tw?.id?.slice(-6)}`);
          return `→ ${name}`;
        }
        if (record.transferIn) {
          const fw = record.transferIn.fromWallet;
          const name = fw?.name || (fw?.trip ? fw.trip.name : `#${fw?.id?.slice(-6)}`);
          return `← ${name}`;
        }
        return record.expenseType ? record.expenseType.name : "—";
      },
    },
    {
      title: t("wallets.tx.description"),
      dataIndex: "description",
      key: "description",
      ...colSearch((r: any) => r.description ?? ""),
      render: (v: string) => v || "—",
    },
    {
      title: t("wallets.tx.images"),
      key: "images",
      render: (_: any, record: any) =>
        record.images?.length ? (
          <Image.PreviewGroup>
            <Space>
              {record.images.map((img: any) => (
                <Image key={img.id} width={36} height={36} src={img.url} style={{ objectFit: "cover", borderRadius: 4 }} />
              ))}
            </Space>
          </Image.PreviewGroup>
        ) : (
          "—"
        ),
    },
    {
      title: t("wallets.tx.createdBy"),
      key: "createdBy",
      render: (_: any, record: any) =>
        record.createdBy
          ? `${record.createdBy.lastName} ${record.createdBy.firstName}`
          : "—",
    },
    {
      title: t("wallets.tx.date"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => new Date(v).toLocaleDateString("ru"),
      sorter: (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: t("wallets.tx.status"),
      key: "isClosed",
      render: (_: any, record: any) =>
        record.isClosed ? (
          <Tooltip
            title={`${t("wallets.tx.closedBy")}: ${record.closedBy?.lastName} ${record.closedBy?.firstName} ${new Date(record.closedAt).toLocaleDateString("ru")}`}
          >
            <Tag color="red" icon={<LockOutlined />}>
              {t("wallets.tx.closed")}
            </Tag>
          </Tooltip>
        ) : (
          <Tag color="green">{t("wallets.tx.open")}</Tag>
        ),
    },
    ...(canAudit
      ? [
          {
            title: "",
            key: "closeAction",
            render: (_: any, record: any) =>
              !record.isClosed ? (
                <Popconfirm
                  title={t("wallets.tx.confirmClose")}
                  onConfirm={() => handleClose(record.id)}
                  okText={t("common.yes")}
                  cancelText={t("common.no")}
                >
                  <Button size="small" icon={<LockOutlined />}>
                    {t("wallets.tx.close")}
                  </Button>
                </Popconfirm>
              ) : null,
          },
        ]
      : []),
  ];

  // ==================== Render ====================

  if (loading) {
    return (
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!wallet) return null;

  const ownerName = wallet.owner
    ? `${wallet.owner.lastName} ${wallet.owner.firstName}`
    : wallet.trip
    ? wallet.trip.name
    : "—";

  // Может ли текущий пользователь делать транзакции (проверка на backend — здесь только canEdit как приближение)
  const canTransact = canManage || canEdit;

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/wallets">{t("wallets.title")}</Link> },
          { title: wallet.name || ownerName },
        ]}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          {wallet.name || (wallet.trip ? `${t("wallets.tripWallet")}: ${wallet.trip.name}` : ownerName)}
          {wallet.isBlocked && (
            <Tag color="red" style={{ marginLeft: 8 }}>
              {t("wallets.blocked")}
            </Tag>
          )}
        </Title>
        <Space>
          {canTransact && !wallet.isBlocked && (
            <>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIncomeOpen(true)}
              >
                {t("wallets.tx.income")}
              </Button>
              <Button
                danger
                icon={<MinusOutlined />}
                onClick={() => setExpenseOpen(true)}
              >
                {t("wallets.tx.expense")}
              </Button>
              <Button icon={<SwapOutlined />} onClick={() => setTransferOpen(true)}>
                {t("wallets.tx.transfer")}
              </Button>
              <Button icon={<RetweetOutlined />} onClick={() => setConversionOpen(true)}>
                {t("wallets.tx.conversion")}
              </Button>
            </>
          )}
          {canEdit && wallet.type === "PERSONAL" && (
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                editForm.setFieldsValue({ name: wallet.name, ownerId: wallet.ownerId });
                setEditOpen(true);
              }}
            >
              {t("common.edit")}
            </Button>
          )}
        </Space>
      </div>

      {/* Инфо + балансы */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t("wallets.type")}>
                <Tag color={wallet.type === "PERSONAL" ? "purple" : "green"}>
                  {t(`wallets.${wallet.type.toLowerCase()}`)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("wallets.responsible")}>{ownerName}</Descriptions.Item>
              {wallet.trip && (
                <Descriptions.Item label={t("wallets.trip")}>
                  <Link to={`/trips/${wallet.trip.id}`}>{wallet.trip.name}</Link>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={t("wallets.balances")}>
            {wallet.balances && wallet.balances.length > 0 ? (
              <Space size={8} wrap>
                {wallet.balances.map((b: any) => (
                  <Tag
                    key={b.currency}
                    color={Number(b.amount) < 0 ? "red" : "blue"}
                    style={{ fontSize: 14, padding: "4px 12px" }}
                  >
                    {Number(b.amount).toLocaleString()} {b.currency}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">{t("wallets.noBalances")}</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Транзакции */}
      <Card title={t("wallets.transactions")}>
        <Table
          columns={txColumns}
          dataSource={transactions}
          rowKey="id"
          pagination={{
            current: txPage,
            pageSize: 20,
            onChange: setTxPage,
            showSizeChanger: false,
            showTotal: (total) => t("common.totalItems", { count: total }),
          }}
        />
      </Card>

      {/* ==================== Модалки ==================== */}

      {/* Приход */}
      <Modal
        open={incomeOpen}
        title={t("wallets.tx.incomeTitle")}
        onCancel={() => { setIncomeOpen(false); incomeForm.resetFields(); setIncomeImages([]); }}
        onOk={() => incomeForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        width={520}
      >
        <Form form={incomeForm} onFinish={handleIncome} layout="vertical">
          <Form.Item name="currency" label={t("wallets.currency")} rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder={t("wallets.selectCurrency")}
              options={COMMON_CURRENCIES.map((c) => ({ label: c, value: c }))}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "8px 0" }} />
                  <div style={{ padding: "0 8px 4px" }}>
                    <Input
                      placeholder={t("wallets.enterCurrencyCode")}
                      onKeyDown={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        const v = e.target.value.trim().toUpperCase();
                        if (v) incomeForm.setFieldValue("currency", v);
                      }}
                    />
                  </div>
                </>
              )}
            />
          </Form.Item>
          <Form.Item name="amount" label={t("wallets.amount")} rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} min={0.0001} precision={4} />
          </Form.Item>
          <Form.Item name="expenseTypeId" label={t("wallets.expenseType")}>
            <Select
              allowClear
              placeholder={t("wallets.selectExpenseType")}
              options={expenseTypes.map((et) => ({ label: et.name, value: et.id }))}
            />
          </Form.Item>
          <Form.Item name="description" label={t("wallets.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label={t("wallets.images")}>
            <Upload
              listType="picture-card"
              multiple
              beforeUpload={async (file) => {
                if (incomeImages.length >= 15) {
                  message.error(t("wallets.tooManyImages"));
                  return false;
                }
                try {
                  const form = new FormData();
                  form.append("file", file);
                  const { data } = await filesApi.upload(form);
                  setIncomeImages((prev) => [...prev, data.url]);
                } catch {
                  message.error(t("common.error"));
                }
                return false;
              }}
              showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
              onRemove={(file) => {
                // упрощённо — убираем последний
                setIncomeImages((prev) => prev.slice(0, -1));
              }}
            >
              {incomeImages.length < 15 && (
                <div>
                  <PaperClipOutlined />
                  <div>{t("wallets.upload")}</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Расход */}
      <Modal
        open={expenseOpen}
        title={t("wallets.tx.expenseTitle")}
        onCancel={() => { setExpenseOpen(false); expenseForm.resetFields(); setExpenseImages([]); }}
        onOk={() => expenseForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        width={520}
      >
        <Form form={expenseForm} onFinish={handleExpense} layout="vertical">
          <Form.Item name="currency" label={t("wallets.currency")} rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder={t("wallets.selectCurrency")}
              options={(wallet?.balances ?? [])
                .filter((b: any) => Number(b.amount) > 0)
                .map((b: any) => ({
                  label: `${b.currency} (${Number(b.amount).toLocaleString()})`,
                  value: b.currency,
                }))}
            />
          </Form.Item>
          <Form.Item name="amount" label={t("wallets.amount")} rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} min={0.0001} precision={4} />
          </Form.Item>
          <Form.Item name="expenseTypeId" label={t("wallets.expenseType")}>
            <Select
              allowClear
              placeholder={t("wallets.selectExpenseType")}
              options={expenseTypes.map((et) => ({ label: et.name, value: et.id }))}
            />
          </Form.Item>
          <Form.Item name="description" label={t("wallets.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label={t("wallets.images")}>
            <Upload
              listType="picture-card"
              multiple
              beforeUpload={async (file) => {
                if (expenseImages.length >= 15) { message.error(t("wallets.tooManyImages")); return false; }
                try {
                  const form = new FormData();
                  form.append("file", file);
                  const { data } = await filesApi.upload(form);
                  setExpenseImages((prev) => [...prev, data.url]);
                } catch {}
                return false;
              }}
              onRemove={() => setExpenseImages((prev) => prev.slice(0, -1))}
            >
              {expenseImages.length < 15 && <div><PaperClipOutlined /><div>{t("wallets.upload")}</div></div>}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Перевод */}
      <Modal
        open={transferOpen}
        title={t("wallets.tx.transferTitle")}
        onCancel={() => { setTransferOpen(false); transferForm.resetFields(); setTransferImages([]); }}
        onOk={() => transferForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        width={520}
      >
        <Form form={transferForm} onFinish={handleTransfer} layout="vertical">
          <Form.Item name="toWalletId" label={t("wallets.tx.toWallet")} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={t("wallets.tx.selectWallet")}
              options={allWallets.map((w) => ({
                label: w.name || (w.trip ? w.trip.name : `#${w.id.slice(-6)}`),
                value: w.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="currency" label={t("wallets.currency")} rules={[{ required: true }]}>
            <Select
              showSearch
              options={COMMON_CURRENCIES.map((c) => ({ label: c, value: c }))}
            />
          </Form.Item>
          <Form.Item name="amount" label={t("wallets.amount")} rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} min={0.0001} precision={4} />
          </Form.Item>
          <Form.Item name="description" label={t("wallets.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label={t("wallets.images")}>
            <Upload
              listType="picture-card"
              multiple
              beforeUpload={async (file) => {
                if (transferImages.length >= 15) {
                  message.error(t("wallets.tooManyImages"));
                  return false;
                }
                try {
                  const form = new FormData();
                  form.append("file", file);
                  const { data } = await filesApi.upload(form);
                  setTransferImages((prev) => [...prev, data.url]);
                } catch {}
                return false;
              }}
              onRemove={() => setTransferImages((prev) => prev.slice(0, -1))}
            >
              {transferImages.length < 15 && <div><PaperClipOutlined /><div>{t("wallets.upload")}</div></div>}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Конвертация */}
      <Modal
        open={conversionOpen}
        title={t("wallets.tx.conversionTitle")}
        onCancel={() => {
          setConversionOpen(false);
          conversionForm.resetFields();
          setConversionImages([]);
          setCustomRate(false);
        }}
        onOk={() => conversionForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        width={560}
      >
        <Form form={conversionForm} onFinish={handleConversion} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fromCurrency" label={t("wallets.fromCurrency")} rules={[{ required: true }]}>
                <Select
                  showSearch
                  options={(wallet?.balances ?? [])
                    .filter((b: any) => Number(b.amount) > 0)
                    .map((b: any) => ({
                      label: `${b.currency} (${Number(b.amount).toLocaleString()})`,
                      value: b.currency,
                    }))}
                  onChange={onConvCurrencyChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="toCurrency" label={t("wallets.toCurrency")} rules={[{ required: true }]}>
                <Select
                  showSearch
                  options={COMMON_CURRENCIES.map((c) => ({ label: c, value: c }))}
                  onChange={onConvCurrencyChange}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fromAmount" label={t("wallets.fromAmount")} rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} min={0.0001} precision={4} onChange={onFromAmountChange} />
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
                <InputNumber
                  style={{ width: "100%" }}
                  min={0.000001}
                  precision={6}
                  disabled={!customRate}
                  onChange={onRateChange}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={t("wallets.customRate")}>
                <Switch
                  checked={customRate}
                  onChange={(v) => {
                    setCustomRate(v);
                    if (!v) {
                      // Подтягиваем курс из API
                      const from = conversionForm.getFieldValue("fromCurrency");
                      const to = conversionForm.getFieldValue("toCurrency");
                      if (from && to) fetchRate(from, to);
                    }
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label={t("wallets.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label={t("wallets.images")}>
            <Upload
              listType="picture-card"
              multiple
              beforeUpload={async (file) => {
                if (conversionImages.length >= 15) { message.error(t("wallets.tooManyImages")); return false; }
                try {
                  const form = new FormData();
                  form.append("file", file);
                  const { data } = await filesApi.upload(form);
                  setConversionImages((prev) => [...prev, data.url]);
                } catch {}
                return false;
              }}
              onRemove={() => setConversionImages((prev) => prev.slice(0, -1))}
            >
              {conversionImages.length < 15 && <div><PaperClipOutlined /><div>{t("wallets.upload")}</div></div>}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Редактирование кошелька */}
      <Modal
        open={editOpen}
        title={t("wallets.editTitle")}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
      >
        <Form form={editForm} onFinish={handleEdit} layout="vertical">
          <Form.Item name="name" label={t("wallets.name")}>
            <Input />
          </Form.Item>
          <Form.Item name="ownerId" label={t("wallets.responsible")}>
            <Select
              showSearch
              optionFilterProp="label"
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
