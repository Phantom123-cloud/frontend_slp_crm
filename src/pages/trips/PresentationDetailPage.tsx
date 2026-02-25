import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Tag, Button, Space, Table, Card, Descriptions,
  Spin, Select, Modal, Tooltip, message,
} from 'antd';
import {
  EditOutlined, ArrowLeftOutlined, TeamOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { presentationsApi, tripsApi } from '../../api/trips';
import { usePermission } from '../../hooks/usePermission';
import PresentationCrewModal from './components/PresentationCrewModal';
import PresentationSummaryModal from './components/PresentationSummaryModal';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export default function PresentationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const canEdit = usePermission('presentations.edit');

  const [presentation, setPresentation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [crewModalOpen, setCrewModalOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [coordinatorModalOpen, setCoordinatorModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>('');
  const [coordLoading, setCoordLoading] = useState(false);

  const loadPresentation = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await presentationsApi.getById(id);
      setPresentation(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPresentation();
  }, [id]);

  const openCoordinatorModal = async () => {
    try {
      const { data } = await tripsApi.getAvailableUsers();
      setAvailableUsers(data);
      setSelectedCoordinator(presentation?.coordinatorId || '');
      setCoordinatorModalOpen(true);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    }
  };

  const handleCoordinatorSave = async () => {
    if (!selectedCoordinator) return;
    setCoordLoading(true);
    try {
      await presentationsApi.updateCoordinator(id!, selectedCoordinator);
      message.success(t('common.success'));
      setCoordinatorModalOpen(false);
      loadPresentation();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    } finally {
      setCoordLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  }

  if (!presentation) {
    return <Text>{t('errors.presentationNotFound')}</Text>;
  }

  const crewColumns = [
    {
      title: t('users.fullName'),
      key: 'name',
      render: (_: any, r: any) => `${r.user.lastName} ${r.user.firstName}`,
    },
    {
      title: t('users.tradeCode'),
      key: 'tradeCode',
      render: (_: any, r: any) => r.user.tradeCode || '—',
    },
    {
      title: t('trips.crewRole'),
      key: 'role',
      render: (_: any, r: any) => t(`trips.role_${r.role}`),
    },
  ];

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/trips/${presentation.tripId}`)}
        style={{ marginBottom: 16 }}
      >
        {t('trips.backToTrip')}: {presentation.trip?.name}
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>{presentation.name}</Title>
          <Tag color={STATUS_COLORS[presentation.status]}>
            {t(`trips.presStatus_${presentation.status}`)}
          </Tag>
        </Space>
        {canEdit && (
          <Button icon={<BarChartOutlined />} onClick={() => setSummaryModalOpen(true)}>
            {t('trips.summaryTitle')}
          </Button>
        )}
      </div>

      <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label={t('trips.presentationDate')}>
          {dayjs(presentation.date).format('DD.MM.YYYY')}
        </Descriptions.Item>
        <Descriptions.Item label={t('trips.presentationTime')}>
          {presentation.time}
        </Descriptions.Item>
        <Descriptions.Item label={t('trips.presentationType')}>
          {presentation.type?.name || '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('trips.venue')}>
          {presentation.venue
            ? `${presentation.venue.city} / ${presentation.venue.venueName}`
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('trips.coordinator')}>
          <Space>
            {presentation.coordinator
              ? `${presentation.coordinator.lastName} ${presentation.coordinator.firstName}`
              : '—'}
            {canEdit && (
              <Tooltip title={t('trips.changeCoordinator')}>
                <Button type="text" icon={<EditOutlined />} size="small" onClick={openCoordinatorModal} />
              </Tooltip>
            )}
          </Space>
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
          canEdit && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => setCrewModalOpen(true)}
            >
              {t('trips.enterCrew')}
            </Button>
          )
        }
        size="small"
      >
        {presentation.crew?.length > 0 ? (
          <Table
            dataSource={presentation.crew}
            columns={crewColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        ) : (
          <Text type="secondary">{t('trips.noCrew')}</Text>
        )}
      </Card>

      {/* Crew modal */}
      <PresentationCrewModal
        open={crewModalOpen}
        presentationId={id!}
        currentCrew={presentation.crew || []}
        coordinator={presentation.coordinator}
        onClose={() => setCrewModalOpen(false)}
        onSaved={() => { setCrewModalOpen(false); loadPresentation(); }}
      />

      {/* Summary modal */}
      <PresentationSummaryModal
        open={summaryModalOpen}
        presentationId={id!}
        canSave={canEdit}
        onClose={() => setSummaryModalOpen(false)}
      />

      {/* Coordinator change modal */}
      <Modal
        title={t('trips.changeCoordinator')}
        open={coordinatorModalOpen}
        onCancel={() => setCoordinatorModalOpen(false)}
        onOk={handleCoordinatorSave}
        confirmLoading={coordLoading}
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
