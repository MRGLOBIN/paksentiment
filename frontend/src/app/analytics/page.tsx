'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AutoAwesome } from '@mui/icons-material'
import styles from './page.module.scss'
import AnalysisDashboard from '../components/AnalysisDashboard'
import LoadingAnimation from '../components/LoadingAnimation'
import Navbar from '../components/Navbar'
import { useAuthStore } from '../../store/useAuthStore'
import { useAnalytics } from '../../hooks/useAnalytics'

const SOURCES = [
    { id: 'reddit', name: 'Reddit' },
    { id: 'reddit_sentiment', name: 'Reddit (Sentiment)' },
    { id: 'twitter', name: 'Twitter' },
    { id: 'twitter_sentiment', name: 'Twitter (Sentiment)' },
    { id: 'commoncrawl', name: 'Common Crawl' },
    { id: 'scrapling', name: 'Scrapling URL' },
    { id: 'database', name: 'Database (Historical)' }
]

export default function AnalysisPage() {
    const { token } = useAuthStore()
    const searchParams = useSearchParams()

    // Client-side hydration check for store
    const [isHydrated, setIsHydrated] = useState(false)
    useEffect(() => { setIsHydrated(true) }, [])

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const {
        mode, setMode,
        source, setSource,
        query, setQuery,
        useLocal, setUseLocal,
        followLinks, setFollowLinks,
        crawlLimit, setCrawlLimit,
        smartPrompt, setSmartPrompt,
        customTags, setCustomTags,
        loading, statusMsg, error,
        sessionId, setSessionId,
        displayedData,
        runAnalysis
    } = useAnalytics({ token, apiUrl })

    // Track if auto-run has happened
    const [hasAutoRun, setHasAutoRun] = useState(false)

    // Check URL params on mount
    useEffect(() => {
        if (!hasAutoRun && searchParams) {
            const modeParam = searchParams.get('mode')
            const sourceParam = searchParams.get('source')
            const queryParam = searchParams.get('query')
            const sessionIdParam = searchParams.get('sessionId')

            if (sessionIdParam) {
                setSessionId(sessionIdParam)
            } else {
                if (modeParam === 'manual') setMode('manual')
                if (sourceParam) setSource(sourceParam)
                if (queryParam) setQuery(queryParam)
            }
        }
    }, [searchParams, hasAutoRun, setSessionId, setMode, setSource, setQuery])

    // Trigger analysis when state is ready from params
    useEffect(() => {
        if (!hasAutoRun) {
            if (sessionId) {
                setHasAutoRun(true)
                runAnalysis()
            } else if (query && searchParams?.get('query')) {
                setHasAutoRun(true)
                runAnalysis()
            }
        }
    }, [query, source, mode, hasAutoRun, searchParams, sessionId, runAnalysis])

    // Handle view change to clear session context when typing new query
    const handleInputChange = (setter: (val: string) => void, val: string) => {
        setter(val)
        if (sessionId) setSessionId(null)
    }

    if (!isHydrated) return null // Prevent hydration mismatch

    return (
        <div className={styles.pageContainer}>
            <Navbar />

            <div className={styles.header}>
                <h1>Analytics</h1>
                <p>Explore trends, sentiment, and volume across multiple data sources in real-time.</p>
            </div>

            <div className={styles.controls}>
                <div className={styles.modeSwitch}>
                    <button
                        className={mode === 'manual' ? styles.activeMode : ''}
                        onClick={() => setMode('manual')}>
                        Manual Source
                    </button>
                    <button
                        className={mode === 'smart' ? styles.activeMode : ''}
                        onClick={() => setMode('smart')}>
                        <AutoAwesome fontSize="small" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Smart Assistant
                    </button>
                </div>

                {mode === 'manual' ? (
                    <>
                        <div className={styles.inputGroup}>
                            <label>Data Source</label>
                            <select value={source} onChange={(e) => handleInputChange(setSource, e.target.value)}>
                                {SOURCES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Query / URL</label>
                            <input
                                type="text"
                                placeholder="Enter search term..."
                                value={query}
                                onChange={(e) => handleInputChange(setQuery, e.target.value)}
                            />
                        </div>
                        {source === 'scrapling' && (
                            <div className={styles.checkboxGroup} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                                <input
                                    type="checkbox"
                                    id="followLinks"
                                    checked={followLinks}
                                    onChange={(e) => setFollowLinks(e.target.checked)}
                                />
                                <label htmlFor="followLinks">Crawl & Analyze Links</label>

                                {followLinks && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '10px' }}>
                                        <span style={{ fontSize: '0.9em' }}>Max:</span>
                                        <input
                                            type="number"
                                            min="1" max="10"
                                            style={{ width: '50px', padding: '3px' }}
                                            value={crawlLimit}
                                            onChange={(e) => setCrawlLimit(Number(e.target.value))}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Custom Sentiment Tags Input */}
                        <div className={styles.inputGroup} style={{ marginTop: '15px' }}>
                            <label>Custom Sentiment Tags <span style={{ fontSize: '0.8em', color: '#888' }}>(Optional, comma separated)</span></label>
                            <input
                                type="text"
                                placeholder="e.g. Bullish, Bearish, Neutral OR Urgent, Critical, Routine"
                                value={customTags}
                                onChange={(e) => handleInputChange(setCustomTags, e.target.value)}
                            />
                        </div>
                    </>
                ) : (
                    <div className={styles.fullWidthInput}>
                        <label>Describe what you want to analyze</label>
                        <textarea
                            rows={2}
                            placeholder="e.g. 'What is the sentiment about the upcoming cricket world cup in Pakistan? check twitter and reddit'"
                            value={smartPrompt}
                            onChange={(e) => handleInputChange(setSmartPrompt, e.target.value)}
                        />
                    </div>
                )}

                <button
                    className={styles.analyzeBtn}
                    onClick={() => runAnalysis()}
                    disabled={loading || (mode === 'manual' ? !query : !smartPrompt)}
                >
                    {loading ? 'Processing...' : 'Run Analysis'}
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {loading && <LoadingAnimation message={statusMsg || 'Analyzing data...'} />}

            {!loading && displayedData.count > 0 && <AnalysisDashboard data={displayedData} />}
            {!loading && displayedData.count === 0 && !error && (
                <div className={styles.loading}>
                    No data found. Select a mode and run analysis.
                </div>
            )}
        </div>
    )
}


