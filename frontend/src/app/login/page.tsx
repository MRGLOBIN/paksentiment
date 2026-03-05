'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material'
import styles from './login.module.scss'
import { useAuthStore } from '../../store/useAuthStore'

interface FormErrors {
  email?: string
  password?: string
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email'
    }
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setApiError('')
    if (!validateForm()) return

    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/auth/login-with-email-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Login failed')
      }
      const data = await response.json()
      login(data.accessToken, data.user)
      router.push('/dashboard')
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : 'An error occurred during login',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Left — Branding Panel */}
      <div className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <Link href='/' className={styles.brandLogo}>
            <span className={styles.logoIcon}>P</span>
            <span className={styles.logoText}>PakSentiment</span>
          </Link>
          <h2 className={styles.brandTitle}>
            AI-Powered Insight for Pakistan&apos;s Digital Pulse
          </h2>
          <p className={styles.brandSubtitle}>
            Monitor sentiment, detect trends, and unlock actionable intelligence
            across social media and the web.
          </p>
          <div className={styles.brandStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>5+</span>
              <span className={styles.statLabel}>Data Sources</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>Real-time</span>
              <span className={styles.statLabel}>Analysis</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>7+</span>
              <span className={styles.statLabel}>Languages</span>
            </div>
          </div>
        </div>
        <div className={styles.brandDecor}>
          <div className={styles.orb1} />
          <div className={styles.orb2} />
        </div>
      </div>

      {/* Right — Form Panel */}
      <div className={styles.formPanel}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h1>Welcome back</h1>
            <p>Sign in to continue to your dashboard</p>
          </div>

          {apiError && (
            <Alert severity='error' sx={{ mb: 2.5, borderRadius: '10px' }}>
              {apiError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <TextField
              label='Email address'
              type='email'
              value={email}
              onChange={e => {
                setEmail(e.target.value)
                if (errors.email) setErrors({ ...errors, email: undefined })
              }}
              error={!!errors.email}
              helperText={errors.email}
              fullWidth
              autoComplete='email'
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <Email sx={{ color: 'var(--text-muted)', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label='Password'
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                if (errors.password)
                  setErrors({ ...errors, password: undefined })
              }}
              error={!!errors.password}
              helperText={errors.password}
              fullWidth
              autoComplete='current-password'
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <Lock sx={{ color: 'var(--text-muted)', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge='end'
                      size='small'
                    >
                      {showPassword ? (
                        <VisibilityOff fontSize='small' />
                      ) : (
                        <Visibility fontSize='small' />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <div className={styles.formOptions}>
              <Link href='/forgot-password' className={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>

            <Button
              type='submit'
              variant='contained'
              fullWidth
              disabled={loading}
              sx={{
                py: 1.5,
                background: 'var(--gradient-primary)',
                borderRadius: '10px',
                fontSize: '0.9375rem',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={22} color='inherit' />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className={styles.formFooter}>
            <p>
              Don&apos;t have an account?{' '}
              <Link href='/register'>Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
