"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  CssBaseline,
} from "@mui/material";

import { ThemeContextType } from "@/common/core/types/theme";
import { useThemeMode } from "@/hooks/useThemeMode";
import { DEFAULT_COLORS, CSS_VARIABLES } from "@/common/constants/theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { mode, toggleTheme, mounted } = useThemeMode();

  // Read CSS variables safely (only client-side)
  const getCSSVar = (variable: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim();
    return value || fallback;
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: getCSSVar(CSS_VARIABLES.primary, DEFAULT_COLORS.primary),
          },
          background: {
            default: getCSSVar(
              CSS_VARIABLES.background,
              DEFAULT_COLORS[mode].background
            ),
            paper: getCSSVar(CSS_VARIABLES.card, DEFAULT_COLORS[mode].paper),
          },
          text: {
            primary: getCSSVar(
              CSS_VARIABLES.textPrimary,
              DEFAULT_COLORS[mode].textPrimary
            ),
            secondary: getCSSVar(
              CSS_VARIABLES.textSecondary,
              DEFAULT_COLORS[mode].textSecondary
            ),
          },
        },
        typography: { fontFamily: "Arial, Helvetica, sans-serif" },
      }),
    [mode]
  );

  if (!mounted) return null; // Avoid flash of incorrect theme

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
