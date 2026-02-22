import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Input, Select, Space, Tag, message, Modal, Badge, Tooltip,
  Checkbox, Radio, Divider, Grid, Descriptions,
} from 'antd';
import {
  PlusOutlined, LogoutOutlined, StopOutlined, CheckCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { usersApi, type UserDetailed } from '../../api/users';
import { usePermission } from '../../hooks/usePermission';

const { useBreakpoint } = Grid;

export default function UsersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const canCreate = usePermission('users.create');
  const canForceLogout = usePermission('users.force_logout');
  const canBlock = usePermission('users.block');
  const hasAnyAction = canForceLogout || canBlock;

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exportScope, setExportScope] = useState<'page' | 'all'>('all');
  const [exportFields, setExportFields] = useState<string[]>([
    'email', 'lastName', 'firstName', 'middleName', 'role',
  ]);
  const [exporting, setExporting] = useState(false);

  const EXPORT_FIELD_OPTIONS = [
    { value: 'email', label: t('users.email') },
    { value: 'lastName', label: t('users.lastName') },
    { value: 'firstName', label: t('users.firstName') },
    { value: 'middleName', label: t('users.middleName') },
    { value: 'role', label: t('users.role') },
    { value: 'tradeCode', label: t('users.tradeCode') },
    { value: 'birthDate', label: t('users.birthDate') },
    { value: 'isMarried', label: t('users.isMarried') },
    { value: 'hasChildren', label: t('users.hasChildren') },
    { value: 'hasPassport', label: t('users.hasPassport') },
    { value: 'hasDriverLicense', label: t('users.hasDriverLicense') },
    { value: 'drivingExperience', label: t('users.drivingExperience') },
    { value: 'passportNumber', label: t('users.passportNumber') },
    { value: 'registrationAddress', label: t('users.registrationAddress') },
    { value: 'livingAddress', label: t('users.livingAddress') },
    { value: 'comment', label: t('users.comment') },
    { value: 'isCoordinator', label: t('users.isCoordinator') },
    { value: 'coordinator', label: t('users.coordinator') },
    { value: 'firstTripDate', label: t('users.firstTripDate') },
    { value: 'languages', label: t('users.languages') },
    { value: 'contacts', label: t('users.contacts') },
    { value: 'citizenships', label: t('users.citizenships') },
    { value: 'isActive', label: t('users.status') },
    { value: 'isOnline', label: t('users.online') },
    { value: 'createdAt', label: t('users.dateAdded') },
  ];

  const handleExport = async () => {
    if (!exportFields.length) return;
    setExporting(true);
    try {
      const res = await usersApi.exportUsers({
        fields: exportFields,
        format: exportFormat,
        scope: exportScope,
        filter: filter || undefined,
        search: search || undefined,
        page,
        limit: 20,
      });
      const ext = exportFormat === 'csv' ? 'csv' : 'xlsx';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `users.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
      setExportOpen(false);
      message.success(t('common.success'));
    } catch {
      message.error(t('common.error'));
    } finally {
      setExporting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['users', filter, search, page],
    queryFn: () => usersApi.getAll({
      filter,
      search: search || undefined,
      page,
      limit: 20,
      detailed: true,
    }).then((r) => r.data),
  });

  const forceLogoutMutation = useMutation({
    mutationFn: usersApi.forceLogout,
    onSuccess: () => { message.success(t('common.success')); queryClient.invalidateQueries({ queryKey: ['users'] }); },
  });

  const blockMutation = useMutation({
    mutationFn: usersApi.block,
    onSuccess: () => { message.success(t('common.success')); queryClient.invalidateQueries({ queryKey: ['users'] }); },
  });

  const unblockMutation = useMutation({
    mutationFn: usersApi.unblock,
    onSuccess: () => { message.success(t('common.success')); queryClient.invalidateQueries({ queryKey: ['users'] }); },
  });

  const confirmAction = (title: string, onOk: () => void) => {
    Modal.confirm({ title, onOk, okText: t('common.save'), cancelText: t('common.cancel') });
  };

  const boolLabel = (val?: boolean | null) =>
    val === true ? t('users.yes') : val === false ? t('users.no') : '—';

  // --- Аккордеон: раскрытие строки с полной анкетой ---
  const expandedRowRender = (record: UserDetailed) => (
    <Descriptions
      size="small"
      column={isMobile ? 1 : 3}
      bordered
      style={{ background: 'transparent' }}
    >
      <Descriptions.Item label={t('users.role')}>
        {record.role?.name || '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.tradeCode')}>
        {record.tradeCode || '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.status')}>
        <Tag color={record.isActive ? 'green' : 'red'}>
          {record.isActive ? t('users.filterActive') : t('users.filterBlocked')}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label={t('users.isCoordinatorShort')}>
        <Tag color={record.isCoordinator ? 'blue' : 'default'}>
          {record.isCoordinator ? t('users.yes') : t('users.no')}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label={t('users.coordinator')}>
        {record.coordinator
          ? `${record.coordinator.lastName} ${record.coordinator.firstName}`
          : '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.middleName')}>
        {record.middleName || '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.birthDate')}>
        {record.birthDate ? dayjs(record.birthDate).format('DD.MM.YYYY') : '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.firstTripDate')}>
        {record.firstTripDate ? dayjs(record.firstTripDate).format('DD.MM.YYYY') : '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.isMarried')}>
        {boolLabel(record.isMarried)}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.hasChildren')}>
        {boolLabel(record.hasChildren)}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.hasPassport')}>
        {boolLabel(record.hasPassport)}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.hasDriverLicense')}>
        {boolLabel(record.hasDriverLicense)}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.drivingExperience')}>
        {record.drivingExperience != null ? `${record.drivingExperience}` : '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.passportNumber')}>
        {record.passportNumber || '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.registrationAddress')} span={isMobile ? 1 : 3}>
        {record.registrationAddress || '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.livingAddress')} span={isMobile ? 1 : 3}>
        {record.livingAddress || '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.languages')} span={isMobile ? 1 : 3}>
        {record.languages?.length
          ? record.languages.map((l) => `${l.language} — ${l.level}`).join(', ')
          : '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.contacts')} span={isMobile ? 1 : 3}>
        {record.contacts?.length
          ? record.contacts.map((c) => `${c.type}: ${c.countryCode}${c.phone}`).join(', ')
          : '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.citizenships')} span={isMobile ? 1 : 3}>
        {record.citizenships?.length
          ? record.citizenships.map((c) => c.country).join(', ')
          : '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('users.comment')} span={isMobile ? 1 : 3}>
        {record.comment || '—'}
      </Descriptions.Item>
    </Descriptions>
  );

  const columns = [
    {
      title: t('users.email'),
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      render: (email: string, record: UserDetailed) => (
        <a onClick={() => navigate(`/users/${record.id}`)}>{email}</a>
      ),
    },
    {
      title: t('users.fullName'),
      key: 'fullName',
      ellipsis: true,
      render: (_: any, record: UserDetailed) => (
        <Space>
          <Badge status={record.isOnline ? 'success' : 'default'} />
          {`${record.lastName} ${record.firstName}`}
        </Space>
      ),
    },
    {
      title: t('users.isCoordinatorShort'),
      key: 'isCoordinator',
      width: 130,
      render: (_: any, record: UserDetailed) => (
        <Tag color={record.isCoordinator ? 'blue' : 'default'}>
          {record.isCoordinator ? t('users.yes') : t('users.no')}
        </Tag>
      ),
    },
    {
      title: t('users.coordinator'),
      key: 'coordinator',
      width: 180,
      ellipsis: true,
      render: (_: any, record: UserDetailed) =>
        record.coordinator
          ? `${record.coordinator.lastName} ${record.coordinator.firstName}`
          : '—',
    },
    ...(!isMobile ? [{
      title: t('users.dateAdded'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    }] : []),
    ...(hasAnyAction ? [{
      title: t('users.actions'),
      key: 'actions',
      width: isMobile ? 80 : 120,
      render: (_: any, record: UserDetailed) => (
        <Space size={4}>
          {canForceLogout && (
            <Tooltip title={t('users.forceLogout')}>
              <Button
                size="small"
                icon={<LogoutOutlined />}
                onClick={() => confirmAction(t('users.forceLogout') + '?', () => forceLogoutMutation.mutate(record.id))}
              />
            </Tooltip>
          )}
          {canBlock && (
            record.isActive ? (
              <Tooltip title={t('users.block')}>
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  onClick={() => confirmAction(t('users.block') + '?', () => blockMutation.mutate(record.id))}
                />
              </Tooltip>
            ) : (
              <Tooltip title={t('users.unblock')}>
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => confirmAction(t('users.unblock') + '?', () => unblockMutation.mutate(record.id))}
                />
              </Tooltip>
            )
          )}
        </Space>
      ),
    }] : []),
  ];

  return (
    <div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 16,
      }}>
        <Space wrap size="small">
          <Select
            value={filter}
            onChange={setFilter}
            style={{ width: isMobile ? 130 : 180 }}
            options={[
              { value: 'all', label: t('users.filterAll') },
              { value: 'active', label: t('users.filterActive') },
              { value: 'blocked', label: t('users.filterBlocked') },
              { value: 'online', label: t('users.filterOnline') },
              { value: 'offline', label: t('users.filterOffline') },
            ]}
          />
          <Input.Search
            placeholder={t('users.search')}
            onSearch={(v) => { setSearch(v); setPage(1); }}
            allowClear
            style={{ width: isMobile ? 180 : 300 }}
          />
        </Space>
        <Space size="small">
          <Button icon={<DownloadOutlined />} onClick={() => setExportOpen(true)} size={isMobile ? 'small' : 'middle'}>
            {!isMobile && t('users.exportData')}
          </Button>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/users/create')} size={isMobile ? 'small' : 'middle'}>
              {!isMobile && t('users.add')}
            </Button>
          )}
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={data?.data}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: isMobile ? 500 : 900 }}
        size={isMobile ? 'small' : 'middle'}
        expandable={{
          expandedRowRender,
          rowExpandable: () => true,
        }}
        pagination={{
          current: page,
          total: data?.total,
          pageSize: 20,
          onChange: setPage,
          showTotal: isMobile ? undefined : (total) => `${total}`,
          size: isMobile ? 'small' : undefined,
        }}
      />

      <Modal
        title={t('users.exportTitle')}
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        onOk={handleExport}
        okText={t('users.exportDownload')}
        cancelText={t('common.cancel')}
        confirmLoading={exporting}
        okButtonProps={{ disabled: !exportFields.length }}
        width={isMobile ? '95%' : 520}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('users.exportFormat')}</div>
          <Radio.Group value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
            <Radio.Button value="xlsx">Excel (.xlsx)</Radio.Button>
            <Radio.Button value="csv">CSV (.csv)</Radio.Button>
          </Radio.Group>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('users.exportScope')}</div>
          <Radio.Group value={exportScope} onChange={(e) => setExportScope(e.target.value)}>
            <Radio.Button value="page">{t('users.exportScopePage')}</Radio.Button>
            <Radio.Button value="all">{t('users.exportScopeAll')}</Radio.Button>
          </Radio.Group>
        </div>

        <Divider />

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>{t('users.exportFields')}</span>
            <a
              onClick={() =>
                setExportFields(
                  exportFields.length === EXPORT_FIELD_OPTIONS.length
                    ? []
                    : EXPORT_FIELD_OPTIONS.map((o) => o.value),
                )
              }
            >
              {exportFields.length === EXPORT_FIELD_OPTIONS.length ? 'Снять все' : 'Выбрать все'}
            </a>
          </div>
          <Checkbox.Group
            value={exportFields}
            onChange={(vals) => setExportFields(vals as string[])}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            options={EXPORT_FIELD_OPTIONS}
          />
        </div>
      </Modal>
    </div>
  );
}
