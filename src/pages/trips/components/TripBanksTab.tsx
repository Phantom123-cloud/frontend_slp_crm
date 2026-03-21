import { useState, useEffect } from "react";
import {
  Button,
  Table,
  Modal,
  Checkbox,
  Space,
  Typography,
  message,
  Spin,
  Empty,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { tripsApi } from "../../../api/trips";
import { directoriesApi } from "../../../api/directories";
import { usePermission } from "../../../hooks/usePermission";

const { Text } = Typography;

interface Props {
  tripId: string;
  isClosed: boolean;
}

export default function TripBanksTab({ tripId, isClosed }: Props) {
  const canManageBanks = usePermission("trips.banks");

  const [tripBanks, setTripBanks] = useState<any[]>([]);
  const [allBanks, setAllBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadTripBanks = async () => {
    setLoading(true);
    try {
      const { data } = await tripsApi.getTripBanks(tripId);
      setTripBanks(data);
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка загрузки банков выезда");
    } finally {
      setLoading(false);
    }
  };

  const loadAllBanks = async () => {
    try {
      const { data } = await directoriesApi.getBanks();
      setAllBanks(data);
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка загрузки справочника банков");
    }
  };

  useEffect(() => {
    loadTripBanks();
    loadAllBanks();
  }, [tripId]);

  const handleOpenModal = () => {
    setSelectedIds(tripBanks.map((b) => b.id));
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await tripsApi.setTripBanks(tripId, selectedIds);
      message.success("Банки сохранены");
      setModalOpen(false);
      loadTripBanks();
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const toggleBank = (bankId: string) => {
    setSelectedIds((prev) =>
      prev.includes(bankId) ? prev.filter((id) => id !== bankId) : [...prev, bankId]
    );
  };

  return (
    <div>
      {/* Заголовок с кнопкой управления банками */}
      {canManageBanks && !isClosed && (
        <div style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleOpenModal}
          >
            Внести банки
          </Button>
        </div>
      )}

      {/* Таблица банков выезда */}
      <Spin spinning={loading}>
        {tripBanks.length === 0 ? (
          <Empty description="Банки не указаны" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            dataSource={tripBanks}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              {
                title: "Название банка",
                dataIndex: "name",
                key: "name",
              },
              {
                title: "Описание",
                dataIndex: "description",
                key: "description",
                render: (v: any) => v || "—",
              },
            ]}
          />
        )}
      </Spin>

      {/* Модал выбора банков */}
      <Modal
        title="Выбор банков для выезда"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={saving}
        width={500}
      >
        {allBanks.length === 0 ? (
          <Text type="secondary">
            Справочник банков пуст. Добавьте банки в раздел «Справочники».
          </Text>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allBanks.map((bank) => (
              <Checkbox
                key={bank.id}
                checked={selectedIds.includes(bank.id)}
                onChange={() => toggleBank(bank.id)}
              >
                <Space direction="vertical" size={0}>
                  <Text strong>{bank.name}</Text>
                  {bank.description && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {bank.description}
                    </Text>
                  )}
                </Space>
              </Checkbox>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
