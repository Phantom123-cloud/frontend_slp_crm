import { useState, useEffect } from "react";
import {
  Table,
  Typography,
  Tag,
  message,
  Spin,
  Descriptions,
  Space,
} from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { contractsApi } from "../../api/contracts";
import { useTableFilters } from "../../utils/tableFilters";

const { Title } = Typography;

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

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH: "Наличными",
  CREDIT: "Кредит",
  COMPANY: "Компания",
  MIXED: "Смешанный",
  TERMINAL: "Терминал",
  RESERVATION: "Резервация",
};

export default function ContractsListPage() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
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
      ...colSearch((r: any) => r.trip?.name ?? ""),
      render: (_: any, r: any) => r.trip?.name || "—",
    },
    {
      title: "Презентация",
      key: "presentation",
      ...colSearch((r: any) => r.presentation?.name ?? ""),
      render: (_: any, r: any) => r.presentation?.name || "—",
    },
    {
      title: "Компания",
      key: "company",
      ...colSearch((r: any) => r.company?.name ?? ""),
      render: (_: any, r: any) => r.company?.name || "—",
    },
    {
      title: "Тип оплаты",
      key: "paymentType",
      width: 120,
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
      title: "Подписал",
      key: "signedBy",
      ...colSearch((r: any) =>
        r.signedBy ? `${r.signedBy.lastName} ${r.signedBy.firstName}` : "",
      ),
      render: (_: any, r: any) =>
        r.signedBy ? `${r.signedBy.lastName} ${r.signedBy.firstName}` : "—",
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
  ];

  return (
    <div style={{ padding: "0 24px 24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Договора
        </Title>
      </div>

      <Spin spinning={loading}>
        <Table
          dataSource={contracts}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: 1400 }}
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
                </Descriptions>
              );
            },
          }}
        />
      </Spin>
    </div>
  );
}
