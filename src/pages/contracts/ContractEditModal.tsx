import { useState, useEffect } from "react";
import {
  Modal, Form, Input, Select, DatePicker, Button, Space,
  InputNumber, Divider, message, Spin, Table, Row, Col, Card,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { contractsApi } from "../../api/contracts";
import { tripsApi } from "../../api/trips";

const COUNTRY_CODES = [
  { code: "+998", label: "🇺🇿 +998 (Узбекистан)" },
  { code: "+7",   label: "🇷🇺 +7 (Россия/Казахстан)" },
  { code: "+996", label: "🇰🇬 +996 (Кыргызстан)" },
  { code: "+992", label: "🇹🇯 +992 (Таджикистан)" },
  { code: "+993", label: "🇹🇲 +993 (Туркменистан)" },
  { code: "+994", label: "🇦🇿 +994 (Азербайджан)" },
  { code: "+374", label: "🇦🇲 +374 (Армения)" },
  { code: "+380", label: "🇺🇦 +380 (Украина)" },
  { code: "+375", label: "🇧🇾 +375 (Беларусь)" },
  { code: "+995", label: "🇬🇪 +995 (Грузия)" },
  { code: "+90",  label: "🇹🇷 +90 (Турция)" },
  { code: "+49",  label: "🇩🇪 +49 (Германия)" },
];

const PAYMENT_TYPE_OPTIONS = [
  { value: "CASH",        label: "Наличными" },
  { value: "CREDIT",      label: "Кредит" },
  { value: "COMPANY",     label: "Компания" },
  { value: "MIXED",       label: "Смешанный" },
  { value: "TERMINAL",    label: "Терминал" },
  { value: "RESERVATION", label: "Резервация" },
];

const SALE_TYPE_OPTIONS = [
  { value: "RAFFLE", label: "Розыгрыш" },
  { value: "HOURLY", label: "Часовка" },
];

const FMT = (v: any) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const PARSE = (v: any) => v.replace(/\s/g, "");

interface Props {
  contractId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContractEditModal({ contractId, open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Данные для селектов
  const [tripBanks, setTripBanks] = useState<any[]>([]);
  const [tripCompanies, setTripCompanies] = useState<any[]>([]);
  const [crewMembers, setCrewMembers] = useState<any[]>([]);

  // Телефоны (динамические)
  const [phones, setPhones] = useState<{ countryCode: string; number: string }[]>([
    { countryCode: "+998", number: "" },
  ]);

  // График платежей
  const [paymentSchedule, setPaymentSchedule] = useState<{ date: dayjs.Dayjs; amount: number }[]>([]);

  // Условия банков: { [bankId]: { conditionId, conditionName, conditionRate } }
  const [bankConditions, setBankConditions] = useState<Record<string, { conditionId: string; conditionName: string; conditionRate: number }>>({});

  const paymentType = Form.useWatch("paymentType", form);
  const totalAmount = Form.useWatch("totalAmount", form) || 0;
  const advanceCash = Form.useWatch("advanceCash", form) || 0;
  const advanceTerminal = Form.useWatch("advanceTerminal", form) || 0;
  const installmentMonths = Form.useWatch("installmentMonths", form) || 0;
  const firstPaymentDate = Form.useWatch("firstPaymentDate", form);
  const selectedBankId = Form.useWatch("bankId", form);
  const selectedBankIds: string[] = Form.useWatch("bankIds", form) || [];
  const bankAdvancesObj: Record<string, number> = Form.useWatch("bankAdvances", form) || {};

  const hasInstallment = paymentType === "COMPANY" || paymentType === "MIXED";

  const totalBankAdvance = (() => {
    if (paymentType === "CREDIT") return Number(bankAdvancesObj[selectedBankId] || 0);
    if (paymentType === "MIXED") return selectedBankIds.reduce((s, id) => s + (Number(bankAdvancesObj[id]) || 0), 0);
    return 0;
  })();

  const totalAdvances = Number(advanceCash) + Number(advanceTerminal) + totalBankAdvance;
  const installmentBalance = Number(totalAmount) - totalAdvances;

  // Автогенерация графика
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

  // Загрузка данных при открытии
  useEffect(() => {
    if (!open) return;
    loadContract();
  }, [open, contractId]);

  const loadContract = async () => {
    setLoading(true);
    try {
      const { data: contract } = await contractsApi.getById(contractId);

      // Загружаем данные выезда
      const [banksRes, companiesRes, tripRes] = await Promise.all([
        tripsApi.getTripBanks(contract.tripId),
        tripsApi.getTripCompanies(contract.tripId),
        tripsApi.getById(contract.tripId),
      ]);
      setTripBanks(banksRes.data);
      setTripCompanies(companiesRes.data);

      // Экипаж из презентации
      const pres = tripRes.data?.presentations?.find((p: any) => p.id === contract.presentationId);
      if (pres) setCrewMembers(pres.crew || []);

      // Телефоны
      if (contract.phones?.length > 0) {
        setPhones(contract.phones.map((p: any) => ({ countryCode: p.countryCode, number: p.number })));
      }

      // График платежей
      if (contract.paymentSchedule?.length > 0) {
        setPaymentSchedule(contract.paymentSchedule.map((s: any) => ({
          date: dayjs(s.date),
          amount: Number(s.amount),
        })));
      } else {
        setPaymentSchedule([]);
      }

      // Банки
      const bankIds = contract.banks?.map((b: any) => b.bankId) ?? [];
      const isSingleBank = contract.paymentType === "CREDIT";
      const bankAdvancesObj: Record<string, number> = {};
      contract.banks?.forEach((b: any) => {
        if (b.advance != null) bankAdvancesObj[b.bankId] = Number(b.advance);
      });
      // Фолбэк для старых договоров
      if (bankIds.length > 0 && contract.advanceBank && Object.keys(bankAdvancesObj).length === 0) {
        bankIds.forEach((bid: string) => {
          bankAdvancesObj[bid] = Number(contract.advanceBank) / bankIds.length;
        });
      }

      // Загружаем сохранённые условия банков
      const savedConditions: Record<string, { conditionId: string; conditionName: string; conditionRate: number }> = {};
      contract.banks?.forEach((b: any) => {
        if (b.conditionId && b.conditionName != null && b.conditionRate != null) {
          savedConditions[b.bankId] = {
            conditionId: b.conditionId,
            conditionName: b.conditionName,
            conditionRate: Number(b.conditionRate),
          };
        }
      });
      setBankConditions(savedConditions);

      form.setFieldsValue({
        clientName: contract.clientName,
        contractDate: dayjs(contract.contractDate),
        registrationAddress: contract.registrationAddress,
        actualAddress: contract.actualAddress,
        companyId: contract.companyId,
        saleType: contract.saleType || undefined,
        paymentType: contract.paymentType,
        speakerId: contract.speakerId || undefined,
        signedById: contract.signedById,
        totalAmount: Number(contract.totalAmount),
        advanceCash: Number(contract.advanceCash || 0),
        advanceTerminal: Number(contract.advanceTerminal || 0),
        bankId: isSingleBank ? bankIds[0] : undefined,
        bankIds: isSingleBank ? undefined : bankIds,
        bankAdvances: bankAdvancesObj,
        installmentMonths: contract.installmentMonths || undefined,
        firstPaymentDate: contract.firstPaymentDate ? dayjs(contract.firstPaymentDate) : undefined,
      });
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка загрузки договора");
    } finally {
      setLoading(false);
    }
  };

  const addPhone = () => {
    if (phones.length < 10) setPhones([...phones, { countryCode: "+998", number: "" }]);
  };
  const removePhone = (idx: number) => setPhones(phones.filter((_, i) => i !== idx));
  const updatePhone = (idx: number, field: "countryCode" | "number", value: string) => {
    const updated = [...phones];
    updated[idx][field] = value;
    setPhones(updated);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const validPhones = phones.filter((p) => p.number.trim());
      if (validPhones.length === 0) {
        message.error("Добавьте хотя бы один номер телефона");
        return;
      }
      // Авансы не должны превышать сумму договора
      const totalAmt = Number(values.totalAmount) || 0;
      if (totalAdvances > totalAmt) {
        message.error(`Сумма авансов (${totalAdvances.toLocaleString()}) превышает сумму договора (${totalAmt.toLocaleString()}).`);
        return;
      }
      // Авансы должны покрывать сумму, если нет рассрочки с графиком
      const hasSchedule = hasInstallment && paymentSchedule.length > 0;
      if (!hasSchedule && totalAdvances < totalAmt) {
        message.error(
          `Сумма авансов (${totalAdvances.toLocaleString()}) меньше суммы договора (${totalAmt.toLocaleString()}). ` +
          `Заполните график рассрочки или увеличьте авансы.`
        );
        return;
      }

      setSaving(true);
      const bankIds = paymentType === "CREDIT"
        ? (selectedBankId ? [selectedBankId] : [])
        : (selectedBankIds || []);

      await contractsApi.update(contractId, {
        clientName: values.clientName,
        contractDate: values.contractDate.format("YYYY-MM-DD"),
        companyId: values.companyId,
        paymentType: values.paymentType,
        saleType: values.saleType || undefined,
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
        bankIds,
        bankAdvances: bankAdvancesObj,
        bankConditions: Object.keys(bankConditions).length > 0 ? bankConditions : undefined,
        phones: validPhones,
        paymentSchedule: hasInstallment
          ? paymentSchedule.map((s) => ({ date: s.date.format("YYYY-MM-DD"), amount: s.amount }))
          : [],
      });
      message.success("Договор обновлён");
      onSuccess();
      onClose();
    } catch (e: any) {
      if (e.errorFields) return; // ошибки валидации
      message.error(e.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Редактировать договор"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="Сохранить"
      cancelText="Отмена"
      confirmLoading={saving}
      width={860}
      styles={{ body: { maxHeight: "75vh", overflowY: "auto", paddingRight: 4 } }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
      ) : (
        <Form form={form} layout="vertical">

          {/* Выезд и презентация */}
          <Card title="Выезд и презентация" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="speakerId" label="Ведущий">
                  <Select
                    placeholder="Выберите ведущего"
                    options={crewMembers
                      .filter((c) => c.role === "LEADER")
                      .map((c) => ({ value: c.user.id, label: `${c.user.lastName} ${c.user.firstName}` }))}
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="signedById" label="Оформляет договор" rules={[{ required: true }]}>
                  <Select
                    placeholder="Выберите подписанта"
                    options={crewMembers.map((c) => ({ value: c.user.id, label: `${c.user.lastName} ${c.user.firstName}` }))}
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
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removePhone(idx)} />
                    )}
                  </Space>
                ))}
                {phones.length < 10 && (
                  <Button type="dashed" icon={<PlusOutlined />} onClick={addPhone}>Добавить номер</Button>
                )}
              </Space>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="registrationAddress" label="Адрес регистрации" rules={[{ required: true }]}>
                  <Input.TextArea rows={2} placeholder="Адрес постоянной регистрации" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="actualAddress" label="Адрес проживания" rules={[{ required: true }]}>
                  <Input.TextArea rows={2} placeholder="Адрес фактического проживания" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Условия договора */}
          <Card title="Условия договора" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="companyId" label="Компания" rules={[{ required: true }]}>
                  <Select
                    placeholder="Выберите компанию"
                    options={tripCompanies.map((c) => ({ value: c.id, label: c.name }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="saleType" label="Тип продажи">
                  <Select placeholder="Не указан (обычный договор)" options={SALE_TYPE_OPTIONS} allowClear />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="paymentType" label="Тип оплаты" rules={[{ required: true }]}>
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
                  <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} placeholder="0" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="advanceCash" label="Аванс наличные">
                  <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} placeholder="0" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="advanceTerminal" label="Аванс терминал">
                  <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} placeholder="0" />
                </Form.Item>
              </Col>
            </Row>

            {paymentType === "CREDIT" && selectedBankId && (() => {
              const bank = tripBanks.find((b) => b.id === selectedBankId);
              return (
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name={["bankAdvances", selectedBankId]} label={`Аванс банк ${bank?.name || ""}`}>
                      <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} placeholder="0" />
                    </Form.Item>
                  </Col>
                  {bank?.conditions?.length > 0 && (
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
                  )}
                </Row>
              );
            })()}

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
                  <InputNumber style={{ width: "100%" }} value={totalAdvances} disabled formatter={FMT} />
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

            {/* Рассрочка */}
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
                      <span style={{ fontWeight: 500 }}>График платежей:</span>
                      <Button size="small" danger onClick={() => setPaymentSchedule([])}>Очистить график</Button>
                    </div>
                    <Table
                      size="small"
                      style={{ marginTop: 8 }}
                      dataSource={paymentSchedule}
                      rowKey={(_, idx) => String(idx)}
                      pagination={false}
                      columns={[
                        { title: "#", key: "num", width: 50, render: (_: any, __: any, idx: number) => idx + 1 },
                        {
                          title: "Дата", key: "date",
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
                          title: "Сумма", key: "amount",
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
                          title: "", key: "del", width: 40,
                          render: (_: any, __: any, idx: number) => (
                            <Button type="text" danger size="small" icon={<DeleteOutlined />}
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
                              <span style={{ fontWeight: 500 }}>Итого рассрочки:</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2}>
                              <span style={{ fontWeight: 600, color: Math.abs(diff) > 0.01 ? "red" : "green" }}>
                                {total.toLocaleString()} {diff !== 0 && `(расхождение: ${diff})`}
                              </span>
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
          </Card>
        </Form>
      )}
    </Modal>
  );
}
