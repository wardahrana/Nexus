import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getBalance = () => API.get('/transactions/balance');
export const getHistory = (page = 1) => API.get(`/transactions/history?page=${page}&limit=10`);
export const depositFunds = (amount: number, description?: string) =>
  API.post('/transactions/deposit', { amount, description });
export const withdrawFunds = (amount: number, description?: string) =>
  API.post('/transactions/withdraw', { amount, description });
export const transferFunds = (recipientId: string, amount: number, description?: string) =>
  API.post('/transactions/transfer', { recipientId, amount, description });
export const createPaymentIntent = (amount: number) =>
  API.post('/transactions/create-payment-intent', { amount });
export const searchEntrepreneurs = (q: string) =>
  API.get(`/transactions/search-entrepreneurs?q=${q}`);