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
  useTheme,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import styles from './register.module.scss'
import { useAuthStore } from '../../store/useAuthStore'

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  confirmPassword?: string
}

const RegisterPage = () => {
  const theme = useTheme()
  const router = useRouter()
  const { login } = useAuthStore()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // First name validation
    if (!firstName) {
      newErrors.firstName = 'First name is required'
    } else if (firstName.length < 3) {
      newErrors.firstName = 'First name must be at least 3 characters'
    }

    // Last name validation
    if (!lastName) {
      newErrors.lastName = 'Last name is required'
    } else if (lastName.length < 3) {
      newErrors.lastName = 'Last name must be at least 3 characters'
    }

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$%&*?!#])/.test(password)) {
      newErrors.password =
        'Password must contain alphabet, number and special character'
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setApiError('')
    setSuccess(false)

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          confirmPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Registration failed')
      }

      const data = await response.json()

      // Use the auth context to login
      login(data.accessToken, data.user)

      setSuccess(true)

      // Redirect to home page after 1 second
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : 'An error occurred during registration'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Create Account</h1>
          <p>Sign up to get started</p>
        </div>

        {apiError && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        {success && (
          <Alert severity='success' sx={{ mb: 2 }}>
            Account created successfully! You can now log in.
          </Alert>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <TextField
            label='First Name'
            type='text'
            value={firstName}
            onChange={e => {
              setFirstName(e.target.value)
              if (errors.firstName)
                setErrors({ ...errors, firstName: undefined })
            }}
            error={!!errors.firstName}
            helperText={errors.firstName}
            fullWidth
            autoComplete='given-name'
            autoFocus
          />

          <TextField
            label='Last Name'
            type='text'
            value={lastName}
            onChange={e => {
              setLastName(e.target.value)
              if (errors.lastName) setErrors({ ...errors, lastName: undefined })
            }}
            error={!!errors.lastName}
            helperText={errors.lastName}
            fullWidth
            autoComplete='family-name'
          />

          <TextField
            label='Email'
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
          />

          <TextField
            label='Password'
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => {
              setPassword(e.target.value)
              if (errors.password) setErrors({ ...errors, password: undefined })
            }}
            error={!!errors.password}
            helperText={errors.password}
            fullWidth
            autoComplete='new-password'
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge='end'
                    aria-label='toggle password visibility'
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label='Confirm Password'
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => {
              setConfirmPassword(e.target.value)
              if (errors.confirmPassword)
                setErrors({ ...errors, confirmPassword: undefined })
            }}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            fullWidth
            autoComplete='new-password'
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge='end'
                    aria-label='toggle confirm password visibility'
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type='submit'
            variant='contained'
            fullWidth
            disabled={loading || success}
            sx={{
              mt: 1,
              py: 1.5,
              background: theme.palette.primary.main,
              '&:hover': {
                background: theme.palette.primary.dark,
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color='inherit' />
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className={styles.footer}>
          <p>
            Already have an account? <Link href='/login'>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPageWithNav() {
  return (
    <>
      <Navbar />
      <RegisterPage />
      <Footer />
    </>
  )
}
