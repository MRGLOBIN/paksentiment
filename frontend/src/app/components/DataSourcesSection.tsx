'use client'

import styles from './DataSourcesSection.module.scss'
import { Reddit, Twitter, YouTube, Public, RssFeed, Shield } from '@mui/icons-material'

const SOURCES = [
    { name: 'Reddit', icon: <Reddit fontSize="inherit" />, description: 'Community discussions and subreddit trends' },
    { name: 'Twitter/X', icon: <Twitter fontSize="inherit" />, description: 'Real-time tweets and hashtag analysis' },
    { name: 'YouTube', icon: <YouTube fontSize="inherit" />, description: 'Video comments and channel insights' },
    { name: 'CommonCrawl', icon: <Public fontSize="inherit" />, description: 'Web archive and news content' },
    { name: 'News RSS', icon: <RssFeed fontSize="inherit" />, description: 'Major news outlets and publications' }
]

export default function DataSourcesSection() {
    return (
        <section className={styles.sources}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Data Sources</h2>
                    <p className={styles.subtitle}>
                        Comprehensive coverage across the global digital landscape
                    </p>
                </div>

                <div className={styles.sourcesGrid}>
                    {SOURCES.map((source, idx) => (
                        <div key={idx} className={styles.sourceCard}>
                            <span className={styles.icon}>{source.icon}</span>
                            <h3 className={styles.sourceName}>{source.name}</h3>
                            <p className={styles.sourceDesc}>{source.description}</p>
                        </div>
                    ))}
                </div>

                <div className={styles.disclaimer}>
                    <span className={styles.shieldIcon}>
                        <Shield fontSize="small" />
                    </span>
                    <p>All data is collected from publicly available sources in compliance with platform terms of service.</p>
                </div>
            </div>
        </section>
    )
}
