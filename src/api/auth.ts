import api from "./client";

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  permissions: string[];
}

export interface MeResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  permissions: string[];
}

export const authApi = {
  login: (data: LoginRequest) => api.post<LoginResponse>("/auth/login", data),

  me: () => api.get<MeResponse>("/auth/me"),

  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),

  updateMyMaxSessions: (maxSessions: number) =>
    api.patch("/auth/my-sessions", { maxSessions }),
};
