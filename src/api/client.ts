import axios from "axios";
import { useAuthStore } from "../store/auth";

const api = axios.create({
  baseURL: "http://localhost:3030/api",
  headers: { "Content-Type": "application/json" },
});

// Подставляем access token в каждый запрос
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Если 401 — пробуем обновить токен
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          "http://localhost:3030/api/auth/refresh",
          {
            refreshToken,
          },
        );

        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        // Разлогиниваем только при явном 401/403 от сервера.
        // Сетевая ошибка (сервер недоступен) — НЕ разлогиниваем,
        // чтобы при перезапуске сервера сессия в браузере сохранялась.
        const status = refreshError?.response?.status;
        if (status === 401 || status === 403) {
          useAuthStore.getState().logout();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
