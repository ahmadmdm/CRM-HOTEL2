"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import { tokenStorage } from "@/lib/auth/token";
import { getLanguageDirection, writeLanguageCookie } from "@/lib/language";
import { resolveDocumentTitle } from "@/lib/site";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";

function RootUIEffects() {
  const theme = useUIStore((state) => state.theme);
  const language = useUIStore((state) => state.language);
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = getLanguageDirection(language);
    document.title = resolveDocumentTitle(pathname, language);
    writeLanguageCookie(language);

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const resolvedTheme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      root.classList.toggle("dark", resolvedTheme === "dark");
      root.style.colorScheme = resolvedTheme;
    };

    applyTheme();
    media.addEventListener?.("change", applyTheme);

    return () => {
      media.removeEventListener?.("change", applyTheme);
    };
  }, [language, pathname, theme]);

  return null;
}

function AuthBootstrapEffects() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const refreshUser = useAuthStore((state) => state.refreshUser);

  useEffect(() => {
    const token = tokenStorage.getAccessToken();

    if (!token || user || isAuthenticated) {
      return;
    }

    void refreshUser();
  }, [isAuthenticated, refreshUser, user]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: (failureCount, error: any) => {
              if (error?.response?.status === 401) return false;
              if (error?.response?.status === 403) return false;
              if (error?.response?.status === 404) return false;
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RootUIEffects />
      <AuthBootstrapEffects />
      {children}
      <Toaster />
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
