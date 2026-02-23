import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Tag, Button, Space, Table, Card, Descriptions, Popconfirm,
  message, Spin, Select, Modal, Divider, Tooltip,
} from 'antd';
import {
  EditOutlined, DeleteOutlined, LockOutlined, UnlockOutlined,
  PlusOutlined, ArrowLeftOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { tripsApi, presentationsApi } from '../../api/trips';
import { usePermission } from '../../hooks/usePermission';
import CrewModal from './components/CrewModal';
import PresentationCreateModal from './components/PresentationCreateModal';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'blue',
  ACTIVE: 'green',
  CLOSED: 'default',
};

const PRES_STATUS_COLORS: Record<string, string> = {
  PLANNED: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const canEdit = usePermission('trips.edit');
  const canDelete = usePermission('trips.delete');
  const canAdmin = usePermission('trips.admin');
  const canCreatePresentation = usePermission('presentations.create');
  const canDeletePresentation = usePermission('presentations.delete');

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [crewModalOpen, setCrewModalOpen] = useState(false);
  const [presCreateOpen, setPresCreateOpen] = useState(false);
  const [coordinatorModalOpen, setCoordinatorModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>('');

  const loadTrip = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await tripsApi.getById(id);
      setTrip(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrip();
  }, [id]);

  const handleStatusChange = async (status: string) => {
    try {
      await tripsApi.updateStatus(id!, status);
      message.success(t('common.success'));
      loadTrip();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    }
  };

  const handleDelete = async () => {
    try {
      await tripsApi.delete(id!);
      message.success(t('common.success'));
      navigate('/trips');
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    }
  };

  const handleDeletePresentation = async (presId: string) => {
    try {
      await presentationsApi.delete(presId);
      message.success(t('common.success'));
      loadTrip();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    }
  };

  const openCoordinatorModal = async () => {
    try {
      const { data } = await tripsApi.getAvailableUsers();
      setAvailableUsers(data);
      setSelectedCoordinator(trip?.coordinatorId || '');
      setCoordinatorModalOpen(true);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    }
  };

  const handleCoordinatorSave = async () => {
    if (!selectedCoordinator) return;
    try {
      await tripsApi.updateCoordinator(id!, selectedCoordinator);
      message.success(t('common.success'));
      setCoordinatorModalOpen(false);
      loadTrip();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  }

  if (!trip) {
    return <Text>{t('errors.tripNotFound')}</Text>;
  }

  const isClosed = trip.status === 'CLOSED';
  const canModify = canEdit && (!isClosed || canAdmin);

  const presColumns = [
    { title: '#', dataIndex: 'number', key: 'number', width: 50 },
    { title: t('trips.presentationName'), dataIndex: 'name', key: 'name' },
    {
      title: t('trips.presentationDate'),
      key: 'date',
      render: (_: any, r: any) => dayjs(r.date).format('DD.MM.YYYY'),
    },
    { title: t('trips.presentationTime'), dataIndex: 'time', key: 'time' },
    {
      title: t('trips.presentationType'),
      key: 'type',
      render: (_: any, r: any) => r.type?.name || '—',
    },
    {
      title: t('trips.venue'),
      key: 'venue',
      render: (_: any, r: any) => r.venue ? `${r.venue.city} / ${r.venue.venueName}` : '—',
    },
    {
      title: t('trips.status'),
      key: 'status',
      render: (_: any, r: any) => (
        <Tag color={PRES_STATUS_COLORS[r.status]}>{t(`trips.presStatus_${r.status}`)}</Tag>
      ),
    },
    {
      title: t('trips.crewCount'),
      key: 'crew',
      render: (_: any, r: any) => r.crew?.length ?? 0,
    },
    ...(canDeletePresentation && canModify ? [{
      title: t('users.actions'),
      key: 'actions',
      width: 80,
      render: (_: any, r: any) => (
        <Popconfirm
          title={dayjs(r.date).isBefore(dayjs()) ? t('trips.cancelPresentationConfirm') : t('trips.deletePresentationConfirm')}
          onConfirm={() => handleDeletePresentation(r.id)}
          okText={t('users.yes')}
          cancelText={t('users.no')}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    }] : []),
  ];

  const crewColumns = [
    {
      title: t('trips.crewRole'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag>{t(`trips.role_${role}`)}</Tag>,
    },
    {
      title: t('users.fullName'),
      key: 'name',
      render: (_: any, r: any) => `${r.user.lastName} ${r.user.firstName}${r.user.middleName ? ' ' + r.user.middleName : ''}`,
    },
    {
      title: t('users.tradeCode'),
      key: 'tradeCode',
      render: (_: any, r: any) => r.user.tradeCode || '—',
    },
  ];

  return (
    <div>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/trips')} style={{ marginBottom: 16 }}>
        {t('trips.backToList')}
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>{trip.name}</Title>
          <Tag color={STATUS_COLORS[trip.status]}>{t(`trips.status_${trip.status}`)}</Tag>
        </Space>
        <Space wrap>
          {canAdmin && !isClosed && (
            <Popconfirm title={t('trips.closeConfirm')} onConfirm={() => handleStatusChange('CLOSED')}>
              <Button icon={<LockOutlined />}>{t('trips.closeTrip')}</Button>
            </Popconfirm>
          )}
          {canAdmin && isClosed && (
            <Popconfirm title={t('trips.openConfirm')} onConfirm={() => handleStatusChange('ACTIVE')}>
              <Button icon={<UnlockOutlined />}>{t('trips.openTrip')}</Button>
            </Popconfirm>
          )}
          {canDelete && trip.presentations?.length === 0 && (
            <Popconfirm title={t('trips.deleteConfirm')} onConfirm={handleDelete}>
              <Button danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label={t('trips.teamName')}>{trip.teamName}</Descriptions.Item>
        <Descriptions.Item label={t('trips.dates')}>
          {dayjs(trip.startDate).format('DD.MM.YYYY')} — {dayjs(trip.endDate).format('DD.MM.YYYY')}
        </Descriptions.Item>
        <Descriptions.Item label={t('trips.coordinator')}>
          <Space>
            {trip.coordinator ? `${trip.coordinator.lastName} ${trip.coordinator.firstName}` : '—'}
            {canModify && (
              <Tooltip title={t('trips.changeCoordinator')}>
                <Button type="text" icon={<EditOutlined />} size="small" onClick={openCoordinatorModal} />
              </Tooltip>
            )}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={t('trips.createdBy')}>
          {trip.createdBy ? `${trip.createdBy.lastName} ${trip.createdBy.firstName}` : '—'}
        </Descriptions.Item>
      </Descriptions>

      {/* Crew */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            {t('trips.crew')}
          </Space>
        }
        extra={
          canModify && (
            <Button type="primary" icon={<EditOutlined />} size="small" onClick={() => setCrewModalOpen(true)}>
              {t('trips.editCrew')}
            </Button>
          )
        }
        style={{ marginBottom: 24 }}
        size="small"
      >
        {trip.crew?.length > 0 ? (
          <Table dataSource={trip.crew} columns={crewColumns} rowKey="id" pagination={false} size="small" />
        ) : (
          <Text type="secondary">{t('trips.noCrew')}</Text>
        )}
      </Card>

      {/* Presentations */}
      <Card
        title={t('trips.presentations')}
        extra={
          canCreatePresentation && canModify && (
            <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => setPresCreateOpen(true)}>
              {t('trips.createPresentation')}
            </Button>
          )
        }
        size="small"
      >
        <Table dataSource={trip.presentations} columns={presColumns} rowKey="id" pagination={false} size="small" />
      </Card>

      {/* Crew modal */}
      <CrewModal
        open={crewModalOpen}
        tripId={id!}
        currentCrew={trip.crew || []}
        onClose={() => setCrewModalOpen(false)}
        onSaved={() => { setCrewModalOpen(false); loadTrip(); }}
      />

      {/* Presentation create modal */}
      <PresentationCreateModal
        open={presCreateOpen}
        tripId={id!}
        trip={trip}
        onClose={() => setPresCreateOpen(false)}
        onCreated={() => { setPresCreateOpen(false); loadTrip(); }}
      />

      {/* Coordinator change modal */}
      <Modal
        title={t('trips.changeCoordinator')}
        open={coordinatorModalOpen}
        onCancel={() => setCoordinatorModalOpen(false)}
        onOk={handleCoordinatorSave}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Select
          value={selectedCoordinator || undefined}
          onChange={setSelectedCoordinator}
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="label"
          placeholder={t('trips.selectCoordinator')}
          options={availableUsers
            .filter((u) => u.isCoordinator)
            .map((u) => ({
              value: u.id,
              label: `${u.lastName} ${u.firstName}${u.tradeCode ? ' (' + u.tradeCode + ')' : ''}`,
            }))}
        />
      </Modal>
    </div>
  );
}
