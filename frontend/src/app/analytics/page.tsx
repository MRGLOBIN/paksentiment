'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  TravelExplore,
  Reddit,
  Language,
  History,
  ArrowForward,
  AutoAwesome,
  Search,
  TrendingUp,
} from '@mui/icons-material'
import styles from './page.module.scss'
import AnalysisDashboard from '../components/AnalysisDashboard'
import LoadingAnimation from '../components/LoadingAnimation'
import Navbar from '../components/Navbar'
import { useAuthStore } from '../../store/useAuthStore'
import { useAnalytics } from '../../hooks/useAnalytics'

// ─── Four core analysis sources ───
const SOURCES = [
  {
    id: 'reddit_sentiment',
    name: 'Reddit Sentiment',
    description: 'Analyze sentiment from Reddit communities and discussions',
    icon: <Reddit />,
    color: '#FF4500',
    placeholder: 'Enter subreddit or topic (e.g. r/technology ai)',
    inputLabel: 'Subreddit / Topic',
  },
  {
    id: 'twitter_sentiment',
    name: 'Twitter Sentiment',
    description: 'Track sentiment across Twitter/X conversations in real-time',
    icon: <TravelExplore />,
    color: '#1DA1F2',
    placeholder: 'Enter search query (e.g. Global Market Trends)',
    inputLabel: 'Search Query',
  },
  {
    id: 'web',
    name: 'Web Scrape',
    description:
      'Live scraping via Colly with automatic Scrapling fallback for JS-heavy sites',
    icon: <Language />,
    color: '#10b981',
    placeholder: 'Enter URL to scrape (e.g. https://techcrunch.com/news/...)',
    inputLabel: 'Website URL',
  },
  {
    id: 'commoncrawl',
    name: 'Web History',
    description: 'Search historical web data from Common Crawl archives',
    icon: <History />,
    color: '#8B5CF6',
    placeholder: 'Enter domain (e.g. medium.com)',
    inputLabel: 'Domain',
  },
  {
    id: 'ai',
    name: 'AI Search',
    description: 'Ask AI a question to automatically select and scrape the best URLs',
    icon: <AutoAwesome />,
    color: '#EAB308', // Amber/Gold color
    placeholder: 'What are you looking for? (e.g. Find news about artificial intelligence)',
    inputLabel: 'AI Prompt / Question',
  },
]

function AnalyticsContent() {
  const { token } = useAuthStore()
  const searchParams = useSearchParams()

  const [isHydrated, setIsHydrated] = useState(false)
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  const {
    source,
    setSource,
    query,
    setQuery,
    followLinks,
    setFollowLinks,
    includeAllLinks,
    setIncludeAllLinks,
    crawlLimit,
    setCrawlLimit,
    customTags,
    setCustomTags,
    multiUrlMode,
    setMultiUrlMode,
    multiUrls,
    setMultiUrls,
    loading,
    statusMsg,
    error,
    sessionId,
    setSessionId,
    displayedData,
    runAnalysis,
  } = useAnalytics({ token, apiUrl })

  const [hasAutoRun, setHasAutoRun] = useState(false)

  // Selected source metadata
  const activeSource = SOURCES.find(s => s.id === source) || SOURCES[0]

  // Check URL params on mount
  useEffect(() => {
    if (!hasAutoRun && searchParams) {
      const sourceParam = searchParams.get('source')
      const queryParam = searchParams.get('query')
      const sessionIdParam = searchParams.get('sessionId')

      if (sessionIdParam) {
        setSessionId(sessionIdParam)
      } else {
        if (sourceParam) setSource(sourceParam)
        if (queryParam) setQuery(queryParam)
      }
    }
  }, [searchParams, hasAutoRun, setSessionId, setSource, setQuery])

  // Trigger analysis when state ready from params
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
  }, [query, source, hasAutoRun, searchParams, sessionId, runAnalysis])

  const handleInputChange = (setter: (val: string) => void, val: string) => {
    setter(val)
    if (sessionId) setSessionId(null)
  }

  if (!isHydrated) return null

  return (
    <div className={styles.pageContainer}>
      <Navbar />

      {/* Hero Header */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroIcon}>
            <TrendingUp />
          </div>
          <h1>Analysis Center</h1>
          <p>
            Analyze sentiment across Reddit, Twitter, live websites, and
            historical web archives. Powered by Colly, Scrapling, and AI
            classification.
          </p>
        </div>
      </div>

      {/* Source Selector Cards */}
      <div className={styles.sourceGrid}>
        {SOURCES.map(s => (
          <button
            key={s.id}
            className={`${styles.sourceCard} ${source === s.id ? styles.sourceCardActive : ''}`}
            onClick={() => {
              setSource(s.id)
              if (sessionId) setSessionId(null)
            }}
            style={{ '--source-color': s.color } as React.CSSProperties}
          >
            <div className={styles.sourceIcon}>{s.icon}</div>
            <div className={styles.sourceInfo}>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
            </div>
            {source === s.id && <div className={styles.activeIndicator} />}
          </button>
        ))}
      </div>

      {/* Query Input Section */}
      <div className={styles.querySection}>
        <div className={styles.queryHeader}>
          <div
            className={styles.querySourceBadge}
            style={{ backgroundColor: activeSource.color }}
          >
            {activeSource.icon}
            <span>{activeSource.name}</span>
          </div>
        </div>

        <div className={styles.queryInputRow}>
          <div className={styles.queryInputWrapper}>
            <Search className={styles.searchIcon} />
            {source === 'web' && multiUrlMode ? (
              <textarea
                placeholder="Enter multiple URLs, one per line..."
                value={multiUrls}
                onChange={e => handleInputChange(setMultiUrls, e.target.value)}
                className={`${styles.queryInput} ${styles.multiUrlInput}`}
                rows={5}
              />
            ) : source === 'ai' ? (
              <textarea
                placeholder={activeSource.placeholder}
                value={query}
                onChange={e => handleInputChange(setQuery, e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && query && !loading) {
                    e.preventDefault()
                    runAnalysis()
                  }
                }}
                className={`${styles.queryInput} ${styles.multiUrlInput}`}
                rows={3}
              />
            ) : (
              <input
                type='text'
                placeholder={activeSource.placeholder}
                value={query}
                onChange={e => handleInputChange(setQuery, e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && query && !loading) runAnalysis()
                }}
                className={styles.queryInput}
              />
            )}
          </div>
          <button
            className={styles.runButton}
            onClick={() => runAnalysis()}
            disabled={
              loading ||
              (source === 'web' && multiUrlMode ? !multiUrls.trim() : !query.trim())
            }
          >
            {loading ? (
              <span className={styles.runButtonLoading}>Processing...</span>
            ) : (
              <>
                Run Analysis
                <ArrowForward fontSize='small' />
              </>
            )}
          </button>
        </div>

        {/* Advanced Options */}
        <div className={styles.advancedOptions}>
          {/* Multi-URL and Follow Links options — for web scrape */}
          {source === 'web' && (
            <div className={styles.optionsGroup}>
              <div className={styles.optionRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type='checkbox'
                    checked={multiUrlMode}
                    onChange={e => {
                      setMultiUrlMode(e.target.checked)
                      if (sessionId) setSessionId(null)
                    }}
                  />
                  <span>Analyze multiple URLs (Batch mode)</span>
                </label>
              </div>

              {!multiUrlMode && (
                <div className={styles.optionRow}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type='checkbox'
                      checked={followLinks}
                      onChange={e => setFollowLinks(e.target.checked)}
                    />
                    <span>Follow links on page</span>
                  </label>
                  {followLinks && (
                    <>
                      <label className={styles.checkboxLabel} style={{ marginLeft: '1rem' }}>
                        <input
                          type='checkbox'
                          checked={includeAllLinks}
                          onChange={e => setIncludeAllLinks(e.target.checked)}
                        />
                        <span>Include all links</span>
                      </label>
                      {!includeAllLinks && (
                        <div className={styles.inlineInput} style={{ marginLeft: '1rem' }}>
                          <span>Max links:</span>
                          <input
                            type='number'
                            min={1}
                            max={100}
                            value={crawlLimit}
                            onChange={e => setCrawlLimit(Number(e.target.value))}
                            disabled={includeAllLinks}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Custom tags for all sources */}
          <div className={styles.optionRow}>
            <div className={styles.tagsInput}>
              <AutoAwesome fontSize='small' className={styles.tagsIcon} />
              <input
                type='text'
                placeholder='Custom sentiment tags (e.g. Bullish, Bearish, Neutral)'
                value={customTags}
                onChange={e => handleInputChange(setCustomTags, e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status & Results */}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading && (
        <LoadingAnimation
          message={statusMsg || `Analyzing via ${activeSource.name}...`}
        />
      )}

      {!loading && displayedData.count > 0 && (
        <AnalysisDashboard data={displayedData} />
      )}

      {!loading && displayedData.count === 0 && !error && (
        <div className={styles.emptyState}>
          <Search className={styles.emptyIcon} />
          <h3>No results yet</h3>
          <p>
            Select a source, enter your query, and run analysis to see results.
          </p>
        </div>
      )}
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={null}>
      <AnalyticsContent />
    </Suspense>
  )
}
