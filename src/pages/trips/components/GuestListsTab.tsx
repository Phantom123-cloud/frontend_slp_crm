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
  Typography,
  Alert,
  Statistic,
  Row,
  Col,
  Divider,
  message,
  Tooltip,
} from "antd";
import {
  UploadOutlined,
  ImportOutlined,
  DeleteOutlined,
  DownloadOutlined,
  HistoryOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { guestListsApi } from "../../../api/guestLists";
import dayjs from "dayjs";

const { Text } = Typography;
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

/** Форматирует заголовок списка: адрес + дата + имя файла */
function formatListTitle(gl: any): string {
  const datePresentations: any[] = gl.datePresentations ?? [];
  const venue = datePresentations[0]?.venue;
  const dateStr = dayjs(gl.date).format("DD.MM.YYYY");
  const parts: string[] = [];
  if (venue?.address) parts.push(venue.address);
  if (venue?.venueName) parts.push(venue.venueName);
  parts.push(dateStr);
  parts.push(gl.fileName);
  return parts.join(" • ");
}

// ────────────────────────────────────────────────────────────────────────────
// Основной компонент
// ────────────────────────────────────────────────────────────────────────────

interface Props {
  tripId: string;
}

const GuestListsTab: React.FC<Props> = ({ tripId }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // ── Состояние ────────────────────────────────────────────────────────────
  const [activeSubTab, setActiveSubTab] = useState("all");
  const [guestLists, setGuestLists] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Импорт
  const [importOpen, setImportOpen] = useState(false);
  const [importDate, setImportDate] = useState<string | undefined>();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [availableDates, setAvailableDates] = useState<any[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);

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

  const loadDates = useCallback(async () => {
    setDatesLoading(true);
    try {
      const dates = await guestListsApi.getDates(tripId);
      setAvailableDates(dates);
    } finally {
      setDatesLoading(false);
    }
  }, [tripId]);

  // ── Импорт ───────────────────────────────────────────────────────────────
  const openImportModal = () => {
    setImportOpen(true);
    loadDates();
  };

  const handleImport = async () => {
    if (!importFile) {
      message.warning("Выберите CSV файл");
      return;
    }
    if (!importDate) {
      message.warning("Выберите дату");
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const result = await guestListsApi.import(tripId, importFile, importDate);
      setImportResult(result);
      const dupMsg = result.duplicatesCount > 0 ? `, дублей: ${result.duplicatesCount}` : "";
      message.success(`Импортировано: ${result.importedCount}, отклонено: ${result.failedCount}${dupMsg}`);
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
    setImportDate(undefined);
    setImportFile(null);
    setImportResult(null);
  };

  // ── Колонки таблицы списков ───────────────────────────────────────────────
  const listsColumns = [
    {
      title: "Список",
      key: "title",
      render: (_: any, r: any) => {
        const datePresentations: any[] = r.datePresentations ?? [];
        const venue = datePresentations[0]?.venue;
        const dateStr = dayjs(r.date).format("DD.MM.YYYY");
        const venuePart = venue
          ? `${venue.address ? venue.address + ", " : ""}${venue.venueName || ""}`.trim().replace(/,\s*$/, "")
          : "";
        const presNames = datePresentations.map((p: any) => p.name).join(", ");

        return (
          <div>
            <div style={{ fontWeight: 500 }}>
              {[venuePart, dateStr].filter(Boolean).join(" • ")}
            </div>
            {presNames && (
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>{presNames}</div>
            )}
            <div style={{ fontSize: 12, color: "#595959" }}>{r.fileName}</div>
          </div>
        );
      },
    },
    {
      title: "Всего",
      dataIndex: "totalCount",
      key: "totalCount",
      width: 70,
    },
    {
      title: "Имп.",
      dataIndex: "importedCount",
      key: "importedCount",
      width: 70,
      render: (v: number) => <Text style={{ color: "#52c41a" }}>{v}</Text>,
    },
    {
      title: "Откл.",
      dataIndex: "failedCount",
      key: "failedCount",
      width: 70,
      render: (v: number) => (
        <Text style={{ color: v ? "#ff4d4f" : undefined }}>{v}</Text>
      ),
    },
    {
      title: "Дубл.",
      dataIndex: "duplicatesCount",
      key: "duplicatesCount",
      width: 70,
      render: (v: number) => (
        <Text style={{ color: v ? "#faad14" : undefined }}>{v || 0}</Text>
      ),
    },
    {
      title: "Дата импорта",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      render: (v: string) => dayjs(v).format("DD.MM.YY HH:mm"),
    },
    {
      title: "Кто",
      key: "createdBy",
      width: 120,
      render: (_: any, r: any) =>
        r.createdBy ? `${r.createdBy.lastName} ${r.createdBy.firstName}` : "—",
    },
    {
      title: "",
      key: "actions",
      width: 90,
      render: (_: any, r: any) => (
        <Button
          size="small"
          icon={<ArrowRightOutlined />}
          type="primary"
          ghost
          onClick={() => navigate(`/trips/${tripId}/guest-lists/${r.id}`)}
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
      width: 130,
      render: (v: string) => dayjs(v).format("DD.MM.YY HH:mm"),
    },
    {
      title: "Действие",
      dataIndex: "action",
      key: "action",
      width: 140,
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
      width: 70,
    },
    {
      title: "Успешно",
      dataIndex: "importedCount",
      key: "importedCount",
      width: 80,
      render: (v: number) => <Text style={{ color: "#52c41a" }}>{v}</Text>,
    },
    {
      title: "Откл.",
      dataIndex: "failedCount",
      key: "failedCount",
      width: 70,
      render: (v: number) => (
        <Text style={{ color: v ? "#ff4d4f" : undefined }}>{v}</Text>
      ),
    },
    {
      title: "Дубл.",
      dataIndex: "duplicatesCount",
      key: "duplicatesCount",
      width: 70,
      render: (v: number) => (
        <Text style={{ color: v ? "#faad14" : undefined }}>{v || 0}</Text>
      ),
    },
    {
      title: "Список",
      key: "guestList",
      render: (_: any, r: any) =>
        r.guestList ? (
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() => navigate(`/trips/${tripId}/guest-lists/${r.guestList.id}`)}
          >
            {r.guestList.fileName}
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Кто",
      key: "createdBy",
      width: 120,
      render: (_: any, r: any) =>
        r.createdBy ? `${r.createdBy.lastName} ${r.createdBy.firstName}` : "—",
    },
  ];

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
              onClick={openImportModal}
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
              <Table
                columns={listsColumns}
                dataSource={guestLists}
                rowKey="id"
                loading={loading}
                size="small"
                pagination={{ pageSize: 20, showSizeChanger: false }}
                locale={{ emptyText: "Нет списков гостей" }}
              />
            ),
          },
          {
            key: "history",
            label: (
              <Space>
                <HistoryOutlined />
                История
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
                disabled={!importFile || !importDate}
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
              <Col span={6}>
                <Statistic title="Всего строк" value={importResult.totalCount} />
              </Col>
              <Col span={6}>
                <Statistic title="Импортировано" value={importResult.importedCount} valueStyle={{ color: "#52c41a" }} />
              </Col>
              <Col span={6}>
                <Statistic title="Отклонено" value={importResult.failedCount} valueStyle={{ color: importResult.failedCount ? "#ff4d4f" : undefined }} />
              </Col>
              <Col span={6}>
                <Statistic title="Дублей" value={importResult.duplicatesCount ?? 0} valueStyle={{ color: (importResult.duplicatesCount ?? 0) > 0 ? "#faad14" : undefined }} />
              </Col>
            </Row>
            {importResult.duplicatesCount > 0 && (
              <Alert
                type="warning"
                message={`${importResult.duplicatesCount} дублирующихся номеров пропущены`}
                style={{ marginBottom: 8 }}
                showIcon
              />
            )}
            {importResult.errorCsv && (
              <Alert
                type="warning"
                message={`${importResult.failedCount} строк не прошли валидацию. Скачайте файл с ошибками.`}
                showIcon
              />
            )}
          </>
        ) : (
          // ── Форма импорта ──────────────────────────────────────────────
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 6, fontWeight: 500 }}>
                Дата презентации *
              </div>
              <Select
                placeholder="Выберите дату"
                style={{ width: "100%" }}
                loading={datesLoading}
                value={importDate}
                onChange={setImportDate}
              >
                {availableDates.map((d: any) => {
                  const presNums = d.presentations
                    .map((p: any) => `#${p.number} ${p.time}`)
                    .join(", ");
                  return (
                    <Option key={d.date} value={d.date}>
                      {dayjs(d.date).format("DD.MM.YYYY")}
                      {presNums ? ` — ${presNums}` : ""}
                    </Option>
                  );
                })}
              </Select>
              <Text type="secondary" style={{ fontSize: 12 }}>
                В файле должны быть только строки с этой датой и временем существующих презентаций
              </Text>
            </div>

            <div style={{ marginBottom: 8, fontWeight: 500 }}>CSV файл *</div>
            <Upload
              beforeUpload={(file) => {
                setImportFile(file);
                return false;
              }}
              onRemove={() => setImportFile(null)}
              accept=".csv"
              maxCount={1}
              fileList={importFile ? [{ uid: "1", name: importFile.name, status: "done" }] : []}
            >
              <Button icon={<UploadOutlined />}>Выбрать файл (.csv)</Button>
            </Upload>

            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Формат: ФИО, Телефон, Дата, Время (или полный формат с 18 колонками)<br />
                Лимит: 2000 строк · Дубли по телефону пропускаются автоматически
              </Text>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default GuestListsTab;
