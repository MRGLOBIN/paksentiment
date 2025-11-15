"use client";

import { ReactNode, useEffect, useMemo } from "react";
import {
  createTheme,
  CssBaseline,
  ThemeProvider as MuiThemeProvider,
} from "@mui/material";
import { getCSSVar } from "@/common/core/themeUtils";
import { DEFAULT_COLORS, CSS_VARIABLES } from "@/common/constants/theme";
import { useThemeStore } from "@/store/useThemeStore";

export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  return { mode, toggleTheme };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const mounted = useThemeStore((s) => s.mounted);
  const initializeTheme = useThemeStore((s) => s.initializeTheme);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

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

  if (!mounted) return null; // Prevent flash of incorrect theme

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
