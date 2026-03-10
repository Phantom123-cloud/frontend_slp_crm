import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Space,
  Avatar,
  Drawer,
  Grid,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  AuditOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  GlobalOutlined,
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  AppstoreOutlined,
  CarOutlined,
  BookOutlined,
  InboxOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/auth";
import { useThemeStore } from "../store/theme";
import { authApi } from "../api/auth";
import { usePermission, useAnyPermission } from "../hooks/usePermission";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user, refreshToken, logout } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      /* ignore */
    }
    logout();
    navigate("/login");
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  const langMenu = {
    items: [
      { key: "ru", label: "Русский" },
      { key: "en", label: "English" },
      { key: "uz", label: "O'zbekcha" },
    ],
    onClick: ({ key }: { key: string }) => changeLanguage(key),
  };

  const canViewUsers = usePermission("users.view");
  const canViewRoles = usePermission("roles.view");
  const canViewAudit = usePermission("audit.view");
  const canManageDirectories = useAnyPermission([
    "directories.view",
    "directories.create",
    "directories.edit",
    "directories.delete",
  ]);
  const canViewPresentations =
    usePermission("presentations.view-all") ||
    usePermission("presentations.view-person");
  const canViewTrips =
    usePermission("trips.view-all") || usePermission("trips.view-person");
  const canViewWarehouses = useAnyPermission([
    "warehouses.view-all",
    "warehouses.view-person",
    "warehouses.manage",
  ]);
  const canViewWallets = useAnyPermission([
    "wallets.view-all",
    "wallets.view-person",
    "wallets.manage",
    "wallets.edit",
    "wallets.auditor",
    "wallets.transaction",
  ]);

  const tripsChildren = [
    canViewTrips && { key: "/trips", label: t("menu.tripsList") },
    canViewPresentations && {
      key: "/presentations",
      label: t("menu.presentations"),
    },
  ].filter(Boolean);

  const menuItems = [
    { key: "/map", icon: <AppstoreOutlined />, label: t("menu.projectMap") },
    canViewUsers && {
      key: "/users",
      icon: <TeamOutlined />,
      label: t("menu.users"),
    },
    tripsChildren.length > 0 && {
      key: "trips-group",
      icon: <CarOutlined />,
      label: t("menu.trips"),
      children: tripsChildren,
    },
    canViewRoles && {
      key: "/roles",
      icon: <SafetyOutlined />,
      label: t("menu.roles"),
    },
    canViewAudit && {
      key: "/audit",
      icon: <AuditOutlined />,
      label: t("menu.audit"),
    },
    canManageDirectories && {
      key: "/directories",
      icon: <BookOutlined />,
      label: t("menu.directories"),
    },
    canViewWarehouses && {
      key: "/warehouses",
      icon: <InboxOutlined />,
      label: t("menu.warehouses"),
    },
    canViewWallets && {
      key: "/wallets",
      icon: <WalletOutlined />,
      label: t("menu.wallets"),
    },
  ].filter(Boolean) as any[];

  const handleMenuClick = (key: string) => {
    navigate(key);
    if (isMobile) setDrawerOpen(false);
  };

  const siderMenu = (
    <>
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isDark ? "#fff" : "#1d2129",
          fontSize: collapsed && !isMobile ? 16 : 20,
          fontWeight: "bold",
        }}
      >
        {collapsed && !isMobile ? "SLP" : "SLP CRM"}
      </div>
      <Menu
        theme={isDark ? "dark" : "light"}
        mode="inline"
        selectedKeys={[location.pathname.split("/").slice(0, 2).join("/")]}
        defaultOpenKeys={["trips-group"]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme={isDark ? "dark" : "light"}
          style={{
            borderRight: isDark ? "1px solid #303030" : "1px solid #d0d5dd",
          }}
        >
          {siderMenu}
        </Sider>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={240}
          styles={{
            body: { padding: 0, background: isDark ? "#141414" : "#e8eaed" },
          }}
          closable={false}
        >
          {siderMenu}
        </Drawer>
      )}

      <Layout>
        <Header
          style={{
            padding: isMobile ? "0 12px" : "0 24px",
            background: isDark ? "#141414" : "#f0f1f3",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${isDark ? "#303030" : "#d0d5dd"}`,
            height: 56,
            lineHeight: "56px",
          }}
        >
          {isMobile ? (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
            />
          ) : (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
          )}
          <Space size={isMobile ? "small" : "middle"}>
            <Button
              type="text"
              icon={isDark ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              size={isMobile ? "small" : "middle"}
            />
            <Dropdown menu={langMenu}>
              <Button
                type="text"
                icon={<GlobalOutlined />}
                size={isMobile ? "small" : "middle"}
              >
                {i18n.language.toUpperCase()}
              </Button>
            </Dropdown>
            {!isMobile && (
              <Space>
                <Avatar icon={<UserOutlined />} size="small" />
                <span style={{ fontSize: 13 }}>
                  {user?.firstName} {user?.lastName}
                </span>
              </Space>
            )}
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              size={isMobile ? "small" : "middle"}
            >
              {!isMobile && t("auth.logout")}
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            margin: isMobile ? 8 : 24,
            padding: isMobile ? 12 : 24,
            background: isDark ? "#1f1f1f" : "#ffffff",
            borderRadius: 8,
            minHeight: 280,
            overflow: "auto",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
