import { useState, useEffect } from 'react';
import { Modal, Select, Button, Space, message, Typography, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { tripsApi } from '../../../api/trips';

const { Text } = Typography;

const ALL_TRIP_ROLES = ['LEADER', 'MV', 'GA', 'MV_GA', 'TRADER'] as const;

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
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (open) {
      tripsApi.getAvailableUsers().then(({ data }) => setAvailableUsers(data));
      setCrew(currentCrew.map((c: any) => ({ userId: c.userId || c.user?.id, role: c.role })));
      setValidationError('');
    }
  }, [open, currentCrew]);

  // === Validation logic ===
  const getCrewRoles = (crewList: { role: string }[]) => {
    const roles = crewList.map((m) => m.role);
    return {
      leaderCount: roles.filter((r) => r === 'LEADER').length,
      traderCount: roles.filter((r) => r === 'TRADER').length,
      hasMV: roles.includes('MV'),
      hasGA: roles.includes('GA'),
      hasMV_GA: roles.includes('MV_GA'),
    };
  };

  const validate = (crewList: { userId: string; role: string }[]): string | null => {
    const validMembers = crewList.filter((m) => m.userId && m.role);
    if (validMembers.length === 0) return null;

    const { leaderCount, traderCount, hasMV, hasGA, hasMV_GA } = getCrewRoles(validMembers);

    if (leaderCount > 1) return t('errors.crewOneLeader');
    if (traderCount > 20) return t('errors.crewMaxTraders');

    // MV/GA exclusion: can't mix MV_GA with separate MV or GA
    if (hasMV_GA && (hasMV || hasGA)) return t('errors.crewMvGaConflict');
    // Can't have MV alone (needs GA or MV_GA)
    if (hasMV && !hasGA && !hasMV_GA) return t('errors.crewMvNeedsGa');
    // Can't have GA alone (needs MV or MV_GA)
    if (hasGA && !hasMV && !hasMV_GA) return t('errors.crewGaNeedsMv');

    return null;
  };

  // Determine which roles are available for a given row
  const getAvailableRoles = (currentRole: string) => {
    const otherRoles = crew.filter((m) => m.role !== currentRole || m.role === currentRole);
    const { leaderCount, hasMV, hasGA, hasMV_GA } = getCrewRoles(crew);

    return ALL_TRIP_ROLES.filter((role) => {
      // Always allow the current role (so user can keep it)
      // LEADER: max 1
      if (role === 'LEADER' && leaderCount >= 1 && currentRole !== 'LEADER') return false;
      // MV_GA conflicts with separate MV or GA
      if (role === 'MV_GA' && (hasMV || hasGA)) return false;
      // MV conflicts with MV_GA
      if (role === 'MV' && hasMV_GA) return false;
      // GA conflicts with MV_GA
      if (role === 'GA' && hasMV_GA) return false;
      return true;
    });
  };

  const addMember = () => {
    setCrew([...crew, { userId: '', role: 'TRADER' }]);
  };

  const removeMember = (index: number) => {
    const updated = crew.filter((_, i) => i !== index);
    setCrew(updated);
    setValidationError(validate(updated) || '');
  };

  const updateMember = (index: number, field: string, value: string) => {
    const updated = [...crew];
    (updated[index] as any)[field] = value;
    setCrew(updated);
    setValidationError(validate(updated) || '');
  };

  const handleSave = async () => {
    const validCrew = crew.filter((m) => m.userId && m.role);
    const error = validate(validCrew);
    if (error) {
      setValidationError(error);
      return;
    }

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

  const selectedUserIds = crew.map((m) => m.userId).filter(Boolean);

  // Check limits for add button
  const { leaderCount, traderCount } = getCrewRoles(crew);
  const totalCount = crew.length;

  return (
    <Modal
      title={t('trips.editCrew')}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={loading}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !!validationError }}
      width={600}
    >
      {validationError && (
        <Alert message={validationError} type="error" showIcon style={{ marginBottom: 12 }} />
      )}

      {crew.map((member, index) => {
        const availableRoles = getAvailableRoles(member.role);
        return (
          <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="start">
            <Select
              value={member.role}
              onChange={(v) => updateMember(index, 'role', v)}
              style={{ width: 120 }}
              options={ALL_TRIP_ROLES.map((r) => ({
                value: r,
                label: t(`trips.role_${r}`),
                disabled: !availableRoles.includes(r) && r !== member.role,
              }))}
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
        );
      })}

      <Button type="dashed" onClick={addMember} icon={<PlusOutlined />} style={{ marginTop: 8 }}>
        {t('trips.addMember')}
      </Button>
    </Modal>
  );
}
