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
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { contractsApi } from "../../api/contracts";
import { tripsApi } from "../../api/trips";
import { useAuthStore } from "../../store/auth";

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

  // График платежей (для COMPANY)
  const [paymentSchedule, setPaymentSchedule] = useState<{ date: dayjs.Dayjs; amount: number }[]>([]);

  const paymentType = Form.useWatch("paymentType", form);
  const totalAmount = Form.useWatch("totalAmount", form) || 0;
  const advanceCash = Form.useWatch("advanceCash", form) || 0;
  const advanceTerminal = Form.useWatch("advanceTerminal", form) || 0;
  const installmentMonths = Form.useWatch("installmentMonths", form) || 0;
  const firstPaymentDate = Form.useWatch("firstPaymentDate", form);

  // Банки: одиночный для CREDIT, мульти для MIXED
  const selectedBankId = Form.useWatch("bankId", form);
  const selectedBankIds: string[] = Form.useWatch("bankIds", form) || [];
  // Авансы по банкам: { [bankId]: number }
  const bankAdvancesObj: Record<string, number> = Form.useWatch("bankAdvances", form) || {};

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
        installmentMonths: hasInstallment ? Number(values.installmentMonths) || undefined : undefined,
        firstPaymentDate: hasInstallment && values.firstPaymentDate
          ? values.firstPaymentDate.format("YYYY-MM-DD") : undefined,
        registrationAddress: values.registrationAddress,
        actualAddress: values.actualAddress,
        bankIds: paymentType === "CREDIT"
          ? (selectedBankId ? [selectedBankId] : [])
          : (selectedBankIds || []),
        phones: validPhones,
        paymentSchedule: hasInstallment
          ? paymentSchedule.map((s) => ({ date: s.date.format("YYYY-MM-DD"), amount: s.amount }))
          : [],
      };

      const res = await contractsApi.create(payload);
      message.success(`Договор ${res.data.contractNumber} создан`);
      navigate(`/trips/${tripId}`);
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

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <FileTextOutlined style={{ fontSize: 24, color: "#1677ff" }} />
        <Title level={3} style={{ margin: 0 }}>Новый договор</Title>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>

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
              </Row>
            );
          })()}

          {/* Авансы по банкам — для MIXED (несколько банков) */}
          {paymentType === "MIXED" && selectedBankIds.length > 0 && (
            <Row gutter={16}>
              {selectedBankIds.map((bankId) => {
                const bank = tripBanks.find((b) => b.id === bankId);
                return (
                  <Col span={8} key={bankId}>
                    <Form.Item name={["bankAdvances", bankId]} label={`Аванс банк ${bank?.name || ""}`}>
                      <InputNumber style={{ width: "100%" }} min={0} placeholder="0" formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} />
                    </Form.Item>
                  </Col>
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

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={() => navigate(`/trips/${tripId}`)}>Отмена</Button>
          <Button type="primary" htmlType="submit" loading={saving} icon={<FileTextOutlined />}>
            Создать договор
          </Button>
        </div>
      </Form>
    </div>
  );
}
