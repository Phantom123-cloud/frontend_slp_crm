import api from "./client";

export const directoriesApi = {
  // Presentation Types
  getPresentationTypes: () => api.get("/presentation-types"),
  createPresentationType: (data: { name: string; description?: string }) =>
    api.post("/presentation-types", data),
  updatePresentationType: (
    id: string,
    data: { name?: string; description?: string },
  ) => api.patch(`/presentation-types/${id}`, data),
  deletePresentationType: (id: string) =>
    api.delete(`/presentation-types/${id}`),

  // Expense Types
  getExpenseTypes: () => api.get("/expense-types"),
  createExpenseType: (data: { name: string }) =>
    api.post("/expense-types", data),
  updateExpenseType: (id: string, data: { name?: string }) =>
    api.patch(`/expense-types/${id}`, data),
  deleteExpenseType: (id: string) => api.delete(`/expense-types/${id}`),

  // Products
  getProducts: () => api.get("/products"),
  createProduct: (data: { name: string; unit: string; sku?: string }) =>
    api.post("/products", data),
  updateProduct: (
    id: string,
    data: { name?: string; unit?: string; sku?: string; isActive?: boolean },
  ) => api.patch(`/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),

  // Venues
  getVenues: () => api.get("/venues"),
  createVenue: (data: { city: string; address: string; venueName: string }) =>
    api.post("/venues", data),
  updateVenue: (
    id: string,
    data: { city?: string; address?: string; venueName?: string },
  ) => api.patch(`/venues/${id}`, data),
  deleteVenue: (id: string) => api.delete(`/venues/${id}`),

  // Banks
  getBanks: () => api.get("/banks"),
  createBank: (data: { name: string; description?: string }) =>
    api.post("/banks", data),
  updateBank: (id: string, data: { name?: string; description?: string }) =>
    api.patch(`/banks/${id}`, data),
  deleteBank: (id: string) => api.delete(`/banks/${id}`),

  // Bank Conditions
  getBankConditions: (bankId: string) => api.get(`/banks/${bankId}/conditions`),
  createBankCondition: (bankId: string, data: { name: string; rate: number; sortOrder?: number }) =>
    api.post(`/banks/${bankId}/conditions`, data),
  updateBankCondition: (id: string, data: { name?: string; rate?: number; isActive?: boolean }) =>
    api.patch(`/banks/conditions/${id}`, data),
  deleteBankCondition: (id: string) => api.delete(`/banks/conditions/${id}`),

  // Companies
  getCompanies: () => api.get("/companies"),
  createCompany: (data: { name: string; description?: string }) =>
    api.post("/companies", data),
  updateCompany: (id: string, data: { name?: string; description?: string }) =>
    api.patch(`/companies/${id}`, data),
  deleteCompany: (id: string) => api.delete(`/companies/${id}`),
};
