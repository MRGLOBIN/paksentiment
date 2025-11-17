'use client'

import { useState } from 'react'
import styles from './AnalysisInput.module.scss'
import AnalysisResults from './AnalysisResults'

interface SentimentData {
  id: string
  sentiment: string
  confidence: number
  summary: string
}

interface TranslationData {
  id: string
  language: string
  translated: boolean
  translatedText: string | null
  text_for_sentiment: string
}

interface Post {
  id: string
  title: string
  text: string
  author: string
  subreddit: string
  created_utc: number
  url: string
  score: number
}

interface AnalysisResponse {
  source: string
  count: number
  posts: Post[]
  translations: TranslationData[]
  sentiment: SentimentData[]
}

export default function AnalysisInput() {
  const [inputText, setInputText] = useState('')
  const [subreddit, setSubreddit] = useState('pakistan')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<AnalysisResponse | null>(null)

  const handleAnalysis = async () => {
    if (!inputText.trim()) return

    setIsLoading(true)
    setError('')
    setResults(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const params = new URLSearchParams({
        subreddit: subreddit,
        query: inputText,
        limit: '10',
      })

      const response = await fetch(
        `${apiUrl}/raw-data/reddit/sentiment?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const data: AnalysisResponse = await response.json()
      setResults(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch analysis results'
      )
      console.error('Analysis error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAnalysis()
    }
  }

  return (
    <>
      <section className={styles.analysisSection}>
        <div className={styles.container}>
          <div className={styles.inputCard}>
            <h2 className={styles.title}>Analysis Input</h2>

            <div className={styles.inputGroup}>
              <label htmlFor='subreddit' className={styles.label}>
                Subreddit
              </label>
              <input
                id='subreddit'
                type='text'
                className={styles.input}
                placeholder='e.g., pakistan, chutyapa, etc.'
                value={subreddit}
                onChange={e => setSubreddit(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor='analysisText' className={styles.label}>
                Enter Search Query or Topic
              </label>
              <textarea
                id='analysisText'
                className={styles.textarea}
                placeholder="Enter topic to search in the subreddit (e.g., 'elections', 'economy', 'politics')..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={6}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.analyzeButton}
              onClick={handleAnalysis}
              disabled={!inputText.trim() || !subreddit.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner}></span>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg
                    className={styles.playIcon}
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <polygon points='5 3 19 12 5 21 5 3'></polygon>
                  </svg>
                  Start Analysis
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {results && <AnalysisResults data={results} />}
    </>
  )
}
