/**
 * Access token stays in sessionStorage for request interceptors.
 * Refresh token is managed by the backend in an httpOnly cookie.
 */

const ACCESS_TOKEN_KEY = "crm_access_token";

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.split("=").slice(1).join("="));
}

export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    const sessionToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (sessionToken) {
      return sessionToken;
    }

    const cookieToken = getCookieValue(ACCESS_TOKEN_KEY);
    if (cookieToken) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, cookieToken);
      return cookieToken;
    }

    return null;
  },

  setAccessToken(token: string): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    // Also persist as a cookie so Next.js middleware can validate auth
    document.cookie = `${ACCESS_TOKEN_KEY}=${token}; path=/; SameSite=Lax`;
  },

  clear(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    // Clear the auth cookie
    document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  },
};
