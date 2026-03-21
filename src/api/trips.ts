import api from "./client";

export const tripsApi = {
  // Trips
  list: (filter?: string) => api.get("/trips", { params: { filter } }),
  getById: (id: string) => api.get(`/trips/${id}`),
  create: (data: { teamName: string; startDate: string; endDate: string }) =>
    api.post("/trips", data),
  update: (id: string, data: any) => api.patch(`/trips/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/trips/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/trips/${id}`),

  // Crew
  getCrew: (tripId: string) => api.get(`/trips/${tripId}/crew`),
  setCrew: (tripId: string, crew: { userId: string; role: string }[]) =>
    api.patch(`/trips/${tripId}/crew`, { crew }),
  updateCoordinator: (tripId: string, coordinatorId: string) =>
    api.patch(`/trips/${tripId}/coordinator`, { coordinatorId }),

  // Available users for crew selection
  getAvailableUsers: () => api.get("/trips/available-users"),

  // Presentations under trip
  getPresentations: (tripId: string) =>
    api.get(`/trips/${tripId}/presentations`),
  createPresentation: (tripId: string, data: any) =>
    api.post(`/trips/${tripId}/presentations`, data),

  // Banks
  getTripBanks: (tripId: string) => api.get(`/trips/${tripId}/banks`),
  setTripBanks: (tripId: string, bankIds: string[]) =>
    api.put(`/trips/${tripId}/banks`, { bankIds }),
};

export const presentationsApi = {
  listAll: (filter?: string) =>
    api.get("/presentations", { params: { filter } }),
  getById: (id: string) => api.get(`/presentations/${id}`),
  update: (id: string, data: any) => api.patch(`/presentations/${id}`, data),
  delete: (id: string) => api.delete(`/presentations/${id}`),
  setCrew: (id: string, crew: { userId: string; role: string }[]) =>
    api.patch(`/presentations/${id}/crew`, { crew }),
  updateCoordinator: (id: string, coordinatorId: string) =>
    api.patch(`/presentations/${id}`, { coordinatorId }),
  getSummary: (id: string) => api.get(`/presentations/${id}/summary`),
  saveSummary: (id: string, rows: any[]) =>
    api.post(`/presentations/${id}/summary`, { rows }),
};
