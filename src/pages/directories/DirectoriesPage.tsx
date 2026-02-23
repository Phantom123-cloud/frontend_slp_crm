import { useState, useEffect } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Space, Popconfirm, message, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { directoriesApi } from '../../api/directories';
import { usePermission } from '../../hooks/usePermission';

const { Title } = Typography;

export default function DirectoriesPage() {
  const { t } = useTranslation();
  const canManage = usePermission('directories.manage');

  // === Presentation Types ===
  const [types, setTypes] = useState<any[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeForm] = Form.useForm();

  const loadTypes = async () => {
    setTypesLoading(true);
    try {
      const { data } = await directoriesApi.getPresentationTypes();
      setTypes(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    } finally {
      setTypesLoading(false);
    }
  };

  const handleCreateType = async (values: any) => {
    try {
      await directoriesApi.createPresentationType(values);
      message.success(t('common.success'));
      setTypeModalOpen(false);
      typeForm.resetFields();
      loadTypes();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    }
  };

  const handleDeleteType = async (id: string) => {
    try {
      await directoriesApi.deletePresentationType(id);
      message.success(t('common.success'));
      loadTypes();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    }
  };

  // === Venues ===
  const [venues, setVenues] = useState<any[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venueModalOpen, setVenueModalOpen] = useState(false);
  const [venueForm] = Form.useForm();

  const loadVenues = async () => {
    setVenuesLoading(true);
    try {
      const { data } = await directoriesApi.getVenues();
      setVenues(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    } finally {
      setVenuesLoading(false);
    }
  };

  const handleCreateVenue = async (values: any) => {
    try {
      await directoriesApi.createVenue(values);
      message.success(t('common.success'));
      setVenueModalOpen(false);
      venueForm.resetFields();
      loadVenues();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    }
  };

  const handleDeleteVenue = async (id: string) => {
    try {
      await directoriesApi.deleteVenue(id);
      message.success(t('common.success'));
      loadVenues();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    }
  };

  useEffect(() => {
    loadTypes();
    loadVenues();
  }, []);

  const typeColumns = [
    { title: t('directories.name'), dataIndex: 'name', key: 'name' },
    { title: t('directories.description'), dataIndex: 'description', key: 'description' },
    ...(canManage ? [{
      title: t('users.actions'),
      key: 'actions',
      width: 80,
      render: (_: any, record: any) => (
        <Popconfirm title={t('directories.deleteConfirm')} onConfirm={() => handleDeleteType(record.id)} okText={t('users.yes')} cancelText={t('users.no')}>
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    }] : []),
  ];

  const venueColumns = [
    { title: t('directories.city'), dataIndex: 'city', key: 'city' },
    { title: t('directories.venueName'), dataIndex: 'venueName', key: 'venueName' },
    { title: t('directories.address'), dataIndex: 'address', key: 'address' },
    ...(canManage ? [{
      title: t('users.actions'),
      key: 'actions',
      width: 80,
      render: (_: any, record: any) => (
        <Popconfirm title={t('directories.deleteConfirm')} onConfirm={() => handleDeleteVenue(record.id)} okText={t('users.yes')} cancelText={t('users.no')}>
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    }] : []),
  ];

  return (
    <div>
      <Title level={3}>{t('directories.title')}</Title>

      <Tabs
        items={[
          {
            key: 'types',
            label: t('directories.presentationTypes'),
            children: (
              <>
                {canManage && (
                  <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setTypeModalOpen(true)}>
                      {t('common.add')}
                    </Button>
                  </div>
                )}
                <Table
                  dataSource={types}
                  columns={typeColumns}
                  rowKey="id"
                  loading={typesLoading}
                  pagination={false}
                  size="small"
                />
              </>
            ),
          },
          {
            key: 'venues',
            label: t('directories.venues'),
            children: (
              <>
                {canManage && (
                  <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setVenueModalOpen(true)}>
                      {t('common.add')}
                    </Button>
                  </div>
                )}
                <Table
                  dataSource={venues}
                  columns={venueColumns}
                  rowKey="id"
                  loading={venuesLoading}
                  pagination={false}
                  size="small"
                />
              </>
            ),
          },
        ]}
      />

      {/* Create Presentation Type */}
      <Modal
        title={t('directories.addType')}
        open={typeModalOpen}
        onCancel={() => { setTypeModalOpen(false); typeForm.resetFields(); }}
        onOk={() => typeForm.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={typeForm} onFinish={handleCreateType} layout="vertical">
          <Form.Item name="name" label={t('directories.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('directories.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Venue */}
      <Modal
        title={t('directories.addVenue')}
        open={venueModalOpen}
        onCancel={() => { setVenueModalOpen(false); venueForm.resetFields(); }}
        onOk={() => venueForm.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={venueForm} onFinish={handleCreateVenue} layout="vertical">
          <Form.Item name="city" label={t('directories.city')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="venueName" label={t('directories.venueName')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label={t('directories.address')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
