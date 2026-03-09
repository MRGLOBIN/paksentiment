'use client'

import styles from './HeroSection.module.scss'

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.textContent}>
          <h1 className={styles.title}>
            AI-Powered Sentiment Analysis for the Global Digital Landscape
          </h1>
          <p className={styles.subtitle}>
            Monitor public sentiment, detect security risks, and gain real-time
            insights across social media and public platforms using advanced ML
            and NLP techniques.
          </p>
          <button className={styles.ctaButton}>Learn More</button>
        </div>

        <div className={styles.dashboardPreview}>
          <div className={styles.dashboardFrame}>
            <div className={styles.dashboardHeader}>
              <div className={styles.headerLeft}>
                <span className={styles.logo}>DataInsight</span>
              </div>
              <div className={styles.headerRight}>
                <span className={styles.menuItem}>Dashboard</span>
                <span className={styles.menuItem}>Analytics</span>
                <span className={styles.menuItem}>Sources</span>
                <span className={styles.menuItem}>Settings</span>
              </div>
            </div>

            <div className={styles.dashboardContent}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <h3>Overview</h3>
                  <div className={styles.pieChart}>
                    <svg viewBox='0 0 100 100' className={styles.chartSvg}>
                      <circle
                        cx='50'
                        cy='50'
                        r='40'
                        fill='none'
                        stroke='var(--primary)'
                        strokeWidth='12'
                        strokeDasharray='150 251'
                        transform='rotate(-90 50 50)'
                      />
                      <circle
                        cx='50'
                        cy='50'
                        r='40'
                        fill='none'
                        stroke='#ef4444'
                        strokeWidth='12'
                        strokeDasharray='75 251'
                        strokeDashoffset='-150'
                        transform='rotate(-90 50 50)'
                      />
                      <circle
                        cx='50'
                        cy='50'
                        r='40'
                        fill='none'
                        stroke='#6b7280'
                        strokeWidth='12'
                        strokeDasharray='26 251'
                        strokeDashoffset='-225'
                        transform='rotate(-90 50 50)'
                      />
                    </svg>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <h3>Platforms</h3>
                  <div className={styles.platformList}>
                    <div className={styles.platformItem}>Twitter</div>
                    <div className={styles.platformItem}>Reddit</div>
                    <div className={styles.platformItem}>Facebook</div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <h3>Sentiment</h3>
                  <div className={styles.sentimentChart}>
                    <div className={styles.barGroup}>
                      <div
                        className={styles.bar}
                        style={{ height: '60%' }}
                      ></div>
                      <div
                        className={styles.bar}
                        style={{ height: '40%' }}
                      ></div>
                      <div
                        className={styles.bar}
                        style={{ height: '80%' }}
                      ></div>
                      <div
                        className={styles.bar}
                        style={{ height: '50%' }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <h3>Trends</h3>
                  <div className={styles.trendChart}>
                    <svg viewBox='0 0 200 80' className={styles.lineChart}>
                      <polyline
                        points='0,60 40,45 80,50 120,30 160,35 200,20'
                        fill='none'
                        stroke='var(--primary)'
                        strokeWidth='2'
                      />
                      <circle cx='0' cy='60' r='3' fill='var(--primary)' />
                      <circle cx='40' cy='45' r='3' fill='var(--primary)' />
                      <circle cx='80' cy='50' r='3' fill='var(--primary)' />
                      <circle cx='120' cy='30' r='3' fill='var(--primary)' />
                      <circle cx='160' cy='35' r='3' fill='var(--primary)' />
                      <circle cx='200' cy='20' r='3' fill='var(--primary)' />
                    </svg>
                  </div>
                </div>
              </div>

              <div className={styles.chartsRow}>
                <div className={styles.chartCard}>
                  <h3>Time Series</h3>
                  <div className={styles.barChart}>
                    <div className={styles.bars}>
                      <div
                        className={styles.barItem}
                        style={{ height: '40%' }}
                      ></div>
                      <div
                        className={styles.barItem}
                        style={{ height: '60%' }}
                      ></div>
                      <div
                        className={styles.barItem}
                        style={{ height: '35%' }}
                      ></div>
                      <div
                        className={styles.barItem}
                        style={{ height: '75%' }}
                      ></div>
                      <div
                        className={styles.barItem}
                        style={{ height: '50%' }}
                      ></div>
                      <div
                        className={styles.barItem}
                        style={{ height: '85%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
