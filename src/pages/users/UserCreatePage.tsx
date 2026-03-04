import { useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Button,
  Select,
  Card,
  message,
  Typography,
  Grid,
} from "antd";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { usersApi } from "../../api/users";
import { rolesApi } from "../../api/roles";

const { useBreakpoint } = Grid;

export default function UserCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.getRoles().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      message.success(t("common.success"));
      navigate("/users");
    },
    onError: (err: any) => {
      message.error(t(err.response?.data?.message || "common.error"));
    },
  });

  return (
    <Card
      title={
        <Typography.Title level={4}>{t("users.register")}</Typography.Title>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => createMutation.mutate(values)}
        style={{ maxWidth: isMobile ? "100%" : 600 }}
      >
        <Form.Item
          name="email"
          label={t("users.email")}
          rules={[{ required: true, type: "email" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="password"
          label={t("auth.password")}
          rules={[{ required: true, min: 6 }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="lastName"
          label={t("users.lastName")}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="firstName"
          label={t("users.firstName")}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="middleName" label={t("users.middleName")}>
          <Input />
        </Form.Item>
        <Form.Item name="roleId" label={t("users.role")}>
          <Select
            allowClear
            placeholder={t("users.role")}
            options={roles?.map((role: any) => ({
              value: role.id,
              label: `${role.name} — ${role.description || ""}`,
            }))}
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending}
          >
            {t("common.save")}
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate("/users")}>
            {t("common.cancel")}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
