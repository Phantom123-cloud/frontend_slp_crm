import { useState, useEffect } from "react";
import {
  Modal,
  InputNumber,
  Typography,
  Divider,
  Table,
  Button,
  message,
  Spin,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { presentationsApi } from "../../../api/trips";

const { Title } = Typography;

interface SummaryRow {
  userId: string;
  name: string;
  successApproach: number | null;
  totalApproach: number | null;
  refusalCount: number | null;
  refusalValue: number | null;
  rewriteCount: number | null;
  rewriteValue: number | null;
}

interface Props {
  open: boolean;
  presentationId: string;
  canSave?: boolean;
  onClose: () => void;
}

export default function PresentationSummaryModal({
  open,
  presentationId,
  canSave = false,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && presentationId) {
      setLoading(true);
      presentationsApi
        .getSummary(presentationId)
        .then(({ data }) => {
          setRows(
            data.map((r: any) => ({
              userId: r.userId,
              name: r.user
                ? `${r.user.lastName ?? ""} ${r.user.firstName ?? ""}`.trim()
                : r.userId,
              successApproach: r.successApproach ?? null,
              totalApproach: r.totalApproach ?? null,
              refusalCount: r.refusalCount ?? null,
              refusalValue: r.refusalValue ?? null,
              rewriteCount: r.rewriteCount ?? null,
              rewriteValue: r.rewriteValue ?? null,
            })),
          );
        })
        .catch(() => message.error(t("common.error")))
        .finally(() => setLoading(false));
    }
  }, [open, presentationId]);

  const updateRow = (
    userId: string,
    field: keyof SummaryRow,
    value: number | null,
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.userId === userId ? { ...r, [field]: value } : r)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await presentationsApi.saveSummary(
        presentationId,
        rows.map((r) => ({
          userId: r.userId,
          successApproach: r.successApproach,
          totalApproach: r.totalApproach,
          refusalCount: r.refusalCount,
          refusalValue: r.refusalValue,
          rewriteCount: r.rewriteCount,
          rewriteValue: r.rewriteValue,
        })),
      );
      message.success(t("common.success"));
      onClose();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setSaving(false);
    }
  };

  const nameCol = {
    title: t("trips.summaryEmployee"),
    key: "name",
    dataIndex: "name",
    width: 160,
  };

  const numInput = (field: keyof SummaryRow) => (_: any, r: SummaryRow) => (
    <InputNumber
      min={0}
      value={r[field] as number | undefined}
      onChange={(v) => canSave && updateRow(r.userId, field, v)}
      disabled={!canSave}
      style={{ width: "100%" }}
    />
  );

  const approachColumns = [
    nameCol,
    {
      title: t("trips.summarySuccessApproach"),
      key: "sa",
      render: numInput("successApproach"),
    },
    {
      title: t("trips.summaryTotalApproach"),
      key: "ta",
      render: numInput("totalApproach"),
    },
  ];

  const refusalColumns = [
    nameCol,
    {
      title: t("trips.summaryRefusalCount"),
      key: "rc",
      render: numInput("refusalCount"),
    },
    {
      title: t("trips.summaryRefusalValue"),
      key: "rv",
      render: numInput("refusalValue"),
    },
    {
      title: t("trips.summaryRewriteCount"),
      key: "wc",
      render: numInput("rewriteCount"),
    },
    {
      title: t("trips.summaryRewriteValue"),
      key: "wv",
      render: numInput("rewriteValue"),
    },
  ];

  return (
    <Modal
      title={t("trips.summaryTitle")}
      open={open}
      onCancel={onClose}
      width={900}
      footer={
        canSave ? (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
          >
            {t("common.save")}
          </Button>
        ) : null
      }
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <>
          <Title level={5} style={{ marginTop: 0 }}>
            {t("trips.summaryApproaches")}
          </Title>
          <Table
            dataSource={rows}
            columns={approachColumns}
            rowKey="userId"
            pagination={false}
            size="small"
          />

          <Divider />

          <Title level={5}>{t("trips.summaryRefusals")}</Title>
          <Table
            dataSource={rows}
            columns={refusalColumns}
            rowKey="userId"
            pagination={false}
            size="small"
          />
        </>
      )}
    </Modal>
  );
}
