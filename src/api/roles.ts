import api from './client';

export const rolesApi = {
  // Permissions
  getPermissions: () => api.get('/roles/permissions'),
  createPermission: (data: any) => api.post('/roles/permissions', data),

  // Roles
  getRoles: () => api.get('/roles'),
  /** Лёгкий список ролей для выпадающих списков (доступен при roles.view ИЛИ users.edit_settings) */
  getRolesList: () => api.get('/roles/list'),
  getRoleById: (id: string) => api.get(`/roles/${id}`),
  createRole: (data: any) => api.post('/roles', data),
  updateRole: (id: string, data: any) => api.patch(`/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/roles/${id}`),
};
