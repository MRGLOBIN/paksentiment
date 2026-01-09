'use client'

import styles from './StatsSection.module.scss'
import { BarChart, Public, Translate, Bolt } from '@mui/icons-material'

const STATS = [
    { value: '1M+', label: 'Documents Analyzed', icon: <BarChart fontSize="inherit" /> },
    { value: '5+', label: 'Data Sources', icon: <Public fontSize="inherit" /> },
    { value: '3+', label: 'Languages Supported', icon: <Translate fontSize="inherit" /> },
    { value: '24/7', label: 'Real-Time Monitoring', icon: <Bolt fontSize="inherit" /> }
]

export default function StatsSection() {
    return (
        <section className={styles.stats}>
            <div className={styles.container}>
                <div className={styles.statsGrid}>
                    {STATS.map((stat, idx) => (
                        <div key={idx} className={styles.statCard}>
                            <span className={styles.icon}>{stat.icon}</span>
                            <span className={styles.value}>{stat.value}</span>
                            <span className={styles.label}>{stat.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
