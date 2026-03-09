'use client'

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ArrowUpward, ArrowForward } from '@mui/icons-material'
import styles from './AnalysisResults.module.scss'

// ... (existing interfaces)

// ... (inside component)

// ... (render loop)


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
    const normalizedSentiment = sentiment.toLowerCase()

    // Default colors for common sentiments
    const defaultColors: Record<string, string> = {
      positive: '#10b981',
      negative: '#ef4444',
      neutral: '#6b7280',
      happy: '#fbbf24',
      sad: '#3b82f6',
      angry: '#dc2626',
      fearful: '#8b5cf6',
      optimistic: '#10b981',
      pessimistic: '#ef4444',
      anxious: '#f59e0b',
      hopeful: '#22c55e',
    }

    return defaultColors[normalizedSentiment] || '#64748b'
  }

  const getSentimentStats = () => {
    const total = data.sentiment.length
    const sentimentCounts: Record<string, number> = {}

    // Count occurrences of each sentiment
    data.sentiment.forEach(s => {
      const sentiment = s.sentiment
      sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1
    })

    // Calculate percentages
    const sentimentStats = Object.entries(sentimentCounts).map(
      ([sentiment, count]) => ({
        sentiment,
        count,
        percentage: ((count / total) * 100).toFixed(1),
      })
    )

    return {
      total,
      sentimentCounts,
      sentimentStats,
    }
  }

  const stats = getSentimentStats()

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  // Prepare chart data dynamically based on actual sentiments
  const pieChartData = stats.sentimentStats.map(stat => ({
    name: stat.sentiment.charAt(0).toUpperCase() + stat.sentiment.slice(1),
    value: stat.count,
    color: getSentimentColor(stat.sentiment),
  }))

  const barChartData = stats.sentimentStats.map(stat => ({
    sentiment: stat.sentiment.charAt(0).toUpperCase() + stat.sentiment.slice(1),
    count: stat.count,
    percentage: parseFloat(stat.percentage),
  }))

  // Create dynamic color mapping
  const COLORS: Record<string, string> = {}
  stats.sentimentStats.forEach(stat => {
    const capitalized =
      stat.sentiment.charAt(0).toUpperCase() + stat.sentiment.slice(1)
    COLORS[capitalized] = getSentimentColor(stat.sentiment)
  })

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
            {stats.sentimentStats.map(stat => {
              const sentimentLabel =
                stat.sentiment.charAt(0).toUpperCase() + stat.sentiment.slice(1)
              const color = getSentimentColor(stat.sentiment)
              return (
                <div key={stat.sentiment} className={styles.statItem}>
                  <span className={styles.statLabel}>{sentimentLabel}</span>
                  <span className={styles.statValue} style={{ color: color }}>
                    {stat.count} ({stat.percentage}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Visualization Charts */}
        <div className={styles.chartsContainer}>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Sentiment Distribution</h3>
            <ResponsiveContainer width='100%' height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx='50%'
                  cy='50%'
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill='#8884d8'
                  dataKey='value'
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Sentiment Breakdown</h3>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='sentiment' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey='count' name='Post Count'>
                  {barChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.sentiment as keyof typeof COLORS]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                      <span>r/{post.subreddit}</span>
                      <span>•</span>
                      <span>u/{post.author}</span>
                      <span>•</span>
                      <span>{formatDate(post.created_utc)}</span>
                      <span>•</span>
                      <span>
                        <ArrowUpward fontSize="inherit" style={{ verticalAlign: 'middle' }} /> {post.score}
                      </span>
                    </div>
                  </div>
                  {sentimentData && (
                    <div
                      className={styles.sentimentBadge}
                      style={{
                        backgroundColor:
                          getSentimentColor(sentimentData.sentiment) + '20',
                        color: getSentimentColor(sentimentData.sentiment),
                        borderColor: getSentimentColor(sentimentData.sentiment),
                      }}
                    >
                      {sentimentData.sentiment.charAt(0).toUpperCase() +
                        sentimentData.sentiment.slice(1)}
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
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  View on Reddit <ArrowForward fontSize="inherit" />
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
