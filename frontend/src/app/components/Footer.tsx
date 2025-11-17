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
              <h3 className={styles.brandName}>PakSentiment</h3>
            </div>
            <p className={styles.brandDescription}>
              AI-powered governance monitoring for Pakistan&apos;s digital
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

          {/* Languages Section */}
          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Languages</h4>
            <ul className={styles.linkList}>
              <li>
                <Link href='/languages/english'>English</Link>
              </li>
              <li>
                <Link href='/languages/urdu'>Urdu (اردو)</Link>
              </li>
              <li>
                <Link href='/languages/punjabi'>Punjabi</Link>
              </li>
              <li>
                <Link href='/languages/pashto'>Pashto (پښتو)</Link>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Contact</h4>
            <ul className={styles.contactList}>
              <li>
                <a href='mailto:support@paksentiment.gov.pk'>
                  support@paksentiment.gov.pk
                </a>
              </li>
              <li>
                <a href='tel:+92511234567'>+92 51 1234567</a>
              </li>
              <li>Islamabad, Pakistan</li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            © 2025 PakSentiment Governance Monitor. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
