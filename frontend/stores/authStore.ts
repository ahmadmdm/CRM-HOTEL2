"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, UserRole } from "@/types";
import { tokenStorage } from "@/lib/auth/token";
import { authApi } from "@/lib/api/auth";
import { logoutOneSignalUser } from "@/lib/onesignal";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const data = await authApi.login({ email, password });
          tokenStorage.setAccessToken(data.access_token);
          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        await authApi.logout().catch(() => null);
        await logoutOneSignalUser(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim());
        tokenStorage.clear();
        set({ user: null, isAuthenticated: false });
        if (typeof window !== "undefined") {
          window.location.assign("/login");
        }
      },

      refreshUser: async () => {
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true });
        } catch {
          void get().logout();
        }
      },
    }),
    {
      name: "crm-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Role helpers
export const useUserRole = (): UserRole | null =>
  useAuthStore((s) => s.user?.role ?? null);

export const useIsAdmin = () =>
  useAuthStore((s) =>
    s.user?.role === "super_admin" || s.user?.role === "sub_admin"
  );

export const useHasRole = (...roles: UserRole[]) =>
  useAuthStore((s) => roles.includes(s.user?.role as UserRole));
