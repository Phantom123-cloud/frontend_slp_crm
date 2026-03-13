import api from './client';

export const guestListsApi = {
  /** Уникальные даты выезда с презентациями (для дропдауна импорта) */
  getDates: (tripId: string) =>
    api.get(`/trips/${tripId}/guest-lists/dates`).then((r) => r.data),

  /** Импорт CSV-файла для выезда. date — "YYYY-MM-DD" */
  import: (tripId: string, file: File, date: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('date', date);
    return api
      .post(`/trips/${tripId}/guest-lists/import`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /** Все списки гостей выезда */
  getAll: (tripId: string) =>
    api.get(`/trips/${tripId}/guest-lists`).then((r) => r.data),

  /** История импортов / удалений */
  getLogs: (tripId: string) =>
    api.get(`/trips/${tripId}/guest-lists/logs`).then((r) => r.data),

  /** Детали одного списка с записями гостей */
  getById: (id: string) =>
    api.get(`/guest-lists/${id}`).then((r) => r.data),

  /** Создать запись гостя вручную */
  createRecord: (guestListId: string, data: Record<string, any>) =>
    api.post(`/guest-lists/${guestListId}/records`, data).then((r) => r.data),

  /** Обновить запись гостя */
  updateRecord: (guestListId: string, recordId: string, data: Record<string, any>) =>
    api.patch(`/guest-lists/${guestListId}/records/${recordId}`, data).then((r) => r.data),

  /** Удалить одну запись гостя */
  deleteRecord: (guestListId: string, recordId: string) =>
    api.delete(`/guest-lists/${guestListId}/records/${recordId}`).then((r) => r.data),

  /** Удалить гостей по файлу с номерами */
  deleteByFile: (guestListId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post(`/guest-lists/${guestListId}/delete-by-file`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
