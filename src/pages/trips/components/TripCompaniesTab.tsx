import { useState, useEffect } from "react";
import {
  Modal,
  Checkbox,
  Space,
  Typography,
  message,
  Spin,
  Tag,
} from "antd";
import { ShopOutlined } from "@ant-design/icons";
import { tripsApi } from "../../../api/trips";
import { directoriesApi } from "../../../api/directories";

const { Text } = Typography;

interface Props {
  tripId: string;
  modalOpen: boolean;
  onModalClose: () => void;
}

export default function TripCompaniesTab({ tripId, modalOpen, onModalClose }: Props) {
  const [tripCompanies, setTripCompanies] = useState<any[]>([]);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Загружаем компании текущего выезда
  const loadTripCompanies = async () => {
    setLoading(true);
    try {
      const { data } = await tripsApi.getTripCompanies(tripId);
      setTripCompanies(data);
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка загрузки компаний выезда");
    } finally {
      setLoading(false);
    }
  };

  // Загружаем полный справочник компаний
  const loadAllCompanies = async () => {
    try {
      const { data } = await directoriesApi.getCompanies();
      setAllCompanies(data);
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка загрузки справочника компаний");
    }
  };

  useEffect(() => {
    loadTripCompanies();
    loadAllCompanies();
  }, [tripId]);

  // При открытии модала заполняем выбранные id из текущих компаний выезда
  useEffect(() => {
    if (modalOpen) {
      setSelectedIds(tripCompanies.map((c) => c.id));
    }
  }, [modalOpen]);

  // Сохраняем выбранные компании
  const handleSave = async () => {
    setSaving(true);
    try {
      await tripsApi.setTripCompanies(tripId, selectedIds);
      message.success("Компании сохранены");
      onModalClose();
      loadTripCompanies();
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  // Переключаем выбор компании в модале
  const toggleCompany = (companyId: string) => {
    setSelectedIds((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId],
    );
  };

  return (
    <>
      <Spin spinning={loading}>
        {tripCompanies.length === 0 ? (
          <Text type="secondary">Компании не указаны</Text>
        ) : (
          <Space wrap>
            {tripCompanies.map((company) => (
              <Tag key={company.id} icon={<ShopOutlined />} color="purple">
                {company.name}
              </Tag>
            ))}
          </Space>
        )}
      </Spin>

      <Modal
        title="Выбор компаний для выезда"
        open={modalOpen}
        onCancel={onModalClose}
        onOk={handleSave}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={saving}
        width={500}
      >
        {allCompanies.length === 0 ? (
          <Text type="secondary">
            Справочник компаний пуст. Добавьте компании в раздел «Справочники».
          </Text>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allCompanies.map((company) => (
              <Checkbox
                key={company.id}
                checked={selectedIds.includes(company.id)}
                onChange={() => toggleCompany(company.id)}
              >
                <Space direction="vertical" size={0}>
                  <Text strong>{company.name}</Text>
                  {company.description && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {company.description}
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
