'use client'

import styles from './FeaturesSection.module.scss'
import { BarChart, Public, Translate, Bolt, TrendingUp, Security } from '@mui/icons-material'

const FEATURES = [
    {
        icon: <BarChart fontSize="inherit" />,
        title: 'AI-Powered Analysis',
        description: 'Advanced machine learning models classify sentiment, topics, and trends from social media content in real-time.'
    },
    {
        icon: <Public fontSize="inherit" />,
        title: 'Multi-Source Collection',
        description: 'Aggregate data from Reddit, Twitter, YouTube, CommonCrawl, and news sources for comprehensive insights.'
    },
    {
        icon: <Translate fontSize="inherit" />,
        title: 'Multi-Language Support',
        description: 'Process content in English, Urdu, and Pashto with automatic translation and localized analysis.'
    },
    {
        icon: <Bolt fontSize="inherit" />,
        title: 'Real-Time Monitoring',
        description: 'Track trends as they emerge with live data feeds and instant alert notifications.'
    },
    {
        icon: <TrendingUp fontSize="inherit" />,
        title: 'Visual Analytics',
        description: 'Professional dashboards with interactive charts, topic distributions, and trend visualizations.'
    },
    {
        icon: <Security fontSize="inherit" />,
        title: 'Privacy Compliant',
        description: 'Only publicly available data is collected, respecting platform policies and user privacy.'
    }
]

export default function FeaturesSection() {
    return (
        <section className={styles.features}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Powerful Features</h2>
                    <p className={styles.subtitle}>
                        Everything you need to understand public sentiment and emerging trends
                    </p>
                </div>

                <div className={styles.featuresGrid}>
                    {FEATURES.map((feature, idx) => (
                        <div key={idx} className={styles.featureCard}>
                            <div className={styles.iconWrapper}>
                                <span className={styles.icon}>{feature.icon}</span>
                            </div>
                            <h3 className={styles.featureTitle}>{feature.title}</h3>
                            <p className={styles.featureDesc}>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
