import React, { useState, useRef, useCallback } from "react";
import {
  Button,
  Modal,
  Select,
  Upload,
  Table,
  Tabs,
  Tag,
  Space,
  Popconfirm,
  Typography,
  Alert,
  Statistic,
  Row,
  Col,
  Divider,
  message,
  Tooltip,
  Radio,
} from "antd";
import {
  UploadOutlined,
  ImportOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { guestListsApi } from "../../../api/guestLists";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const { Option } = Select;

// ────────────────────────────────────────────────────────────────────────────
// Вспомогательные функции
// ────────────────────────────────────────────────────────────────────────────

/** Скачивает строку как текстовый файл */
function downloadTextFile(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Эффективный статус презентации по её дате */
function getPresEffectiveStatus(pres: any): "ACTIVE" | "PLANNED" | "COMPLETED" | "CANCELLED" {
  if (pres.status === "CANCELLED") return "CANCELLED";
  const today = dayjs().startOf("day");
  const presDate = dayjs(pres.date).startOf("day");
  if (presDate.isSame(today)) return "ACTIVE";
  if (presDate.isAfter(today)) return "PLANNED";
  return "COMPLETED";
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "green",
  PLANNED: "blue",
  COMPLETED: "default",
  CANCELLED: "red",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Активна",
  PLANNED: "Запланирована",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

// ────────────────────────────────────────────────────────────────────────────
// Компонент детали списка (гости внутри)
// ────────────────────────────────────────────────────────────────────────────

interface GuestListDetailProps {
  guestListId: string;
  onClose: () => void;
  onChanged: () => void;
}

const GuestListDetail: React.FC<GuestListDetailProps> = ({ guestListId, onClose, onChanged }) => {
  const { t } = useTranslation();
  const [list, setList] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [deleteByFileLoading, setDeleteByFileLoading] = React.useState(false);
  const deleteFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await guestListsApi.getById(guestListId);
      setList(data);
    } finally {
      setLoading(false);
    }
  }, [guestListId]);

  React.useEffect(() => { load(); }, [load]);

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await guestListsApi.deleteRecord(guestListId, recordId);
      message.success("Запись удалена");
      load();
      onChanged();
    } catch {
      message.error("Ошибка удаления");
    }
  };

  const handleDeleteByFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDeleteByFileLoading(true);
    try {
      const result = await guestListsApi.deleteByFile(guestListId, file);
      message.success(`Удалено ${result.deletedCount} из ${result.totalInFile} номеров`);
      load();
      onChanged();
    } catch {
      message.error("Ошибка при удалении по файлу");
    } finally {
      setDeleteByFileLoading(false);
      if (deleteFileRef.current) deleteFileRef.current.value = "";
    }
  };

  const columns = [
    {
      title: "ФИО",
      dataIndex: "fullName",
      key: "fullName",
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Номер",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Презентация",
      key: "presentation",
      render: (_: any, r: any) =>
        r.presentation
          ? `${dayjs(r.presentation.date).format("DD.MM.YYYY")} ${r.presentation.time}`
          : "—",
    },
    {
      title: "",
      key: "actions",
      width: 50,
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

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={720}
      title={list ? `${list.fileName} — гости` : "Список гостей"}
    >
      {list && (
        <>
          {/* Статистика */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic title="Всего в файле" value={list.totalCount} />
            </Col>
            <Col span={8}>
              <Statistic title="Импортировано" value={list.importedCount} valueStyle={{ color: "#52c41a" }} />
            </Col>
            <Col span={8}>
              <Statistic title="Отклонено" value={list.failedCount} valueStyle={{ color: list.failedCount ? "#ff4d4f" : undefined }} />
            </Col>
          </Row>
          <Divider style={{ margin: "8px 0 16px" }} />

          {/* Кнопка удаления по файлу */}
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
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

          {/* Таблица гостей */}
          <Table
            columns={columns}
            dataSource={list.guests}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: false }}
          />
        </>
      )}
    </Modal>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Основной компонент — вкладка "Списки гостей"
// ────────────────────────────────────────────────────────────────────────────

interface Props {
  tripId: string;
  presentations: any[]; // список презентаций выезда (из trip.presentations)
}

const GuestListsTab: React.FC<Props> = ({ tripId, presentations }) => {
  const { t } = useTranslation();

  // ── Состояние ────────────────────────────────────────────────────────────
  const [activeSubTab, setActiveSubTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [guestLists, setGuestLists] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Импорт
  const [importOpen, setImportOpen] = useState(false);
  const [importPresId, setImportPresId] = useState<string | undefined>();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Детали списка
  const [detailId, setDetailId] = useState<string | null>(null);

  // ── Загрузка ─────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [lists, logsData] = await Promise.all([
        guestListsApi.getAll(tripId),
        guestListsApi.getLogs(tripId),
      ]);
      setGuestLists(lists);
      setLogs(logsData);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  React.useEffect(() => { loadAll(); }, [loadAll]);

  // ── Фильтрация по статусу ────────────────────────────────────────────────
  const filteredLists = guestLists.filter((gl) => {
    if (statusFilter === "all") return true;
    const pres = gl.presentation;
    if (!pres) return statusFilter === "all";
    const status = getPresEffectiveStatus(pres).toLowerCase();
    return status === statusFilter;
  });

  // ── Импорт ───────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!importFile) {
      message.warning("Выберите CSV файл");
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const result = await guestListsApi.import(tripId, importFile, importPresId);
      setImportResult(result);
      message.success(`Импортировано: ${result.importedCount}, отклонено: ${result.failedCount}`);
      loadAll();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Ошибка импорта");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!importResult?.errorCsv) return;
    const base = importFile?.name?.replace(/\.csv$/i, "") || "import";
    downloadTextFile(importResult.errorCsv, `${base}_errors.csv`);
  };

  const resetImport = () => {
    setImportOpen(false);
    setImportPresId(undefined);
    setImportFile(null);
    setImportResult(null);
  };

  // ── Колонки таблицы списков ───────────────────────────────────────────────
  const listsColumns = [
    {
      title: "Файл",
      dataIndex: "fileName",
      key: "fileName",
      render: (v: string, r: any) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => setDetailId(r.id)}>
          {v}
        </Button>
      ),
    },
    {
      title: "Презентация",
      key: "presentation",
      render: (_: any, r: any) => {
        const p = r.presentation;
        if (!p) return <Text type="secondary">—</Text>;
        const status = getPresEffectiveStatus(p);
        return (
          <Space>
            <span>{dayjs(p.date).format("DD.MM.YYYY")} {p.time}</span>
            <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>
          </Space>
        );
      },
    },
    {
      title: "Всего",
      dataIndex: "totalCount",
      key: "totalCount",
      width: 80,
    },
    {
      title: "Импортировано",
      dataIndex: "importedCount",
      key: "importedCount",
      width: 130,
      render: (v: number) => <Text style={{ color: "#52c41a" }}>{v}</Text>,
    },
    {
      title: "Отклонено",
      dataIndex: "failedCount",
      key: "failedCount",
      width: 100,
      render: (v: number) => (
        <Text style={{ color: v ? "#ff4d4f" : undefined }}>{v}</Text>
      ),
    },
    {
      title: "Дата импорта",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (v: string) => dayjs(v).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "Кто",
      key: "createdBy",
      width: 140,
      render: (_: any, r: any) =>
        r.createdBy
          ? `${r.createdBy.lastName} ${r.createdBy.firstName}`
          : "—",
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_: any, r: any) => (
        <Button
          size="small"
          icon={<UserOutlined />}
          onClick={() => setDetailId(r.id)}
        >
          Открыть
        </Button>
      ),
    },
  ];

  // ── Колонки истории ───────────────────────────────────────────────────────
  const logsColumns = [
    {
      title: "Дата",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (v: string) => dayjs(v).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "Действие",
      dataIndex: "action",
      key: "action",
      width: 150,
      render: (v: string) => (
        <Tag color={v === "IMPORT" ? "blue" : "orange"}>
          {v === "IMPORT" ? "Импорт" : "Удаление по файлу"}
        </Tag>
      ),
    },
    {
      title: "Файл",
      dataIndex: "fileName",
      key: "fileName",
    },
    {
      title: "Всего",
      dataIndex: "totalCount",
      key: "totalCount",
      width: 80,
    },
    {
      title: "Успешно",
      dataIndex: "importedCount",
      key: "importedCount",
      width: 90,
      render: (v: number) => <Text style={{ color: "#52c41a" }}>{v}</Text>,
    },
    {
      title: "Отклонено",
      dataIndex: "failedCount",
      key: "failedCount",
      width: 100,
      render: (v: number) => (
        <Text style={{ color: v ? "#ff4d4f" : undefined }}>{v}</Text>
      ),
    },
    {
      title: "Список",
      key: "guestList",
      render: (_: any, r: any) =>
        r.guestList ? (
          <Button type="link" style={{ padding: 0 }} onClick={() => setDetailId(r.guestList.id)}>
            {r.guestList.fileName}
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Кто",
      key: "createdBy",
      width: 140,
      render: (_: any, r: any) =>
        r.createdBy
          ? `${r.createdBy.lastName} ${r.createdBy.firstName}`
          : "—",
    },
  ];

  // ── Сортировка презентаций для Select ────────────────────────────────────
  const sortedPresentations = [...presentations].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Tabs
        activeKey={activeSubTab}
        onChange={setActiveSubTab}
        tabBarExtraContent={
          activeSubTab !== "history" && (
            <Button
              type="primary"
              icon={<ImportOutlined />}
              onClick={() => setImportOpen(true)}
              style={{ marginBottom: 0 }}
            >
              Создать список
            </Button>
          )
        }
        items={[
          {
            key: "all",
            label: "Списки",
            children: (
              <>
                {/* Фильтр по статусу презентации */}
                <div style={{ marginBottom: 12, marginTop: 8 }}>
                  <Radio.Group
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <Radio.Button value="all">Все</Radio.Button>
                    <Radio.Button value="active">Активные</Radio.Button>
                    <Radio.Button value="planned">Запланированные</Radio.Button>
                    <Radio.Button value="completed">Завершённые</Radio.Button>
                    <Radio.Button value="cancelled">Отменённые</Radio.Button>
                  </Radio.Group>
                </div>
                <Table
                  columns={listsColumns}
                  dataSource={filteredLists}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 20, showSizeChanger: false }}
                  locale={{ emptyText: "Нет списков гостей" }}
                />
              </>
            ),
          },
          {
            key: "history",
            label: (
              <Space>
                <HistoryOutlined />
                История импортов
              </Space>
            ),
            children: (
              <Table
                columns={logsColumns}
                dataSource={logs}
                rowKey="id"
                loading={loading}
                size="small"
                pagination={{ pageSize: 20, showSizeChanger: false }}
                locale={{ emptyText: "История пуста" }}
              />
            ),
          },
        ]}
      />

      {/* ── Модалка импорта ─────────────────────────────────────────────── */}
      <Modal
        open={importOpen}
        title="Импорт списка гостей"
        onCancel={resetImport}
        footer={
          importResult ? (
            <Space>
              {importResult.errorCsv && (
                <Button icon={<DownloadOutlined />} onClick={handleDownloadErrors}>
                  Скачать ошибки ({importResult.failedCount})
                </Button>
              )}
              <Button type="primary" onClick={resetImport}>
                Закрыть
              </Button>
            </Space>
          ) : (
            <Space>
              <Button onClick={resetImport}>Отмена</Button>
              <Button
                type="primary"
                icon={<ImportOutlined />}
                loading={importing}
                onClick={handleImport}
                disabled={!importFile}
              >
                Импортировать
              </Button>
            </Space>
          )
        }
        width={520}
      >
        {importResult ? (
          // ── Результат импорта ──────────────────────────────────────────
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title="Всего строк" value={importResult.totalCount} />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Импортировано"
                  value={importResult.importedCount}
                  valueStyle={{ color: "#52c41a" }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Отклонено"
                  value={importResult.failedCount}
                  valueStyle={{ color: importResult.failedCount ? "#ff4d4f" : undefined }}
                />
              </Col>
            </Row>
            {importResult.errorCsv && (
              <Alert
                type="warning"
                message={`${importResult.failedCount} строк не прошли валидацию. Скачайте файл с ошибками для просмотра причин.`}
                showIcon
              />
            )}
          </>
        ) : (
          // ── Форма импорта ──────────────────────────────────────────────
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 6, fontWeight: 500 }}>
                Презентация (опционально)
              </div>
              <Select
                placeholder="Выберите дату презентации"
                style={{ width: "100%" }}
                allowClear
                value={importPresId}
                onChange={setImportPresId}
              >
                {sortedPresentations.map((p: any) => (
                  <Option key={p.id} value={p.id}>
                    {dayjs(p.date).format("DD.MM.YYYY")} {p.time} — {p.name}
                  </Option>
                ))}
              </Select>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Для организации. Валидация дат происходит по всем презентациям выезда.
              </Text>
            </div>

            <div style={{ marginBottom: 8, fontWeight: 500 }}>CSV файл *</div>
            <Upload
              beforeUpload={(file) => {
                setImportFile(file);
                return false; // не загружаем автоматически
              }}
              onRemove={() => setImportFile(null)}
              accept=".csv"
              maxCount={1}
              fileList={importFile ? [{ uid: "1", name: importFile.name, status: "done" }] : []}
            >
              <Button icon={<UploadOutlined />}>Выбрать файл (.csv)</Button>
            </Upload>

            <div style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Формат CSV (без заголовка или с заголовком):<br />
                <code>ФИО, Номер, Дата, Время</code><br />
                Дата: DD.MM.YYYY или YYYY-MM-DD · Время: HH:MM
              </Text>
            </div>
          </>
        )}
      </Modal>

      {/* ── Детали списка (модалка) ─────────────────────────────────────── */}
      {detailId && (
        <GuestListDetail
          guestListId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={loadAll}
        />
      )}
    </>
  );
};

export default GuestListsTab;
