import api from './client';

export const directoriesApi = {
  // Presentation Types
  getPresentationTypes: () => api.get('/presentation-types'),
  createPresentationType: (data: { name: string; description?: string }) =>
    api.post('/presentation-types', data),
  deletePresentationType: (id: string) => api.delete(`/presentation-types/${id}`),

  // Venues
  getVenues: () => api.get('/venues'),
  createVenue: (data: { city: string; address: string; venueName: string }) =>
    api.post('/venues', data),
  deleteVenue: (id: string) => api.delete(`/venues/${id}`),
};
