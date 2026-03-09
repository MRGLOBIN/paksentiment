'use client'

import Link from 'next/link'
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
import { useRegister } from './useRegister'

const RegisterPage = () => {
  const theme = useTheme()
  const {
    firstName, setFirstName,
    lastName, setLastName,
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword,
    errors, setErrors,
    loading, apiError, success,
    handleSubmit
  } = useRegister()

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
