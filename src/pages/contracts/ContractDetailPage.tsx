import { useState, useEffect } from "react";
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
} from "@ant-design/icons";
import dayjs from "dayjs";
import { contractsApi } from "../../api/contracts";
import { usePermission } from "../../hooks/usePermission";

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

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canVerify = usePermission("contracts.verify");
  const canEdit = usePermission("contracts.edit");

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Модалка возврата
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundForm] = Form.useForm();

  // Модалка редактирования финансов
  const [finOpen, setFinOpen] = useState(false);
  const [finLoading, setFinLoading] = useState(false);
  const [finForm] = Form.useForm();

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

  // Открыть модалку возврата — заполнить текущими значениями авансов
  const openRefundModal = () => {
    const bankAdvancesObj: Record<string, number> = {};
    contract.banks?.forEach((b: any) => {
      if (b.advance != null) bankAdvancesObj[b.bankId] = Number(b.advance);
    });
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

  // Открыть модалку редактирования финансов
  const openFinModal = () => {
    const bankAdvancesObj: Record<string, number> = {};
    contract.banks?.forEach((b: any) => {
      if (b.advance != null) bankAdvancesObj[b.bankId] = Number(b.advance);
    });
    finForm.setFieldsValue({
      totalAmount: Number(contract.totalAmount),
      advanceCash: Number(contract.advanceCash || 0),
      advanceTerminal: Number(contract.advanceTerminal || 0),
      advanceBank: Number(contract.advanceBank || 0),
      bankAdvances: bankAdvancesObj,
      installmentMonths: contract.installmentMonths,
      firstPaymentDate: contract.firstPaymentDate ? dayjs(contract.firstPaymentDate).format("YYYY-MM-DD") : undefined,
    });
    setFinOpen(true);
  };

  // Сохранить изменения финансов (→ PARTIAL_REFUND)
  const handleFinSave = async () => {
    try {
      const values = await finForm.validateFields();
      setFinLoading(true);
      const bankIds = contract.banks?.map((b: any) => b.bankId) ?? [];
      await contractsApi.updateFinancials(id!, {
        totalAmount: values.totalAmount,
        advanceCash: values.advanceCash,
        advanceTerminal: values.advanceTerminal,
        advanceBank: values.advanceBank,
        bankIds,
        bankAdvances: values.bankAdvances,
        installmentMonths: values.installmentMonths,
        firstPaymentDate: values.firstPaymentDate,
      });
      message.success("Финансы обновлены");
      setFinOpen(false);
      load();
    } catch (e: any) {
      if (e?.errorFields) return; // ошибка валидации формы
      message.error(e.response?.data?.message || "Ошибка");
    } finally {
      setFinLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>;
  }

  if (!contract) return null;

  const totalAdvances =
    (Number(contract.advanceCash) || 0) +
    (Number(contract.advanceTerminal) || 0) +
    (Number(contract.advanceBank) || 0);

  const installmentBalance = Number(contract.totalAmount) - totalAdvances;

  // Сумма после возврата: если задана — берём её, иначе = totalAmount
  const amountAfterRefund =
    contract.amountAfterRefund != null
      ? Number(contract.amountAfterRefund)
      : Number(contract.totalAmount);

  const hasRefund = contract.paymentStatus === "REFUND" || contract.paymentStatus === "PARTIAL_REFUND";

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
        {/* Статус верификации */}
        <Tag color={STATUS_COLORS[contract.status]} style={{ fontSize: 13, padding: "2px 10px" }}>
          {STATUS_LABELS[contract.status]}
        </Tag>
        {/* Статус оплаты */}
        <Tag color={PAYMENT_STATUS_COLORS[contract.paymentStatus]} style={{ fontSize: 13, padding: "2px 10px" }}>
          {PAYMENT_STATUS_LABELS[contract.paymentStatus] || contract.paymentStatus}
        </Tag>
        <div style={{ flex: 1 }} />

        {/* Кнопки редактирования финансов */}
        {canEdit && contract.paymentStatus !== "REFUND" && (
          <Button icon={<RollbackOutlined />} onClick={openRefundModal}>
            Оформить возврат
          </Button>
        )}
        {canEdit && (
          <Button icon={<EditOutlined />} onClick={openFinModal}>
            Редактировать финансы
          </Button>
        )}

        {/* Кнопки верификации */}
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
            <Field
              label="Итого авансов"
              value={<Text strong>{totalAdvances.toLocaleString()}</Text>}
            />
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
        </Row>
      </Card>

      {/* График платежей */}
      {contract.paymentSchedule?.length > 0 && (
        <Card size="small">
          <Divider titlePlacement="left" plain style={{ marginTop: 0, fontSize: 12, color: "#888" }}>ГРАФИК ПЛАТЕЖЕЙ</Divider>
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
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>Итого:</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text strong>{total.toLocaleString()}</Text>
                  </Table.Summary.Cell>
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
          message="После подтверждения все авансы будут обнулены и изменить статус будет нельзя автоматически."
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
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={finLoading}
        width={600}
      >
        <Alert
          type="info"
          showIcon
          message="После сохранения статус договора изменится на «Частичный возврат»."
          style={{ marginBottom: 16 }}
        />
        <Form form={finForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Общая сумма (после возврата)" name="totalAmount" rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Аванс наличные" name="advanceCash">
                <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Аванс терминал" name="advanceTerminal">
                <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} />
              </Form.Item>
            </Col>
            {contract.banks?.length > 0 ? (
              contract.banks.map((b: any) => (
                <Col span={12} key={b.bankId}>
                  <Form.Item label={`Аванс ${b.bank?.name}`} name={["bankAdvances", b.bankId]}>
                    <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} />
                  </Form.Item>
                </Col>
              ))
            ) : (
              <Col span={12}>
                <Form.Item label="Аванс банк" name="advanceBank">
                  <InputNumber style={{ width: "100%" }} min={0} formatter={FMT} parser={PARSE} />
                </Form.Item>
              </Col>
            )}
            {contract.installmentMonths != null && (
              <Col span={12}>
                <Form.Item label="Кол-во месяцев рассрочки" name="installmentMonths">
                  <InputNumber style={{ width: "100%" }} min={1} />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
