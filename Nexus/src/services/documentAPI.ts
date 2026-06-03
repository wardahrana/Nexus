import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const uploadDocument = (formData: FormData) =>
  API.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getMyDocuments = () => API.get('/documents');

export const getDocumentById = (id: string) => API.get(`/documents/${id}`);

export const deleteDocument = (id: string) => API.delete(`/documents/${id}`);

export const shareDocument = (id: string, userId: string) =>
  API.patch(`/documents/${id}/share`, { userId });

export const signDocument = (id: string, signatureImageBase64: string) =>
  API.patch(`/documents/${id}/sign`, { signatureImageBase64 });