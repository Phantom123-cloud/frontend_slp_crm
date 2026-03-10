import { useNavigate } from "react-router-dom";
import {
  Card,
  Typography,
  Space,
  Tag,
  Grid,
  Button,
  Tooltip,
  Collapse,
} from "antd";
import {
  TeamOutlined,
  SafetyOutlined,
  AuditOutlined,
  FileProtectOutlined,
  FieldTimeOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LogoutOutlined,
  StopOutlined,
  DownloadOutlined,
  UploadOutlined,
  EyeOutlined,
  SettingOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  CarOutlined,
  CalendarOutlined,
  InboxOutlined,
  SwapOutlined,
  WalletOutlined,
  TransactionOutlined,
  LockOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/auth";

const { useBreakpoint } = Grid;

interface ActionDetail {
  permission: string;
  labelKey: string;
  detailKey: string;
  locationKey: string;
  icon: React.ReactNode;
  buttonType?: "primary" | "default" | "dashed" | "link";
  danger?: boolean;
}

interface ModuleConfig {
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  color: string;
  permissions: string[];
  actions: ActionDetail[];
  link?: string;
}

const MODULES: ModuleConfig[] = [
  {
    titleKey: "projectMap.usersTitle",
    descKey: "projectMap.usersDesc",
    icon: <TeamOutlined style={{ fontSize: 28 }} />,
    color: "#1677ff",
    permissions: [
      "users.view",
      "users.create",
      "users.edit_profile",
      "users.edit_settings",
      "users.force_logout",
      "users.block",
    ],
    actions: [
      {
        permission: "users.view",
        labelKey: "projectMap.usersView",
        detailKey: "projectMap.usersViewDetail",
        locationKey: "projectMap.usersViewLocation",
        icon: <EyeOutlined />,
      },
      {
        permission: "users.create",
        labelKey: "projectMap.usersCreate",
        detailKey: "projectMap.usersCreateDetail",
        locationKey: "projectMap.usersCreateLocation",
        icon: <PlusOutlined />,
        buttonType: "primary",
      },
      {
        permission: "users.edit_profile",
        labelKey: "projectMap.usersEditProfile",
        detailKey: "projectMap.usersEditProfileDetail",
        locationKey: "projectMap.usersEditProfileLocation",
        icon: <EditOutlined />,
      },
      {
        permission: "users.edit_settings",
        labelKey: "projectMap.usersEditSettings",
        detailKey: "projectMap.usersEditSettingsDetail",
        locationKey: "projectMap.usersEditSettingsLocation",
        icon: <SettingOutlined />,
      },
      {
        permission: "users.force_logout",
        labelKey: "projectMap.usersForceLogout",
        detailKey: "projectMap.usersForceLogoutDetail",
        locationKey: "projectMap.usersForceLogoutLocation",
        icon: <LogoutOutlined />,
      },
      {
        permission: "users.block",
        labelKey: "projectMap.usersBlock",
        detailKey: "projectMap.usersBlockDetail",
        locationKey: "projectMap.usersBlockLocation",
        icon: <StopOutlined />,
        danger: true,
      },
    ],
    link: "/users",
  },
  {
    titleKey: "projectMap.rolesTitle",
    descKey: "projectMap.rolesDesc",
    icon: <SafetyOutlined style={{ fontSize: 28 }} />,
    color: "#722ed1",
    permissions: ["roles.view", "roles.create", "roles.edit", "roles.delete"],
    actions: [
      {
        permission: "roles.view",
        labelKey: "projectMap.rolesView",
        detailKey: "projectMap.rolesViewDetail",
        locationKey: "projectMap.rolesViewLocation",
        icon: <EyeOutlined />,
      },
      {
        permission: "roles.create",
        labelKey: "projectMap.rolesCreate",
        detailKey: "projectMap.rolesCreateDetail",
        locationKey: "projectMap.rolesCreateLocation",
        icon: <PlusOutlined />,
        buttonType: "primary",
      },
      {
        permission: "roles.edit",
        labelKey: "projectMap.rolesEdit",
        detailKey: "projectMap.rolesEditDetail",
        locationKey: "projectMap.rolesEditLocation",
        icon: <EditOutlined />,
      },
      {
        permission: "roles.delete",
        labelKey: "projectMap.rolesDelete",
        detailKey: "projectMap.rolesDeleteDetail",
        locationKey: "projectMap.rolesDeleteLocation",
        icon: <DeleteOutlined />,
        danger: true,
      },
    ],
    link: "/roles",
  },
  {
    titleKey: "projectMap.auditTitle",
    descKey: "projectMap.auditDesc",
    icon: <AuditOutlined style={{ fontSize: 28 }} />,
    color: "#13c2c2",
    permissions: ["audit.view"],
    actions: [
      {
        permission: "audit.view",
        labelKey: "projectMap.auditView",
        detailKey: "projectMap.auditViewDetail",
        locationKey: "projectMap.auditViewLocation",
        icon: <SearchOutlined />,
      },
      {
        permission: "audit.view",
        labelKey: "projectMap.auditExport",
        detailKey: "projectMap.auditExportDetail",
        locationKey: "projectMap.auditExportLocation",
        icon: <DownloadOutlined />,
      },
    ],
    link: "/audit",
  },
  {
    titleKey: "projectMap.docsTitle",
    descKey: "projectMap.docsDesc",
    icon: <FileProtectOutlined style={{ fontSize: 28 }} />,
    color: "#52c41a",
    permissions: ["user_docs.view", "user_docs.upload", "user_docs.delete"],
    actions: [
      {
        permission: "user_docs.view",
        labelKey: "projectMap.docsView",
        detailKey: "projectMap.docsViewDetail",
        locationKey: "projectMap.docsViewLocation",
        icon: <EyeOutlined />,
      },
      {
        permission: "user_docs.upload",
        labelKey: "projectMap.docsUpload",
        detailKey: "projectMap.docsUploadDetail",
        locationKey: "projectMap.docsUploadLocation",
        icon: <UploadOutlined />,
        buttonType: "primary",
      },
      {
        permission: "user_docs.delete",
        labelKey: "projectMap.docsDelete",
        detailKey: "projectMap.docsDeleteDetail",
        locationKey: "projectMap.docsDeleteLocation",
        icon: <DeleteOutlined />,
        danger: true,
      },
    ],
  },
  {
    titleKey: "projectMap.sessionTitle",
    descKey: "projectMap.sessionDesc",
    icon: <FieldTimeOutlined style={{ fontSize: 28 }} />,
    color: "#fa8c16",
    permissions: ["session.manage"],
    actions: [
      {
        permission: "session.manage",
        labelKey: "projectMap.sessionManage",
        detailKey: "projectMap.sessionManageDetail",
        locationKey: "projectMap.sessionManageLocation",
        icon: <SettingOutlined />,
      },
    ],
  },
  {
    titleKey: "projectMap.tripsTitle",
    descKey: "projectMap.tripsDesc",
    icon: <CarOutlined style={{ fontSize: 28 }} />,
    color: "#1677ff",
    permissions: [
      "trips.view-all",
      "trips.view-person",
      "trips.create",
      "trips.edit",
      "trips.delete",
      "trips.admin",
    ],
    actions: [
      {
        permission: "trips.view-all",
        labelKey: "projectMap.tripsViewAll",
        detailKey: "projectMap.tripsViewAllDetail",
        locationKey: "projectMap.tripsViewAllLocation",
        icon: <EyeOutlined />,
      },
      {
        permission: "trips.view-person",
        labelKey: "projectMap.tripsViewPerson",
        detailKey: "projectMap.tripsViewPersonDetail",
        locationKey: "projectMap.tripsViewPersonLocation",
        icon: <EyeOutlined />,
      },
      {
        permission: "trips.create",
        labelKey: "projectMap.tripsCreate",
        detailKey: "projectMap.tripsCreateDetail",
        locationKey: "projectMap.tripsCreateLocation",
        icon: <PlusOutlined />,
        buttonType: "primary",
      },
      {
        permission: "trips.edit",
        labelKey: "projectMap.tripsEdit",
        detailKey: "projectMap.tripsEditDetail",
        locationKey: "projectMap.tripsEditLocation",
        icon: <EditOutlined />,
      },
      {
        permission: "trips.admin",
        labelKey: "projectMap.tripsAdmin",
        detailKey: "projectMap.tripsAdminDetail",
        locationKey: "projectMap.tripsAdminLocation",
        icon: <SettingOutlined />,
      },
      {
        permission: "trips.delete",
        labelKey: "projectMap.tripsDelete",
        detailKey: "projectMap.tripsDeleteDetail",
        locationKey: "projectMap.tripsDeleteLocation",
        icon: <DeleteOutlined />,
        danger: true,
      },
    ],
    link: "/trips",
  },
  {
    titleKey: "projectMap.presentationsTitle",
    descKey: "projectMap.presentationsDesc",
    icon: <CalendarOutlined style={{ fontSize: 28 }} />,
    color: "#52c41a",
    permissions: [
      "presentations.view-all",
      "presentations.view-person",
      "presentations.create",
      "presentations.edit",
      "presentations.delete",
    ],
    actions: [
      {
        permission: "presentations.view-all",
        labelKey: "projectMap.presentationsViewAll",
        detailKey: "projectMap.presentationsViewAllDetail",
        locationKey: "projectMap.presentationsViewAllLocation",
        icon: <EyeOutlined />,
      },
      {
        permission: "presentations.view-person",
        labelKey: "projectMap.presentationsViewPerson",
        detailKey: "projectMap.presentationsViewPersonDetail",
        locationKey: "projectMap.presentationsViewPersonLocation",
        icon: <EyeOutlined />,
      },
      {
        permission: "presentations.create",
        labelKey: "projectMap.presentationsCreate",
        detailKey: "projectMap.presentationsCreateDetail",
        locationKey: "projectMap.presentationsCreateLocation",
        icon: <PlusOutlined />,
        buttonType: "primary",
      },
      {
        permission: "presentations.edit",
        labelKey: "projectMap.presentationsEdit",
        detailKey: "projectMap.presentationsEditDetail",
        locationKey: "projectMap.presentationsEditLocation",
        icon: <EditOutlined />,
      },
      {
        permission: "presentations.delete",
        labelKey: "projectMap.presentationsDelete",
        detailKey: "projectMap.presentationsDeleteDetail",
        locationKey: "projectMap.presentationsDeleteLocation",
        icon: <DeleteOutlined />,
        danger: true,
      },
    ],
    link: "/presentations",
  },
  {
    titleKey: "projectMap.directoriesTitle",
    descKey: "projectMap.directoriesDesc",
    icon: <BookOutlined style={{ fontSize: 28 }} />,
    color: "#722ed1",
    permissions: [
      "directories.view",
      "directories.create",
      "directories.edit",
      "directories.delete",
    ],
    actions: [
      {
        permission: "directories.view",
        labelKey: "projectMap.directoriesView",
        detailKey: "projectMap.directoriesViewDetail",
        locationKey: "projectMap.directoriesViewLocation",
        icon: <EyeOutlined />,
      },
      {
        permission: "directories.create",
        labelKey: "projectMap.directoriesCreate",
        detailKey: "projectMap.directoriesCreateDetail",
        locationKey: "projectMap.directoriesCreateLocation",
        icon: <PlusOutlined />,
        buttonType: "primary",
      },
      {
        permission: "directories.edit",
        labelKey: "projectMap.directoriesEdit",
        detailKey: "projectMap.directoriesEditDetail",
        locationKey: "projectMap.directoriesEditLocation",
        icon: <EditOutlined />,
      },
      {
        permission: "directories.delete",
        labelKey: "projectMap.directoriesDelete",
        detailKey: "projectMap.directoriesDeleteDetail",
        locationKey: "projectMap.directoriesDeleteLocation",
        icon: <DeleteOutlined />,
      },
    ],
    link: "/directories",
  },
  {
    titleKey: "projectMap.warehousesTitle",
    descKey: "projectMap.warehousesDesc",
    icon: <InboxOutlined style={{ fontSize: 28 }} />,
    color: "#fa8c16",
    permissions: [
      "warehouses.view-all",
      "warehouses.view-person",
      "warehouses.create",
      "warehouses.transaction",
      "warehouses.manage",
    ],
    actions: [
      {
        permission: "warehouses.view-all",
        labelKey: "projectMap.warehousesViewAll",
        detailKey: "projectMap.warehousesViewAllDetail",
        locationKey: "projectMap.warehousesViewAllLocation",
        icon: <EyeOutlined />,
      },
      {
        permission: "warehouses.view-person",
        labelKey: "projectMap.warehousesViewPerson",
        detailKey: "projectMap.warehousesViewPersonDetail",
        locationKey: "projectMap.warehousesViewPersonLocation",
        icon: <EyeOutlined />,
      },
      {
        permission: "warehouses.create",
        labelKey: "projectMap.warehousesCreate",
        detailKey: "projectMap.warehousesCreateDetail",
        locationKey: "projectMap.warehousesCreateLocation",
        icon: <PlusOutlined />,
        buttonType: "primary",
      },
      {
        permission: "warehouses.transaction",
        labelKey: "projectMap.warehousesTransaction",
        detailKey: "projectMap.warehousesTransactionDetail",
        locationKey: "projectMap.warehousesTransactionLocation",
        icon: <SwapOutlined />,
      },
      {
        permission: "warehouses.manage",
        labelKey: "projectMap.warehousesManage",
        detailKey: "projectMap.warehousesManageDetail",
        locationKey: "projectMap.warehousesManageLocation",
        icon: <SettingOutlined />,
      },
    ],
    link: "/warehouses",
  },
  {
    titleKey: "projectMap.walletsTitle",
    descKey: "projectMap.walletsDesc",
    icon: <WalletOutlined style={{ fontSize: 28 }} />,
    color: "#13c2c2",
    permissions: [
      "wallets.view-all",
      "wallets.view-person",
      "wallets.create",
      "wallets.edit",
      "wallets.transaction",
      "wallets.manage",
      "wallets.auditor",
    ],
    actions: [
      {
        permission: "wallets.view-all",
        labelKey: "projectMap.walletsViewAll",
        detailKey: "projectMap.walletsViewAllDetail",
        locationKey: "projectMap.walletsViewAllLocation",
        icon: <EyeOutlined />,
      },
      {
        permission: "wallets.view-person",
        labelKey: "projectMap.walletsViewPerson",
        detailKey: "projectMap.walletsViewPersonDetail",
        locationKey: "projectMap.walletsViewPersonLocation",
        icon: <EyeOutlined />,
      },
      {
        permission: "wallets.create",
        labelKey: "projectMap.walletsCreate",
        detailKey: "projectMap.walletsCreateDetail",
        locationKey: "projectMap.walletsCreateLocation",
        icon: <PlusOutlined />,
        buttonType: "primary",
      },
      {
        permission: "wallets.edit",
        labelKey: "projectMap.walletsEdit",
        detailKey: "projectMap.walletsEditDetail",
        locationKey: "projectMap.walletsEditLocation",
        icon: <EditOutlined />,
      },
      {
        permission: "wallets.transaction",
        labelKey: "projectMap.walletsTransaction",
        detailKey: "projectMap.walletsTransactionDetail",
        locationKey: "projectMap.walletsTransactionLocation",
        icon: <SwapOutlined />,
      },
      {
        permission: "wallets.manage",
        labelKey: "projectMap.walletsManage",
        detailKey: "projectMap.walletsManageDetail",
        locationKey: "projectMap.walletsManageLocation",
        icon: <SettingOutlined />,
      },
      {
        permission: "wallets.auditor",
        labelKey: "projectMap.walletsAuditor",
        detailKey: "projectMap.walletsAuditorDetail",
        locationKey: "projectMap.walletsAuditorLocation",
        icon: <LockOutlined />,
      },
    ],
    link: "/wallets",
  },
];

function ActionRow({
  action,
  color,
  t,
}: {
  action: ActionDetail;
  color: string;
  t: (key: string) => string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        alignItems: "flex-start",
      }}
    >
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <Tooltip title={t(action.labelKey)}>
          <Button
            size="small"
            type={action.buttonType || "default"}
            danger={action.danger}
            icon={action.icon}
            style={
              !action.buttonType && !action.danger
                ? { borderColor: color, color: color }
                : {}
            }
          />
        </Tooltip>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Typography.Text style={{ display: "block", fontSize: 13 }}>
          {t(action.detailKey)}
        </Typography.Text>
        <div
          style={{
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <EnvironmentOutlined style={{ fontSize: 11, color: "#8c8c8c" }} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t(action.locationKey)}
          </Typography.Text>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({
  config,
  userPermissions,
}: {
  config: ModuleConfig;
  userPermissions: string[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const availableActions = config.actions.filter((a) =>
    userPermissions.includes(a.permission),
  );

  return (
    <Card
      style={{ borderTop: `3px solid ${config.color}` }}
      styles={{ body: { padding: isMobile ? 16 : 24 } }}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${config.color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: config.color,
              }}
            >
              {config.icon}
            </div>
            <div>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {t(config.titleKey)}
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {t(config.descKey)}
              </Typography.Text>
            </div>
          </div>
          {config.link && (
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate(config.link!)}
              style={{ background: config.color, borderColor: config.color }}
              size={isMobile ? "small" : "middle"}
            >
              {!isMobile && t("projectMap.goTo")}
            </Button>
          )}
        </div>

        {/* Quick tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {availableActions.map((a) => (
            <Tag key={a.labelKey} color={config.color} style={{ margin: 0 }}>
              {t(a.labelKey)}
            </Tag>
          ))}
        </div>

        {/* Detailed actions accordion */}
        <Collapse
          size="small"
          items={[
            {
              key: "details",
              label: (
                <Typography.Text
                  strong
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    color: "#8c8c8c",
                  }}
                >
                  {t("projectMap.detailTitle")} ({availableActions.length})
                </Typography.Text>
              ),
              children: (
                <div>
                  {availableActions.map((a) => (
                    <ActionRow
                      key={a.labelKey}
                      action={a}
                      color={config.color}
                      t={t}
                    />
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Space>
    </Card>
  );
}

export default function ProjectMapPage() {
  const { t } = useTranslation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const userPermissions = useAuthStore((s) => s.permissions);

  const visibleModules = MODULES.filter((m) =>
    m.permissions.some((p) => userPermissions.includes(p)),
  );

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>
        {t("projectMap.title")}
      </Typography.Title>
      <Typography.Text
        type="secondary"
        style={{ display: "block", marginBottom: 24 }}
      >
        {t("projectMap.subtitle")}
      </Typography.Text>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(auto-fill, minmax(500px, 1fr))",
          gap: 16,
        }}
      >
        {visibleModules.map((m) => (
          <ModuleCard
            key={m.titleKey}
            config={m}
            userPermissions={userPermissions}
          />
        ))}
      </div>

      {visibleModules.length === 0 && (
        <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>
      )}
    </div>
  );
}
