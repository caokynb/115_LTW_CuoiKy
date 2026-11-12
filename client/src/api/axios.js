import axios from 'axios';
import {
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  AUTH_UNAUTHORIZED_EVENT,
} from '../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const readStoredToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = readStoredToken();
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
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

    if (status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(USER_STORAGE_KEY);
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }

    return Promise.reject(error);
  }
);

/**
 * Trích xuất thông báo lỗi thân thiện từ AxiosError.
 */
export const getErrorMessage = (error, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại!') => {
  if (!error) return fallback;
  if (error.response?.data?.errors?.length) {
    return error.response.data.errors.join('. ');
  }
  return error.response?.data?.message || error.message || fallback;
};

export default api;
