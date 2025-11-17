"use client";

import Link from "next/link";
import styles from "./register.module.scss";
import { RegisterForm } from "./RegisterForm";
import { withAlerts } from "@/app/components/alerts/withAlerts";
import { useRegister } from "./useRegister";

const RegisterPageBase = () => {
  const { apiError, success } = useRegister();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Create Account</h1>
          <p>Sign up to get started with PakSentiment</p>
        </div>

        <RegisterForm />

        <div className={styles.footer}>
          <p>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// Wrap page with alert HOC
const RegisterPage = withAlerts(RegisterPageBase);
export default RegisterPage;
