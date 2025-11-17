'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './Navbar.module.scss'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link href='/' className={styles.logo}>
          <span className={styles.logoText}>PakSentiment</span>
        </Link>

        <div className={styles.navLinks}>
          <Link href='/' className={styles.navLink}>
            Home
          </Link>
          <Link href='/dashboard' className={styles.navLink}>
            Dashboard
          </Link>
          <Link href='/analytics' className={styles.navLink}>
            Analytics
          </Link>
          <Link href='/about' className={styles.navLink}>
            About
          </Link>
        </div>

        <div className={styles.navActions}>
          <ThemeToggle />
          <Link href='/login' className={styles.loginButton}>
            Login
          </Link>
          <Link href='/register' className={styles.registerButton}>
            Sign Up
          </Link>
          <button
            className={styles.mobileMenuButton}
            onClick={toggleMobileMenu}
            aria-label='Toggle menu'
          >
            <span className={styles.hamburger}></span>
            <span className={styles.hamburger}></span>
            <span className={styles.hamburger}></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <Link
            href='/'
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            href='/dashboard'
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href='/analytics'
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Analytics
          </Link>
          <Link
            href='/about'
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            About
          </Link>
          <div className={styles.mobileDivider}></div>
          <Link
            href='/login'
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Login
          </Link>
          <Link
            href='/register'
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Sign Up
          </Link>
        </div>
      )}
    </nav>
  )
}
