import { useState, useEffect } from "react";
import {
  Table,
  Typography,
  Tag,
  message,
  Spin,
  Descriptions,
  Space,
  Tabs,
  Grid,
  Popconfirm,
  Button,
  Tooltip,
  Dropdown,
} from "antd";
import { FileTextOutlined, DeleteOutlined, DownloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { usePermission } from "../../hooks/usePermission";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { contractsApi } from "../../api/contracts";
import { useTableFilters } from "../../utils/tableFilters";

const { Title, Text } = Typography;

const TRIP_ROLE_LABELS: Record<string, string> = {
  LEADER: "Ведущий",
  MV: "МВ",
  GA: "ГА",
  MV_GA: "МВ/ГА",
  TRADER: "Торговый",
};

const STATUS_COLORS: Record<string, string> = {
  UNVERIFIED: "warning",
  VERIFIED: "success",
  CANCELLED: "error",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  OPEN: "processing",
  CLOSED: "success",
  REFUND: "error",
  PARTIAL_REFUND: "warning",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  OPEN: "Незакрытый",
  CLOSED: "Закрыт",
  REFUND: "Возврат",
  PARTIAL_REFUND: "Частичный возврат",
};

const STATUS_LABELS: Record<string, string> = {
  UNVERIFIED: "Не верифицирован",
  VERIFIED: "Верифицирован",
  CANCELLED: "Отменён",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH: "Наличными",
  CREDIT: "Кредит",
  COMPANY: "Компания",
  MIXED: "Смешанный",
  TERMINAL: "Терминал",
  RESERVATION: "Резервация",
};

// Реальные деньги = наличные + терминал + аванс_банка × (1 - ставка/100)
function calcRealMoney(r: any): number {
  const cash = Number(r.advanceCash || 0);
  const terminal = Number(r.advanceTerminal || 0);
  let bankReal = 0;
  if (r.banks?.length > 0) {
    bankReal = r.banks.reduce((s: number, b: any) => {
      if (b.advance == null) return s;
      const rate = b.conditionRate != null ? Number(b.conditionRate) : 0;
      return s + Number(b.advance) * (1 - rate / 100);
    }, 0);
    // Фолбэк: если ни один банк не имеет advance, берём advanceBank без комиссии
    if (bankReal === 0 && Number(r.advanceBank || 0) > 0) bankReal = Number(r.advanceBank);
  } else {
    bankReal = Number(r.advanceBank || 0);
  }
  return Math.round(cash + terminal + bankReal);
}

// Вычислить остаток рассрочки из данных списка
function calcInstallmentBalance(r: any): number {
  const amountAfterRefund = r.amountAfterRefund != null ? Number(r.amountAfterRefund) : Number(r.totalAmount);
  if (r.paymentSchedule?.length > 0) {
    return r.paymentSchedule.reduce((s: number, item: any) => !item.isPaid ? s + Number(item.amount) : s, 0);
  }
  const bankAdv = r.banks?.length > 0
    ? r.banks.reduce((s: number, b: any) => s + (b.advance != null ? Number(b.advance) : 0), 0) || Number(r.advanceBank || 0)
    : Number(r.advanceBank || 0);
  return Math.max(0, amountAfterRefund - (Number(r.advanceCash || 0) + Number(r.advanceTerminal || 0) + bankAdv));
}

// Форматировать банки в строку: "Банк:сумма/Банк:сумма"
function formatBanks(r: any): string {
  if (!r.banks?.length) return "";
  return r.banks
    .map((b: any) => {
      const name = b.bank?.name ?? "—";
      const amount = b.advance != null ? Number(b.advance).toLocaleString() : "0";
      return `${name}:${amount}`;
    })
    .join("/");
}

// Преобразовать список договоров в плоские строки для экспорта
function toExportRows(rows: any[]) {
  return rows.map((r) => ({
    "№ договора": r.contractNumber ?? "",
    "Клиент": r.clientName ?? "",
    "Дата": r.contractDate ? dayjs(r.contractDate).format("DD.MM.YYYY") : "",
    "Телефоны": r.phones?.map((p: any) => `${String(p.countryCode).replace(/\+/g, "")}${p.number}`).join(", ") ?? "",
    "Адрес регистрации": r.registrationAddress ?? "",
    "Адрес проживания": r.actualAddress ?? "",
    "Выезд": r.trip?.name ?? "",
    "Презентация": r.presentation?.name ?? "",
    "Компания": r.company?.name ?? "",
    "Тип оплаты": PAYMENT_TYPE_LABELS[r.paymentType] ?? r.paymentType ?? "",
    "Тип продажи": ({ RAFFLE: "Розыгрыш", HOURLY: "Часовка" } as any)[r.saleType] ?? "",
    "Сумма": Number(r.totalAmount ?? 0),
    "Реал. деньги": calcRealMoney(r),
    "Сумма после возврата": r.amountAfterRefund != null ? Number(r.amountAfterRefund) : "",
    "Аванс наличные": Number(r.advanceCash ?? 0),
    "Аванс терминал": Number(r.advanceTerminal ?? 0),
    "Аванс банк": Number(r.advanceBank ?? 0),
    "Банки": formatBanks(r),
    "Рассрочка (мес)": r.installmentMonths ?? "",
    "Остаток рассрочки": calcInstallmentBalance(r),
    "Статус оплаты": PAYMENT_STATUS_LABELS[r.paymentStatus] ?? "",
    "Должник": calcInstallmentBalance(r) > 0 ? "Да" : "Нет",
    "Спасённый": r.paymentStatus === "PARTIAL_REFUND" ? "Да" : r.paymentStatus === "REFUND" ? "Нет" : "",
    "Ведущий": r.speaker ? `${r.speaker.lastName} ${r.speaker.firstName}` : "",
    "Оформил": r.signedBy ? `${r.signedBy.lastName} ${r.signedBy.firstName}` : "",
    "Координатор": r.presentation?.coordinator
      ? `${r.presentation.coordinator.lastName} ${r.presentation.coordinator.firstName}`
      : "",
    "Верифицирован": STATUS_LABELS[r.status] ?? r.status ?? "",
    "Состав презентации": r.presentation?.crew?.length
      ? r.presentation.crew
          .map((c: any) => c.user ? `${c.user.lastName} ${c.user.firstName}` : "")
          .filter(Boolean)
          .join("\n")
      : "",
  }));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportExcel(rows: any[], filename: string) {
  const data = toExportRows(rows);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Договора");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(new Blob([buf], { type: "application/octet-stream" }), filename);
}

function exportCsv(rows: any[], filename: string) {
  const data = toExportRows(rows);
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(";"),
    ...data.map((r) =>
      headers.map((h) => String((r as any)[h] ?? "").replace(/;/g, ",")).join(";")
    ),
  ];
  downloadBlob(
    new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" }),
    filename,
  );
}

export default function ContractsListPage() {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const canDelete = usePermission("contracts.delete");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"all" | "unverified" | "verified">("all");
  const { colSearch, colEnum } = useTableFilters();

  const loadContracts = async () => {
    setLoading(true);
    try {
      const { data } = await contractsApi.list();
      setContracts(data);
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const columns = [
    {
      title: "№ договора",
      dataIndex: "contractNumber",
      key: "contractNumber",
      width: 160,
      fixed: "left" as const,
      ...colSearch((r: any) => r.contractNumber ?? ""),
      render: (_: any, r: any) => (
        <a
          onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${r.id}`); }}
          style={{ fontWeight: 600 }}
        >
          {r.contractNumber}
        </a>
      ),
    },
    {
      title: "Клиент",
      dataIndex: "clientName",
      key: "clientName",
      ...colSearch((r: any) => r.clientName ?? ""),
    },
    {
      title: "Дата",
      key: "contractDate",
      width: 110,
      render: (_: any, r: any) => dayjs(r.contractDate).format("DD.MM.YYYY"),
      ...colSearch((r: any) => dayjs(r.contractDate).format("DD.MM.YYYY")),
    },
    {
      title: "Выезд",
      key: "trip",
      responsive: ["md"] as any,
      ...colSearch((r: any) => r.trip?.name ?? ""),
      render: (_: any, r: any) => r.trip?.name || "—",
    },
    {
      title: "Презентация",
      key: "presentation",
      responsive: ["lg"] as any,
      ...colSearch((r: any) => r.presentation?.name ?? ""),
      render: (_: any, r: any) => r.presentation?.name || "—",
    },
    {
      title: "Компания",
      key: "company",
      responsive: ["md"] as any,
      ...colSearch((r: any) => r.company?.name ?? ""),
      render: (_: any, r: any) => r.company?.name || "—",
    },
    {
      title: "Тип оплаты",
      key: "paymentType",
      width: 120,
      responsive: ["md"] as any,
      ...colEnum(
        Object.entries(PAYMENT_TYPE_LABELS).map(([v, t]) => ({ text: t, value: v })),
        (v: any, r: any) => r.paymentType === v,
      ),
      render: (_: any, r: any) => PAYMENT_TYPE_LABELS[r.paymentType] || r.paymentType,
    },
    {
      title: "Сумма",
      key: "totalAmount",
      width: 110,
      align: "right" as const,
      render: (_: any, r: any) => Number(r.totalAmount).toLocaleString(),
    },
    {
      title: "Реал. деньги",
      key: "realMoney",
      width: 120,
      align: "right" as const,
      responsive: ["md"] as any,
      render: (_: any, r: any) => {
        const real = calcRealMoney(r);
        const total = Number(r.totalAmount || 0);
        const color = real < total ? "#fa8c16" : undefined;
        return <span style={{ color }}>{real.toLocaleString()}</span>;
      },
    },
    {
      title: "После возврата",
      key: "amountAfterRefund",
      width: 120,
      align: "right" as const,
      responsive: ["md"] as any,
      render: (_: any, r: any) => {
        if (r.amountAfterRefund == null) return "—";
        const val = Number(r.amountAfterRefund);
        const color = val < Number(r.totalAmount) ? "#fa8c16" : undefined;
        return <span style={{ color }}>{val.toLocaleString()}</span>;
      },
    },
    {
      title: "Статус оплаты",
      key: "paymentStatus",
      width: 140,
      responsive: ["md"] as any,
      ...colEnum(
        Object.entries(PAYMENT_STATUS_LABELS).map(([v, t]) => ({ text: t, value: v })),
        (v: any, r: any) => r.paymentStatus === v,
      ),
      render: (_: any, r: any) =>
        r.paymentStatus ? (
          <Tag color={PAYMENT_STATUS_COLORS[r.paymentStatus]}>
            {PAYMENT_STATUS_LABELS[r.paymentStatus] || r.paymentStatus}
          </Tag>
        ) : "—",
    },
    {
      title: "Должник?",
      key: "debtor",
      width: 90,
      responsive: ["md"] as any,
      render: (_: any, r: any) => {
        const balance = calcInstallmentBalance(r);
        return balance > 0
          ? <Tag color="error">Да</Tag>
          : <Tag color="default">Нет</Tag>;
      },
    },
    {
      title: "Спасённый?",
      key: "saved",
      width: 110,
      responsive: ["lg"] as any,
      render: (_: any, r: any) => {
        if (r.paymentStatus === "PARTIAL_REFUND") return <Tag color="success">Да</Tag>;
        if (r.paymentStatus === "REFUND") return <Tag color="error">Нет</Tag>;
        return "—";
      },
    },
    {
      title: "Подписал (Ведущий)",
      key: "speaker",
      responsive: ["lg"] as any,
      ...colSearch((r: any) =>
        r.speaker ? `${r.speaker.lastName} ${r.speaker.firstName}` : "",
      ),
      render: (_: any, r: any) =>
        r.speaker ? `${r.speaker.lastName} ${r.speaker.firstName}` : "—",
    },
    {
      title: "Оформил",
      key: "signedBy",
      responsive: ["lg"] as any,
      ...colSearch((r: any) =>
        r.signedBy ? `${r.signedBy.lastName} ${r.signedBy.firstName}` : "",
      ),
      render: (_: any, r: any) =>
        r.signedBy ? `${r.signedBy.lastName} ${r.signedBy.firstName}` : "—",
    },
    {
      title: "Координатор",
      key: "coordinator",
      responsive: ["xl"] as any,
      ...colSearch((r: any) =>
        r.presentation?.coordinator
          ? `${r.presentation.coordinator.lastName} ${r.presentation.coordinator.firstName}`
          : "",
      ),
      render: (_: any, r: any) =>
        r.presentation?.coordinator
          ? `${r.presentation.coordinator.lastName} ${r.presentation.coordinator.firstName}`
          : "—",
    },
    {
      title: "Проверен?",
      key: "status",
      width: 90,
      ...colEnum(
        [{ text: "Да", value: "VERIFIED" }, { text: "Нет", value: "UNVERIFIED" }, { text: "Отменён", value: "CANCELLED" }],
        (v: any, r: any) => r.status === v,
      ),
      render: (_: any, r: any) => (
        <Tag color={STATUS_COLORS[r.status]}>
          {r.status === "VERIFIED" ? "Да" : r.status === "UNVERIFIED" ? "Нет" : "Отменён"}
        </Tag>
      ),
    },
    ...(canDelete ? [{
      title: "",
      key: "actions",
      width: 48,
      fixed: "right" as const,
      render: (_: any, r: any) => {
        if (r.status !== "UNVERIFIED") return null;
        return (
          <Tooltip title="Удалить договор">
            <Popconfirm
              title="Удалить договор?"
              description="Это действие необратимо."
              okText="Удалить"
              okButtonProps={{ danger: true }}
              cancelText="Отмена"
              onConfirm={async (e) => {
                e?.stopPropagation();
                setDeletingId(r.id);
                try {
                  await contractsApi.delete(r.id);
                  message.success("Договор удалён");
                  setContracts((prev) => prev.filter((c) => c.id !== r.id));
                } catch (err: any) {
                  message.error(err.response?.data?.message || "Ошибка удаления");
                } finally {
                  setDeletingId(null);
                }
              }}
            >
              <Button
                danger
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                loading={deletingId === r.id}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Tooltip>
        );
      },
    }] : []),
  ];

  const filtered =
    tab === "unverified" ? contracts.filter((c) => c.status === "UNVERIFIED") :
    tab === "verified"   ? contracts.filter((c) => c.status === "VERIFIED") :
    contracts;

  const unverifiedCount = contracts.filter((c) => c.status === "UNVERIFIED").length;
  const verifiedCount = contracts.filter((c) => c.status === "VERIFIED").length;

  return (
    <div style={{ padding: "0 24px 24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Договора
        </Title>
        <Dropdown
          menu={{
            items: [
              { type: "group", label: "Excel (.xlsx)", children: [
                {
                  key: "excel-all",
                  label: `Все договора (${filtered.length})`,
                  onClick: () => exportExcel(filtered, `договора_все_${dayjs().format("YYYY-MM-DD")}.xlsx`),
                },
                {
                  key: "excel-page",
                  label: `Текущая страница`,
                  onClick: () => exportExcel(
                    filtered.slice((page - 1) * 20, page * 20),
                    `договора_стр${page}_${dayjs().format("YYYY-MM-DD")}.xlsx`,
                  ),
                },
              ]},
              { type: "divider" },
              { type: "group", label: "CSV (.csv)", children: [
                {
                  key: "csv-all",
                  label: `Все договора (${filtered.length})`,
                  onClick: () => exportCsv(filtered, `договора_все_${dayjs().format("YYYY-MM-DD")}.csv`),
                },
                {
                  key: "csv-page",
                  label: `Текущая страница`,
                  onClick: () => exportCsv(
                    filtered.slice((page - 1) * 20, page * 20),
                    `договора_стр${page}_${dayjs().format("YYYY-MM-DD")}.csv`,
                  ),
                },
              ]},
            ],
          }}
          disabled={filtered.length === 0}
        >
          <Button icon={<DownloadOutlined />} size="small">Скачать</Button>
        </Dropdown>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(k) => { setTab(k as "all" | "unverified" | "verified"); setPage(1); }}
        style={{ marginBottom: 8 }}
        items={[
          { key: "all", label: `Все (${contracts.length})` },
          {
            key: "verified",
            label: `Верифицированные (${verifiedCount})`,
          },
          {
            key: "unverified",
            label: (
              <span>
                Не верифицированные
                {unverifiedCount > 0 && (
                  <Tag color="warning" style={{ marginLeft: 6, fontSize: 11 }}>
                    {unverifiedCount}
                  </Tag>
                )}
              </span>
            ),
          },
        ]}
      />

      <Spin spinning={loading}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: 1800 }}
          pagination={{
            pageSize: 20,
            current: page,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
          onChange={(pg, filters) => {
            const hasFilter = Object.values(filters).some((f) => f && f.length > 0);
            if (hasFilter) setPage(1);
          }}
          expandable={{
            expandRowByClick: false,
            expandedRowRender: (r: any) => {
              const totalAdv = (Number(r.advanceCash) || 0) + (Number(r.advanceTerminal) || 0) + (Number(r.advanceBank) || 0);
              return (
                <Descriptions size="small" bordered column={3} style={{ margin: "8px 0" }}>
                  <Descriptions.Item label="Адрес регистрации" span={3}>{r.registrationAddress || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Адрес проживания" span={3}>{r.actualAddress || "—"}</Descriptions.Item>
                  {r.phones?.length > 0 && (
                    <Descriptions.Item label="Телефоны" span={3}>
                      {r.phones.map((p: any) => `${p.countryCode} ${p.number}`).join(", ")}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Тип продажи">{{ RAFFLE: "Розыгрыш", HOURLY: "Часовка" }[r.saleType as string] || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Аванс наличные">{Number(r.advanceCash || 0).toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="Аванс терминал">{Number(r.advanceTerminal || 0).toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="Аванс банк">{Number(r.advanceBank || 0).toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="Итого авансов">{totalAdv.toLocaleString()}</Descriptions.Item>
                  {r.installmentMonths && <Descriptions.Item label="Рассрочка (мес)">{r.installmentMonths}</Descriptions.Item>}
                  {r.banks?.length > 0 && (
                    <Descriptions.Item label="Банки" span={3}>{r.banks.map((b: any) => b.bank?.name).join(", ")}</Descriptions.Item>
                  )}
                  <Descriptions.Item label="Ведущий">{r.speaker ? `${r.speaker.lastName} ${r.speaker.firstName}` : "—"}</Descriptions.Item>
                  <Descriptions.Item label="Оформил" span={2}>{r.signedBy ? `${r.signedBy.lastName} ${r.signedBy.firstName}` : "—"}</Descriptions.Item>
                  {r.presentation?.crew?.length > 0 && (
                    <Descriptions.Item label="Состав презентации" span={3}>
                      <Space wrap>
                        {r.presentation.crew.map((c: any) => (
                          <Tag key={c.id} color="blue" style={{ margin: 0 }}>
                            {c.user ? `${c.user.lastName} ${c.user.firstName}` : "—"}
                            <Text style={{ color: "#add8e6", fontSize: 11, marginLeft: 5 }}>
                              {TRIP_ROLE_LABELS[c.role] || c.role}
                            </Text>
                          </Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              );
            },
          }}
        />
      </Spin>
    </div>
  );
}
