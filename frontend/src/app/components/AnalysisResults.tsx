'use client'

import styles from './AnalysisResults.module.scss'

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

interface AnalysisResultsProps {
  data: AnalysisResponse
}

export default function AnalysisResults({ data }: AnalysisResultsProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return styles.positive
      case 'negative':
        return styles.negative
      default:
        return styles.neutral
    }
  }

  const getSentimentStats = () => {
    const total = data.sentiment.length
    const positive = data.sentiment.filter(
      s => s.sentiment.toLowerCase() === 'positive'
    ).length
    const negative = data.sentiment.filter(
      s => s.sentiment.toLowerCase() === 'negative'
    ).length
    const neutral = total - positive - negative

    return {
      total,
      positive,
      negative,
      neutral,
      positivePercent: ((positive / total) * 100).toFixed(1),
      negativePercent: ((negative / total) * 100).toFixed(1),
      neutralPercent: ((neutral / total) * 100).toFixed(1),
    }
  }

  const stats = getSentimentStats()

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  return (
    <section className={styles.resultsSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Analysis Results</h2>

        {/* Stats Overview */}
        <div className={styles.statsCard}>
          <h3 className={styles.statsTitle}>Sentiment Overview</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Posts</span>
              <span className={styles.statValue}>{stats.total}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Positive</span>
              <span className={`${styles.statValue} ${styles.positive}`}>
                {stats.positive} ({stats.positivePercent}%)
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Negative</span>
              <span className={`${styles.statValue} ${styles.negative}`}>
                {stats.negative} ({stats.negativePercent}%)
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Neutral</span>
              <span className={`${styles.statValue} ${styles.neutral}`}>
                {stats.neutral} ({stats.neutralPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className={styles.resultsList}>
          {data.posts.map(post => {
            const sentimentData = data.sentiment.find(s => s.id === post.id)
            const translationData = data.translations.find(
              t => t.id === post.id
            )

            return (
              <div key={post.id} className={styles.resultCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.postInfo}>
                    <h4 className={styles.postTitle}>{post.title}</h4>
                    <div className={styles.postMeta}>
                      <span key='subreddit'>r/{post.subreddit}</span>
                      <span key='sep1'>•</span>
                      <span key='author'>u/{post.author}</span>
                      <span key='sep2'>•</span>
                      <span key='date'>{formatDate(post.created_utc)}</span>
                      <span key='sep3'>•</span>
                      <span key='score'>↑ {post.score}</span>
                    </div>
                  </div>
                  {sentimentData && (
                    <div
                      className={`${styles.sentimentBadge} ${getSentimentColor(
                        sentimentData.sentiment
                      )}`}
                    >
                      {sentimentData.sentiment}
                      <span className={styles.confidence}>
                        {(sentimentData.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>

                <p className={styles.postText}>{post.text}</p>

                {translationData && translationData.translated && (
                  <div className={styles.translation}>
                    <span className={styles.translationLabel}>
                      Translation ({translationData.language} → en):
                    </span>
                    <p className={styles.translationText}>
                      {translationData.translatedText}
                    </p>
                  </div>
                )}

                {sentimentData && sentimentData.summary && (
                  <div className={styles.summary}>
                    <span className={styles.summaryLabel}>AI Summary:</span>
                    <p className={styles.summaryText}>
                      {sentimentData.summary}
                    </p>
                  </div>
                )}

                <a
                  href={post.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={styles.viewLink}
                >
                  View on Reddit →
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
