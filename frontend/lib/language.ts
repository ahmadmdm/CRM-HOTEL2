import type { AppLanguage } from "@/lib/i18n";

export const LANGUAGE_COOKIE_NAME = "crm-language";

export function normalizeLanguage(value?: string | null): AppLanguage {
  return value === "en" ? "en" : "ar";
}

export function getLanguageDirection(language: AppLanguage) {
  return language === "ar" ? "rtl" : "ltr";
}

export function getInitialLanguage(): AppLanguage {
  if (typeof document === "undefined") {
    return "ar";
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${LANGUAGE_COOKIE_NAME}=([^;]+)`));
  return normalizeLanguage(match?.[1]);
}

export function writeLanguageCookie(language: AppLanguage) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${LANGUAGE_COOKIE_NAME}=${language}; path=/; max-age=31536000; samesite=lax`;
}