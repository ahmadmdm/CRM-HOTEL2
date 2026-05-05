import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "@/lib/auth/token";

const INTERNAL_API_BASE_URL = `${process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000"}/api/v1`;
const BROWSER_API_BASE_URL = "/api/backend";
const API_BASE_URL =
  typeof window === "undefined" ? INTERNAL_API_BASE_URL : BROWSER_API_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
  withCredentials: true,
});

// ── Request interceptor: attach access token ──────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle token refresh ───────────────────────────────
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function isAuthEndpoint(url?: string) {
  return Boolean(
    url && ["/auth/login", "/auth/refresh", "/auth/logout"].some((path) => url.includes(path))
  );
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const { data } = await axios.post<{ access_token: string }>(
            `${API_BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          );
          tokenStorage.setAccessToken(data.access_token);
          onRefreshed(data.access_token);
        } catch {
          tokenStorage.clear();
          redirectToLogin();
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve) => {
        subscribeTokenRefresh((token: string) => {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);
