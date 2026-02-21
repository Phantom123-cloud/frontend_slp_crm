import api from './client';

export const filesApi = {
  upload: (userId: string, file: File, title: string, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) formData.append('description', description);

    return api.post(`/files/upload/${userId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  download: (docId: string) =>
    api.get(`/files/${docId}/download`, { responseType: 'blob' }),

  updateDetails: (docId: string, title: string, description?: string) =>
    api.patch(`/files/${docId}`, { title, description }),

  remove: (docId: string) =>
    api.delete(`/files/${docId}`),
};
