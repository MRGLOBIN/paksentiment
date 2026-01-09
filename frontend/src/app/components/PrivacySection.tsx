'use client'

import styles from './PrivacySection.module.scss'
import { Public, Gavel, Security, Search } from '@mui/icons-material'

const PRIVACY_POINTS = [
    {
        icon: <Public fontSize="inherit" />,
        title: 'Public Data Only',
        description: 'We only collect publicly available data from social media and web sources.'
    },
    {
        icon: <Gavel fontSize="inherit" />,
        title: 'Platform Compliance',
        description: 'All data collection respects Terms of Service of source platforms.'
    },
    {
        icon: <Security fontSize="inherit" />,
        title: 'No Personal Storage',
        description: 'No personal identifiable information is stored or processed.'
    },
    {
        icon: <Search fontSize="inherit" />,
        title: 'Transparent Processing',
        description: 'All analysis methods are documented and available for review.'
    }
]

export default function PrivacySection() {
    return (
        <section className={styles.privacy}>
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.textContent}>
                        <h2 className={styles.title}>Privacy & Trust</h2>
                        <p className={styles.subtitle}>
                            PakSentiment is built with privacy at its core. We believe in ethical data practices
                            and transparency in all our operations.
                        </p>
                    </div>

                    <div className={styles.pointsGrid}>
                        {PRIVACY_POINTS.map((point, idx) => (
                            <div key={idx} className={styles.pointCard}>
                                <span className={styles.pointIcon}>{point.icon}</span>
                                <div className={styles.pointText}>
                                    <h4 className={styles.pointTitle}>{point.title}</h4>
                                    <p className={styles.pointDesc}>{point.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
