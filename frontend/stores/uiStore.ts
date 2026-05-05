"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { writeLanguageCookie } from "@/lib/language";

type Theme = "light" | "dark" | "system";
type Language = "ar" | "en";
type SidebarState = "expanded" | "collapsed";

interface UIState {
  theme: Theme;
  language: Language;
  sidebarState: SidebarState;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  toggleSidebar: () => void;
  setSidebarState: (state: SidebarState) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "light",
      language: "ar",
      sidebarState: "expanded",

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => {
        writeLanguageCookie(language);
        set({ language });
      },
      toggleSidebar: () =>
        set((state) => ({
          sidebarState:
            state.sidebarState === "expanded" ? "collapsed" : "expanded",
        })),
      setSidebarState: (sidebarState) => set({ sidebarState }),
    }),
    {
      name: "crm-ui-preferences",
    }
  )
);
