'use client'

import styles from './HowItWorksSection.module.scss'
import { MoveToInbox, SmartToy, BarChart, ArrowForward } from '@mui/icons-material'

const STEPS = [
    {
        step: '01',
        title: 'Collect',
        description: 'Data is gathered from public social media platforms, news sources, and web archives using ethical scraping practices.',
        icon: <MoveToInbox fontSize="inherit" />
    },
    {
        step: '02',
        title: 'Analyze',
        description: 'AI-powered models process content to classify sentiment, extract topics, translate languages, and identify trends.',
        icon: <SmartToy fontSize="inherit" />
    },
    {
        step: '03',
        title: 'Visualize',
        description: 'Results are presented through intuitive dashboards with charts, reports, and actionable insights.',
        icon: <BarChart fontSize="inherit" />
    }
]

export default function HowItWorksSection() {
    return (
        <section className={styles.howItWorks}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>How It Works</h2>
                    <p className={styles.subtitle}>
                        From data collection to actionable insights in three steps
                    </p>
                </div>

                <div className={styles.stepsContainer}>
                    {STEPS.map((step, idx) => (
                        <div key={idx} className={styles.stepCard}>
                            <div className={styles.stepNumber}>{step.step}</div>
                            <div className={styles.stepIcon}>{step.icon}</div>
                            <h3 className={styles.stepTitle}>{step.title}</h3>
                            <p className={styles.stepDesc}>{step.description}</p>
                            {idx < STEPS.length - 1 && (
                                <div className={styles.connector}>
                                    <span className={styles.arrow}>
                                        <ArrowForward />
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
