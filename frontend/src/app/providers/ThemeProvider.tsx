"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  CssBaseline,
} from "@mui/material";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize theme from localStorage or default to 'light'
  const [mode, setMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Get saved theme from localStorage
    const savedTheme = localStorage.getItem("theme") as ThemeMode;
    if (savedTheme) {
      setMode(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      // Check system preference
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
      localStorage.setItem("theme", newMode);
      document.documentElement.setAttribute("data-theme", newMode);
      return newMode;
    });
  };

  const theme = createTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? {
            // Light mode colors
            primary: {
              main:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--primary")
                  .trim() || "#6aaf40",
            },
            background: {
              default:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--background")
                  .trim() || "#ffffff",
              paper:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--card-bg")
                  .trim() || "#f5f5f5",
            },
            text: {
              primary:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--text-primary")
                  .trim() || "#171717",
              secondary:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--text-secondary")
                  .trim() || "#666666",
            },
          }
        : {
            // Dark mode colors
            primary: {
              main:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--primary")
                  .trim() || "#6aaf40",
            },
            background: {
              default:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--background")
                  .trim() || "#0a0a0a",
              paper:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--card-bg")
                  .trim() || "#1a1a1a",
            },
            text: {
              primary:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--text-primary")
                  .trim() || "#ededed",
              secondary:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--text-secondary")
                  .trim() || "#a0a0a0",
            },
          }),
    },
    typography: {
      fontFamily: "Arial, Helvetica, sans-serif",
    },
  });

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
