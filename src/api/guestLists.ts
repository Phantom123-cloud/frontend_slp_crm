import api from './client';

export const guestListsApi = {
  /** Импорт CSV-файла для выезда */
  import: (tripId: string, file: File, presentationId?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (presentationId) form.append('presentationId', presentationId);
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
