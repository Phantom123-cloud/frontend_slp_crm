import { create } from "zustand";

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  permissions: string[];
  isAuthenticated: boolean;

  setAuth: (
    accessToken: string,
    refreshToken: string,
    user: AuthUser,
    permissions?: string[],
  ) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setPermissions: (permissions: string[]) => void;
  hasPermission: (permission: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: localStorage.getItem("accessToken"),
  refreshToken: localStorage.getItem("refreshToken"),
  user: localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null,
  permissions: localStorage.getItem("permissions")
    ? JSON.parse(localStorage.getItem("permissions")!)
    : [],
  isAuthenticated: !!localStorage.getItem("accessToken"),

  setAuth: (accessToken, refreshToken, user, permissions = []) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("permissions", JSON.stringify(permissions));
    set({
      accessToken,
      refreshToken,
      user,
      permissions,
      isAuthenticated: true,
    });
  },

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    set({ accessToken, refreshToken });
  },

  setPermissions: (permissions) => {
    localStorage.setItem("permissions", JSON.stringify(permissions));
    set({ permissions });
  },

  hasPermission: (permission) => {
    return get().permissions.includes(permission);
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("permissions");
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      permissions: [],
      isAuthenticated: false,
    });
  },
}));
