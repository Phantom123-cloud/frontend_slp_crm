import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Card,
  InputNumber,
  Divider,
  message,
  Spin,
  Table,
  Row,
  Col,
  Upload,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  InboxOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  CloseOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { contractsApi } from "../../api/contracts";
import { warehousesApi } from "../../api/warehouses";
import { tripsApi } from "../../api/trips";
import { useAuthStore } from "../../store/auth";
import { usePermission } from "../../hooks/usePermission";

const { Title, Text } = Typography;

// Коды стран для телефонов
const COUNTRY_CODES = [
  { code: "+998", label: "🇺🇿 +998 (Узбекистан)" },
  { code: "+7", label: "🇷🇺 +7 (Россия/Казахстан)" },
  { code: "+996", label: "🇰🇬 +996 (Кыргызстан)" },
  { code: "+992", label: "🇹🇯 +992 (Таджикистан)" },
  { code: "+993", label: "🇹🇲 +993 (Туркменистан)" },
  { code: "+994", label: "🇦🇿 +994 (Азербайджан)" },
  { code: "+374", label: "🇦🇲 +374 (Армения)" },
  { code: "+380", label: "🇺🇦 +380 (Украина)" },
  { code: "+375", label: "🇧🇾 +375 (Беларусь)" },
  { code: "+995", label: "🇬🇪 +995 (Грузия)" },
  { code: "+90", label: "🇹🇷 +90 (Турция)" },
  { code: "+49", label: "🇩🇪 +49 (Германия)" },
];

const PAYMENT_TYPE_OPTIONS = [
  { value: "CASH", label: "Наличными" },
  { value: "CREDIT", label: "Кредит" },
  { value: "COMPANY", label: "Компания" },
  { value: "MIXED", label: "Смешанный" },
  { value: "TERMINAL", label: "Терминал" },
  { value: "RESERVATION", label: "Резервация" },
];

const SALE_TYPE_OPTIONS = [
  { value: "RAFFLE", label: "Розыгрыш" },
  { value: "HOURLY", label: "Часовка" },
];

export default function ContractFormPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const currentUser = useAuthStore((s) => s.user);
  const canCreateAny = usePermission("contracts.create-any");
  // Режим "только за себя" — поля Ведущий и Подписано заблокированы
  const isCreateOwnOnly = !canCreateAny;

  const tripId = searchParams.get("tripId") || "";
  const presentationId = searchParams.get("presentationId") || "";
  const signedByIdParam = searchParams.get("userId") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Данные для селектов
  const [trip, setTrip] = useState<any>(null);
  const [presentation, setPresentation] = useState<any>(null);
  const [tripBanks, setTripBanks] = useState<any[]>([]);
  const [tripCompanies, setTripCompanies] = useState<any[]>([]);
  const [crewMembers, setCrewMembers] = useState<any[]>([]);

  // Телефоны (динамические)
  const [phones, setPhones] = useState<{ countryCode: string; number: string }[]>([
    { countryCode: "+998", number: "" },
  ]);

  // Товары договора
  const [warehouseStock, setWarehouseStock] = useState<any[]>([]);
  const [contractItems, setContractItems] = useState<{ productId: string; quantity: number; type: 'SALE' | 'GIFT' }[]>([]);
  const [itemsError, setItemsError] = useState(false);

  // Файлы для загрузки после создания
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<Record<string, string>>({});

  const addPendingFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) { message.error(`${file.name}: превышает 2 МБ`); return false; }
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) { message.error(`${file.name}: недопустимый тип`); return false; }
    if (pendingFiles.length >= 15) { message.error("Максимум 15 файлов"); return false; }
    setPendingFiles((prev) => [...prev, file]);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPendingPreviews((prev) => ({ ...prev, [file.name + file.size]: url }));
    }
    return false;
  };

  const removePendingFile = (index: number) => {
    const file = pendingFiles[index];
    const key = file.name + file.size;
    if (pendingPreviews[key]) { URL.revokeObjectURL(pendingPreviews[key]); setPendingPreviews((p) => { const n = { ...p }; delete n[key]; return n; }); }
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // График платежей (для COMPANY)
  const [paymentSchedule, setPaymentSchedule] = useState<{ date: dayjs.Dayjs; amount: number }[]>([]);

  const paymentType = Form.useWatch("paymentType", form);
  const totalAmount = Form.useWatch("totalAmount", form) || 0;
  const advanceCash = Form.useWatch("advanceCash", form) || 0;
  const advanceTerminal = Form.useWatch("advanceTerminal", form) || 0;
  const installmentMonths = Form.useWatch("installmentMonths", form) || 0;
  const firstPaymentDate = Form.useWatch("firstPaymentDate", form);

  // Превью номера договора
  const [previewNumber, setPreviewNumber] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const watchedSignedById = Form.useWatch("signedById", form);
  const watchedContractDate = Form.useWatch("contractDate", form);

  useEffect(() => {
    if (!presentationId || !watchedSignedById || !watchedContractDate) {
      setPreviewNumber(null);
      return;
    }
    // Дебаунс 600ms
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await contractsApi.previewNumber({
          presentationId,
          signedById: watchedSignedById,
          contractDate: watchedContractDate.toISOString(),
        });
        setPreviewNumber(res.data.number);
      } catch {
        setPreviewNumber(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [presentationId, watchedSignedById, watchedContractDate]);

  // Банки: одиночный для CREDIT, мульти для MIXED
  const selectedBankId = Form.useWatch("bankId", form);
  const selectedBankIds: string[] = Form.useWatch("bankIds", form) || [];
  // Авансы по банкам: { [bankId]: number }
  const bankAdvancesObj: Record<string, number> = Form.useWatch("bankAdvances", form) || {};
  // Выбранные условия банков: { [bankId]: { conditionId, conditionName, conditionRate } }
  const [bankConditions, setBankConditions] = useState<Record<string, { conditionId: string; conditionName: string; conditionRate: number }>>({});

  // Суммарный аванс по всем банкам
  const totalBankAdvance = (() => {
    if (paymentType === "CREDIT") return Number(bankAdvancesObj[selectedBankId] || 0);
    if (paymentType === "MIXED") return selectedBankIds.reduce((s, id) => s + (Number(bankAdvancesObj[id]) || 0), 0);
    return 0;
  })();

  // Итого авансов
  const totalAdvances = Number(advanceCash) + Number(advanceTerminal) + totalBankAdvance;
  // Остаток для рассрочки
  const installmentBalance = Number(totalAmount) - totalAdvances;

  useEffect(() => {
    loadData();
  }, []);

  // Автогенерация графика платежей при изменении параметров рассрочки
  const hasInstallment = paymentType === "COMPANY" || paymentType === "MIXED";
  useEffect(() => {
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
    } else if (!hasInstallment) {
      setPaymentSchedule([]);
    }
  }, [paymentType, installmentMonths, firstPaymentDate, totalAmount, advanceCash, advanceTerminal, totalBankAdvance]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tripRes, banksRes, companiesRes] = await Promise.all([
        tripsApi.getById(tripId),
        tripsApi.getTripBanks(tripId),
        tripsApi.getTripCompanies(tripId),
      ]);

      const tripData = tripRes.data;
      setTrip(tripData);
      setTripBanks(banksRes.data);
      setTripCompanies(companiesRes.data);

      // Загружаем остатки склада выезда
      const warehouseId = tripData?.warehouse?.id;
      if (warehouseId) {
        try {
          const { data: wh } = await warehousesApi.getById(warehouseId);
          setWarehouseStock(wh.stock ?? []);
        } catch {}
      }

      // Находим нужную презентацию
      const pres = tripData.presentations?.find((p: any) => p.id === presentationId);
      if (pres) {
        setPresentation(pres);
        setCrewMembers(pres.crew || []);
        const leaderMember = (pres.crew || []).find((c: any) => c.role === "LEADER");

        // Пресеты формы
        form.setFieldsValue({
          presentationName: pres.name,
          tripName: tripData.name,
          contractDate: dayjs(),
          speakerId: leaderMember?.user?.id,
          signedById: signedByIdParam || currentUser?.id,
        });
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const addPhone = () => {
    if (phones.length < 10) {
      setPhones([...phones, { countryCode: "+998", number: "" }]);
    }
  };

  const removePhone = (idx: number) => {
    setPhones(phones.filter((_, i) => i !== idx));
  };

  const updatePhone = (idx: number, field: "countryCode" | "number", value: string) => {
    const updated = [...phones];
    updated[idx][field] = value;
    setPhones(updated);
  };

  const handleSubmit = async (values: any) => {
    // Проверяем телефоны
    const validPhones = phones.filter((p) => p.number.trim());
    if (validPhones.length === 0) {
      message.error("Добавьте хотя бы один номер телефона");
      return;
    }

    // Проверяем наличие товара
    if (contractItems.length === 0) {
      setItemsError(true);
      return;
    }
    setItemsError(false);

    // Авансы не должны превышать сумму договора
    const total = Number(values.totalAmount) || 0;
    if (totalAdvances > total) {
      message.error(
        `Сумма авансов (${totalAdvances.toLocaleString()}) превышает сумму договора (${total.toLocaleString()}).`
      );
      return;
    }

    // Авансы должны покрывать полную сумму, если нет реального графика рассрочки
    const hasSchedule = hasInstallment && paymentSchedule.length > 0;
    if (!hasSchedule) {
      if (totalAdvances < total) {
        message.error(
          `Сумма авансов (${totalAdvances.toLocaleString()}) меньше суммы договора (${total.toLocaleString()}). ` +
          `Заполните график рассрочки или увеличьте авансы.`
        );
        return;
      }
    }

    // Проверяем, что для банков с условиями выбрано условие
    const activeBankIds = paymentType === "CREDIT"
      ? (selectedBankId ? [selectedBankId] : [])
      : (selectedBankIds || []);
    for (const bankId of activeBankIds) {
      const bank = tripBanks.find((b) => b.id === bankId);
      if (bank?.conditions?.length > 0 && !bankConditions[bankId]) {
        message.error(`Выберите условие для банка ${bank.name}`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        clientName: values.clientName,
        contractDate: values.contractDate.format("YYYY-MM-DD"),
        companyId: values.companyId,
        paymentType: values.paymentType,
        saleType: values.saleType || undefined,
        presentationId,
        tripId,
        speakerId: values.speakerId || undefined,
        signedById: values.signedById,
        totalAmount: Number(values.totalAmount) || 0,
        advanceCash: Number(values.advanceCash) || undefined,
        advanceTerminal: Number(values.advanceTerminal) || undefined,
        advanceBank: totalBankAdvance || undefined,
        bankAdvances: totalBankAdvance > 0 ? bankAdvancesObj : undefined,
        installmentMonths: hasInstallment ? Number(values.installmentMonths) || undefined : undefined,
        firstPaymentDate: hasInstallment && values.firstPaymentDate
          ? values.firstPaymentDate.format("YYYY-MM-DD") : undefined,
        registrationAddress: values.registrationAddress,
        actualAddress: values.actualAddress,
        bankIds: activeBankIds,
        bankConditions: Object.keys(bankConditions).length > 0 ? bankConditions : undefined,
        phones: validPhones,
        paymentSchedule: hasInstallment
          ? paymentSchedule.map((s) => ({ date: s.date.format("YYYY-MM-DD"), amount: s.amount }))
          : [],
        items: contractItems.length > 0 ? contractItems : undefined,
      };

      const res = await contractsApi.create(payload);
      const contractId = res.data.id;
      // Загружаем прикреплённые файлы
      for (const file of pendingFiles) {
        try { await contractsApi.uploadFile(contractId, file); } catch {}
      }
      Object.values(pendingPreviews).forEach((url) => URL.revokeObjectURL(url));
      message.success(`Договор ${res.data.contractNumber} создан`);
      navigate(`/contracts/${contractId}`);
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 48px" }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/trips/${tripId}`)}
        style={{ marginBottom: 16 }}
      >
        К выезду {trip?.name}
      </Button>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <FileTextOutlined style={{ fontSize: 24, color: "#1677ff" }} />
        <Title level={3} style={{ margin: 0 }}>Новый договор</Title>
        {/* Превью номера */}
        {previewLoading && <Spin size="small" />}
        {!previewLoading && previewNumber && (
          <div style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
            border: "1px solid #6366f1",
            borderRadius: 8,
            padding: "4px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ color: "#a5b4fc", fontSize: 11, fontWeight: 500 }}>№</span>
            <span style={{ color: "#e0e7ff", fontSize: 18, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "monospace" }}>
              {previewNumber}
            </span>
          </div>
        )}
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onFinishFailed={() => {
          // Показываем ошибку товара даже если другие поля тоже не прошли валидацию
          if (contractItems.length === 0) setItemsError(true);
        }}
      >

        {/* Служебные поля (автозаполнение) */}
        <Card title="Выезд и презентация" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Выезд">
                <Input value={trip?.name} disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Презентация">
                <Input value={presentation?.name} disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="speakerId" label="Ведущий">
                <Select
                  placeholder="Выберите ведущего"
                  options={crewMembers
                    .filter((c) => c.role === "LEADER")
                    .map((c) => ({
                      value: c.user.id,
                      label: `${c.user.lastName} ${c.user.firstName}`,
                    }))}
                  allowClear
                  disabled={isCreateOwnOnly}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="signedById" label="Подписано (оформляет договор)" rules={[{ required: true }]}>
                <Select
                  placeholder="Выберите подписанта"
                  options={crewMembers.map((c) => ({
                    value: c.user.id,
                    label: `${c.user.lastName} ${c.user.firstName}`,
                  }))}
                  showSearch
                  optionFilterProp="label"
                  disabled={isCreateOwnOnly}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Данные клиента */}
        <Card title="Данные клиента" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="clientName" label="ФИО клиента" rules={[{ required: true, message: "Введите ФИО" }]}>
                <Input placeholder="Фамилия Имя Отчество" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contractDate" label="Дата договора" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
          </Row>

          {/* Телефоны */}
          <Form.Item label="Телефоны (до 10)">
            <Space direction="vertical" style={{ width: "100%" }}>
              {phones.map((phone, idx) => (
                <Space key={idx} style={{ width: "100%" }}>
                  <Select
                    value={phone.countryCode}
                    onChange={(v) => updatePhone(idx, "countryCode", v)}
                    style={{ width: 200 }}
                    options={COUNTRY_CODES.map((c) => ({ value: c.code, label: c.label }))}
                  />
                  <Input
                    value={phone.number}
                    onChange={(e) => updatePhone(idx, "number", e.target.value)}
                    placeholder="Номер без кода"
                    style={{ width: 200 }}
                  />
                  {phones.length > 1 && (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removePhone(idx)}
                    />
                  )}
                </Space>
              ))}
              {phones.length < 10 && (
                <Button type="dashed" icon={<PlusOutlined />} onClick={addPhone}>
                  Добавить номер
                </Button>
              )}
            </Space>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="registrationAddress" label="Адрес регистрации" rules={[{ required: true, message: "Введите адрес регистрации" }]}>
                <Input.TextArea rows={2} placeholder="Адрес постоянной регистрации" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="actualAddress" label="Адрес проживания" rules={[{ required: true, message: "Введите адрес проживания" }]}>
                <Input.TextArea rows={2} placeholder="Адрес фактического проживания" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Условия договора */}
        <Card title="Условия договора" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="companyId" label="Компания" rules={[{ required: true, message: "Выберите компанию" }]}>
                <Select
                  placeholder="Выберите компанию"
                  options={tripCompanies.map((c) => ({ value: c.id, label: c.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="saleType" label="Тип продажи">
                <Select
                  placeholder="Не указан (обычный договор)"
                  options={SALE_TYPE_OPTIONS}
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="paymentType" label="Тип оплаты" rules={[{ required: true, message: "Выберите тип оплаты" }]}>
                <Select placeholder="Выберите тип оплаты" options={PAYMENT_TYPE_OPTIONS} />
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
        </Card>

        {/* Финансы */}
        <Card title="Финансы" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="totalAmount" label="Общая сумма" rules={[{ required: true }]}>
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="advanceCash" label="Аванс наличные">
                <InputNumber style={{ width: "100%" }} min={0} placeholder="0" formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="advanceTerminal" label="Аванс терминал">
                <InputNumber style={{ width: "100%" }} min={0} placeholder="0" formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} />
              </Form.Item>
            </Col>
          </Row>
          {/* Авансы по банкам — для CREDIT (один банк) */}
          {paymentType === "CREDIT" && selectedBankId && (() => {
            const bank = tripBanks.find((b) => b.id === selectedBankId);
            return (
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name={["bankAdvances", selectedBankId]} label={`Аванс банк ${bank?.name || ""}`}>
                    <InputNumber style={{ width: "100%" }} min={0} placeholder="0" formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} />
                  </Form.Item>
                </Col>
                {(() => {
                  if (!bank?.conditions?.length) return null;
                  return (
                    <Col span={8}>
                      <Form.Item
                        label={`Условие ${bank.name}`}
                        required
                        validateStatus={!bankConditions[selectedBankId] ? 'error' : ''}
                        help={!bankConditions[selectedBankId] ? 'Выберите условие' : ''}
                      >
                        <Select
                          placeholder="Выберите условие"
                          value={bankConditions[selectedBankId]?.conditionId}
                          onChange={(val) => {
                            const cond = bank.conditions.find((c: any) => c.id === val);
                            if (cond) {
                              setBankConditions(prev => ({
                                ...prev,
                                [selectedBankId]: { conditionId: cond.id, conditionName: cond.name, conditionRate: Number(cond.rate) }
                              }));
                            }
                          }}
                          options={bank.conditions.map((c: any) => ({
                            value: c.id,
                            label: `${c.name} — ${Number(c.rate)}%`
                          }))}
                        />
                      </Form.Item>
                    </Col>
                  );
                })()}
              </Row>
            );
          })()}

          {/* Авансы по банкам — для MIXED (несколько банков) */}
          {paymentType === "MIXED" && selectedBankIds.length > 0 && (
            <Row gutter={16}>
              {selectedBankIds.map((bankId) => {
                const bank = tripBanks.find((b) => b.id === bankId);
                return (
                  <>
                    <Col span={8} key={bankId}>
                      <Form.Item name={["bankAdvances", bankId]} label={`Аванс банк ${bank?.name || ""}`}>
                        <InputNumber style={{ width: "100%" }} min={0} placeholder="0" formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} />
                      </Form.Item>
                    </Col>
                    {bank?.conditions?.length > 0 && (
                      <Col span={8} key={`${bankId}-cond`}>
                        <Form.Item
                          label={`Условие ${bank.name}`}
                          required
                          validateStatus={!bankConditions[bankId] ? 'error' : ''}
                          help={!bankConditions[bankId] ? 'Выберите условие' : ''}
                        >
                          <Select
                            placeholder="Выберите условие"
                            value={bankConditions[bankId]?.conditionId}
                            onChange={(val) => {
                              const cond = bank.conditions.find((c: any) => c.id === val);
                              if (cond) {
                                setBankConditions(prev => ({
                                  ...prev,
                                  [bankId]: { conditionId: cond.id, conditionName: cond.name, conditionRate: Number(cond.rate) }
                                }));
                              }
                            }}
                            options={bank.conditions.map((c: any) => ({
                              value: c.id,
                              label: `${c.name} — ${Number(c.rate)}%`
                            }))}
                          />
                        </Form.Item>
                      </Col>
                    )}
                  </>
                );
              })}
            </Row>
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Итого авансов">
                <InputNumber
                  style={{ width: "100%" }}
                  value={totalAdvances}
                  disabled
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              {hasInstallment && (
                <Form.Item label="Остаток (рассрочка)">
                  <InputNumber
                    style={{ width: "100%", color: installmentBalance < 0 ? "red" : undefined }}
                    value={installmentBalance}
                    disabled
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                  />
                </Form.Item>
              )}
            </Col>
          </Row>

          {/* Рассрочка — для COMPANY и MIXED */}
          {hasInstallment && (
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

              {/* График платежей */}
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
                      {
                        title: "#",
                        key: "num",
                        width: 50,
                        render: (_: any, __: any, idx: number) => idx + 1,
                      },
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
                        </Table.Summary.Row>
                      );
                    }}
                  />
                </>
              )}
            </>
          )}
        </Card>

        {/* Товар */}
        <Card title="Товар" size="small" style={{ marginBottom: 16 }}>
          {contractItems.length > 0 && (
            <Table
              size="small"
              pagination={false}
              dataSource={contractItems}
              rowKey={(_, i) => String(i)}
              style={{ marginBottom: 12 }}
              columns={[
                {
                  title: "Товар",
                  dataIndex: "productId",
                  render: (v: string) => {
                    const s = warehouseStock.find((s: any) => s.productId === v);
                    return s ? `${s.product?.name} (${s.product?.unit})` : v;
                  },
                },
                {
                  title: "Кол-во",
                  dataIndex: "quantity",
                  width: 90,
                  render: (v: number, _: any, idx: number) => (
                    <InputNumber
                      size="small"
                      min={0.001}
                      value={v}
                      onChange={(val) => {
                        const updated = [...contractItems];
                        updated[idx].quantity = val ?? 1;
                        setContractItems(updated);
                      }}
                      style={{ width: 80 }}
                    />
                  ),
                },
                {
                  title: "Тип",
                  dataIndex: "type",
                  width: 180,
                  render: (v: string, _: any, idx: number) => (
                    <Select
                      size="small"
                      value={v}
                      onChange={(val) => {
                        const updated = [...contractItems];
                        updated[idx].type = val;
                        setContractItems(updated);
                      }}
                      style={{ width: 170 }}
                      options={[
                        { value: "SALE", label: "Продажа" },
                        { value: "GIFT", label: "Подарок к договору" },
                      ]}
                    />
                  ),
                },
                {
                  title: "",
                  key: "del",
                  width: 40,
                  render: (_: any, __: any, idx: number) => (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => setContractItems((prev) => prev.filter((_, i) => i !== idx))}
                    />
                  ),
                },
              ]}
            />
          )}
          <Space wrap>
            <Select
              placeholder="Добавить товар"
              style={{ minWidth: 220 }}
              showSearch
              optionFilterProp="label"
              options={warehouseStock.map((s: any) => ({
                value: s.productId,
                label: `${s.product?.name ?? s.productId} (${s.product?.unit ?? ""}) — ${Number(s.quantity)}`,
              }))}
              value={undefined}
              onChange={(productId: string) => {
                setContractItems((prev) => [...prev, { productId, quantity: 1, type: "SALE" }]);
                setItemsError(false);
              }}
            />
          </Space>
          {itemsError && (
            <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>Добавьте хотя бы один товар</div>
          )}
          {warehouseStock.length === 0 && (
            <div style={{ color: "#888", fontSize: 12, marginTop: 8 }}>Склад выезда пуст или недоступен</div>
          )}
        </Card>

        {/* Вложения (необязательно) */}
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          title={<Space><PaperClipOutlined />Вложения ({pendingFiles.length}/15) — необязательно</Space>}
        >
          <Upload.Dragger
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            showUploadList={false}
            beforeUpload={addPendingFile}
            disabled={pendingFiles.length >= 15}
            style={{ marginBottom: pendingFiles.length > 0 ? 12 : 0 }}
          >
            <p style={{ margin: "4px 0" }}><InboxOutlined style={{ fontSize: 28, color: "#555" }} /></p>
            <p style={{ fontSize: 12, color: "#888", margin: 0 }}>JPG, PNG, GIF, WebP, PDF · до 2 МБ</p>
          </Upload.Dragger>
          {pendingFiles.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pendingFiles.map((file, index) => {
                const key = file.name + file.size;
                const preview = pendingPreviews[key];
                return (
                  <div key={index} style={{ position: "relative", width: 72, flexShrink: 0 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 6, overflow: "hidden", border: "1px solid #333", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {preview
                        ? <img src={preview} style={{ width: 72, height: 72, objectFit: "cover", display: "block" }} />
                        : <FilePdfOutlined style={{ fontSize: 28, color: "#ff4d4f" }} />}
                    </div>
                    <div style={{ fontSize: 10, color: "#888", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 72 }}>{file.name}</div>
                    <Button type="text" size="small" danger icon={<CloseOutlined style={{ fontSize: 10 }} />} onClick={() => removePendingFile(index)}
                      style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, minWidth: 16, padding: 0, background: "rgba(0,0,0,0.6)", borderRadius: 3 }} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={() => navigate(`/trips/${tripId}`)}>Отмена</Button>
          <Button type="primary" htmlType="submit" loading={saving} icon={<FileTextOutlined />}>
            Создать договор{pendingFiles.length > 0 ? ` + ${pendingFiles.length} файл(ов)` : ""}
          </Button>
        </div>
      </Form>
    </div>
  );
}
