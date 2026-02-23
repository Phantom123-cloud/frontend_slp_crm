import { useState, useEffect } from 'react';
import { Modal, Form, Select, Button, Space, Tag, message, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { tripsApi } from '../../../api/trips';

const { Text } = Typography;

const TRIP_ROLES = ['LEADER', 'MV', 'GA', 'MV_GA', 'TRADER'] as const;

interface Props {
  open: boolean;
  tripId: string;
  currentCrew: any[];
  onClose: () => void;
  onSaved: () => void;
}

export default function CrewModal({ open, tripId, currentCrew, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [crew, setCrew] = useState<{ userId: string; role: string }[]>([]);

  useEffect(() => {
    if (open) {
      tripsApi.getAvailableUsers().then(({ data }) => setAvailableUsers(data));
      // Init crew from currentCrew
      setCrew(currentCrew.map((c: any) => ({ userId: c.userId || c.user?.id, role: c.role })));
    }
  }, [open, currentCrew]);

  const addMember = () => {
    setCrew([...crew, { userId: '', role: 'TRADER' }]);
  };

  const removeMember = (index: number) => {
    setCrew(crew.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: string, value: string) => {
    const updated = [...crew];
    (updated[index] as any)[field] = value;
    setCrew(updated);
  };

  const handleSave = async () => {
    const validCrew = crew.filter((m) => m.userId && m.role);
    setLoading(true);
    try {
      await tripsApi.setCrew(tripId, validCrew);
      message.success(t('common.success'));
      onSaved();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    } finally {
      setLoading(false);
    }
  };

  const getUserLabel = (user: any) => {
    const name = `${user.lastName} ${user.firstName}`;
    return user.tradeCode ? `${name} (${user.tradeCode})` : name;
  };

  // Users already selected
  const selectedUserIds = crew.map((m) => m.userId).filter(Boolean);

  return (
    <Modal
      title={t('trips.editCrew')}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={loading}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      width={600}
    >
      {crew.map((member, index) => (
        <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="start">
          <Select
            value={member.role}
            onChange={(v) => updateMember(index, 'role', v)}
            style={{ width: 120 }}
            options={TRIP_ROLES.map((r) => ({ value: r, label: t(`trips.role_${r}`) }))}
          />
          <Select
            value={member.userId || undefined}
            onChange={(v) => updateMember(index, 'userId', v)}
            style={{ width: 320 }}
            showSearch
            optionFilterProp="label"
            placeholder={t('trips.selectUser')}
            options={availableUsers
              .filter((u) => !selectedUserIds.includes(u.id) || u.id === member.userId)
              .map((u) => ({ value: u.id, label: getUserLabel(u) }))}
          />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeMember(index)} />
        </Space>
      ))}

      <Button type="dashed" onClick={addMember} icon={<PlusOutlined />} style={{ marginTop: 8 }}>
        {t('trips.addMember')}
      </Button>
    </Modal>
  );
}
