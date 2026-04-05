import { useState } from "react";
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  message,
  Popconfirm,
  Checkbox,
  Card,
  Typography,
  Collapse,
  Grid,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { rolesApi } from "../../api/roles";
import { usePermission } from "../../hooks/usePermission";
import { useTableFilters } from "../../utils/tableFilters";

const { useBreakpoint } = Grid;

export default function RolesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const canCreate = usePermission("roles.create");
  const canEdit = usePermission("roles.edit");
  const canDelete = usePermission("roles.delete");

  const { colSearch } = useTableFilters();

  const [roleModal, setRoleModal] = useState(false);
  const [permModal, setPermModal] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.getRoles().then((r) => r.data),
  });
  const { data: permissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => rolesApi.getPermissions().then((r) => r.data),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["roles"] });
    queryClient.invalidateQueries({ queryKey: ["permissions"] });
  };

  const createRoleMut = useMutation({
    mutationFn: rolesApi.createRole,
    onSuccess: () => {
      invalidateAll();
      setRoleModal(false);
      message.success(t("common.success"));
    },
    onError: (e: any) =>
      message.error(t(e.response?.data?.message || "common.error")),
  });
  const updateRoleMut = useMutation({
    mutationFn: ({ id, ...body }: any) => rolesApi.updateRole(id, body),
    onSuccess: () => {
      invalidateAll();
      setEditRole(null);
      message.success(t("common.success"));
    },
    onError: (e: any) =>
      message.error(t(e.response?.data?.message || "common.error")),
  });
  const deleteRoleMut = useMutation({
    mutationFn: rolesApi.deleteRole,
    onSuccess: () => {
      invalidateAll();
      message.success(t("common.success"));
    },
    onError: (e: any) =>
      message.error(t(e.response?.data?.message || "common.error")),
  });
  const createPermMut = useMutation({
    mutationFn: rolesApi.createPermission,
    onSuccess: () => {
      invalidateAll();
      setPermModal(false);
      message.success(t("common.success"));
    },
    onError: (e: any) =>
      message.error(t(e.response?.data?.message || "common.error")),
  });

  // Группировка прав по group
  const permissionsByGroup = (permissions || []).reduce(
    (acc: any, p: any) => {
      const groupName = p.group || "other";
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(p);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  // Доступные группы для создания прав
  const availableGroups = [
    ...new Set((permissions || []).map((p: any) => p.group).filter(Boolean)),
  ] as string[];

  // === Компонент для выбора прав (Checkbox-группы) ===
  const PermissionSelector = ({
    value = [],
    onChange,
  }: {
    value?: string[];
    onChange?: (v: string[]) => void;
  }) => {
    const handleToggle = (permId: string, checked: boolean) => {
      const next = checked
        ? [...value, permId]
        : value.filter((id) => id !== permId);
      onChange?.(next);
    };

    const handleToggleAll = (groupPerms: any[], checked: boolean) => {
      const ids = groupPerms.map((p: any) => p.id);
      if (checked) {
        const next = [...new Set([...value, ...ids])];
        onChange?.(next);
      } else {
        onChange?.(value.filter((id) => !ids.includes(id)));
      }
    };

    return (
      <Collapse
        defaultActiveKey={Object.keys(permissionsByGroup)}
        size="small"
        items={(Object.entries(permissionsByGroup) as [string, any[]][]).map(
          ([groupName, perms]) => {
            const allChecked = perms.every((p) => value.includes(p.id));
            const someChecked = perms.some((p) => value.includes(p.id));
            return {
              key: groupName,
              label: (
                <Space>
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked && !allChecked}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleAll(perms, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Typography.Text
                    strong
                    style={{ textTransform: "uppercase" }}
                  >
                    {groupName}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    ({perms.filter((p) => value.includes(p.id)).length}/
                    {perms.length})
                  </Typography.Text>
                </Space>
              ),
              children: (
                <Space direction="vertical" size={4}>
                  {perms.map((p: any) => (
                    <Checkbox
                      key={p.id}
                      checked={value.includes(p.id)}
                      onChange={(e) => handleToggle(p.id, e.target.checked)}
                    >
                      <Tag color="blue" style={{ marginRight: 4 }}>
                        {p.slug}
                      </Tag>
                      {p.description && (
                        <Typography.Text type="secondary">
                          {p.description}
                        </Typography.Text>
                      )}
                    </Checkbox>
                  ))}
                </Space>
              ),
            };
          },
        )}
      />
    );
  };

  // === Roles Tab ===
  const rolesTab = (
    <>
      {canCreate && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setRoleModal(true)}
          style={{ marginBottom: 16 }}
          size={isMobile ? "small" : "middle"}
        >
          {t("roles.addRole")}
        </Button>
      )}
      <Table
        dataSource={roles}
        rowKey="id"
        scroll={{ x: isMobile ? 500 : undefined }}
        size={isMobile ? "small" : "middle"}
        columns={[
          {
            title: t("roles.name"),
            dataIndex: "name",
            width: isMobile ? 100 : 180,
            ...colSearch((r: any) => r.name || ""),
          },
          ...(!isMobile
            ? [
                {
                  title: t("roles.description"),
                  dataIndex: "description",
                  width: 200,
                  ...colSearch((r: any) => r.description || ""),
                },
              ]
            : []),
          {
            title: t("roles.permissions"),
            render: (_: any, r: any) => {
              // Группируем права роли по group
              const grouped: Record<string, any[]> = {};
              r.permissions?.forEach((rp: any) => {
                const group =
                  rp.permission.group ||
                  rp.permission.slug?.split(".")[0] ||
                  "other";
                if (!grouped[group]) grouped[group] = [];
                grouped[group].push(rp.permission);
              });
              return (
                <Space direction="vertical" size={2}>
                  {Object.entries(grouped).map(([group, perms]) => (
                    <div key={group}>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 11, textTransform: "uppercase" }}
                      >
                        {group}:{" "}
                      </Typography.Text>
                      {perms.map((p) => (
                        <Tag key={p.id} color="blue" style={{ fontSize: 11 }}>
                          {p.name}
                        </Tag>
                      ))}
                    </div>
                  ))}
                </Space>
              );
            },
          },
          ...(canEdit || canDelete
            ? [
                {
                  title: "",
                  width: isMobile ? 70 : 100,
                  render: (_: any, r: any) => (
                    <Space size={4}>
                      {canEdit && (
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => setEditRole(r)}
                        />
                      )}
                      {canDelete && (
                        <Popconfirm
                          title={t("common.delete") + "?"}
                          onConfirm={() => deleteRoleMut.mutate(r.id)}
                        >
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      )}
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />
    </>
  );

  // === Permissions Tab ===
  const permissionsTab = (
    <>
      {canCreate && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setPermModal(true)}
          style={{ marginBottom: 16 }}
          size={isMobile ? "small" : "middle"}
        >
          {t("roles.addPermission")}
        </Button>
      )}
      <Collapse
        size="small"
        items={(Object.entries(permissionsByGroup) as [string, any[]][]).map(
          ([groupName, perms]) => ({
            key: groupName,
            label: (
              <span>
                <Typography.Text strong style={{ textTransform: "uppercase", letterSpacing: 1 }}>
                  {groupName}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  ({perms.length})
                </Typography.Text>
              </span>
            ),
            children: perms.map((p: any, idx: number) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  padding: "6px 0",
                  borderBottom: idx < perms.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined,
                }}
              >
                <Tag
                  color="blue"
                  style={{ margin: 0, flexShrink: 0, fontFamily: "monospace", fontSize: 12 }}
                >
                  {p.slug}
                </Tag>
                {p.description && (
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {p.description}
                  </Typography.Text>
                )}
              </div>
            )),
          }),
        )}
      />
      {Object.keys(permissionsByGroup).length === 0 && (
        <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>
      )}
    </>
  );

  return (
    <>
      <Tabs
        size={isMobile ? "small" : "middle"}
        items={[
          { key: "roles", label: t("roles.title"), children: rolesTab },
          {
            key: "permissions",
            label: t("roles.permissions"),
            children: permissionsTab,
          },
        ]}
      />

      {/* Create Permission Modal */}
      <Modal
        title={t("roles.addPermission")}
        open={permModal}
        onCancel={() => setPermModal(false)}
        footer={null}
        width={isMobile ? "95%" : 520}
      >
        <Form layout="vertical" onFinish={(v) => createPermMut.mutate(v)}>
          <Form.Item
            name="name"
            label={t("roles.name")}
            rules={[{ required: true }]}
          >
            <Input placeholder="Создание пользователей..." />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}>
            <Input placeholder="users.create, deals.view..." />
          </Form.Item>
          <Form.Item
            name="group"
            label={t("roles.group")}
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              allowClear
              placeholder="users, roles, audit..."
              options={availableGroups.map((g) => ({ value: g, label: g }))}
              // Можно ввести новую группу
              mode={undefined}
            />
          </Form.Item>
          <Form.Item name="description" label={t("roles.description")}>
            <Input />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={createPermMut.isPending}
          >
            {t("common.save")}
          </Button>
        </Form>
      </Modal>

      {/* Create Role Modal */}
      <Modal
        title={t("roles.addRole")}
        open={roleModal}
        onCancel={() => setRoleModal(false)}
        footer={null}
        width={isMobile ? "95%" : 600}
      >
        <Form layout="vertical" onFinish={(v) => createRoleMut.mutate(v)}>
          <Form.Item
            name="name"
            label={t("roles.name")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t("roles.description")}>
            <Input />
          </Form.Item>
          <Form.Item name="permissionIds" label={t("roles.permissions")}>
            <PermissionSelector />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={createRoleMut.isPending}
          >
            {t("common.save")}
          </Button>
        </Form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        title={t("common.edit")}
        open={!!editRole}
        onCancel={() => setEditRole(null)}
        footer={null}
        destroyOnClose
        width={isMobile ? "95%" : 600}
      >
        {editRole && (
          <Form
            layout="vertical"
            initialValues={{
              name: editRole.name,
              description: editRole.description,
              permissionIds: editRole.permissions?.map(
                (rp: any) => rp.permission.id,
              ),
            }}
            onFinish={(v) => updateRoleMut.mutate({ id: editRole.id, ...v })}
          >
            <Form.Item
              name="name"
              label={t("roles.name")}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="description" label={t("roles.description")}>
              <Input />
            </Form.Item>
            <Form.Item name="permissionIds" label={t("roles.permissions")}>
              <PermissionSelector />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateRoleMut.isPending}
            >
              {t("common.save")}
            </Button>
          </Form>
        )}
      </Modal>
    </>
  );
}
