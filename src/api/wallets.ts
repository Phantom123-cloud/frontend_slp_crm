import api from "./client";

export const walletsApi = {
  list: () => api.get("/wallets"),
  getById: (id: string) => api.get(`/wallets/${id}`),
  create: (data: { name?: string; ownerId?: string }) =>
    api.post("/wallets", data),
  update: (id: string, data: { name?: string; ownerId?: string }) =>
    api.patch(`/wallets/${id}`, data),
  block: (id: string) => api.post(`/wallets/${id}/block`, {}),
  unblock: (id: string) => api.post(`/wallets/${id}/unblock`, {}),
  delete: (id: string) => api.delete(`/wallets/${id}`),

  getTransactions: (id: string) => api.get(`/wallets/${id}/transactions`),
  income: (
    id: string,
    data: {
      currency: string;
      amount: number;
      expenseTypeId?: string;
      description?: string;
      images?: string[];
    },
  ) => api.post(`/wallets/${id}/income`, data),
  expense: (
    id: string,
    data: {
      currency: string;
      amount: number;
      expenseTypeId?: string;
      description?: string;
      images?: string[];
    },
  ) => api.post(`/wallets/${id}/expense`, data),
  transfer: (
    id: string,
    data: {
      toWalletId: string;
      currency: string;
      amount: number;
      description?: string;
      images?: string[];
    },
  ) => api.post(`/wallets/${id}/transfer`, data),
  conversion: (
    id: string,
    data: {
      fromCurrency: string;
      fromAmount: number;
      toCurrency: string;
      toAmount: number;
      rate: number;
      isCustomRate?: boolean;
      description?: string;
      images?: string[];
    },
  ) => api.post(`/wallets/${id}/conversion`, data),
  updateTransaction: (
    txId: string,
    data: { description?: string; expenseTypeId?: string | null; images?: string[] },
  ) => api.patch(`/wallets/transactions/${txId}`, data),
  closeTransaction: (txId: string) =>
    api.post(`/wallets/transactions/${txId}/close`, {}),
  reopenTransaction: (txId: string) =>
    api.post(`/wallets/transactions/${txId}/reopen`, {}),
};
