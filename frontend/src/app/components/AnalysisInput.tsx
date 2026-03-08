'use client'

import { useState } from 'react'
import styles from './AnalysisInput.module.scss'
import AnalysisResults from './AnalysisResults'
import { AnalysisResponse } from '../../types'
import { useAnalysisInput } from './useAnalysisInput'

export default function AnalysisInput() {
  const {
    inputText, setInputText,
    subreddit, setSubreddit,
    isLoading, error, results,
    useCustomSentiments, setUseCustomSentiments,
    customSentiments, setCustomSentiments,
    handleAnalysis, handleKeyPress
  } = useAnalysisInput()

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
                placeholder='e.g., technology, sports, etc.'
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
                placeholder="Enter topic to search in the subreddit (e.g., 'artificial intelligence', 'stock market')..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={6}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type='checkbox'
                  checked={useCustomSentiments}
                  onChange={e => setUseCustomSentiments(e.target.checked)}
                  className={styles.checkbox}
                />
                Use Custom Sentiment Categories (AI-powered)
              </label>
            </div>

            {useCustomSentiments && (
              <div className={styles.inputGroup}>
                <label htmlFor='customSentiments' className={styles.label}>
                  Custom Sentiment Categories
                  <span className={styles.hint}>
                    (comma-separated, e.g., &quot;happy, sad, angry,
                    fearful&quot;)
                  </span>
                </label>
                <input
                  id='customSentiments'
                  type='text'
                  className={styles.input}
                  placeholder='e.g., optimistic, pessimistic, anxious, hopeful'
                  value={customSentiments}
                  onChange={e => setCustomSentiments(e.target.value)}
                />
              </div>
            )}

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
