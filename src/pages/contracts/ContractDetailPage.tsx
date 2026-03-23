import { useState, useEffect, useRef } from "react";
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
} from "@ant-design/icons";
import dayjs from "dayjs";
import { contractsApi } from "../../api/contracts";
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
}: {
  form: any;
  tripBanks: any[];
  paymentSchedule: { date: dayjs.Dayjs; amount: number }[];
  setPaymentSchedule: (s: { date: dayjs.Dayjs; amount: number }[]) => void;
  originalTotalAmount: number;
  onCanSaveChange: (v: boolean) => void;
  initialPaymentType: string;
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
          </Row>
        );
      })()}

      {/* Авансы банков MIXED */}
      {paymentType === "MIXED" && selectedBankIds.length > 0 && (
        <Row gutter={16}>
          {selectedBankIds.map((bankId) => {
            const bank = tripBanks.find((b) => b.id === bankId);
            return (
              <Col span={8} key={bankId}>
                <Form.Item name={["bankAdvances", bankId]} label={`Аванс банк ${bank?.name || ""}`}>
                  <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} placeholder="0" />
                </Form.Item>
              </Col>
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
  const canVerify = usePermission("contracts.verify");
  const canEdit = usePermission("contracts.edit");

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Банки выезда (для модалки финансов)
  const [tripBanks, setTripBanks] = useState<any[]>([]);

  // Модалка возврата
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundForm] = Form.useForm();

  // Модалка редактирования договора (для не верифицированных)
  const [editOpen, setEditOpen] = useState(false);

  // Подтверждение платежа по графику
  const [payingScheduleItemId, setPayingScheduleItemId] = useState<string | null>(null);

  const handlePayScheduleItem = async (scheduleItemId: string) => {
    setPayingScheduleItemId(scheduleItemId);
    try {
      const { data } = await contractsApi.payScheduleItem(scheduleItemId);
      setContract(data);
      message.success("Платёж подтверждён");
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка подтверждения платежа");
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

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await contractsApi.getById(id!);
      setContract(data);
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка загрузки договора");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

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

  const totalAdvances =
    (Number(contract.advanceCash) || 0) +
    (Number(contract.advanceTerminal) || 0) +
    bankTotal;

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

  // Следующий неоплаченный платёж (по порядку)
  const nextUnpaidPayment = contract.paymentSchedule?.find((s: any) => !s.isPaid) ?? null;

  const hasRefund = contract.paymentStatus === "REFUND" || contract.paymentStatus === "PARTIAL_REFUND";

  // Должник: авансы не покрывают исходную сумму договора
  const isDebtor = totalAdvances < Number(contract.totalAmount);

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

        {/* Не верифицирован: кнопка редактирования договора */}
        {canEdit && contract.status === "UNVERIFIED" && (
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
            Редактировать договор
          </Button>
        )}
        {canVerify && contract.status === "UNVERIFIED" && (
          <Popconfirm title="Верифицировать договор?" onConfirm={handleVerify} okText="Да" cancelText="Нет">
            <Button type="primary" icon={<CheckCircleOutlined />} loading={verifying}>
              Верифицировать
            </Button>
          </Popconfirm>
        )}
        {canVerify && contract.status === "VERIFIED" && (
          <Popconfirm title="Отменить верификацию?" onConfirm={handleUnverify} okText="Да" cancelText="Нет">
            <Button danger icon={<CloseCircleOutlined />} loading={verifying}>
              Отмена верификации
            </Button>
          </Popconfirm>
        )}
      </div>

      {/* Данные клиента */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>КЛИЕНТ</Divider>
        <Row gutter={[24, 0]}>
          <Col span={12}><Field label="ФИО" value={contract.clientName} /></Col>
          <Col span={6}><Field label="Дата договора" value={dayjs(contract.contractDate).format("DD.MM.YYYY")} /></Col>
          <Col span={6}>
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
          <Col span={12}><Field label="Адрес регистрации" value={contract.registrationAddress} /></Col>
          <Col span={12}><Field label="Адрес проживания" value={contract.actualAddress} /></Col>
        </Row>
      </Card>

      {/* Выезд и презентация */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>ВЫЕЗД И ПРЕЗЕНТАЦИЯ</Divider>
        <Row gutter={[24, 0]}>
          <Col span={6}><Field label="Выезд" value={contract.trip?.name} /></Col>
          <Col span={6}><Field label="Презентация" value={contract.presentation?.name} /></Col>
          <Col span={6}><Field label="Ведущий" value={contract.speaker ? `${contract.speaker.lastName} ${contract.speaker.firstName}` : null} /></Col>
          <Col span={6}><Field label="Оформил" value={contract.signedBy ? `${contract.signedBy.lastName} ${contract.signedBy.firstName}` : null} /></Col>
        </Row>
      </Card>

      {/* Условия */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>УСЛОВИЯ ДОГОВОРА</Divider>
        <Row gutter={[24, 0]}>
          <Col span={8}><Field label="Компания" value={contract.company?.name} /></Col>
          <Col span={8}><Field label="Тип оплаты" value={PAYMENT_TYPE_LABELS[contract.paymentType] || contract.paymentType} /></Col>
          <Col span={8}><Field label="Тип продажи" value={contract.saleType ? SALE_TYPE_LABELS[contract.saleType] : null} /></Col>
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

      {/* Финансы */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>ФИНАНСЫ</Divider>
        <Row gutter={[24, 0]}>
          <Col span={6}>
            <Field
              label="Общая сумма (до возврата)"
              value={<Text strong style={{ fontSize: 16 }}>{Number(contract.totalAmount).toLocaleString()}</Text>}
            />
          </Col>
          <Col span={6}>
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
          <Col span={6}><Field label="Аванс наличные" value={Number(contract.advanceCash || 0).toLocaleString()} /></Col>
          <Col span={6}><Field label="Аванс терминал" value={Number(contract.advanceTerminal || 0).toLocaleString()} /></Col>
          {contract.banks?.some((b: any) => b.advance != null) ? (
            contract.banks.filter((b: any) => b.advance != null).map((b: any) => (
              <Col span={6} key={b.bankId}>
                <Field label={`Аванс ${b.bank?.name}`} value={Number(b.advance).toLocaleString()} />
              </Col>
            ))
          ) : (
            <Col span={6}><Field label="Аванс банк" value={Number(contract.advanceBank || 0).toLocaleString()} /></Col>
          )}
          <Col span={6}>
            <Field label="Итого авансов" value={<Text strong>{totalAdvances.toLocaleString()}</Text>} />
          </Col>
          {(contract.paymentType === "COMPANY" || contract.paymentType === "MIXED") && (
            <Col span={6}>
              <Field
                label="Остаток (рассрочка)"
                value={<Text strong style={{ color: installmentBalance < 0 ? "#ff4d4f" : undefined }}>{installmentBalance.toLocaleString()}</Text>}
              />
            </Col>
          )}
          {contract.installmentMonths && (
            <Col span={6}><Field label="Кол-во месяцев" value={contract.installmentMonths} /></Col>
          )}
          {contract.firstPaymentDate && (
            <Col span={6}><Field label="Первый платёж" value={dayjs(contract.firstPaymentDate).format("DD.MM.YYYY")} /></Col>
          )}
          {/* Должник */}
          <Col span={6}>
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
          {savedContract !== null && (
            <Col span={6}>
              <Field
                label="Спасенный контракт"
                value={
                  <Tag color={savedContract === "yes" ? "success" : "default"} style={{ marginTop: 2 }}>
                    {savedContract === "yes" ? "Да" : "Нет"}
                  </Tag>
                }
              />
            </Col>
          )}
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
                render: (_: any, r: any) => (
                  <Tag color={r.isPaid ? "success" : "default"}>{r.isPaid ? "Оплачен" : "Ожидает"}</Tag>
                ),
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
          />
        </Form>
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
