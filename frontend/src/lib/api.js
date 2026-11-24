import axios from 'axios';

export const TOKEN_KEY = 'blogsphere_token';

function normalizeApiUrl(value) {
  const trimmed = (value || '/api').trim();
  if (!/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '') || '/api';
  const withoutSlash = trimmed.replace(/\/+$/, '');
  // The API contract places all routes under `/api`; accept an origin-only env value too.
  return /\/api$/i.test(withoutSlash) ? withoutSlash : `${withoutSlash}/api`;
}

const configuredApiUrl = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const API_BASE_URL = configuredApiUrl.replace(/\/$/, '') || '/api';

/**
 * Uploaded files are returned as relative paths such as `/uploads/photo.jpg`.
 * When the API lives on another origin (e.g. Render), those paths must be
 * prefixed with that origin. A relative `/api` base keeps Vite's dev proxy in use.
 */
export function getMediaOrigin() {
  if (!/^https?:\/\//i.test(configuredApiUrl)) return '';
  return configuredApiUrl.replace(/\/+$/, '').replace(/\/api$/i, '');
}

export function resolveMediaUrl(path) {
  if (!path || typeof path !== 'string') return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const origin = getMediaOrigin();
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

export class ApiError extends Error {
  constructor(message, { code, details, status } = {}) {
    super(message || 'Something went wrong. Please try again.');
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config || {};
    const status = error.response?.status;
    const data = error.response?.data;
    const message =
      data?.error?.message ||
      data?.message ||
      (typeof data === 'string' ? data : null) ||
      error.message ||
      'Something went wrong. Please try again.';

    const url = String(config.url || '');
    // Failed sign-in/sign-up requests should surface their error on the form;
    // a failed logout must not trigger a redirect while leaving the page.
    const isAuthFlow =
      url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/logout');

    if (status === 401 && !isAuthFlow) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent('blogsphere:unauthorized'));

      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register')) {
        const redirect = encodeURIComponent(currentPath);
        window.location.assign(`/login?redirect=${redirect}`);
      }
    }

    return Promise.reject(
      new ApiError(message, {
        code: data?.error?.code,
        details: data?.error?.details,
        status,
      }),
    );
  },
);

export default api;
