'use client'

import Link from 'next/link'
import styles from './Footer.module.scss'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          {/* Brand Section */}
          <div className={styles.footerSection}>
            <div className={styles.brand}>
              <div className={styles.logoIcon}>
                <svg
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M12 2L2 7L12 12L22 7L12 2Z'
                    fill='currentColor'
                    opacity='0.8'
                  />
                  <path
                    d='M2 17L12 22L22 17V12L12 17L2 12V17Z'
                    fill='currentColor'
                  />
                </svg>
              </div>
              <h3 className={styles.brandName}>DataInsight</h3>
            </div>
            <p className={styles.brandDescription}>
              AI-powered trend monitoring for the global digital
              landscape.
            </p>
          </div>

          {/* Features Section */}
          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Features</h4>
            <ul className={styles.linkList}>
              <li>
                <Link href='/features/sentiment-analysis'>
                  Sentiment Analysis
                </Link>
              </li>
              <li>
                <Link href='/features/risk-detection'>Risk Detection</Link>
              </li>
              <li>
                <Link href='/features/multi-language'>
                  Multi-language Support
                </Link>
              </li>
              <li>
                <Link href='/features/real-time'>Real-time Monitoring</Link>
              </li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Languages</h4>
            <ul className={styles.linkList}>
              <li>
                <Link href='/languages/english'>English</Link>
              </li>
              <li>
                <Link href='/languages/spanish'>Spanish</Link>
              </li>
              <li>
                <Link href='/languages/french'>French</Link>
              </li>
              <li>
                <Link href='/languages/mandarin'>Mandarin</Link>
              </li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Contact</h4>
            <ul className={styles.contactList}>
              <li>
                <a href='mailto:hello@datainsight.io'>
                  hello@datainsight.io
                </a>
              </li>
              <li>
                <a href='tel:+18001234567'>+1 800 123 4567</a>
              </li>
              <li>San Francisco, CA</li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            © 2026 DataInsight Analytics. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
