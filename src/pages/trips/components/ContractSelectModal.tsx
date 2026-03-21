import { useState, useEffect } from "react";
import { Modal, Select, Form } from "antd";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  trip: any;
  /** Если передан — презентация уже выбрана (из кнопки в таблице) */
  preselectedPresentationId?: string;
}

export default function ContractSelectModal({ open, onClose, trip, preselectedPresentationId }: Props) {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [selectedPresId, setSelectedPresId] = useState<string | null>(preselectedPresentationId || null);
  const [crewOfPres, setCrewOfPres] = useState<any[]>([]);

  useEffect(() => {
    if (preselectedPresentationId) {
      setSelectedPresId(preselectedPresentationId);
      form.setFieldValue("presentationId", preselectedPresentationId);
    }
  }, [preselectedPresentationId, open]);

  useEffect(() => {
    if (selectedPresId && trip?.presentations) {
      const pres = trip.presentations.find((p: any) => p.id === selectedPresId);
      setCrewOfPres(pres?.crew || []);
    } else {
      setCrewOfPres([]);
    }
    form.setFieldValue("userId", undefined);
  }, [selectedPresId, trip]);

  const handleGo = () => {
    form.validateFields().then((values) => {
      navigate(
        `/contracts/new?tripId=${trip.id}&presentationId=${values.presentationId}&userId=${values.userId}`,
      );
      onClose();
    });
  };

  const presentations = (trip?.presentations || []);

  return (
    <Modal
      title="Внести договор"
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={handleGo}
      okText="Перейти к форме"
      cancelText="Отмена"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="presentationId"
          label="Презентация"
          rules={[{ required: true, message: "Выберите презентацию" }]}
          initialValue={preselectedPresentationId}
        >
          <Select
            placeholder="Выберите презентацию"
            options={presentations.map((p: any) => ({
              value: p.id,
              label: p.name,
            }))}
            onChange={(v) => setSelectedPresId(v)}
          />
        </Form.Item>

        <Form.Item
          name="userId"
          label="Подписант (член состава)"
          rules={[{ required: true, message: "Выберите подписанта" }]}
        >
          <Select
            placeholder={selectedPresId ? "Выберите подписанта" : "Сначала выберите презентацию"}
            disabled={!selectedPresId}
            options={crewOfPres.map((c: any) => ({
              value: c.user.id,
              label: `${c.user.lastName} ${c.user.firstName}`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
