import api from "./client";

export const warehousesApi = {
  list: () => api.get("/warehouses"),
  getById: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: { name?: string; type: string; ownerId: string }) =>
    api.post("/warehouses", data),
  update: (id: string, data: { name?: string; isActive?: boolean; ownerId?: string }) =>
    api.patch(`/warehouses/${id}`, data),
  delete: (id: string) => api.delete(`/warehouses/${id}`),
  getTransactions: (id: string) => api.get(`/warehouses/${id}/transactions`),
  createTransaction: (
    id: string,
    data: {
      type: string;
      items: { productId: string; quantity: number }[];
      toWarehouseId?: string;
      note?: string;
    },
  ) => api.post(`/warehouses/${id}/transactions`, data),
};
