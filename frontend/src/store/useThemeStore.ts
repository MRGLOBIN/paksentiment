"use client";

import { create } from "zustand";
import { ThemeState, ThemeMode } from "@/common/core/types/theme";
import { DEFAULT_COLORS } from "@/common/constants/theme";

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "light",
  mounted: false,

  toggleTheme: () =>
    set((state) => {
      const newMode: ThemeMode = state.mode === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", newMode);
        document.documentElement.setAttribute("data-theme", newMode);
      }
      return { mode: newMode };
    }),

  initializeTheme: () => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem("theme") as ThemeMode | null;
    if (saved) {
      document.documentElement.setAttribute("data-theme", saved);
      set({ mode: saved });
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const initial: ThemeMode = prefersDark ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", initial);
      set({ mode: initial });
    }
    set({ mounted: true });
  },
}));
