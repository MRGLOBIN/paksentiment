"use client";

import Link from "next/link";
import {
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import styles from "./login.module.scss";
import { useLogin } from "./useLogin";

const LoginPage = () => {
  const theme = useTheme();
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    handleTogglePasswordVisibility,
    errors,
    setErrors,
    loading,
    apiError,
    handleSubmit,
  } = useLogin();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Sign In</h1>
          <p>Welcome Back to PakSentiment</p>
        </div>

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            error={!!errors.email}
            helperText={errors.email}
            fullWidth
            autoComplete="email"
            autoFocus
          />

          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password)
                setErrors({ ...errors, password: undefined });
            }}
            error={!!errors.password}
            helperText={errors.password}
            fullWidth
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                    aria-label="toggle password visibility"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              mt: 1,
              py: 1.5,
              background: theme.palette.primary.main,
              "&:hover": { background: theme.palette.primary.dark },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className={styles.footer}>
          <p>
            Don&apos;t have an account? <Link href="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
