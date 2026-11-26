import axios from 'axios';

const HOSTED_API = 'https://garissa-sport-connect-api.onrender.com/api';

function apiBase() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname === 'garissa-sport-connect.onrender.com') {
    return HOSTED_API;
  }
  return '/api';
}

const api = axios.create({ baseURL: apiBase() });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gsc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const token = localStorage.getItem('gsc_token');
    const url = error.config?.url || '';
    if (status === 401 && token && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      localStorage.removeItem('gsc_token');
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error, fallback = 'Something went wrong.') {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((item) => item.msg).filter(Boolean).join(' ');
  }
  return data?.message || error?.message || fallback;
}

export default api;
