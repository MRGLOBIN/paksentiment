'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import styles from './page.module.scss'
import { useAuthStore } from '../../store/useAuthStore'
import { useActivities } from '../../hooks/useActivities'

export default function DashboardPage() {
    const { user, token, isAuthenticated } = useAuthStore()
    const router = useRouter()

    // Auth check logic
    // Using a simple state to wait for hydration or just client side check
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        // Simple hydration delay or check
        setIsChecking(false)
        if (!isAuthenticated && !token) {
            // Optional: Redirect
            // router.push('/login')
        }
    }, [isAuthenticated, token, router])

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const { activities, loading: activitiesLoading } = useActivities(token, apiUrl)

    const loading = isChecking || activitiesLoading

    return (
        <div className={styles.container}>
            <Navbar />

            <main className={styles.main}>
                {!isAuthenticated && !isChecking ? (
                    <div className={styles.loginPrompt}>
                        <h2>Please Log In</h2>
                        <p>You need to be logged in to view your dashboard activity.</p>
                        <br />
                        <Link href="/login" className={styles.link}>Go to Login</Link>
                    </div>
                ) : (
                    <>
                        <div className={styles.header}>
                            <h1>Welcome back, {user?.fullName}</h1>
                            <p>Here is a summary of your recent activities on PakSentiment.</p>
                        </div>

                        <div className={styles.activityCard}>
                            <h2>Recent Activity</h2>
                            {loading ? (
                                <div className={styles.loading}>Loading activities...</div>
                            ) : activities.length === 0 ? (
                                <div className={styles.loading}>No activity recorded yet.</div>
                            ) : (
                                <div className={styles.activityList}>
                                    {activities.map((activity) => (
                                        <div key={activity.id} className={styles.activityItem}>
                                            <div className={styles.time}>
                                                {new Date(activity.createdAt).toLocaleString()}
                                            </div>
                                            <div className={styles.content}>
                                                <div className={styles.action}>{formatAction(activity.action)}</div>
                                                {activity.details && Object.keys(activity.details).length > 0 && (
                                                    <div className={styles.details}>
                                                        {Object.entries(activity.details).map(([key, value]) => {
                                                            if (['password', 'token', 'email', 'confirmPassword'].includes(key)) return null;
                                                            return (
                                                                <div key={key} className={styles.detailRow}>
                                                                    <span className={styles.detailKey}>{key}: </span>
                                                                    <span className={styles.detailValue}>
                                                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                                    </span>
                                                                </div>
                                                            )
                                                        })}
                                                        {/* Add View Results Button for Analysis Activities */}
                                                        {((activity.action.includes('ANALYZE') || activity.action.includes('SEARCH') || activity.action.includes('PLAN')) && (activity.details.sessionId || activity.details.query)) && (
                                                            <div style={{ marginTop: '10px' }}>
                                                                <Link
                                                                    href={
                                                                        activity.details.sessionId
                                                                            ? `/analytics?sessionId=${activity.details.sessionId}`
                                                                            : `/analytics?mode=manual&source=database&query=${encodeURIComponent(activity.details.query as string)}`
                                                                    }
                                                                    className={styles.viewResultsBtn}
                                                                    style={{
                                                                        display: 'inline-block',
                                                                        padding: '6px 12px',
                                                                        backgroundColor: '#059669',
                                                                        color: 'white',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.85rem',
                                                                        textDecoration: 'none',
                                                                        fontWeight: 500
                                                                    }}
                                                                >
                                                                    View Past Results
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            <Footer />
        </div >
    )
}

function formatAction(action: string) {
    return action.replace(/_/g, ' ').toUpperCase()
}

