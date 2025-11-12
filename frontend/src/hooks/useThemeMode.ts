"use client";

import { useEffect, useState } from "react";
import { ThemeMode } from "@/common/core/types/theme";
import { THEME_STORAGE_KEY } from "@/common/constants/theme";

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
    if (savedTheme) {
      setMode(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const initialMode = prefersDark ? "dark" : "light";
      setMode(initialMode);
      document.documentElement.setAttribute("data-theme", initialMode);
    }
  }, []);

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === "light" ? "dark" : "light";
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
      document.documentElement.setAttribute("data-theme", newMode);
      return newMode;
    });
  };

  return { mode, toggleTheme, mounted };
}
