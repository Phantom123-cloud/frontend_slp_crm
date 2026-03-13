import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  Button,
  Table,
  Typography,
  Space,
  Input,
  Select,
  Form,
  Modal,
  InputNumber,
  Popconfirm,
  message,
  Tag,
  Tooltip,
  Row,
  Col,
  Statistic,
  Divider,
  Breadcrumb,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import { guestListsApi } from "../../api/guestLists";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const { Option } = Select;

// ────────────────────────────────────────────────────────────────────────────
// Справочники
// ────────────────────────────────────────────────────────────────────────────

const LEFT_STATUS_OPTIONS = ["не пустили", "ушел"];

const LEFT_REASON_OPTIONS = [
  "Пьяные",
  "Агрессивные",
  "Молодые/Старые",
  "Заболевшие",
  "Очень опоздали",
  "Нет места",
  "Нет времени",
  "Не интересно",
  "С ребенком",
  "Уже был",
  "Нет причины",
  "Др причины",
  "Бомж",
  "Был 3+ раза",
  "Пришел за подарком",
];

// ────────────────────────────────────────────────────────────────────────────
// Модалка редактирования гостя
// ────────────────────────────────────────────────────────────────────────────

interface EditModalProps {
  record: any;
  datePresentations: any[];
  onSave: (values: any) => Promise<void>;
  onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ record, datePresentations, onSave, onClose }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [presNumber, setPresNumber] = useState<number | null>(record.presentationNumber ?? null);

  const handlePresNumberChange = (val: number | null) => {
    setPresNumber(val);
    // Автоматически проставляем время из презентации
    if (val) {
      const pres = datePresentations.find((p: any) => p.number === val);
      if (pres) {
        form.setFieldValue("time", pres.time);
      }
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await onSave(values);
    } catch {
      // ошибка валидации формы
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={`Редактировать: ${record.fullName || record.phone}`}
      onCancel={onClose}
      width={700}
      footer={
        <Space>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            Сохранить
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          fullName: record.fullName || "",
          couponNumber: record.couponNumber || "",
          phone: record.phone || "",
          phone2: record.phone2 || "",
          phone3: record.phone3 || "",
          guestsCount: record.guestsCount ?? null,
          pairsCount: record.pairsCount ?? null,
          passportCount: record.passportCount ?? null,
          age: record.age ?? null,
          insteadOf: record.insteadOf || "",
          guestFullName: record.guestFullName || "",
          guestPhone: record.guestPhone || "",
          leftStatus: record.leftStatus || null,
          leftReason: record.leftReason || null,
          notes: record.notes || "",
          presentationNumber: record.presentationNumber ?? null,
          time: record.time || "",
        }}
      >
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="ФИО" name="fullName">
              <Input placeholder="ФИО гостя" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="№ купона" name="couponNumber">
              <Input placeholder="1в, 2т..." />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Возраст" name="age">
              <InputNumber style={{ width: "100%" }} min={0} max={150} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="Телефон" name="phone">
              <Input placeholder="Телефон 1" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Телефон 2" name="phone2">
              <Input placeholder="Телефон 2" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Телефон 3" name="phone3">
              <Input placeholder="Телефон 3" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={6}>
            <Form.Item label="Гости" name="guestsCount">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Пары" name="pairsCount">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Паспорт" name="passportCount">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Вместо" name="insteadOf">
              <Input placeholder="Вместо" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="ФИО Гостя" name="guestFullName">
              <Input placeholder="ФИО сопровождающего" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Телефон Гостя" name="guestPhone">
              <Input placeholder="Телефон сопровождающего" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="Ушедшие/Невпущенные" name="leftStatus">
              <Select allowClear placeholder="Выберите статус">
                {LEFT_STATUS_OPTIONS.map((s) => (
                  <Option key={s} value={s}>{s}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item label="Причина" name="leftReason">
              <Select allowClear placeholder="Причина">
                {LEFT_REASON_OPTIONS.map((r) => (
                  <Option key={r} value={r}>{r}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Заметки"
          name="notes"
          rules={[{ max: 150, message: "Максимум 150 символов" }]}
        >
          <Input.TextArea rows={2} maxLength={150} showCount placeholder="Заметки" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Презентация №" name="presentationNumber">
              <Select
                allowClear
                placeholder="Номер презентации"
                onChange={handlePresNumberChange}
              >
                {datePresentations.map((p: any) => (
                  <Option key={p.number} value={p.number}>
                    №{p.number} — {p.time} ({p.name})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Время" name="time">
              <Input placeholder="HH:MM" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Основная страница
// ────────────────────────────────────────────────────────────────────────────

const GuestListDetailPage: React.FC = () => {
  const { tripId, glId } = useParams<{ tripId: string; glId: string }>();
  const navigate = useNavigate();

  const [guestList, setGuestList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [searchText, setSearchText] = useState("");
  const deleteFileRef = useRef<HTMLInputElement>(null);
  const [deleteByFileLoading, setDeleteByFileLoading] = useState(false);

  const load = useCallback(async () => {
    if (!glId) return;
    setLoading(true);
    try {
      const data = await guestListsApi.getById(glId);
      setGuestList(data);
    } finally {
      setLoading(false);
    }
  }, [glId]);

  React.useEffect(() => { load(); }, [load]);

  // ── Поиск по ФИО / телефону ──────────────────────────────────────────────
  const filteredGuests = useMemo(() => {
    if (!guestList?.guests) return [];
    const q = searchText.toLowerCase().trim();
    if (!q) return guestList.guests;
    return guestList.guests.filter((g: any) =>
      (g.fullName || "").toLowerCase().includes(q) ||
      (g.phone || "").includes(q) ||
      (g.couponNumber || "").toLowerCase().includes(q),
    );
  }, [guestList, searchText]);

  // ── Редактирование ───────────────────────────────────────────────────────
  const handleSaveRecord = async (values: any) => {
    try {
      await guestListsApi.updateRecord(glId!, editRecord.id, values);
      message.success("Сохранено");
      setEditRecord(null);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Ошибка сохранения");
      throw e;
    }
  };

  // ── Удаление одной записи ────────────────────────────────────────────────
  const handleDeleteRecord = async (recordId: string) => {
    try {
      await guestListsApi.deleteRecord(glId!, recordId);
      message.success("Запись удалена");
      load();
    } catch {
      message.error("Ошибка удаления");
    }
  };

  // ── Удаление по файлу ────────────────────────────────────────────────────
  const handleDeleteByFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDeleteByFileLoading(true);
    try {
      const result = await guestListsApi.deleteByFile(glId!, file);
      message.success(`Удалено ${result.deletedCount} из ${result.totalInFile} номеров`);
      load();
    } catch {
      message.error("Ошибка при удалении по файлу");
    } finally {
      setDeleteByFileLoading(false);
      if (deleteFileRef.current) deleteFileRef.current.value = "";
    }
  };

  // ── Заголовок списка ─────────────────────────────────────────────────────
  const listTitle = useMemo(() => {
    if (!guestList) return "Список гостей";
    const datePresentations: any[] = guestList.datePresentations ?? [];
    const venue = datePresentations[0]?.venue;
    const dateStr = dayjs(guestList.date).format("DD.MM.YYYY");
    const parts: string[] = [];
    if (venue?.address) parts.push(venue.address);
    if (venue?.venueName) parts.push(venue.venueName);
    parts.push(dateStr);
    return parts.join(" • ");
  }, [guestList]);

  // ── Колонки таблицы ──────────────────────────────────────────────────────
  const columns = [
    {
      title: "",
      key: "fill",
      width: 80,
      render: (_: any, r: any) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => setEditRecord(r)}
        >
          Запол.
        </Button>
      ),
    },
    {
      title: "ФИО",
      dataIndex: "fullName",
      key: "fullName",
      width: 160,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "№ купона",
      dataIndex: "couponNumber",
      key: "couponNumber",
      width: 90,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      key: "phone",
      width: 120,
    },
    {
      title: "Тел. 2",
      dataIndex: "phone2",
      key: "phone2",
      width: 110,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Тел. 3",
      dataIndex: "phone3",
      key: "phone3",
      width: 110,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Гости",
      dataIndex: "guestsCount",
      key: "guestsCount",
      width: 70,
      render: (v: number | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Пары",
      dataIndex: "pairsCount",
      key: "pairsCount",
      width: 60,
      render: (v: number | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Паспорт",
      dataIndex: "passportCount",
      key: "passportCount",
      width: 80,
      render: (v: number | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Возраст",
      dataIndex: "age",
      key: "age",
      width: 75,
      render: (v: number | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Вместо",
      dataIndex: "insteadOf",
      key: "insteadOf",
      width: 100,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "ФИО Гостя",
      dataIndex: "guestFullName",
      key: "guestFullName",
      width: 140,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Тел. Гостя",
      dataIndex: "guestPhone",
      key: "guestPhone",
      width: 110,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Ушедшие/Невп.",
      dataIndex: "leftStatus",
      key: "leftStatus",
      width: 130,
      render: (v: string) =>
        v ? (
          <Tag color={v === "не пустили" ? "red" : "orange"}>{v}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Причина",
      dataIndex: "leftReason",
      key: "leftReason",
      width: 140,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Заметки",
      dataIndex: "notes",
      key: "notes",
      width: 160,
      render: (v: string) =>
        v ? (
          <Tooltip title={v}>
            <Text ellipsis style={{ maxWidth: 150 }}>{v}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "През. №",
      dataIndex: "presentationNumber",
      key: "presentationNumber",
      width: 80,
      sorter: (a: any, b: any) => (a.presentationNumber ?? 99) - (b.presentationNumber ?? 99),
      defaultSortOrder: "ascend" as const,
      render: (v: number | null) =>
        v ? <Tag color="blue">№{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Время",
      dataIndex: "time",
      key: "time",
      width: 75,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "",
      key: "actions",
      width: 48,
      fixed: "right" as const,
      render: (_: any, r: any) => (
        <Popconfirm
          title="Удалить запись?"
          onConfirm={() => handleDeleteRecord(r.id)}
          okText="Да"
          cancelText="Нет"
        >
          <Button size="small" icon={<DeleteOutlined />} danger type="text" />
        </Popconfirm>
      ),
    },
  ];

  if (!guestList && !loading) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Назад
        </Button>
        <div style={{ marginTop: 24 }}>Список не найден</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 0 24px" }}>
      {/* ── Шапка ────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => navigate(`/trips/${tripId}?tab=guestLists`)}
          style={{ marginBottom: 8 }}
        >
          К выезду
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          {listTitle}
        </Title>
        {guestList && (
          <Text type="secondary">{guestList.fileName}</Text>
        )}
      </div>

      {/* ── Статистика ───────────────────────────────────────────────────── */}
      {guestList && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col>
              <Statistic title="Всего в файле" value={guestList.totalCount} />
            </Col>
            <Col>
              <Statistic
                title="В списке сейчас"
                value={guestList.importedCount}
                valueStyle={{ color: "#52c41a" }}
              />
            </Col>
            <Col>
              <Statistic
                title="Отклонено"
                value={guestList.failedCount}
                valueStyle={{ color: guestList.failedCount ? "#ff4d4f" : undefined }}
              />
            </Col>
            {(guestList.duplicatesCount ?? 0) > 0 && (
              <Col>
                <Statistic
                  title="Дублей пропущено"
                  value={guestList.duplicatesCount}
                  valueStyle={{ color: "#faad14" }}
                />
              </Col>
            )}
          </Row>
          <Divider style={{ margin: "0 0 12px" }} />
        </>
      )}

      {/* ── Тулбар ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Поиск по ФИО, телефону, купону..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ width: 300 }}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Tooltip title="Загрузите файл с номерами (одна строка — один номер). Найденные записи будут удалены.">
            <Button
              icon={<DeleteOutlined />}
              loading={deleteByFileLoading}
              onClick={() => deleteFileRef.current?.click()}
              danger
            >
              Удалить файлом
            </Button>
          </Tooltip>
          <input
            ref={deleteFileRef}
            type="file"
            accept=".txt,.csv"
            style={{ display: "none" }}
            onChange={handleDeleteByFile}
          />
        </div>
      </div>

      {/* ── Таблица гостей ───────────────────────────────────────────────── */}
      <Table
        columns={columns}
        dataSource={filteredGuests}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1800 }}
        pagination={false}
        sticky
        locale={{ emptyText: "Нет записей" }}
      />

      {/* ── Модалка редактирования ───────────────────────────────────────── */}
      {editRecord && (
        <EditModal
          record={editRecord}
          datePresentations={guestList?.datePresentations ?? []}
          onSave={handleSaveRecord}
          onClose={() => setEditRecord(null)}
        />
      )}
    </div>
  );
};

export default GuestListDetailPage;
