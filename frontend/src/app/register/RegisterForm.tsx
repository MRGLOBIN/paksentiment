"use client";

import {
  TextField,
  Button,
  IconButton,
  InputAdornment,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useRegister } from "./useRegister";
import styles from "./register.module.scss";

export const RegisterForm = () => {
  const theme = useTheme();
  const {
    formData,
    errors,
    loading,
    success,
    showPassword,
    showConfirmPassword,
    handleChange,
    handleSubmit,
    togglePassword,
    toggleConfirmPassword,
  } = useRegister();

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <TextField
        label="Full Name"
        value={formData.name}
        onChange={handleChange("name")}
        error={!!errors.name}
        helperText={errors.name}
        fullWidth
        autoFocus
      />

      <TextField
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleChange("email")}
        error={!!errors.email}
        helperText={errors.email}
        fullWidth
      />

      <TextField
        label="Password"
        type={showPassword ? "text" : "password"}
        value={formData.password}
        onChange={handleChange("password")}
        error={!!errors.password}
        helperText={errors.password}
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={togglePassword} edge="end">
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        label="Confirm Password"
        type={showConfirmPassword ? "text" : "password"}
        value={formData.confirmPassword}
        onChange={handleChange("confirmPassword")}
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword}
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={toggleConfirmPassword} edge="end">
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading || success}
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
          "Create Account"
        )}
      </Button>
    </form>
  );
};
