'use client'

import Link from 'next/link'
import styles from './CTASection.module.scss'

export default function CTASection() {
    return (
        <section className={styles.cta}>
            <div className={styles.container}>
                <h2 className={styles.title}>Ready to Get Started?</h2>
                <p className={styles.subtitle}>
                    Start analyzing public sentiment and discover trending topics today.
                </p>
                <div className={styles.buttons}>
                    <Link href="/analytics" className={styles.primaryBtn}>
                        Launch Dashboard
                    </Link>
                    <Link href="/register" className={styles.secondaryBtn}>
                        Create Account
                    </Link>
                </div>
            </div>
        </section>
    )
}
