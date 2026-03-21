import { useState, useEffect } from "react";
import {
  Table,
  Modal,
  Checkbox,
  Space,
  Typography,
  message,
  Spin,
  Empty,
  Tag,
} from "antd";
import { BankOutlined } from "@ant-design/icons";
import { tripsApi } from "../../../api/trips";
import { directoriesApi } from "../../../api/directories";

const { Text } = Typography;

interface Props {
  tripId: string;
  /** Открыть модал выбора банков извне */
  modalOpen: boolean;
  /** Закрыть модал извне */
  onModalClose: () => void;
}

export default function TripBanksTab({ tripId, modalOpen, onModalClose }: Props) {
  const [tripBanks, setTripBanks] = useState<any[]>([]);
  const [allBanks, setAllBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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

  // При открытии модала — заполняем текущий выбор
  useEffect(() => {
    if (modalOpen) {
      setSelectedIds(tripBanks.map((b) => b.id));
    }
  }, [modalOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await tripsApi.setTripBanks(tripId, selectedIds);
      message.success("Банки сохранены");
      onModalClose();
      loadTripBanks();
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const toggleBank = (bankId: string) => {
    setSelectedIds((prev) =>
      prev.includes(bankId) ? prev.filter((id) => id !== bankId) : [...prev, bankId],
    );
  };

  return (
    <>
      {/* Список банков выезда в виде тегов */}
      <Spin spinning={loading}>
        {tripBanks.length === 0 ? (
          <Text type="secondary">Банки не указаны</Text>
        ) : (
          <Space wrap>
            {tripBanks.map((bank) => (
              <Tag key={bank.id} icon={<BankOutlined />} color="blue">
                {bank.name}
              </Tag>
            ))}
          </Space>
        )}
      </Spin>

      {/* Модал выбора банков */}
      <Modal
        title="Выбор банков для выезда"
        open={modalOpen}
        onCancel={onModalClose}
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
    </>
  );
}
