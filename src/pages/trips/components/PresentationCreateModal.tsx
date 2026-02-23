import { useState, useEffect } from 'react';
import { Modal, Form, Select, TimePicker, message, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { tripsApi } from '../../../api/trips';
import { directoriesApi } from '../../../api/directories';
import dayjs from 'dayjs';

const { Text } = Typography;

interface Props {
  open: boolean;
  tripId: string;
  trip: any; // trip object with startDate, endDate, teamName
  onClose: () => void;
  onCreated: () => void;
}

export default function PresentationCreateModal({ open, tripId, trip, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (open) {
      directoriesApi.getPresentationTypes().then(({ data }) => setTypes(data));
      directoriesApi.getVenues().then(({ data }) => setVenues(data));
    }
  }, [open]);

  // Generate date options from trip range
  const dateOptions = () => {
    if (!trip) return [];
    const start = dayjs(trip.startDate);
    const end = dayjs(trip.endDate);
    const options: { value: string; label: string }[] = [];
    let current = start;
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      options.push({
        value: current.format('YYYY-MM-DD'),
        label: current.format('DD.MM.YYYY'),
      });
      current = current.add(1, 'day');
    }
    return options;
  };

  const updatePreview = () => {
    const date = form.getFieldValue('date');
    const time = form.getFieldValue('time');
    if (date && time && trip) {
      const d = dayjs(date);
      const dd = d.format('DD');
      const mm = d.format('MM');
      const hour = time.hour();
      const number = hour < 12 ? 1 : hour < 16 ? 2 : 3;
      setPreview(`${trip.teamName} ${dd}.${mm} #${number}`);
    } else {
      setPreview('');
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await tripsApi.createPresentation(tripId, {
        date: values.date,
        time: values.time.format('HH:mm'),
        typeId: values.typeId || undefined,
        venueId: values.venueId || undefined,
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
      title={t('trips.createPresentation')}
      open={open}
      onCancel={() => { onClose(); form.resetFields(); setPreview(''); }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
    >
      <Form form={form} onFinish={handleSubmit} layout="vertical" onValuesChange={updatePreview}>
        <Form.Item name="date" label={t('trips.presentationDate')} rules={[{ required: true }]}>
          <Select options={dateOptions()} placeholder={t('trips.selectDate')} />
        </Form.Item>
        <Form.Item name="time" label={t('trips.presentationTime')} rules={[{ required: true }]}>
          <TimePicker format="HH:mm" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="typeId" label={t('trips.presentationType')}>
          <Select
            allowClear
            placeholder={t('trips.selectType')}
            options={types.map((t) => ({ value: t.id, label: t.name }))}
          />
        </Form.Item>
        <Form.Item name="venueId" label={t('trips.venue')}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t('trips.selectVenue')}
            options={venues.map((v) => ({ value: v.id, label: `${v.city} / ${v.venueName} / ${v.address}` }))}
          />
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
