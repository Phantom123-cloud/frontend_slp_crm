import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Tag,
  Card,
  Spin,
  message,
  Table,
  Typography,
  Popconfirm,
  Row,
  Col,
  Divider,
  Modal,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Space,
  Alert,
  Timeline,
  Tooltip,
  Upload,
  Image,
  Grid,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  PhoneOutlined,
  BankOutlined,
  RollbackOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
  UserOutlined,
  PaperClipOutlined,
  UploadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  InboxOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { contractsApi } from "../../api/contracts";
import { warehousesApi } from "../../api/warehouses";
import { tripsApi } from "../../api/trips";
import { usePermission } from "../../hooks/usePermission";
import ContractEditModal from "./ContractEditModal";

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  UNVERIFIED: "warning",
  VERIFIED: "success",
  CANCELLED: "error",
};

const STATUS_LABELS: Record<string, string> = {
  UNVERIFIED: "Не верифицирован",
  VERIFIED: "Верифицирован",
  CANCELLED: "Отменён",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  OPEN: "blue",
  CLOSED: "green",
  REFUND: "red",
  PARTIAL_REFUND: "orange",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  OPEN: "Незакрытый",
  CLOSED: "Закрытый",
  REFUND: "Возврат",
  PARTIAL_REFUND: "Частичный возврат",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH: "Наличными",
  CREDIT: "Кредит",
  COMPANY: "Компания",
  MIXED: "Смешанный",
  TERMINAL: "Терминал",
  RESERVATION: "Резервация",
};

const PAYMENT_TYPE_OPTIONS = [
  { value: "CASH", label: "Наличными" },
  { value: "CREDIT", label: "Кредит" },
  { value: "COMPANY", label: "Компания" },
  { value: "MIXED", label: "Смешанный" },
  { value: "TERMINAL", label: "Терминал" },
  { value: "RESERVATION", label: "Резервация" },
];

const SALE_TYPE_LABELS: Record<string, string> = {
  RAFFLE: "Розыгрыш",
  HOURLY: "Часовка",
};

const FMT = (v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const PARSE = (v: string | undefined) => Number(v?.replace(/\s/g, "") ?? 0);

// Метки действий аудита
const AUDIT_ACTION_LABELS: Record<string, string> = {
  "contract.created": "Договор создан",
  "contract.updated": "Договор обновлён",
  "contract.refund": "Оформлен возврат",
  "contract.financialsUpdated": "Финансы обновлены",
  "contract.statusChanged": "Статус изменён",
  "contract.scheduleItemPaid": "Платёж подтверждён",
  "contract.scheduleItemUnpaid": "Платёж отменён",
  "contract.fileUploaded": "Файл загружен",
  "contract.fileDeleted": "Файл удалён",
  "contract.deleted": "Договор удалён",
};

const AUDIT_ACTION_COLORS: Record<string, string> = {
  "contract.created": "green",
  "contract.updated": "blue",
  "contract.refund": "red",
  "contract.financialsUpdated": "orange",
  "contract.statusChanged": "purple",
  "contract.scheduleItemPaid": "green",
  "contract.scheduleItemUnpaid": "red",
  "contract.fileUploaded": "blue",
  "contract.fileDeleted": "red",
};

function formatAuditDetails(action: string, details: any): React.ReactNode | null {
  if (!details) return null;

  if (action === "contract.statusChanged") {
    // Поддержка старого формата { status } и нового { from, to }
    if (details.from && details.to) {
      return (
        <span>
          <Tag style={{ fontSize: 11 }}>{STATUS_LABELS[details.from] || details.from}</Tag>
          →
          <Tag color="blue" style={{ fontSize: 11, marginLeft: 4 }}>{STATUS_LABELS[details.to] || details.to}</Tag>
        </span>
      );
    }
    return <Tag style={{ fontSize: 11 }}>{STATUS_LABELS[details.status] || details.status}</Tag>;
  }

  if (action === "contract.financialsUpdated" && details.before && details.after) {
    const b = details.before;
    const a = details.after;
    const lines: React.ReactNode[] = [];

    if (Number(b.amountAfterRefund) !== Number(a.amountAfterRefund)) {
      lines.push(
        <span key="amount">
          Сумма: <Text delete style={{ color: "#888", fontSize: 11 }}>{Number(b.amountAfterRefund).toLocaleString()}</Text>
          {" → "}
          <Text strong style={{ fontSize: 11 }}>{Number(a.amountAfterRefund).toLocaleString()}</Text>
        </span>
      );
    }
    if (Number(b.advanceCash) !== Number(a.advanceCash)) {
      lines.push(
        <span key="cash">
          Нал: <Text delete style={{ color: "#888", fontSize: 11 }}>{Number(b.advanceCash).toLocaleString()}</Text>
          {" → "}
          <Text strong style={{ fontSize: 11 }}>{Number(a.advanceCash).toLocaleString()}</Text>
        </span>
      );
    }
    if (Number(b.advanceTerminal) !== Number(a.advanceTerminal)) {
      lines.push(
        <span key="term">
          Терм: <Text delete style={{ color: "#888", fontSize: 11 }}>{Number(b.advanceTerminal).toLocaleString()}</Text>
          {" → "}
          <Text strong style={{ fontSize: 11 }}>{Number(a.advanceTerminal).toLocaleString()}</Text>
        </span>
      );
    }
    if (Number(b.advanceBank) !== Number(a.advanceBank)) {
      lines.push(
        <span key="bank">
          Банк: <Text delete style={{ color: "#888", fontSize: 11 }}>{Number(b.advanceBank).toLocaleString()}</Text>
          {" → "}
          <Text strong style={{ fontSize: 11 }}>{Number(a.advanceBank).toLocaleString()}</Text>
        </span>
      );
    }
    if (b.paymentStatus !== a.paymentStatus) {
      lines.push(
        <span key="status">
          <Tag style={{ fontSize: 11 }}>{PAYMENT_STATUS_LABELS[b.paymentStatus] || b.paymentStatus}</Tag>
          →
          <Tag color={PAYMENT_STATUS_COLORS[a.paymentStatus]} style={{ fontSize: 11, marginLeft: 4 }}>
            {PAYMENT_STATUS_LABELS[a.paymentStatus] || a.paymentStatus}
          </Tag>
        </span>
      );
    }
    if (lines.length === 0) return null;
    return <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>{lines}</div>;
  }

  if (action === "contract.scheduleItemPaid" || action === "contract.scheduleItemUnpaid") {
    const date = details.date ? dayjs(details.date).format("DD.MM.YYYY") : "";
    const amount = details.amount ? Number(details.amount).toLocaleString() : "";
    return <Tag style={{ fontSize: 11 }}>{[date, amount].filter(Boolean).join(" — ")}</Tag>;
  }

  if (action === "contract.refund") {
    return <Tag color="red" style={{ fontSize: 11 }}>{PAYMENT_STATUS_LABELS[details.paymentStatus] || ""}</Tag>;
  }

  return null;
}

// Компонент одного поля: лейбл сверху серый, значение снизу
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>
        {value ?? <span style={{ color: "#555" }}>—</span>}
      </div>
    </div>
  );
}

// Встроенный блок финансов для модалки редактирования (реактивный)
function FinancialsFormContent({
  form,
  tripBanks,
  paymentSchedule,
  setPaymentSchedule,
  originalTotalAmount,
  onCanSaveChange,
  initialPaymentType,
  bankConditions = {},
  setBankConditions,
}: {
  form: any;
  tripBanks: any[];
  paymentSchedule: { date: dayjs.Dayjs; amount: number }[];
  setPaymentSchedule: (s: { date: dayjs.Dayjs; amount: number }[]) => void;
  originalTotalAmount: number;
  onCanSaveChange: (v: boolean) => void;
  initialPaymentType: string;
  bankConditions?: Record<string, { conditionId: string; conditionName: string; conditionRate: number }>;
  setBankConditions?: (v: Record<string, { conditionId: string; conditionName: string; conditionRate: number }>) => void;
}) {
  // Fallback на initialPaymentType пока Form.useWatch не синхронизировался (первый рендер)
  const paymentTypeWatched = Form.useWatch("paymentType", form);
  const paymentType = paymentTypeWatched ?? initialPaymentType;
  // totalAmount здесь = "Общая сумма (после возврата)" — редактируемое поле
  const totalAmount = Form.useWatch("totalAmount", form) || 0;
  const advanceCash = Form.useWatch("advanceCash", form) || 0;
  const advanceTerminal = Form.useWatch("advanceTerminal", form) || 0;
  const installmentMonths = Form.useWatch("installmentMonths", form) || 0;
  const firstPaymentDate = Form.useWatch("firstPaymentDate", form);
  const selectedBankId = Form.useWatch("bankId", form);
  const selectedBankIds: string[] = Form.useWatch("bankIds", form) || [];
  const bankAdvancesObj: Record<string, number> = Form.useWatch("bankAdvances", form) || {};

  const hasInstallment = paymentType === "COMPANY" || paymentType === "MIXED";

  // Хранение предыдущих значений зависимостей — для корректной работы в React StrictMode
  // (StrictMode дважды запускает эффекты; prevDepsRef позволяет пропустить повторный запуск
  // с теми же значениями и не сбрасывать загруженный из договора график)
  const prevDepsRef = useRef<{
    paymentType: string;
    installmentMonths: number;
    firstPaymentDate: any;
    totalAmount: number;
    advanceCash: number;
    advanceTerminal: number;
    totalBankAdvance: number;
  } | null>(null);

  const totalBankAdvance = (() => {
    if (paymentType === "CREDIT") return Number(bankAdvancesObj[selectedBankId] || 0);
    if (paymentType === "MIXED") return selectedBankIds.reduce((s, id) => s + (Number(bankAdvancesObj[id]) || 0), 0);
    return 0;
  })();

  const totalAdvances = Number(advanceCash) + Number(advanceTerminal) + totalBankAdvance;
  const installmentBalance = Number(totalAmount) - totalAdvances;

  // Проверка возможности сохранения
  useEffect(() => {
    if (!hasInstallment) {
      // Без рассрочки: итого авансов должно совпасть с суммой после возврата
      onCanSaveChange(totalAmount > 0 && Math.round((totalAdvances - totalAmount) * 100) / 100 === 0);
    } else {
      // С рассрочкой: итого рассрочки должно совпасть с остатком
      const scheduleTotal = paymentSchedule.reduce((s, r) => s + r.amount, 0);
      onCanSaveChange(installmentBalance >= 0 && Math.round((scheduleTotal - installmentBalance) * 100) / 100 === 0);
    }
  }, [totalAdvances, totalAmount, installmentBalance, paymentSchedule, hasInstallment]);

  // Автогенерация/очистка графика при изменении параметров рассрочки
  useEffect(() => {
    const current = { paymentType, installmentMonths, firstPaymentDate, totalAmount, advanceCash, advanceTerminal, totalBankAdvance };
    const prev = prevDepsRef.current;
    prevDepsRef.current = current;

    // Первый рендер — инициализируем без изменения графика
    if (prev === null) return;

    // Значения не изменились (React StrictMode повторный запуск) — пропускаем
    const changed =
      prev.paymentType !== current.paymentType ||
      prev.installmentMonths !== current.installmentMonths ||
      prev.firstPaymentDate !== current.firstPaymentDate ||
      prev.totalAmount !== current.totalAmount ||
      prev.advanceCash !== current.advanceCash ||
      prev.advanceTerminal !== current.advanceTerminal ||
      prev.totalBankAdvance !== current.totalBankAdvance;
    if (!changed) return;

    if (hasInstallment && installmentMonths > 0 && firstPaymentDate && installmentBalance > 0) {
      const perMonth = Math.round((installmentBalance / installmentMonths) * 100) / 100;
      const schedule = [];
      for (let i = 0; i < installmentMonths; i++) {
        schedule.push({
          date: dayjs(firstPaymentDate).add(i, "month"),
          amount: i === installmentMonths - 1
            ? Math.round((installmentBalance - perMonth * (installmentMonths - 1)) * 100) / 100
            : perMonth,
        });
      }
      setPaymentSchedule(schedule);
    } else if (!hasInstallment || installmentBalance <= 0) {
      // Тип без рассрочки ИЛИ авансы покрывают всю сумму — рассрочка не нужна
      setPaymentSchedule([]);
      form.setFieldsValue({ installmentMonths: null, firstPaymentDate: undefined });
    }
  }, [paymentType, installmentMonths, firstPaymentDate, totalAmount, advanceCash, advanceTerminal, totalBankAdvance]);

  return (
    <>
      {/* Тип оплаты + Банки */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="paymentType" label="Тип оплаты" rules={[{ required: true }]}>
            <Select options={PAYMENT_TYPE_OPTIONS} placeholder="Выберите тип оплаты" />
          </Form.Item>
        </Col>
        {paymentType === "CREDIT" && (
          <Col span={12}>
            <Form.Item name="bankId" label="Банк">
              <Select
                placeholder="Выберите банк"
                options={tripBanks.map((b) => ({ value: b.id, label: b.name }))}
                allowClear
              />
            </Form.Item>
          </Col>
        )}
        {paymentType === "MIXED" && (
          <Col span={12}>
            <Form.Item name="bankIds" label="Банк(и)">
              <Select
                mode="multiple"
                placeholder="Выберите банки"
                options={tripBanks.map((b) => ({ value: b.id, label: b.name }))}
              />
            </Form.Item>
          </Col>
        )}
      </Row>

      {/* Суммы */}
      <Row gutter={16}>
        <Col span={8}>
          {/* Исходная сумма договора — не редактируется */}
          <Form.Item label="Общая сумма (до возврата)">
            <InputNumber style={{ width: "100%" }} value={originalTotalAmount} disabled formatter={FMT} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="totalAmount" label="Общая сумма (после возврата)" rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} placeholder="0" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="advanceCash" label="Аванс наличные">
            <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} placeholder="0" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="advanceTerminal" label="Аванс терминал">
            <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} placeholder="0" />
          </Form.Item>
        </Col>
      </Row>

      {/* Аванс банк CREDIT */}
      {paymentType === "CREDIT" && selectedBankId && (() => {
        const bank = tripBanks.find((b) => b.id === selectedBankId);
        return (
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name={["bankAdvances", selectedBankId]} label={`Аванс банк ${bank?.name || ""}`}>
                <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} placeholder="0" />
              </Form.Item>
            </Col>
            {bank?.conditions?.length > 0 && setBankConditions && (
              <Col span={8}>
                <Form.Item
                  label={`Условие ${bank.name}`}
                  validateStatus={!bankConditions[selectedBankId] ? 'error' : ''}
                  help={!bankConditions[selectedBankId] ? 'Выберите условие' : ''}
                >
                  <Select
                    placeholder="Выберите условие"
                    value={bankConditions[selectedBankId]?.conditionId}
                    onChange={(val) => {
                      const cond = bank.conditions.find((c: any) => c.id === val);
                      if (cond) setBankConditions({ ...bankConditions, [selectedBankId]: { conditionId: cond.id, conditionName: cond.name, conditionRate: Number(cond.rate) } });
                    }}
                    options={bank.conditions.map((c: any) => ({ value: c.id, label: `${c.name} — ${Number(c.rate)}%` }))}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
        );
      })()}

      {/* Авансы банков MIXED */}
      {paymentType === "MIXED" && selectedBankIds.length > 0 && (
        <Row gutter={16}>
          {selectedBankIds.map((bankId) => {
            const bank = tripBanks.find((b) => b.id === bankId);
            return (
              <>
                <Col span={8} key={bankId}>
                  <Form.Item name={["bankAdvances", bankId]} label={`Аванс банк ${bank?.name || ""}`}>
                    <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} placeholder="0" />
                  </Form.Item>
                </Col>
                {bank?.conditions?.length > 0 && setBankConditions && (
                  <Col span={8} key={`${bankId}-cond`}>
                    <Form.Item
                      label={`Условие ${bank.name}`}
                      validateStatus={!bankConditions[bankId] ? 'error' : ''}
                      help={!bankConditions[bankId] ? 'Выберите условие' : ''}
                    >
                      <Select
                        placeholder="Выберите условие"
                        value={bankConditions[bankId]?.conditionId}
                        onChange={(val) => {
                          const cond = bank.conditions.find((c: any) => c.id === val);
                          if (cond) setBankConditions({ ...bankConditions, [bankId]: { conditionId: cond.id, conditionName: cond.name, conditionRate: Number(cond.rate) } });
                        }}
                        options={bank.conditions.map((c: any) => ({ value: c.id, label: `${c.name} — ${Number(c.rate)}%` }))}
                      />
                    </Form.Item>
                  </Col>
                )}
              </>
            );
          })}
        </Row>
      )}

      {/* Итого авансов + Остаток */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Итого авансов">
            <InputNumber
              style={{ width: "100%" }}
              value={totalAdvances}
              disabled
              formatter={FMT}
            />
          </Form.Item>
        </Col>
        {hasInstallment && (
          <Col span={8}>
            <Form.Item label="Остаток (рассрочка)">
              <InputNumber
                style={{ width: "100%", color: installmentBalance < 0 ? "red" : undefined }}
                value={installmentBalance}
                disabled
                formatter={FMT}
              />
            </Form.Item>
          </Col>
        )}
      </Row>

      {/* Рассрочка — для COMPANY и MIXED, только если есть остаток */}
      {hasInstallment && installmentBalance > 0 && (
        <>
          <Divider titlePlacement="left" plain>Рассрочка</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="installmentMonths" label="Кол-во месяцев">
                <InputNumber style={{ width: "100%" }} min={1} max={120} placeholder="12" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="firstPaymentDate" label="Дата первого платежа">
                <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
          </Row>

          {paymentSchedule.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <Text strong>График платежей:</Text>
                <Button size="small" danger onClick={() => setPaymentSchedule([])}>Очистить график</Button>
              </div>
              <Table
                size="small"
                style={{ marginTop: 8 }}
                dataSource={paymentSchedule}
                rowKey={(_, idx) => String(idx)}
                pagination={false}
                columns={[
                  { title: "#", key: "num", width: 40, render: (_: any, __: any, idx: number) => idx + 1 },
                  {
                    title: "Дата",
                    key: "date",
                    render: (_: any, r: any, idx: number) => (
                      <DatePicker
                        size="small"
                        value={r.date}
                        format="DD.MM.YYYY"
                        onChange={(date) => {
                          if (date) {
                            const updated = [...paymentSchedule];
                            updated[idx].date = date;
                            setPaymentSchedule(updated);
                          }
                        }}
                      />
                    ),
                  },
                  {
                    title: "Сумма",
                    key: "amount",
                    render: (_: any, r: any, idx: number) => (
                      <InputNumber
                        size="small"
                        value={r.amount}
                        min={0}
                        onChange={(val) => {
                          const updated = [...paymentSchedule];
                          updated[idx].amount = Number(val) || 0;
                          setPaymentSchedule(updated);
                        }}
                      />
                    ),
                  },
                  {
                    title: "",
                    key: "del",
                    width: 40,
                    render: (_: any, __: any, idx: number) => (
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => setPaymentSchedule(paymentSchedule.filter((_, i) => i !== idx))}
                      />
                    ),
                  },
                ]}
                summary={() => {
                  const total = paymentSchedule.reduce((sum, r) => sum + r.amount, 0);
                  const diff = Math.round((installmentBalance - total) * 100) / 100;
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong>Итого рассрочки:</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <Text strong style={{ color: Math.abs(diff) > 0.01 ? "red" : "green" }}>
                          {total.toLocaleString()} {diff !== 0 && `(расхождение: ${diff})`}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} />
                    </Table.Summary.Row>
                  );
                }}
              />
            </>
          )}
        </>
      )}
    </>
  );
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  const canVerify = usePermission("contracts.verify");
  const canEdit = usePermission("contracts.edit");
  const canDelete = usePermission("contracts.delete");
  const [deleting, setDeleting] = useState(false);

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Банки выезда (для модалки финансов)
  const [tripBanks, setTripBanks] = useState<any[]>([]);

  // История действий по договору
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Модалка возврата
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundForm] = Form.useForm();

  // Модалка редактирования договора (для не верифицированных)
  const [editOpen, setEditOpen] = useState(false);

  // Подтверждение / отмена платежа по графику
  const [payingScheduleItemId, setPayingScheduleItemId] = useState<string | null>(null);

  const handlePayScheduleItem = async (scheduleItemId: string) => {
    setPayingScheduleItemId(scheduleItemId);
    try {
      const { data } = await contractsApi.payScheduleItem(scheduleItemId);
      setContract(data);
      loadHistory();
      message.success("Платёж подтверждён");
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка подтверждения платежа");
    } finally {
      setPayingScheduleItemId(null);
    }
  };

  const handleUnpayScheduleItem = async (scheduleItemId: string) => {
    setPayingScheduleItemId(scheduleItemId);
    try {
      const { data } = await contractsApi.unpayScheduleItem(scheduleItemId);
      setContract(data);
      loadHistory();
      message.success("Платёж отменён");
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка отмены платежа");
    } finally {
      setPayingScheduleItemId(null);
    }
  };

  // Модалка редактирования финансов
  const [finOpen, setFinOpen] = useState(false);
  const [finLoading, setFinLoading] = useState(false);
  const [finCanSave, setFinCanSave] = useState(false);
  const [finForm] = Form.useForm();
  const [finPaymentSchedule, setFinPaymentSchedule] = useState<{ date: dayjs.Dayjs; amount: number }[]>([]);
  const [finBankConditions, setFinBankConditions] = useState<Record<string, { conditionId: string; conditionName: string; conditionRate: number }>>({});

  // Файлы: blob-превью для изображений
  const [fileBlobUrls, setFileBlobUrls] = useState<Record<string, string>>({});
  const loadedFileIdsRef = useRef<Set<string>>(new Set());
  const fileBlobUrlsRef = useRef<Record<string, string>>({});

  // Удаление / загрузка файлов
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  // Блок товаров договора
  const [warehouseStock, setWarehouseStock] = useState<any[]>([]);
  const [warehouseIsActive, setWarehouseIsActive] = useState(true);
  const [itemProductId, setItemProductId] = useState<string | undefined>();
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemType, setItemType] = useState<'SALE' | 'GIFT'>('SALE');
  const [itemAdding, setItemAdding] = useState(false);
  const [itemRemoving, setItemRemoving] = useState<string | null>(null);

  // Редактирование кол-ва товара
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemQty, setEditItemQty] = useState<number>(1);
  const [editItemUpdating, setEditItemUpdating] = useState(false);

  // Модалка возврата на другой склад (если склад неактивен)
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnWarehouseId, setReturnWarehouseId] = useState<string | undefined>();
  const [allWarehouses, setAllWarehouses] = useState<any[]>([]);
  const [pendingUpdatePayload, setPendingUpdatePayload] = useState<{ itemId: string; qty: number } | null>(null);

  // Модалка загрузки файлов
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<Record<string, string>>({});
  const [bulkUploading, setBulkUploading] = useState(false);

  const addPendingFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      message.error(`${file.name}: превышает 2 МБ`);
      return false;
    }
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      message.error(`${file.name}: недопустимый тип`);
      return false;
    }
    setPendingFiles((prev) => [...prev, file]);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPendingPreviews((prev) => ({ ...prev, [file.name + file.size]: url }));
    }
    return false; // для antd Upload — не отправлять автоматически
  };

  const removePendingFile = (index: number) => {
    const file = pendingFiles[index];
    const key = file.name + file.size;
    if (pendingPreviews[key]) {
      URL.revokeObjectURL(pendingPreviews[key]);
      setPendingPreviews((prev) => { const n = { ...prev }; delete n[key]; return n; });
    }
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkUpload = async () => {
    if (!pendingFiles.length) return;
    const remaining = 15 - (contract.files?.length ?? 0);
    const toUpload = pendingFiles.slice(0, remaining);
    setBulkUploading(true);
    let ok = 0;
    for (const file of toUpload) {
      try {
        await contractsApi.uploadFile(id!, file);
        ok++;
      } catch (e: any) {
        message.error(`${file.name}: ${e.response?.data?.message || "ошибка"}`);
      }
    }
    // Очищаем превью pending-файлов
    Object.values(pendingPreviews).forEach((url) => URL.revokeObjectURL(url));
    setPendingFiles([]);
    setPendingPreviews({});
    setBulkUploading(false);
    setUploadModalOpen(false);
    if (ok > 0) {
      message.success(`Загружено: ${ok} файл(ов)`);
      load();
      loadHistory();
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    setDeletingFileId(fileId);
    try {
      await contractsApi.deleteFile(id!, fileId);
      // Очищаем blob URL если есть
      if (fileBlobUrls[fileId]) {
        URL.revokeObjectURL(fileBlobUrls[fileId]);
        setFileBlobUrls((prev) => { const n = { ...prev }; delete n[fileId]; return n; });
        loadedFileIdsRef.current.delete(fileId);
      }
      message.success("Файл удалён");
      load();
      loadHistory();
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка удаления файла");
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleDownloadFile = async (fileId: string, fileName: string, mimeType?: string) => {
    try {
      const response = await contractsApi.downloadFile(id!, fileId);
      const blob = new Blob([response.data], { type: mimeType || "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      if (mimeType === "application/pdf") {
        // PDF открываем во вкладке браузера
        window.open(url, "_blank");
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch {
      message.error("Ошибка скачивания файла");
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await contractsApi.getById(id!);
      setContract(data);
      // Загружаем остатки склада выезда для выбора товара
      const warehouseId = data?.trip?.warehouse?.id;
      if (warehouseId) {
        try {
          const { data: wh } = await warehousesApi.getById(warehouseId);
          setWarehouseStock(wh.stock ?? []);
          setWarehouseIsActive(wh.isActive !== false);
        } catch {
          // склад не критичен
        }
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка загрузки договора");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await contractsApi.getHistory(id!);
      setHistory(data.data || []);
    } catch {
      // история не критична
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, [id]);

  useEffect(() => { load(); loadHistory(); }, [id]);

  // Подгружаем blob-URL для изображений договора (для превью)
  useEffect(() => {
    if (!contract?.files?.length || !id) return;
    const imageFiles = contract.files.filter((f: any) => f.mimeType?.startsWith("image/"));
    for (const file of imageFiles) {
      if (loadedFileIdsRef.current.has(file.id)) continue;
      loadedFileIdsRef.current.add(file.id);
      contractsApi.downloadFile(id, file.id)
        .then((res) => {
          const url = URL.createObjectURL(new Blob([res.data], { type: file.mimeType }));
          setFileBlobUrls((prev) => ({ ...prev, [file.id]: url }));
        })
        .catch(() => { loadedFileIdsRef.current.delete(file.id); });
    }
  }, [contract?.files]);

  // Освобождаем blob URL при размонтировании
  useEffect(() => {
    return () => {
      Object.values(fileBlobUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Синхронизируем ref для cleanup
  useEffect(() => { fileBlobUrlsRef.current = fileBlobUrls; }, [fileBlobUrls]);

  const loadAllWarehouses = async () => {
    if (allWarehouses.length > 0) return;
    try {
      const { data } = await warehousesApi.list();
      // Показываем только CENTRAL и PERSONAL
      setAllWarehouses((data.data ?? data ?? []).filter((w: any) => w.type !== 'TRIP' && w.isActive));
    } catch {}
  };

  const handleStartEditItem = (item: any) => {
    setEditItemId(item.id);
    setEditItemQty(Number(item.quantity));
  };

  const handleUpdateItem = async (itemId: string, qty: number, retWarehouseId?: string) => {
    // Если количество уменьшается и выезд закрыт — сразу показываем модалку выбора склада
    const item = contract?.contractItems?.find((ci: any) => ci.id === itemId);
    const oldQty = item ? Number(item.quantity) : 0;
    const tripClosed = contract?.trip?.status === 'CLOSED';
    if (!retWarehouseId && qty < oldQty && tripClosed) {
      setPendingUpdatePayload({ itemId, qty });
      await loadAllWarehouses();
      setReturnModalOpen(true);
      return;
    }

    setEditItemUpdating(true);
    try {
      const { data } = await contractsApi.updateItem(id!, itemId, {
        quantity: qty,
        returnWarehouseId: retWarehouseId,
      });
      setContract(data);
      setEditItemId(null);
      setReturnModalOpen(false);
      setPendingUpdatePayload(null);
      setReturnWarehouseId(undefined);
      message.success("Количество обновлено");
    } catch (e: any) {
      const msg = e.response?.data?.message || "";
      if (msg.includes('warehouseInactiveNeedReturn')) {
        // Склад неактивен (дополнительная проверка с сервера)
        setPendingUpdatePayload({ itemId, qty });
        await loadAllWarehouses();
        setReturnModalOpen(true);
      } else {
        message.error(msg || "Ошибка обновления");
      }
    } finally {
      setEditItemUpdating(false);
    }
  };

  const handleAddItem = async () => {
    if (!itemProductId || !itemQty) return;
    setItemAdding(true);
    try {
      const { data } = await contractsApi.addItem(id!, { productId: itemProductId, quantity: itemQty, type: itemType });
      setContract(data);
      setItemProductId(undefined);
      setItemQty(1);
      message.success("Товар добавлен");
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка добавления товара");
    } finally {
      setItemAdding(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setItemRemoving(itemId);
    try {
      const { data } = await contractsApi.removeItem(id!, itemId);
      setContract(data);
      message.success("Товар удалён");
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка удаления товара");
    } finally {
      setItemRemoving(null);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await contractsApi.updateStatus(id!, "VERIFIED");
      message.success("Договор верифицирован");
      load();
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка верификации");
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await contractsApi.delete(id!);
      message.success("Договор удалён");
      navigate(`/trips/${contract.tripId}`);
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка удаления");
      setDeleting(false);
    }
  };

  const handleUnverify = async () => {
    setVerifying(true);
    try {
      await contractsApi.updateStatus(id!, "UNVERIFIED");
      message.success("Верификация отменена");
      load();
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка");
    } finally {
      setVerifying(false);
    }
  };

  // Открыть модалку возврата
  const openRefundModal = () => {
    const bankAdvancesObj: Record<string, number> = {};
    const bankIds = contract.banks?.map((b: any) => b.bankId) ?? [];
    contract.banks?.forEach((b: any) => {
      if (b.advance != null) bankAdvancesObj[b.bankId] = Number(b.advance);
    });
    // Фолбэк для старых договоров без per-bank аванса
    if (bankIds.length > 0 && contract.advanceBank) {
      bankIds.forEach((bankId: string) => {
        if (bankAdvancesObj[bankId] == null) {
          bankAdvancesObj[bankId] = Number(contract.advanceBank) / bankIds.length;
        }
      });
    }
    refundForm.setFieldsValue({
      advanceCash: Number(contract.advanceCash || 0),
      advanceTerminal: Number(contract.advanceTerminal || 0),
      advanceBank: Number(contract.advanceBank || 0),
      bankAdvances: bankAdvancesObj,
    });
    setRefundOpen(true);
  };

  // Подтвердить обнуление авансов
  const handleRefundConfirm = async () => {
    setRefundLoading(true);
    try {
      const bankAdvancesObj: Record<string, number> = {};
      contract.banks?.forEach((b: any) => { bankAdvancesObj[b.bankId] = 0; });
      await contractsApi.refund(id!, {
        paymentStatus: "REFUND",
        advanceCash: 0,
        advanceTerminal: 0,
        advanceBank: 0,
        bankAdvances: bankAdvancesObj,
        amountAfterRefund: 0,
      });
      message.success("Возврат оформлен");
      setRefundOpen(false);
      load();
      loadHistory();
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка");
    } finally {
      setRefundLoading(false);
    }
  };

  // Открыть модалку редактирования финансов — подгрузить банки выезда
  const openFinModal = async () => {
    const bankAdvancesObj: Record<string, number> = {};
    contract.banks?.forEach((b: any) => {
      if (b.advance != null) bankAdvancesObj[b.bankId] = Number(b.advance);
    });

    // Определяем bankId / bankIds по текущим банкам договора
    const currentBankIds = contract.banks?.map((b: any) => b.bankId) ?? [];
    const isSingleBank = contract.paymentType === "CREDIT";

    // Фолбэк: если per-bank аванс не задан (старые договоры) — берём общий advanceBank
    if (currentBankIds.length > 0 && contract.advanceBank) {
      currentBankIds.forEach((bankId: string) => {
        if (bankAdvancesObj[bankId] == null) {
          // Распределяем поровну если банков несколько и per-bank не задан
          bankAdvancesObj[bankId] = Number(contract.advanceBank) / currentBankIds.length;
        }
      });
    }

    // Загружаем сохранённые условия банков
    const savedFinConditions: Record<string, { conditionId: string; conditionName: string; conditionRate: number }> = {};
    contract.banks?.forEach((b: any) => {
      if (b.conditionId && b.conditionName != null && b.conditionRate != null) {
        savedFinConditions[b.bankId] = { conditionId: b.conditionId, conditionName: b.conditionName, conditionRate: Number(b.conditionRate) };
      }
    });
    setFinBankConditions(savedFinConditions);

    setFinCanSave(false);
    finForm.setFieldsValue({
      paymentType: contract.paymentType,
      // totalAmount в форме = "Общая сумма (после возврата)" — стартует с amountAfterRefund
      totalAmount: contract.amountAfterRefund != null
        ? Number(contract.amountAfterRefund)
        : Number(contract.totalAmount),
      advanceCash: Number(contract.advanceCash || 0),
      advanceTerminal: Number(contract.advanceTerminal || 0),
      advanceBank: Number(contract.advanceBank || 0),
      bankAdvances: bankAdvancesObj,
      bankId: isSingleBank ? currentBankIds[0] : undefined,
      bankIds: isSingleBank ? undefined : currentBankIds,
      installmentMonths: contract.installmentMonths,
      firstPaymentDate: contract.firstPaymentDate ? dayjs(contract.firstPaymentDate) : undefined,
    });

    // Подгружаем банки выезда если ещё не загружены
    if (tripBanks.length === 0 && contract.tripId) {
      try {
        const { data } = await tripsApi.getTripBanks(contract.tripId);
        setTripBanks(data);
      } catch {}
    }

    // Инициализируем график платежей из текущего договора
    if (contract.paymentSchedule?.length > 0) {
      setFinPaymentSchedule(contract.paymentSchedule.map((s: any) => ({
        date: dayjs(s.date),
        amount: Number(s.amount),
      })));
    } else {
      setFinPaymentSchedule([]);
    }

    setFinOpen(true);
  };

  // Сохранить изменения финансов (→ PARTIAL_REFUND)
  const handleFinSave = async () => {
    try {
      const values = await finForm.validateFields();
      setFinLoading(true);

      const paymentType = values.paymentType;
      const bankIds =
        paymentType === "CREDIT"
          ? (values.bankId ? [values.bankId] : [])
          : paymentType === "MIXED"
          ? (values.bankIds || [])
          : [];

      const hasInstallment = paymentType === "COMPANY" || paymentType === "MIXED";

      await contractsApi.updateFinancials(id!, {
        paymentType,
        totalAmount: values.totalAmount,
        advanceCash: values.advanceCash,
        advanceTerminal: values.advanceTerminal,
        advanceBank: values.advanceBank,
        bankIds,
        bankAdvances: values.bankAdvances,
        bankConditions: Object.keys(finBankConditions).length > 0 ? finBankConditions : undefined,
        installmentMonths: hasInstallment ? values.installmentMonths : undefined,
        firstPaymentDate: hasInstallment && values.firstPaymentDate
          ? dayjs(values.firstPaymentDate).format("YYYY-MM-DD")
          : undefined,
        // Передаём график: если рассрочки нет — пустой массив (сервер удалит)
        paymentSchedule: hasInstallment
          ? finPaymentSchedule.map((s) => ({ date: s.date.format("YYYY-MM-DD"), amount: s.amount }))
          : [],
      });
      message.success("Финансы обновлены");
      setFinOpen(false);
      load();
      loadHistory();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e.response?.data?.message || "Ошибка");
    } finally {
      setFinLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>;
  }

  if (!contract) return null;

  // Банковский аванс: сумма per-bank записей; если их нет — fallback на contract.advanceBank
  const bankTotal = contract.banks?.length > 0
    ? contract.banks.reduce((sum: number, b: any) => sum + (b.advance != null ? Number(b.advance) : 0), 0) || (Number(contract.advanceBank) || 0)
    : (Number(contract.advanceBank) || 0);

  // Сумма уже оплаченных платежей по графику рассрочки
  const paidScheduleTotal = contract.paymentSchedule?.reduce(
    (sum: number, s: any) => s.isPaid ? sum + Number(s.amount) : sum, 0
  ) ?? 0;

  const totalAdvances =
    (Number(contract.advanceCash) || 0) +
    (Number(contract.advanceTerminal) || 0) +
    bankTotal +
    paidScheduleTotal;

  // Реальные деньги по банкам с учётом условий (conditionRate = комиссия банка в %)
  const bankRealTotal = contract.banks?.length > 0
    ? contract.banks.reduce((sum: number, b: any) => {
        if (b.advance == null) return sum;
        const rate = b.conditionRate != null ? Number(b.conditionRate) : 0;
        return sum + Number(b.advance) * (1 - rate / 100);
      }, 0)
    : bankTotal;

  // Итого реальных денег = наличные + терминал + банки с учётом комиссии + оплаченные платежи
  const totalRealMoney =
    (Number(contract.advanceCash) || 0) +
    (Number(contract.advanceTerminal) || 0) +
    bankRealTotal +
    paidScheduleTotal;

  // Есть ли хотя бы один банк с условием
  const hasBankConditions = contract.banks?.some((b: any) => b.conditionRate != null);

  const amountAfterRefund =
    contract.amountAfterRefund != null
      ? Number(contract.amountAfterRefund)
      : Number(contract.totalAmount);

  // Остаток рассрочки = сумма неоплаченных платежей по графику
  // (если график есть — считаем по нему; иначе — по разнице сумм)
  const installmentBalance =
    contract.paymentSchedule?.length > 0
      ? contract.paymentSchedule.reduce((sum: number, s: any) => !s.isPaid ? sum + Number(s.amount) : sum, 0)
      : Math.max(0, amountAfterRefund - totalAdvances);

  // Следующий неоплаченный платёж (по порядку А→Я)
  const nextUnpaidPayment = contract.paymentSchedule?.find((s: any) => !s.isPaid) ?? null;

  // Последний оплаченный платёж (по порядку Я→А) — для кнопки отмены
  const lastPaidPayment = contract.paymentSchedule
    ? [...contract.paymentSchedule].reverse().find((s: any) => s.isPaid) ?? null
    : null;

  const hasRefund = contract.paymentStatus === "REFUND" || contract.paymentStatus === "PARTIAL_REFUND";

  // Должник: есть непогашенный остаток рассрочки (активна рассрочка)
  const isDebtor = installmentBalance > 0;

  // Спасенный контракт: частичный возврат = да, полный возврат = нет, иначе — нет значения
  const savedContract: "yes" | "no" | null =
    contract.paymentStatus === "PARTIAL_REFUND" ? "yes" :
    contract.paymentStatus === "REFUND" ? "no" :
    null;

  return (
    <div style={{ padding: "0 24px 24px", maxWidth: 960, margin: "0 auto" }}>
      {/* Шапка */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/trips/${contract.tripId}`)}>
          К выезду {contract.trip?.name}
        </Button>
        <FileTextOutlined style={{ fontSize: 18 }} />
        <Title level={4} style={{ margin: 0 }}>
          {contract.contractNumber}
        </Title>
        <Tag color={STATUS_COLORS[contract.status]} style={{ fontSize: 13, padding: "2px 10px" }}>
          {STATUS_LABELS[contract.status]}
        </Tag>
        <Tag color={PAYMENT_STATUS_COLORS[contract.paymentStatus]} style={{ fontSize: 13, padding: "2px 10px" }}>
          {PAYMENT_STATUS_LABELS[contract.paymentStatus] || contract.paymentStatus}
        </Tag>
        <div style={{ flex: 1 }} />

        {/* Не верифицирован: кнопка редактирования и удаления */}
        {canEdit && contract.status === "UNVERIFIED" && (
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
            Редактировать договор
          </Button>
        )}
        {canDelete && contract.status === "UNVERIFIED" && (
          <Popconfirm
            title="Удалить договор?"
            description={`Договор ${contract.contractNumber} будет удалён без возможности восстановления.`}
            onConfirm={handleDelete}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} loading={deleting}>
              Удалить
            </Button>
          </Popconfirm>
        )}
        {canVerify && contract.status === "UNVERIFIED" && (
          contract.files?.length > 0
            ? <Popconfirm title="Верифицировать договор?" onConfirm={handleVerify} okText="Да" cancelText="Нет">
                <Button type="primary" icon={<CheckCircleOutlined />} loading={verifying}>
                  Верифицировать
                </Button>
              </Popconfirm>
            : <Tooltip title="Нельзя верифицировать без вложений — загрузите хотя бы 1 файл">
                <Button type="primary" icon={<CheckCircleOutlined />} disabled>
                  Верифицировать
                </Button>
              </Tooltip>
        )}
        {canVerify && contract.status === "VERIFIED" && (
          contract.paymentStatus !== "OPEN"
            ? <Tooltip title="Нельзя отменить верификацию: по договору уже проводились финансовые операции">
                <Button danger icon={<CloseCircleOutlined />} disabled>
                  Отмена верификации
                </Button>
              </Tooltip>
            : <Popconfirm title="Отменить верификацию?" onConfirm={handleUnverify} okText="Да" cancelText="Нет">
                <Button danger icon={<CloseCircleOutlined />} loading={verifying}>
                  Отмена верификации
                </Button>
              </Popconfirm>
        )}
      </div>

      {/* Данные клиента */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>КЛИЕНТ</Divider>
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12}><Field label="ФИО" value={contract.clientName} /></Col>
          <Col xs={12} sm={6}><Field label="Дата договора" value={dayjs(contract.contractDate).format("DD.MM.YYYY")} /></Col>
          <Col xs={12} sm={6}>
            <Field
              label="Телефоны"
              value={contract.phones?.length > 0
                ? <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {contract.phones.map((p: any, i: number) => (
                      <span key={i}><PhoneOutlined style={{ marginRight: 4, fontSize: 11 }} />{p.countryCode} {p.number}</span>
                    ))}
                  </div>
                : null}
            />
          </Col>
          <Col xs={24} sm={12}><Field label="Адрес регистрации" value={contract.registrationAddress} /></Col>
          <Col xs={24} sm={12}><Field label="Адрес проживания" value={contract.actualAddress} /></Col>
        </Row>
      </Card>

      {/* Выезд и презентация */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>ВЫЕЗД И ПРЕЗЕНТАЦИЯ</Divider>
        <Row gutter={[16, 0]}>
          <Col xs={12} sm={6}><Field label="Выезд" value={contract.trip?.name} /></Col>
          <Col xs={12} sm={6}><Field label="Презентация" value={contract.presentation?.name} /></Col>
          <Col xs={12} sm={6}><Field label="Ведущий" value={contract.speaker ? `${contract.speaker.lastName} ${contract.speaker.firstName}` : null} /></Col>
          <Col xs={12} sm={6}><Field label="Оформил" value={contract.signedBy ? `${contract.signedBy.lastName} ${contract.signedBy.firstName}` : null} /></Col>
        </Row>
      </Card>

      {/* Условия */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>УСЛОВИЯ ДОГОВОРА</Divider>
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={8}><Field label="Компания" value={contract.company?.name} /></Col>
          <Col xs={12} sm={8}><Field label="Тип оплаты" value={PAYMENT_TYPE_LABELS[contract.paymentType] || contract.paymentType} /></Col>
          <Col xs={12} sm={8}><Field label="Тип продажи" value={contract.saleType ? SALE_TYPE_LABELS[contract.saleType] : null} /></Col>
          {contract.banks?.length > 0 && (
            <Col span={24}>
              <Field
                label="Банки"
                value={
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {contract.banks.map((b: any) => (
                      <Tag key={b.bankId} icon={<BankOutlined />}>
                        {b.bank?.name}
                        {b.advance != null && ` — ${Number(b.advance).toLocaleString()}`}
                      </Tag>
                    ))}
                  </div>
                }
              />
            </Col>
          )}
        </Row>
      </Card>

      {/* Товар */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>ТОВАР</Divider>
        {/* Список товаров договора */}
        {contract.contractItems?.length > 0 && (
          <Table
            size="small"
            pagination={false}
            dataSource={contract.contractItems}
            rowKey="id"
            style={{ marginBottom: 12 }}
            columns={[
              {
                title: "Товар",
                render: (_: any, r: any) => `${r.product?.name ?? "—"} (${r.product?.unit ?? ""})`,
              },
              {
                title: "Кол-во",
                dataIndex: "quantity",
                width: 160,
                render: (v: any, r: any) =>
                  canEdit && contract.status !== "VERIFIED" && contract.status !== "CANCELLED" ? (
                    editItemId === r.id ? (
                      <Space size={4}>
                        <InputNumber
                          size="small"
                          min={0.001}
                          value={editItemQty}
                          onChange={(val) => setEditItemQty(val ?? Number(v))}
                          style={{ width: 70 }}
                          autoFocus
                        />
                        <Button
                          size="small"
                          type="primary"
                          loading={editItemUpdating}
                          onClick={() => handleUpdateItem(r.id, editItemQty)}
                        >
                          ОК
                        </Button>
                        <Button size="small" onClick={() => setEditItemId(null)}>✕</Button>
                      </Space>
                    ) : (
                      <Space size={4}>
                        <span>{Number(v)}</span>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleStartEditItem(r)}
                        />
                      </Space>
                    )
                  ) : Number(v),
              },
              {
                title: "Тип",
                dataIndex: "type",
                width: 160,
                render: (v: string) => v === "SALE" ? "Продажа" : "Подарок к договору",
              },
              ...(canEdit && contract.status !== "VERIFIED" && contract.status !== "CANCELLED" ? [{
                title: "",
                key: "action",
                width: 40,
                render: (_: any, r: any) => (
                  <Popconfirm
                    title="Удалить товар из договора?"
                    onConfirm={() => handleRemoveItem(r.id)}
                    okText="Да"
                    cancelText="Нет"
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={itemRemoving === r.id}
                    />
                  </Popconfirm>
                ),
              }] : []),
            ]}
          />
        )}
        {/* Форма добавления товара — только до верификации */}
        {canEdit && contract.status !== "VERIFIED" && contract.status !== "CANCELLED" && (
          <Space wrap>
            <Select
              placeholder="Товар"
              style={{ minWidth: 220 }}
              value={itemProductId}
              onChange={setItemProductId}
              showSearch
              optionFilterProp="label"
              options={warehouseStock.map((s: any) => ({
                value: s.productId,
                label: `${s.product?.name ?? s.productId} (${s.product?.unit ?? ""}) — ${Number(s.quantity)}`,
              }))}
            />
            <InputNumber
              min={0.001}
              step={1}
              value={itemQty}
              onChange={(v) => setItemQty(v ?? 1)}
              style={{ width: 90 }}
            />
            <Select
              value={itemType}
              onChange={setItemType}
              style={{ width: 170 }}
              options={[
                { value: "SALE", label: "Продажа" },
                { value: "GIFT", label: "Подарок к договору" },
              ]}
            />
            <Button
              type="primary"
              onClick={handleAddItem}
              loading={itemAdding}
              disabled={!itemProductId}
            >
              Добавить
            </Button>
          </Space>
        )}
      </Card>

      {/* Модалка выбора склада при неактивном складе выезда */}
      <Modal
        open={returnModalOpen}
        title="Выберите склад для возврата товара"
        onCancel={() => { setReturnModalOpen(false); setPendingUpdatePayload(null); setReturnWarehouseId(undefined); }}
        onOk={() => {
          if (pendingUpdatePayload && returnWarehouseId) {
            handleUpdateItem(pendingUpdatePayload.itemId, pendingUpdatePayload.qty, returnWarehouseId);
          }
        }}
        okButtonProps={{ disabled: !returnWarehouseId, loading: editItemUpdating }}
        okText="Подтвердить"
        cancelText="Отмена"
      >
        <div style={{ marginBottom: 12, fontSize: 13 }}>
          Выезд <b>{contract?.trip?.name}</b> закрыт — перемещение товара на склад выезда невозможно.
          Укажите личный или центральный склад для возврата разницы:
        </div>
        <Select
          style={{ width: "100%" }}
          placeholder="Выберите склад"
          value={returnWarehouseId}
          onChange={setReturnWarehouseId}
          showSearch
          optionFilterProp="label"
          options={allWarehouses.map((w: any) => ({
            value: w.id,
            label: `${w.name} (${w.type === 'CENTRAL' ? 'Центральный' : 'Личный'})`,
          }))}
        />
      </Modal>

      {/* Финансы */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>ФИНАНСЫ</Divider>
        <Row gutter={[16, 0]}>
          <Col xs={12} sm={6}>
            <Field
              label="Общая сумма (до возврата)"
              value={<Text strong style={{ fontSize: 16 }}>{Number(contract.totalAmount).toLocaleString()}</Text>}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Field
              label="Общая сумма (после возврата)"
              value={
                <Text
                  strong
                  style={{
                    fontSize: 16,
                    color: hasRefund ? (amountAfterRefund === 0 ? "#ff4d4f" : "#fa8c16") : undefined,
                  }}
                >
                  {amountAfterRefund.toLocaleString()}
                </Text>
              }
            />
          </Col>
          <Col xs={12} sm={6}><Field label="Аванс наличные" value={Number(contract.advanceCash || 0).toLocaleString()} /></Col>
          <Col xs={12} sm={6}><Field label="Аванс терминал" value={Number(contract.advanceTerminal || 0).toLocaleString()} /></Col>
          {contract.banks?.some((b: any) => b.advance != null) ? (
            contract.banks.filter((b: any) => b.advance != null).map((b: any) => {
              const advance = Number(b.advance);
              const rate = b.conditionRate != null ? Number(b.conditionRate) : null;
              const realMoney = rate != null ? advance * (1 - rate / 100) : null;
              const condLabel = b.conditionName && rate != null ? ` (${b.conditionName} — ${rate}%)` : '';
              return (
                <Col xs={12} sm={6} key={b.bankId}>
                  <Field
                    label={`Аванс ${b.bank?.name}${condLabel}`}
                    value={
                      realMoney != null
                        ? `${advance.toLocaleString()} / ${Math.round(realMoney).toLocaleString()}`
                        : advance.toLocaleString()
                    }
                  />
                </Col>
              );
            })
          ) : (
            <Col xs={12} sm={6}><Field label="Аванс банк" value={Number(contract.advanceBank || 0).toLocaleString()} /></Col>
          )}
          <Col xs={12} sm={6}>
            <Field label="Итого авансов" value={<Text strong>{totalAdvances.toLocaleString()}</Text>} />
          </Col>
          {hasBankConditions && (
            <Col xs={12} sm={6}>
              <Field label="Итого авансов (реал. деньги)" value={<Text strong>{Math.round(totalRealMoney).toLocaleString()}</Text>} />
            </Col>
          )}
          {(contract.paymentType === "COMPANY" || contract.paymentType === "MIXED") && (
            <Col xs={12} sm={6}>
              <Field
                label="Остаток (рассрочка)"
                value={<Text strong style={{ color: installmentBalance < 0 ? "#ff4d4f" : undefined }}>{installmentBalance.toLocaleString()}</Text>}
              />
            </Col>
          )}
          {contract.installmentMonths && (
            <Col xs={12} sm={6}><Field label="Кол-во месяцев" value={contract.installmentMonths} /></Col>
          )}
          {contract.firstPaymentDate && (
            <Col xs={12} sm={6}><Field label="Первый платёж" value={dayjs(contract.firstPaymentDate).format("DD.MM.YYYY")} /></Col>
          )}
          {/* Должник */}
          <Col xs={12} sm={6}>
            <Field
              label="Должник"
              value={
                <Tag color={isDebtor ? "error" : "success"} style={{ marginTop: 2 }}>
                  {isDebtor ? "Да" : "Нет"}
                </Tag>
              }
            />
          </Col>
          {/* Спасенный контракт */}
          <Col xs={12} sm={6}>
            <Field
              label="Спасенный контракт"
              value={
                savedContract === null
                  ? <span style={{ color: "#555" }}>—</span>
                  : <Tag color={savedContract === "yes" ? "success" : "error"} style={{ marginTop: 2 }}>
                      {savedContract === "yes" ? "Да" : "Нет"}
                    </Tag>
              }
            />
          </Col>
        </Row>

        {/* Кнопки возврата — только для верифицированных договоров */}
        {canEdit && contract.status === "VERIFIED" && (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {contract.paymentStatus !== "REFUND" && (
              <Button icon={<RollbackOutlined />} onClick={openRefundModal}>
                Возврат
              </Button>
            )}
            <Button icon={<EditOutlined />} onClick={openFinModal}>
              Частичный возврат
            </Button>
          </div>
        )}
      </Card>

      {/* График платежей */}
      {contract.paymentSchedule?.length > 0 && (
        <Card size="small">
          <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>ГРАФИК ПЛАТЕЖЕЙ</Divider>
          {canEdit && nextUnpaidPayment && contract.status === "VERIFIED" && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <Popconfirm
                title={`Подтвердить платёж от ${dayjs(nextUnpaidPayment.date).format("DD.MM.YYYY")}?`}
                onConfirm={() => handlePayScheduleItem(nextUnpaidPayment.id)}
                okText="Да"
                cancelText="Нет"
              >
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={payingScheduleItemId === nextUnpaidPayment.id}
                >
                  Подтвердить платёж {dayjs(nextUnpaidPayment.date).format("DD.MM.YYYY")}
                </Button>
              </Popconfirm>
            </div>
          )}
          <Table
            size="small"
            dataSource={contract.paymentSchedule}
            rowKey={(r: any) => r.id || r.order}
            pagination={false}
            columns={[
              { title: "#", key: "num", width: 50, render: (_: any, __: any, i: number) => i + 1 },
              { title: "Дата", key: "date", render: (_: any, r: any) => dayjs(r.date).format("DD.MM.YYYY") },
              { title: "Сумма", key: "amount", render: (_: any, r: any) => Number(r.amount).toLocaleString() },
              {
                title: "Статус",
                key: "isPaid",
                render: (_: any, r: any) => {
                  const isOverdue = !r.isPaid && dayjs(r.date).isBefore(dayjs(), "day");
                  return (
                  <Space size={4}>
                    <Tag color={r.isPaid ? "success" : isOverdue ? "error" : "default"}>
                      {r.isPaid ? "Оплачен" : isOverdue ? "Просрочен" : "Ожидает"}
                    </Tag>
                    {/* Крестик отмены — только у последнего оплаченного, только для верифицированных */}
                    {canEdit && r.isPaid && lastPaidPayment?.id === r.id && contract.status === "VERIFIED" && (
                      <Popconfirm
                        title="Отменить подтверждение этого платежа?"
                        onConfirm={() => handleUnpayScheduleItem(r.id)}
                        okText="Да"
                        cancelText="Нет"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<CloseCircleOutlined />}
                          loading={payingScheduleItemId === r.id}
                          style={{ padding: "0 2px" }}
                        />
                      </Popconfirm>
                    )}
                  </Space>
                  );
                },
              },
            ]}
            summary={() => {
              const total = contract.paymentSchedule.reduce((s: number, r: any) => s + Number(r.amount), 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}><Text strong>Итого:</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2}><Text strong>{total.toLocaleString()}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} />
                </Table.Summary.Row>
              );
            }}
          />
        </Card>
      )}

      {/* Вложения */}
      <Card size="small" style={{ marginTop: 12 }}>
        <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>
          <Space><PaperClipOutlined />ВЛОЖЕНИЯ ({contract.files?.length ?? 0}/15)</Space>
        </Divider>

        {/* Сетка загруженных файлов */}
        {contract.files?.length > 0 && (
          <Image.PreviewGroup>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {contract.files.map((file: any) => {
                const isImage = file.mimeType?.startsWith("image/");
                const blobUrl = fileBlobUrls[file.id];
                return (
                  <div key={file.id} style={{ position: "relative", width: 88, flexShrink: 0 }}>
                    <div
                      style={{
                        width: 88,
                        height: 88,
                        borderRadius: 6,
                        overflow: "hidden",
                        border: "1px solid #333",
                        background: "#111",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: isImage ? "zoom-in" : "pointer",
                      }}
                      onClick={!isImage ? () => handleDownloadFile(file.id, file.fileName, file.mimeType) : undefined}
                    >
                      {isImage ? (
                        <Image
                          width={88}
                          height={88}
                          src={blobUrl}
                          style={{ objectFit: "cover", display: "block" }}
                          placeholder={
                            <div style={{ width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <FileImageOutlined style={{ fontSize: 28, color: "#444" }} />
                            </div>
                          }
                          preview={blobUrl ? undefined : false}
                        />
                      ) : (
                        <div style={{ textAlign: "center" }}>
                          <FilePdfOutlined style={{ fontSize: 32, color: "#ff4d4f" }} />
                        </div>
                      )}
                    </div>

                    {/* Название файла */}
                    <div style={{ fontSize: 10, color: "#888", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 88 }}>
                      {file.fileName}
                    </div>

                    {/* Кнопка удаления */}
                    {canEdit && (
                      <Popconfirm
                        title="Удалить файл?"
                        onConfirm={() => handleDeleteFile(file.id)}
                        okText="Да"
                        cancelText="Нет"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<CloseOutlined style={{ fontSize: 10 }} />}
                          loading={deletingFileId === file.id}
                          style={{
                            position: "absolute",
                            top: 3,
                            right: 3,
                            width: 18,
                            height: 18,
                            minWidth: 18,
                            padding: 0,
                            lineHeight: "16px",
                            background: "rgba(0,0,0,0.65)",
                            borderRadius: 3,
                          }}
                        />
                      </Popconfirm>
                    )}
                  </div>
                );
              })}
            </div>
          </Image.PreviewGroup>
        )}

        {/* Кнопка открытия модалки загрузки */}
        {canEdit && (contract.files?.length ?? 0) < 15 && (
          <Button
            icon={<UploadOutlined />}
            size="small"
            onClick={() => { setPendingFiles([]); setPendingPreviews({}); setUploadModalOpen(true); }}
          >
            Загрузить файлы
          </Button>
        )}

        {(contract.files?.length ?? 0) === 0 && contract.status === "UNVERIFIED" && (
          <Alert
            type="warning"
            showIcon
            message="Для верификации необходимо загрузить хотя бы 1 файл"
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      {/* История действий по договору */}
      <Card size="small" style={{ marginTop: 12 }}>
        <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>
          <Space><HistoryOutlined />ИСТОРИЯ</Space>
        </Divider>
        {historyLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>
        ) : history.length === 0 ? (
          <div style={{ color: "#555", fontSize: 13, padding: "8px 0" }}>История пуста</div>
        ) : (
          <Timeline
            style={{ marginTop: 8 }}
            items={history.map((log) => {
              const details = formatAuditDetails(log.action, log.details);
              const color = AUDIT_ACTION_COLORS[log.action] || "gray";
              const userName = log.user
                ? `${log.user.lastName} ${log.user.firstName}`
                : "Система";
              const roleName = log.user?.role?.name;
              return {
                color,
                children: (
                  <div style={{ paddingBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text strong style={{ fontSize: 13 }}>
                        {AUDIT_ACTION_LABELS[log.action] || log.action}
                      </Text>
                    </div>
                    {details && <div style={{ marginTop: 4 }}>{details}</div>}
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                      <UserOutlined />
                      <span>{userName}</span>
                      {roleName && (
                        <Tag style={{ fontSize: 11, lineHeight: "16px", padding: "0 5px" }}>
                          {roleName}
                        </Tag>
                      )}
                      <span style={{ marginLeft: 4 }}>
                        {dayjs(log.createdAt).format("DD.MM.YYYY HH:mm")}
                      </span>
                    </div>
                  </div>
                ),
              };
            })}
          />
        )}
      </Card>

      {/* Модалка "Оформить возврат" */}
      <Modal
        title="Оформить возврат"
        open={refundOpen}
        onCancel={() => setRefundOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setRefundOpen(false)}>Отмена</Button>
            <Popconfirm
              title="Подтвердить обнуление авансов?"
              description="Все авансы будут обнулены, статус изменится на «Возврат»."
              onConfirm={handleRefundConfirm}
              okText="Подтвердить"
              cancelText="Нет"
            >
              <Button type="primary" danger loading={refundLoading}>
                Подтвердить обнуление авансов
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Alert
          type="warning"
          showIcon
          message="После подтверждения все авансы будут обнулены и статус изменится на «Возврат»."
          style={{ marginBottom: 16 }}
        />
        <Form form={refundForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Аванс наличные" name="advanceCash">
                <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Аванс терминал" name="advanceTerminal">
                <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} disabled />
              </Form.Item>
            </Col>
            {contract.banks?.length > 0 ? (
              contract.banks.map((b: any) => (
                <Col span={12} key={b.bankId}>
                  <Form.Item label={`Аванс ${b.bank?.name}`} name={["bankAdvances", b.bankId]}>
                    <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} disabled />
                  </Form.Item>
                </Col>
              ))
            ) : (
              <Col span={12}>
                <Form.Item label="Аванс банк" name="advanceBank">
                  <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} disabled />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Form>
        <div style={{ textAlign: "right", color: "#888", fontSize: 12 }}>
          Все поля будут обнулены при подтверждении.
        </div>
      </Modal>

      {/* Модалка "Редактировать финансы договора" */}
      <Modal
        title="Редактировать финансы договора"
        open={finOpen}
        onCancel={() => setFinOpen(false)}
        onOk={handleFinSave}
        destroyOnClose
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={finLoading}
        okButtonProps={{ disabled: !finCanSave }}
        width={750}
      >
        <Alert
          type="info"
          showIcon
          message="После сохранения статус договора изменится на «Частичный возврат»."
          style={{ marginBottom: 16 }}
        />
        <Form form={finForm} layout="vertical">
          <FinancialsFormContent
            form={finForm}
            tripBanks={tripBanks}
            paymentSchedule={finPaymentSchedule}
            setPaymentSchedule={setFinPaymentSchedule}
            originalTotalAmount={Number(contract?.totalAmount || 0)}
            onCanSaveChange={setFinCanSave}
            initialPaymentType={contract?.paymentType ?? "CASH"}
            bankConditions={finBankConditions}
            setBankConditions={setFinBankConditions}
          />
        </Form>
      </Modal>

      {/* Модалка загрузки файлов */}
      <Modal
        title="Загрузить файлы"
        open={uploadModalOpen}
        onCancel={() => { if (!bulkUploading) { setUploadModalOpen(false); setPendingFiles([]); setPendingPreviews({}); } }}
        onOk={handleBulkUpload}
        okText={pendingFiles.length > 0 ? `Загрузить (${pendingFiles.length})` : "Загрузить"}
        cancelText="Отмена"
        confirmLoading={bulkUploading}
        okButtonProps={{ disabled: pendingFiles.length === 0 }}
        destroyOnHidden
        width={560}
      >
        <Upload.Dragger
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          showUploadList={false}
          beforeUpload={addPendingFile}
          disabled={bulkUploading || (contract.files?.length ?? 0) + pendingFiles.length >= 15}
          style={{ marginBottom: pendingFiles.length > 0 ? 12 : 0 }}
        >
          <p style={{ margin: "8px 0 4px" }}><InboxOutlined style={{ fontSize: 32, color: "#555" }} /></p>
          <p style={{ fontSize: 13, margin: "0 0 4px" }}>Перетащите файлы сюда или нажмите для выбора</p>
          <p style={{ fontSize: 11, color: "#666", margin: 0 }}>
            JPG, PNG, GIF, WebP, PDF · до 2 МБ · осталось мест: {Math.max(0, 15 - (contract.files?.length ?? 0) - pendingFiles.length)}
          </p>
        </Upload.Dragger>

        {pendingFiles.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {pendingFiles.map((file, index) => {
              const key = file.name + file.size;
              const preview = pendingPreviews[key];
              return (
                <div key={index} style={{ position: "relative", width: 88, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 6,
                      overflow: "hidden",
                      border: "1px solid #333",
                      background: "#111",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {preview ? (
                      <img src={preview} style={{ width: 88, height: 88, objectFit: "cover", display: "block" }} />
                    ) : (
                      <FilePdfOutlined style={{ fontSize: 32, color: "#ff4d4f" }} />
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "#888", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 88 }}>
                    {file.name}
                  </div>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<CloseOutlined style={{ fontSize: 10 }} />}
                    onClick={() => removePendingFile(index)}
                    style={{
                      position: "absolute",
                      top: 3,
                      right: 3,
                      width: 18,
                      height: 18,
                      minWidth: 18,
                      padding: 0,
                      lineHeight: "16px",
                      background: "rgba(0,0,0,0.65)",
                      borderRadius: 3,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Модалка редактирования договора (только до верификации) */}
      {id && (
        <ContractEditModal
          contractId={id}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
