"use client";

import { Alert } from "@mui/material";
import React from "react";

interface WithAlertsProps {
  apiError?: string;
  success?: boolean;
  successMessage?: string;
}

export const withAlerts = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return (props: P & WithAlertsProps) => (
    <div>
      {props.apiError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {props.apiError}
        </Alert>
      )}
      {props.success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {props.successMessage || "Action completed successfully!"}
        </Alert>
      )}
      <WrappedComponent {...(props as P)} />
    </div>
  );
};
