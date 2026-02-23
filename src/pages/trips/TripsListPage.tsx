import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tag, Space, Radio, Typography, message, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { tripsApi } from '../../api/trips';
import { usePermission } from '../../hooks/usePermission';
import TripCreateModal from './components/TripCreateModal';
import dayjs from 'dayjs';

const { Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'blue',
  ACTIVE: 'green',
  CLOSED: 'default',
};

export default function TripsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canCreate = usePermission('trips.create');
  const canDelete = usePermission('trips.delete');
  const canAdmin = usePermission('trips.admin');

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('active');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const { data } = await tripsApi.list(filter);
      setTrips(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [filter]);

  const handleDelete = async (id: string) => {
    try {
      await tripsApi.delete(id);
      message.success(t('common.success'));
      loadTrips();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    }
  };

  const columns = [
    {
      title: t('trips.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <a onClick={() => navigate(`/trips/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: t('trips.dates'),
      key: 'dates',
      render: (_: any, record: any) =>
        `${dayjs(record.startDate).format('DD.MM.YYYY')} — ${dayjs(record.endDate).format('DD.MM.YYYY')}`,
    },
    {
      title: t('trips.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status]}>{t(`trips.status_${status}`)}</Tag>
      ),
    },
    {
      title: t('trips.coordinator'),
      key: 'coordinator',
      render: (_: any, record: any) =>
        record.coordinator
          ? `${record.coordinator.lastName} ${record.coordinator.firstName}`
          : '—',
    },
    {
      title: t('trips.presentationsCount'),
      key: 'presentations',
      render: (_: any, record: any) => record._count?.presentations ?? 0,
    },
    {
      title: t('trips.crewCount'),
      key: 'crew',
      render: (_: any, record: any) => record._count?.crew ?? 0,
    },
    {
      title: t('users.actions'),
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title={t('trips.view')}>
            <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/trips/${record.id}`)} />
          </Tooltip>
          {canDelete && record._count?.presentations === 0 && (
            <Popconfirm title={t('trips.deleteConfirm')} onConfirm={() => handleDelete(record.id)} okText={t('users.yes')} cancelText={t('users.no')}>
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>{t('trips.title')}</Title>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            {t('trips.create')}
          </Button>
        )}
      </div>

      <Radio.Group value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 16 }}>
        <Radio.Button value="active">{t('trips.filterActive')}</Radio.Button>
        <Radio.Button value="planned">{t('trips.filterPlanned')}</Radio.Button>
        {canAdmin && <Radio.Button value="closed">{t('trips.filterClosed')}</Radio.Button>}
        <Radio.Button value="all">{t('trips.filterAll')}</Radio.Button>
      </Radio.Group>

      <Table
        dataSource={trips}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        size="small"
      />

      <TripCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => { setCreateModalOpen(false); loadTrips(); }}
      />
    </div>
  );
}
