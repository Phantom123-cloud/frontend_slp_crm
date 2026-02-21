import api from './client';

export const auditApi = {
  getAll: (params?: {
    entity?: string;
    entityId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => api.get('/audit', { params }),

  exportLogs: (data: {
    entity?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    format?: 'xlsx' | 'csv';
    scope?: 'page' | 'all';
    page?: number;
    limit?: number;
  }) => api.post('/audit/export', data, { responseType: 'blob' }),
};
