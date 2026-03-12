import api from "./client";

export const warehousesApi = {
  list: () => api.get("/warehouses"),
  getById: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: { name?: string; type: string; ownerId: string }) =>
    api.post("/warehouses", data),
  update: (id: string, data: { name?: string; isActive?: boolean; ownerId?: string }) =>
    api.patch(`/warehouses/${id}`, data),
  deactivate: (id: string) => api.post(`/warehouses/${id}/deactivate`, {}),
  reactivate: (id: string) => api.post(`/warehouses/${id}/reactivate`, {}),
  delete: (id: string) => api.delete(`/warehouses/${id}`),
  getTransactions: (id: string) => api.get(`/warehouses/${id}/transactions`),
  createTransaction: (
    id: string,
    data: {
      type: string;
      items: { productId: string; quantity: number }[];
      toWarehouseId?: string;
      source?: string;
      note?: string;
    },
  ) => api.post(`/warehouses/${id}/transactions`, data),
  reverseTransaction: (txId: string) => api.post(`/warehouses/transactions/${txId}/reverse`, {}),
  acceptTransfer: (txId: string) => api.post(`/warehouses/transfers/${txId}/accept`, {}),
  cancelTransfer: (txId: string) => api.post(`/warehouses/transfers/${txId}/cancel`, {}),
  // Редактирование примечания/источника транзакции
  updateTransaction: (txId: string, data: { note?: string; source?: string }) =>
    api.patch(`/warehouses/transactions/${txId}`, data),
};
