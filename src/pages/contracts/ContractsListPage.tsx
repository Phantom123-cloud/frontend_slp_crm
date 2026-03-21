import { useState, useEffect } from "react";
import {
  Table,
  Typography,
  Tag,
  message,
  Spin,
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
      title: "Статус",
      key: "status",
      width: 150,
      ...colEnum(
        Object.entries(STATUS_LABELS).map(([v, t]) => ({ text: t, value: v })),
        (v: any, r: any) => r.status === v,
      ),
      render: (_: any, r: any) => (
        <Tag color={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Tag>
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
          onRow={(record) => ({
            style: { cursor: "pointer" },
            onClick: () => navigate(`/contracts/${record.id}`),
          })}
        />
      </Spin>
    </div>
  );
}
