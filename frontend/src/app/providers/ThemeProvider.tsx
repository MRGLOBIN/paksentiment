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
  const [mode, setMode] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as ThemeMode
    if (savedTheme) {
      setMode(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    } else {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
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
    if (!mounted) {
      return createTheme({ palette: { mode } })
    }

    return createTheme({
      palette: {
        mode,
        primary: {
          main: '#10b981',
          dark: '#059669',
          light: '#34d399',
        },
        ...(mode === 'light'
          ? {
              background: {
                default: '#fafbfc',
                paper: '#ffffff',
              },
              text: {
                primary: '#0f172a',
                secondary: '#475569',
              },
            }
          : {
              background: {
                default: '#0c0f17',
                paper: '#161b2e',
              },
              text: {
                primary: '#e2e8f0',
                secondary: '#94a3b8',
              },
            }),
      },
      typography: {
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        h1: { fontWeight: 800, letterSpacing: '-0.025em' },
        h2: { fontWeight: 700, letterSpacing: '-0.02em' },
        h3: { fontWeight: 700, letterSpacing: '-0.015em' },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600 },
      },
      shape: {
        borderRadius: 10,
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: '0.9375rem',
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: 10,
              },
            },
          },
        },
      },
    })
  }, [mode, mounted])

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
