'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import {
  TextField,
  Button,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Email, ArrowBack, CheckCircleOutline } from '@mui/icons-material'
import styles from './forgot-password.module.scss'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (!email) {
      setError('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email')
      return
    }

    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Request failed')
      }
      setSubmitted(true)
    } catch {
      // Still show success to avoid email enumeration
      setSubmitted(true)
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
            Don&apos;t worry, it happens to the best of us
          </h2>
          <p className={styles.brandSubtitle}>
            Enter your email and we&apos;ll send you instructions to reset your
            password and get you back on track.
          </p>
        </div>
        <div className={styles.brandDecor}>
          <div className={styles.orb1} />
          <div className={styles.orb2} />
        </div>
      </div>

      {/* Right — Form Panel */}
      <div className={styles.formPanel}>
        <div className={styles.formContainer}>
          <Link href='/login' className={styles.backLink}>
            <ArrowBack sx={{ fontSize: 18 }} />
            Back to Sign In
          </Link>

          {!submitted ? (
            <>
              <div className={styles.formHeader}>
                <h1>Reset your password</h1>
                <p>
                  Enter the email address associated with your account and
                  we&apos;ll send a reset link.
                </p>
              </div>

              {error && (
                <Alert severity='error' sx={{ mb: 2.5, borderRadius: '10px' }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit} className={styles.form}>
                <TextField
                  label='Email address'
                  type='email'
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value)
                    if (error) setError('')
                  }}
                  error={!!error}
                  fullWidth
                  autoComplete='email'
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Email
                          sx={{ color: 'var(--text-muted)', fontSize: 20 }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />

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
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className={styles.successState}>
              <div className={styles.successIcon}>
                <CheckCircleOutline
                  sx={{ fontSize: 56, color: 'var(--primary)' }}
                />
              </div>
              <h2>Check your email</h2>
              <p>
                We&apos;ve sent password-reset instructions to{' '}
                <strong>{email}</strong>. Please check your inbox and spam
                folder.
              </p>
              <Button
                variant='outlined'
                fullWidth
                onClick={() => {
                  setSubmitted(false)
                  setEmail('')
                }}
                sx={{
                  mt: 3,
                  py: 1.3,
                  borderRadius: '10px',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: 'var(--primary)',
                    background: 'rgba(16, 185, 129, 0.04)',
                  },
                }}
              >
                Try another email
              </Button>
            </div>
          )}

          <div className={styles.formFooter}>
            <p>
              Remember your password? <Link href='/login'>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
