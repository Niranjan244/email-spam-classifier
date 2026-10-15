import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const getAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (
    avatar.startsWith('http://') ||
    avatar.startsWith('https://') ||
    avatar.startsWith('blob:') ||
    avatar.startsWith('data:')
  ) {
    return avatar;
  }
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const serverBase = apiBase.replace(/\/api\/?$/, '');
  const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
  return `${serverBase}${cleanPath}`;
};

export default api;
