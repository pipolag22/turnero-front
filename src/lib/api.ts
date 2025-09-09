// src/lib/api.ts
import axios, { AxiosHeaders } from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  // Asegura instancia de AxiosHeaders
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }
  const h = config.headers as AxiosHeaders;

  // Anti-cache para que Box/TV vean nombres al instante
  h.set('Cache-Control', 'no-cache');
  h.set('Pragma', 'no-cache');
  h.set('Expires', '0');
  h.set('Content-Type', 'application/json');

  // Token si existe
  const token = localStorage.getItem('token');
  if (token) h.set('Authorization', `Bearer ${token}`);

  return config;
});
