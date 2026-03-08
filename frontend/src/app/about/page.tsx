'use client'

import styles from './page.module.scss'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import {
    Psychology,
    Security,
    Public,
    Code,
    School,
    AutoGraph
} from '@mui/icons-material'

export default function AboutPage() {
    return (
        <div className={styles.pageContainer}>
            <Navbar />

            <main className={styles.mainContent}>
                {/* Hero Section */}
                <section className={styles.hero}>
                    <h1>About DataInsight</h1>
                    <p>
                        An advanced AI-powered platform designed to analyze the global
                        pulse. Utilizing state-of-the-art machine learning to
                        decode public sentiment across social media and the web.
                    </p>
                </section>

                {/* Mission Section */}
                <section className={styles.section}>
                    <h2>Our Mission</h2>
                    <div className={styles.missionGrid}>
                        <div className={styles.card}>
                            <div className={styles.iconWrapper}>
                                <Psychology fontSize="large" />
                            </div>
                            <h3>Advanced AI Analysis</h3>
                            <p>
                                Leveraging Large Language Models (LLMs) like the Analysis Model (Flan-T5)
                                to accurately interpret context, sarcasm, and global languages.
                            </p>
                        </div>

                        <div className={styles.card}>
                            <div className={styles.iconWrapper}>
                                <Public fontSize="large" />
                            </div>
                            <h3>Multi-Source Intelligence</h3>
                            <p>
                                Aggregating data from Twitter, Reddit, YouTube, and Common Crawl
                                to provide a comprehensive view of the diverse digital ecosystem.
                            </p>
                        </div>

                        <div className={styles.card}>
                            <div className={styles.iconWrapper}>
                                <AutoGraph fontSize="large" />
                            </div>
                            <h3>Real-Time Insights</h3>
                            <p>
                                Transforming raw data into actionable intelligence with interactive
                                dashboards, trend tracking, and sentiment visualizations.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Technology Stack */}
                <section className={`${styles.section} ${styles.techSection}`}>
                    <h2>Built With Modern Tech</h2>
                    <div className={styles.techGrid}>
                        <div className={styles.techCard}>
                            <div className={styles.iconWrapper}>
                                <Code fontSize="large" />
                            </div>
                            <h3>Next.js Frontend</h3>
                            <p>Fast, responsive, and server-side rendered UI.</p>
                        </div>
                        <div className={styles.techCard}>
                            <div className={styles.iconWrapper}>
                                <Security fontSize="large" />
                            </div>
                            <h3>Secure Gateway</h3>
                            <p>Python/FastAPI backend ensuring data integrity and speed.</p>
                        </div>
                    </div>
                </section>

                {/* Team / Context */}
                <section className={styles.section}>
                    <div className={styles.teamSection}>
                        <School fontSize="large" style={{ color: '#059669', marginBottom: '1rem' }} />
                        <h2>Final Year Project</h2>
                        <p>
                            DataInsight is developed as a Final Year Project (FYP) for university,
                            aiming to bridge the gap in advanced global social listening tools.
                            It represents a culmination of research in Natural Language Processing,
                            Distributed Systems, and Full-Stack Development.
                        </p>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
