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
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  PlusOutlined,
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
  record: any;       // пустой объект {} при создании
  isNew?: boolean;   // true — режим ручного добавления
  datePresentations: any[];
  onSave: (values: any) => Promise<void>;
  onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ record, isNew, datePresentations, onSave, onClose }) => {
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
      title={isNew ? "Внести гостя вручную" : `Редактировать: ${record.fullName || record.phone}`}
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
// Стили статистической таблицы
// ────────────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: "4px 10px",
  border: "1px solid #d9d9d9",
  background: "#f5f5f5",
  fontWeight: 600,
  textAlign: "center",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "4px 10px",
  border: "1px solid #d9d9d9",
  textAlign: "center",
  whiteSpace: "nowrap",
};

const tdLabelStyle: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid rgba(0,0,0,0.15)",
  color: "#fff",
  fontWeight: 600,
  whiteSpace: "nowrap",
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
  const [addManualOpen, setAddManualOpen] = useState(false);
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

  // ── Ручное добавление гостя ──────────────────────────────────────────────
  const handleCreateRecord = async (values: any) => {
    try {
      await guestListsApi.createRecord(glId!, values);
      message.success("Гость добавлен");
      setAddManualOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Ошибка при добавлении");
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
    // Все времена презентаций через запятую
    const times = datePresentations
      .map((p: any) => p.time)
      .filter(Boolean)
      .join(", ");
    const parts: string[] = [];
    // Приоритет: venueName > address
    if (venue?.venueName) parts.push(venue.venueName);
    else if (venue?.address) parts.push(venue.address);
    parts.push(dateStr);
    if (times) parts.push(times);
    return parts.join(" • ");
  }, [guestList]);

  // ── Статистика по презентациям ───────────────────────────────────────────
  const presStats = useMemo(() => {
    if (!guestList?.guests || !guestList?.datePresentations) return [];

    const guests: any[] = guestList.guests;
    const total = guests.length;

    // Цвета для презентаций по номеру
    const presColors: Record<number, string> = { 1: "#c0392b", 2: "#b7791f", 3: "#276749" };

    const rows = guestList.datePresentations.map((pres: any) => {
      const records = guests.filter((g) => g.presentationNumber === pres.number);
      const arrivals = records.length;
      const pairsTotal = records.reduce((s: number, g: any) => s + (g.pairsCount || 0), 0);

      const leftRecs = records.filter((g: any) => g.leftStatus === "ушел");
      const notRecs  = records.filter((g: any) => g.leftStatus === "не пустили");

      const leftCount = leftRecs.length;
      const leftPairs = leftRecs.reduce((s: number, g: any) => s + (g.pairsCount || 0), 0);
      const notCount  = notRecs.length;
      const notPairs  = notRecs.reduce((s: number, g: any) => s + (g.pairsCount || 0), 0);

      const inHall      = arrivals - leftCount - notCount;
      const inHallPairs = pairsTotal - leftPairs - notPairs;
      // % = Приход / Приглашено (сколько из списка реально зашли)
      const pct = arrivals > 0 ? Math.round(((arrivals - notCount) / arrivals) * 100) : 0;

      return {
        key: pres.number,
        number: pres.number,
        name: pres.name,
        time: pres.time,
        color: presColors[pres.number] ?? "#595959",
        arrivals,
        pairsTotal,
        pct,
        leftCount,
        leftPairs,
        notCount,
        notPairs,
        inHall,
        inHallPairs,
      };
    });

    // Строка «без презентации» — записи с null presentationNumber
    const noPresRecs = guests.filter((g: any) => g.presentationNumber == null);
    if (noPresRecs.length > 0) {
      rows.push({
        key: 0,
        number: 0,
        name: "—",
        time: "",
        color: "#8c8c8c",
        arrivals: noPresRecs.length,
        pairsTotal: noPresRecs.reduce((s: number, g: any) => s + (g.pairsCount || 0), 0),
        pct: total > 0 ? Math.round((noPresRecs.length / total) * 100) : 0,
        leftCount: 0, leftPairs: 0, notCount: 0, notPairs: 0,
        inHall: noPresRecs.length,
        inHallPairs: noPresRecs.reduce((s: number, g: any) => s + (g.pairsCount || 0), 0),
      });
    }

    return rows;
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
      </div>

      {/* ── Статистика по презентациям ───────────────────────────────────── */}
      {guestList && presStats.length > 0 && (
        <div style={{ marginBottom: 16, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
            <thead>
              <tr>
                <th style={thStyle}>Презентация</th>
                <th style={thStyle}>Пригл.</th>
                <th style={thStyle}>Приход</th>
                <th style={thStyle}>Пары</th>
                <th style={thStyle}>%.пр.</th>
                <th style={thStyle}>у/Пар</th>
                <th style={thStyle}>н/Пар</th>
                <th style={thStyle}>В зале г/п</th>
              </tr>
            </thead>
            <tbody>
              {presStats.map((row) => (
                <tr key={row.key}>
                  <td style={{ ...tdLabelStyle, background: row.color }}>
                    {row.number ? `Презентация №${row.number}` : "Без презентации"}
                    {row.time ? ` (${row.time})` : ""}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{row.arrivals}</td>
                  <td style={tdStyle}>{row.arrivals - row.notCount}</td>
                  <td style={tdStyle}>{row.pairsTotal}</td>
                  <td style={tdStyle}>{row.pct}%</td>
                  <td style={{ ...tdStyle, color: row.leftCount ? "#ff4d4f" : undefined }}>
                    {row.leftCount}/{row.leftPairs}
                  </td>
                  <td style={{ ...tdStyle, color: row.notCount ? "#fa8c16" : undefined }}>
                    {row.notCount}/{row.notPairs}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: "#52c41a" }}>
                    {row.inHall}/{row.inHallPairs}
                  </td>
                </tr>
              ))}
              {/* Строка итогов */}
              {presStats.length > 1 && (() => {
                const tot = presStats.reduce(
                  (acc, r) => ({
                    arrivals:   acc.arrivals   + r.arrivals,
                    pairsTotal: acc.pairsTotal + r.pairsTotal,
                    leftCount:  acc.leftCount  + r.leftCount,
                    leftPairs:  acc.leftPairs  + r.leftPairs,
                    notCount:   acc.notCount   + r.notCount,
                    notPairs:   acc.notPairs   + r.notPairs,
                    inHall:     acc.inHall     + r.inHall,
                    inHallPairs:acc.inHallPairs+ r.inHallPairs,
                  }),
                  { arrivals:0, pairsTotal:0, leftCount:0, leftPairs:0, notCount:0, notPairs:0, inHall:0, inHallPairs:0 }
                );
                return (
                  <tr>
                    <td style={{ ...tdLabelStyle, background: "#434343" }}>Итого</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{tot.arrivals}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{tot.arrivals - tot.notCount}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{tot.pairsTotal}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      {tot.arrivals > 0 ? Math.round(((tot.arrivals - tot.notCount) / tot.arrivals) * 100) : 0}%
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: tot.leftCount ? "#ff4d4f" : undefined }}>
                      {tot.leftCount}/{tot.leftPairs}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: tot.notCount ? "#fa8c16" : undefined }}>
                      {tot.notCount}/{tot.notPairs}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: "#52c41a" }}>
                      {tot.inHall}/{tot.inHallPairs}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddManualOpen(true)}
        >
          Внести вручную
        </Button>
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

      {/* ── Модалка ручного добавления ────────────────────────────────────── */}
      {addManualOpen && (
        <EditModal
          record={{}}
          isNew
          datePresentations={guestList?.datePresentations ?? []}
          onSave={handleCreateRecord}
          onClose={() => setAddManualOpen(false)}
        />
      )}
    </div>
  );
};

export default GuestListDetailPage;
