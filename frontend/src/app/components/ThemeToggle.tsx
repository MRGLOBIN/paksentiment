"use client";

import { IconButton, Tooltip, useTheme as useMuiTheme } from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { useTheme } from "../providers/ThemeProvider";

export default function ThemeToggle() {
  const { mode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();

  return (
    <Tooltip title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}>
      <IconButton
        onClick={toggleTheme}
        color="inherit"
        aria-label="toggle theme"
        sx={{
          backgroundColor: `${muiTheme.palette.primary.main}1A`,
          "&:hover": {
            backgroundColor: `${muiTheme.palette.primary.main}33`,
          },
        }}
      >
        {mode === "dark" ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
}
