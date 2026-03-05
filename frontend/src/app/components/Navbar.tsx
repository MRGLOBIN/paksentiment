'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Navbar.module.scss'
import ThemeToggle from './ThemeToggle'
import { useAuthStore } from '../../store/useAuthStore'
import {
  Dashboard,
  BarChart,
  Chat,
  Translate,
  Info,
  Payments,
  Menu as MenuIcon,
  Close as CloseIcon,
  Person,
  Logout as LogoutIcon,
} from '@mui/icons-material'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <Dashboard fontSize='small' />,
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: <BarChart fontSize='small' />,
  },
  { href: '/chat', label: 'Chat', icon: <Chat fontSize='small' /> },
  {
    href: '/translate',
    label: 'Translate',
    icon: <Translate fontSize='small' />,
  },
  { href: '/pricing', label: 'Pricing', icon: <Payments fontSize='small' /> },
  { href: '/about', label: 'About', icon: <Info fontSize='small' /> },
]

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated, user, logout } = useAuthStore()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.navContainer}>
        <Link href='/' className={styles.logo}>
          <span className={styles.logoIcon}>P</span>
          <span className={styles.logoText}>PakSentiment</span>
        </Link>

        <div className={styles.navLinks}>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className={styles.navActions}>
          <ThemeToggle />

          {isAuthenticated ? (
            <div className={styles.userSection}>
              <div className={styles.userAvatar}>
                <Person fontSize='small' />
              </div>
              <span className={styles.userName}>
                {user?.fullName?.split(' ')[0]}
              </span>
              <button
                onClick={logout}
                className={styles.logoutBtn}
                title='Sign out'
              >
                <LogoutIcon fontSize='small' />
              </button>
            </div>
          ) : (
            <div className={styles.authButtons}>
              <Link href='/login' className={styles.loginButton}>
                Sign In
              </Link>
              <Link href='/register' className={styles.registerButton}>
                Get Started
              </Link>
            </div>
          )}

          <button
            className={styles.mobileMenuButton}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label='Toggle menu'
          >
            {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ''}`}
      >
        <div className={styles.mobileMenuInner}>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.mobileNavLink} ${pathname === item.href ? styles.active : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          <div className={styles.mobileDivider} />

          {isAuthenticated ? (
            <>
              <div className={styles.mobileUserInfo}>
                <div className={styles.userAvatar}>
                  <Person fontSize='small' />
                </div>
                <span>{user?.fullName}</span>
              </div>
              <button
                onClick={() => {
                  logout()
                  setIsMobileMenuOpen(false)
                }}
                className={styles.mobileNavLink}
              >
                <LogoutIcon fontSize='small' />
                Sign Out
              </button>
            </>
          ) : (
            <div className={styles.mobileAuthButtons}>
              <Link href='/login' className={styles.mobileLoginBtn}>
                Sign In
              </Link>
              <Link href='/register' className={styles.mobileRegisterBtn}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
