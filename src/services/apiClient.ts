import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Base URL resolution: Environment variable with fallback to relative /api endpoint
export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  '/api';

/**
 * Standardized Axios client for all NivasPay production API interactions.
 * Uses HttpOnly cookie session management (withCredentials: true)
 * and CSRF protection headers without persisting tokens to localStorage.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Platform': 'NivasPay-Web',
  },
});

/**
 * Isolated Axios client exclusively for authentication and token renewal calls.
 * Does not carry the 401 retry interceptor, preventing recursive circular loops.
 */
export const rawApiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Platform': 'NivasPay-Web',
  },
});

let inMemoryToken: string | null = null;

// Concurrency queue state for token refresh operations
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Pluggable token refresh callback (allows context or mock adapters to supply renewal without circular imports)
type TokenRefreshHandler = () => Promise<string | null>;
let customRefreshHandler: TokenRefreshHandler | null = null;
const tokenRefreshedListeners: Set<(token: string) => void> = new Set();

export function setTokenRefreshHandler(handler: TokenRefreshHandler | null): void {
  customRefreshHandler = handler;
}

export function onTokenRefreshed(listener: (token: string) => void): () => void {
  tokenRefreshedListeners.add(listener);
  return () => {
    tokenRefreshedListeners.delete(listener);
  };
}

/**
 * Update the active in-memory auth token (never persisted to localStorage)
 */
export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    tokenRefreshedListeners.forEach((listener) => {
      try {
        listener(token);
      } catch (e) {
        console.warn('[ApiClient] Listener error:', e);
      }
    });
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

/**
 * Retrieve the active in-memory auth token
 */
export function getAuthToken(): string | null {
  return inMemoryToken;
}

// Request Interceptor: Attach bearer token if present and add tracing ID
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (inMemoryToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${inMemoryToken}`;
    }

    // Attach request trace ID for DPDP audit compliance
    if (!config.headers['X-Request-Id']) {
      const traceId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      config.headers['X-Request-Id'] = traceId;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Standardize API error formatting and handle automatic token renewal
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<{ error?: string; message?: string }>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Only process 401 Unauthorized errors
    if (error.response?.status === 401 && originalRequest) {
      const requestUrl = originalRequest.url || '';

      // Skip refresh retry for authentication and non-idempotent payment transactions
      const isAuthEndpoint =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/signup') ||
        requestUrl.includes('/auth/refresh') ||
        requestUrl.includes('/auth/logout');

      const isNonIdempotentPayment =
        requestUrl.includes('/payments') &&
        originalRequest.method &&
        originalRequest.method.toLowerCase() !== 'get';

      if (isAuthEndpoint || isNonIdempotentPayment || originalRequest._retry) {
        // If already retried or auth endpoint failed, clear session and broadcast unauthorized
        setAuthToken(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nivaspay:unauthorized', { detail: error.response.data })
          );
        }
        return Promise.reject(error);
      }

      // If another refresh cycle is already active in-flight, enqueue this request
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (newToken && originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Mark this request as retried and begin refresh locking
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        let renewedToken: string | null = null;

        if (customRefreshHandler) {
          renewedToken = await customRefreshHandler();
        } else {
          // Default refresh strategy: Call /auth/refresh using unintercepted raw client
          const refreshRes = await rawApiClient.post('/auth/refresh', {
            token: inMemoryToken || undefined,
          });
          renewedToken = refreshRes.data?.token || null;
        }

        if (renewedToken) {
          setAuthToken(renewedToken);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('nivaspay:token_refreshed', { detail: { token: renewedToken } })
            );
          }

          processQueue(null, renewedToken);

          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${renewedToken}`;
          }
          return apiClient(originalRequest);
        } else {
          throw new Error('401_UNAUTHORIZED: Token renewal returned empty token.');
        }
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        setAuthToken(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nivaspay:unauthorized', { detail: error.response.data })
          );
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Utility to extract clean error message from Axios errors
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const serverError = error.response?.data?.error || error.response?.data?.message;
    if (serverError) {
      return serverError;
    }
    if (error.response?.status === 404) {
      return 'Requested resource was not found.';
    }
    if (error.response?.status === 500) {
      return 'An internal server error occurred. Please try again.';
    }
    return error.message || 'An unexpected network error occurred.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}

export default apiClient;
