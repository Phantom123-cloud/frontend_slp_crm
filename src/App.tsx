import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, Spin, theme } from "antd";
import ruRU from "antd/locale/ru_RU";
import "./i18n";

import { useAuthStore } from "./store/auth";
import { useThemeStore } from "./store/theme";
import { usePermission } from "./hooks/usePermission";
import { authApi } from "./api/auth";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/auth/LoginPage";
import UsersListPage from "./pages/users/UsersListPage";
import UserCreatePage from "./pages/users/UserCreatePage";
import UserProfilePage from "./pages/users/UserProfilePage";
import RolesPage from "./pages/roles/RolesPage";
import AuditPage from "./pages/AuditPage";
import ProjectMapPage from "./pages/ProjectMapPage";
import TripsListPage from "./pages/trips/TripsListPage";
import TripDetailPage from "./pages/trips/TripDetailPage";
import PresentationDetailPage from "./pages/trips/PresentationDetailPage";
import DirectoriesPage from "./pages/directories/DirectoriesPage";
import PresentationsListPage from "./pages/presentations/PresentationsListPage";
import WarehousesListPage from "./pages/warehouses/WarehousesListPage";
import WarehouseDetailPage from "./pages/warehouses/WarehouseDetailPage";
import WalletsListPage from "./pages/wallets/WalletsListPage";
import WalletDetailPage from "./pages/wallets/WalletDetailPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const setPermissions = useAuthStore((s) => s.setPermissions);
  const logout = useAuthStore((s) => s.logout);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuth) {
      setChecking(false);
      return;
    }
    // Первичная проверка сессии + загрузка прав
    authApi
      .me()
      .then(({ data }) => {
        setPermissions(data.permissions);
      })
      .catch(() => {
        logout();
      })
      .finally(() => setChecking(false));

    // Heartbeat каждые 60 секунд — обновляет lastSeen на бэкенде
    const interval = setInterval(() => {
      authApi
        .me()
        .then(({ data }) => {
          setPermissions(data.permissions);
        })
        .catch(() => {
          logout();
        });
    }, 60_000);

    return () => clearInterval(interval);
  }, [isAuth]);

  if (checking) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return isAuth ? <>{children}</> : <Navigate to="/login" />;
}

function PermissionRoute({
  permission,
  children,
}: {
  permission: string | string[];
  children: React.ReactNode;
}) {
  const permissions = useAuthStore((s) => s.permissions);
  const allowed = Array.isArray(permission)
    ? permission.some((p) => permissions.includes(p))
    : permissions.includes(permission);
  return allowed ? <>{children}</> : <Navigate to="/" replace />;
}

function DefaultRedirect() {
  const permissions = useAuthStore((s) => s.permissions);
  const routes = [
    { perm: "users.view", path: "/users" },
    { perm: "roles.view", path: "/roles" },
    { perm: "audit.view", path: "/audit" },
  ];
  const first = routes.find((r) => permissions.includes(r.perm));
  return <Navigate to={first?.path ?? "/map"} replace />;
}

export default function App() {
  const isDark = useThemeStore((s) => s.isDark);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={ruRU}
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: "#1677ff",
            ...(isDark
              ? {}
              : {
                  // Затемняем светлую тему чтобы не била в глаза
                  colorBgContainer: "#f7f7f8",
                  colorBgElevated: "#ffffff",
                  colorBgLayout: "#e8eaed",
                  colorBorderSecondary: "#d0d5dd",
                  colorText: "#1d2129",
                  colorTextSecondary: "#4e5969",
                  colorTextTertiary: "#86909c",
                }),
          },
          components: isDark
            ? {}
            : {
                Table: {
                  headerBg: "#e8eaed",
                  headerColor: "#1d2129",
                  rowHoverBg: "#eef0f3",
                  borderColor: "#d0d5dd",
                },
                Card: { colorBgContainer: "#ffffff" },
                Layout: {
                  siderBg: "#e8eaed",
                  headerBg: "#f0f1f3",
                  bodyBg: "#e8eaed",
                },
                Menu: {
                  itemBg: "transparent",
                  itemSelectedBg: "#d0d7e0",
                  itemHoverBg: "#dde1e6",
                  itemSelectedColor: "#1d2129",
                },
              },
        }}
      >
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<DefaultRedirect />} />
              <Route path="map" element={<ProjectMapPage />} />
              <Route
                path="users"
                element={
                  <PermissionRoute permission="users.view">
                    <UsersListPage />
                  </PermissionRoute>
                }
              />
              <Route
                path="users/create"
                element={
                  <PermissionRoute permission="users.create">
                    <UserCreatePage />
                  </PermissionRoute>
                }
              />
              <Route
                path="users/:id"
                element={
                  <PermissionRoute permission="users.view">
                    <UserProfilePage />
                  </PermissionRoute>
                }
              />
              <Route
                path="roles"
                element={
                  <PermissionRoute permission="roles.view">
                    <RolesPage />
                  </PermissionRoute>
                }
              />
              <Route
                path="audit"
                element={
                  <PermissionRoute permission="audit.view">
                    <AuditPage />
                  </PermissionRoute>
                }
              />
              <Route
                path="trips"
                element={
                  <PermissionRoute
                    permission={["trips.view-all", "trips.view-person"]}
                  >
                    <TripsListPage />
                  </PermissionRoute>
                }
              />
              <Route
                path="trips/:id"
                element={
                  <PermissionRoute
                    permission={["trips.view-all", "trips.view-person"]}
                  >
                    <TripDetailPage />
                  </PermissionRoute>
                }
              />
              <Route
                path="presentations"
                element={
                  <PermissionRoute
                    permission={[
                      "presentations.view-all",
                      "presentations.view-person",
                    ]}
                  >
                    <PresentationsListPage />
                  </PermissionRoute>
                }
              />
              <Route
                path="presentations/:id"
                element={<PresentationDetailPage />}
              />
              <Route path="directories" element={<DirectoriesPage />} />
              <Route
                path="warehouses"
                element={
                  <PermissionRoute
                    permission={[
                      "warehouses.view-all",
                      "warehouses.view-person",
                      "warehouses.create",
                      "warehouses.manage",
                    ]}
                  >
                    <WarehousesListPage />
                  </PermissionRoute>
                }
              />
              <Route
                path="warehouses/:id"
                element={
                  <PermissionRoute
                    permission={[
                      "warehouses.view-all",
                      "warehouses.view-person",
                      "warehouses.create",
                      "warehouses.manage",
                    ]}
                  >
                    <WarehouseDetailPage />
                  </PermissionRoute>
                }
              />
              <Route
                path="wallets"
                element={
                  <PermissionRoute
                    permission={[
                      "wallets.view-all",
                      "wallets.view-person",
                      "wallets.create",
                      "wallets.manage",
                      "wallets.edit",
                      "wallets.auditor",
                    ]}
                  >
                    <WalletsListPage />
                  </PermissionRoute>
                }
              />
              <Route
                path="wallets/:id"
                element={
                  <PermissionRoute
                    permission={[
                      "wallets.view-all",
                      "wallets.view-person",
                      "wallets.create",
                      "wallets.manage",
                      "wallets.edit",
                      "wallets.auditor",
                    ]}
                  >
                    <WalletDetailPage />
                  </PermissionRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
