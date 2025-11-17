'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react'
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material'

type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  mode: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize theme from localStorage or default to 'light'
  const [mode, setMode] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Get saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') as ThemeMode
    if (savedTheme) {
      setMode(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    } else {
      // Check system preference
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
      const initialMode = prefersDark ? 'dark' : 'light'
      setMode(initialMode)
      document.documentElement.setAttribute('data-theme', initialMode)
    }
  }, [])

  const toggleTheme = () => {
    setMode(prevMode => {
      const newMode = prevMode === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', newMode)
      document.documentElement.setAttribute('data-theme', newMode)
      return newMode
    })
  }

  const theme = useMemo(() => {
    // Only create theme on client side after mount
    if (!mounted) {
      return createTheme({ palette: { mode } })
    }

    const getCSSVariable = (varName: string, fallback: string): string => {
      try {
        return (
          getComputedStyle(document.documentElement)
            .getPropertyValue(varName)
            .trim() || fallback
        )
      } catch {
        return fallback
      }
    }

    return createTheme({
      palette: {
        mode,
        ...(mode === 'light'
          ? {
              // Light mode colors
              primary: {
                main: getCSSVariable('--primary', '#6aaf40'),
              },
              background: {
                default: getCSSVariable('--background', '#ffffff'),
                paper: getCSSVariable('--card-bg', '#f5f5f5'),
              },
              text: {
                primary: getCSSVariable('--text-primary', '#171717'),
                secondary: getCSSVariable('--text-secondary', '#666666'),
              },
            }
          : {
              // Dark mode colors
              primary: {
                main: getCSSVariable('--primary', '#6aaf40'),
              },
              background: {
                default: getCSSVariable('--background', '#0a0a0a'),
                paper: getCSSVariable('--card-bg', '#1a1a1a'),
              },
              text: {
                primary: getCSSVariable('--text-primary', '#ededed'),
                secondary: getCSSVariable('--text-secondary', '#a0a0a0'),
              },
            }),
      },
      typography: {
        fontFamily: 'Arial, Helvetica, sans-serif',
      },
    })
  }, [mode, mounted])

  // Prevent flash of wrong theme
  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}
