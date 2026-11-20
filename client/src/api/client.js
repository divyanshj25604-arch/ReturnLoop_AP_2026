import axios from 'axios';

export const TOKEN_KEY = 'rl_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Extracts a human-readable error message from an Axios error or API envelope.
 * Follows the { success: false, message: '...' } shape defined in docs/api.md.
 */
export function getApiErrorMessage(error) {
  if (!error) return 'An unexpected error occurred';
  return (
    error.response?.data?.message ||
    error.message ||
    'An unexpected error occurred'
  );
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach Authorization Bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 Unauthorized with token eviction & redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRequest =
        error.config &&
        (error.config.url?.includes('/auth/login') || error.config.url?.endsWith('/login'));

      if (!isLoginRequest) {
        removeToken();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
