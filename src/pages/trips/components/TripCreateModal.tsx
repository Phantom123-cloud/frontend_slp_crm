import { useState } from 'react';
import { Modal, Form, Input, DatePicker, message, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { tripsApi } from '../../../api/trips';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function TripCreateModal({ open, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');

  const updatePreview = () => {
    const teamName = form.getFieldValue('teamName') || '';
    const startDate = form.getFieldValue('startDate');
    if (teamName && startDate) {
      const d = startDate.toDate();
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setPreview(`${teamName}${yy}${mm}${dd}`);
    } else {
      setPreview('');
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await tripsApi.create({
        teamName: values.teamName,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
      });
      message.success(t('common.success'));
      form.resetFields();
      setPreview('');
      onCreated();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || 'common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={t('trips.createTrip')}
      open={open}
      onCancel={() => { onClose(); form.resetFields(); setPreview(''); }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
    >
      <Form form={form} onFinish={handleSubmit} layout="vertical" onValuesChange={updatePreview}>
        <Form.Item name="teamName" label={t('trips.teamName')} rules={[{ required: true }]}>
          <Input placeholder="AA" maxLength={10} />
        </Form.Item>
        <Form.Item name="startDate" label={t('trips.startDate')} rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
        </Form.Item>
        <Form.Item name="endDate" label={t('trips.endDate')} rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
        </Form.Item>
        {preview && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">{t('trips.generatedName')}: </Text>
            <Text strong>{preview}</Text>
          </div>
        )}
      </Form>
    </Modal>
  );
}
