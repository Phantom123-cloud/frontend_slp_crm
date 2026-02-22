import api from './client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  isActive: boolean;
  isOnline: boolean;
  createdAt: string;
}

export interface UserDetailed extends User {
  tradeCode?: string;
  birthDate?: string;
  firstTripDate?: string;
  isCoordinator?: boolean;
  coordinatorId?: string;
  coordinator?: { id: string; firstName: string; lastName: string };
  isMarried?: boolean;
  hasChildren?: boolean;
  hasPassport?: boolean;
  hasDriverLicense?: boolean;
  drivingExperience?: number;
  comment?: string;
  passportNumber?: string;
  registrationAddress?: string;
  livingAddress?: string;
  role?: { name: string };
  languages?: { language: string; level: string }[];
  contacts?: { type: string; countryCode: string; phone: string }[];
  citizenships?: { country: string }[];
}

export interface UserProfile extends User {
  tradeCode?: string;
  firstTripDate?: string;
  isCoordinator: boolean;
  coordinatorId?: string;
  coordinator?: { id: string; firstName: string; lastName: string; email: string };
  subordinates?: { id: string; firstName: string; lastName: string; email: string }[];
  birthDate?: string;
  isMarried?: boolean;
  hasChildren?: boolean;
  hasPassport?: boolean;
  hasDriverLicense?: boolean;
  drivingExperience?: number;
  comment?: string;
  passportNumber?: string;
  registrationAddress?: string;
  livingAddress?: string;
  contacts?: any[];
  languages?: any[];
  citizenships?: any[];
  documents?: any[];
  maxSessions?: number;
  role?: { id: string; name: string; permissions?: any[] };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const usersApi = {
  getAll: (params?: { filter?: string; search?: string; page?: number; limit?: number; detailed?: boolean }) =>
    api.get<PaginatedResponse<UserDetailed>>('/users', { params }),

  getById: (id: string) =>
    api.get<UserProfile>(`/users/${id}`),

  create: (data: any) =>
    api.post('/users', data),

  updateProfile: (id: string, data: any) =>
    api.patch(`/users/${id}/profile`, data),

  updateCredentials: (id: string, data: any) =>
    api.patch(`/users/${id}/credentials`, data),

  getCoordinators: () =>
    api.get('/users/coordinators'),

  forceLogout: (id: string) =>
    api.post(`/users/${id}/force-logout`),

  block: (id: string) =>
    api.post(`/users/${id}/block`),

  unblock: (id: string) =>
    api.post(`/users/${id}/unblock`),

  // Контакты
  addContact: (userId: string, data: any) =>
    api.post(`/users/${userId}/contacts`, data),

  removeContact: (contactId: string) =>
    api.delete(`/users/contacts/${contactId}`),

  // Языки
  addLanguage: (userId: string, data: any) =>
    api.post(`/users/${userId}/languages`, data),

  removeLanguage: (languageId: string) =>
    api.delete(`/users/languages/${languageId}`),

  // Гражданства
  setCitizenships: (userId: string, countries: string[]) =>
    api.patch(`/users/${userId}/citizenships`, { countries }),

  // Экспорт
  exportUsers: (data: {
    fields: string[];
    format?: 'xlsx' | 'csv';
    scope?: 'page' | 'all';
    filter?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.post('/users/export', data, { responseType: 'blob' }),

  // Лимит сессий
  updateMaxSessions: (userId: string, maxSessions: number) =>
    api.patch(`/users/${userId}/max-sessions`, { maxSessions }),
};
