import { useState, useCallback } from 'react'
import { AnalysisResult } from '../types'

interface UseAnalyticsProps {
  token: string | null
  apiUrl: string
}

export function useAnalytics({ token, apiUrl }: UseAnalyticsProps) {
  // Source selection — 4 core sources
  const [source, setSource] = useState('reddit_sentiment')
  const [query, setQuery] = useState('')
  const [followLinks, setFollowLinks] = useState(false)
  const [includeAllLinks, setIncludeAllLinks] = useState(false)
  const [crawlLimit, setCrawlLimit] = useState(3)
  const [customTags, setCustomTags] = useState('')
  const [multiUrlMode, setMultiUrlMode] = useState(false)
  const [multiUrls, setMultiUrls] = useState('')

  // Results state
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')

  // Data storage
  const [searchData, setSearchData] = useState<AnalysisResult | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Displayed data
  const displayedData: AnalysisResult = searchData || {
    source: '',
    count: 0,
    posts: [],
    sentiment: [],
  }

  const runAnalysis = useCallback(
    async (overrideSessionId?: string) => {
      const activeSessionId = overrideSessionId || sessionId

      if (!activeSessionId && !query) return

      setLoading(true)
      setError('')
      setSearchData(null)
      setStatusMsg('Fetching data...')

      try {
        if (activeSessionId) {
          // Fetch by Session ID (History)
          setStatusMsg('Fetching historical session data...')
          const res = await fetch(
            `${apiUrl}/raw-data/session/${activeSessionId}`,
            {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            },
          )
          if (!res.ok) throw new Error('Failed to fetch session data')
          const data = await res.json()
          setSearchData(data)
          setSessionId(activeSessionId)
        } else if (multiUrlMode && source === 'web' && multiUrls.trim()) {
          // Multi-URL mode: process each URL and merge results
          const urls = multiUrls
            .split('\n')
            .map(u => u.trim())
            .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')))

          if (urls.length === 0) throw new Error('No valid URLs provided. Each URL must start with http:// or https://')

          const mergedResult: AnalysisResult = {
            source: 'web',
            count: 0,
            posts: [],
            sentiment: [],
          }

          // Generate one shared session ID for the entire batch
          const masterSessionId = crypto.randomUUID()
          mergedResult.sessionId = masterSessionId

          for (let i = 0; i < urls.length; i++) {
            setStatusMsg(`Processing URL ${i + 1}/${urls.length}: ${urls[i].substring(0, 50)}...`)
            try {
              const result = await fetchSource(
                apiUrl,
                'web',
                urls[i],
                followLinks,
                includeAllLinks ? 0 : crawlLimit,
                customTags,
                token,
                masterSessionId,
              )
              mergedResult.posts.push(...(result.posts || []))
              mergedResult.sentiment.push(...(result.sentiment || []))
              mergedResult.count += result.count || 0
            } catch (urlErr: any) {
              console.warn(`Failed to process ${urls[i]}: ${urlErr.message}`)
            }
          }

          setSearchData(mergedResult)
          setSessionId(masterSessionId)
        } else if (source === 'ai' && query.trim()) {
          setStatusMsg('AI is planning multi-source search (Reddit, Web Search, Common Crawl)...')
          const smartRes = await fetch(`${apiUrl}/raw-data/smart`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ query: query.trim(), customTags: customTags || '' }),
          })

          if (!smartRes.ok) {
            const errorData = await smartRes.json().catch(() => ({}))
            throw new Error(errorData.message || 'AI Smart Search failed.')
          }
          const smartData = await smartRes.json()

          // Normalize posts to ensure consistent author and text fields
          const normalizedPosts = (smartData.posts || []).map((p: any) => ({
            ...p,
            author: p.author || (() => {
              try { return p.url ? new URL(p.url).hostname : 'Unknown System' } catch { return 'Unknown System' }
            })(),
            text: p.text || p.content || '',
          }))

          const mergedResult: AnalysisResult = {
            source: 'AI Smart Search',
            count: smartData.count || 0,
            posts: normalizedPosts,
            sentiment: smartData.sentiment || [],
            sessionId: smartData.sessionId,
          }

          setSearchData(mergedResult)
          if (smartData.sessionId) setSessionId(smartData.sessionId)
        } else {
          const result = await fetchSource(
            apiUrl,
            source,
            query,
            followLinks,
            includeAllLinks ? 0 : crawlLimit,
            customTags,
            token,
          )
          setSearchData(result)
          if (result.sessionId) setSessionId(result.sessionId)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
        setStatusMsg('')
      }
    },
    [
      apiUrl,
      token,
      source,
      query,
      followLinks,
      includeAllLinks,
      crawlLimit,
      customTags,
      sessionId,
      multiUrlMode,
      multiUrls,
    ],
  )

  return {
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
  }
}

// ─── Helper: map source ID to API endpoint and build request body ───
async function fetchSource(
  apiUrl: string,
  src: string,
  q: string,
  doCrawl: boolean,
  limit: number,
  customTags: string,
  token: string | null,
  overrideSessionId?: string,
): Promise<AnalysisResult> {
  let endpoint = ''
  let body: any = {}

  const addTags = (b: any) => {
    if (customTags) b.customTags = customTags
    if (overrideSessionId) b.overrideSessionId = overrideSessionId
    return b
  }

  switch (src) {
    case 'reddit_sentiment': {
      endpoint = '/raw-data/reddit/sentiment'
      const subMatch = q.match(/r\/(\w+)/)
      const sub = subMatch ? subMatch[1] : 'pakistan'
      const cleanQ = subMatch ? q.replace(subMatch[0], '').trim() : q
      body = addTags({ subreddit: sub, query: cleanQ || 'general', limit: 10 })
      break
    }
    case 'twitter_sentiment':
      endpoint = '/raw-data/twitter/sentiment'
      body = addTags({ query: q, maxResults: 10 })
      break
    case 'web':
      endpoint = '/raw-data/web'
      body = addTags({ url: q, followLinks: doCrawl, fetchLimit: limit })
      break
    case 'commoncrawl':
      endpoint = '/raw-data/commoncrawl'
      body = addTags({ domain: q, limit: 10 })
      break
    case 'database':
      // Fetching from database uses the history endpoint, handled earlier or differently.
      // If we reach here, we shouldn't throw, but just mock a safe empty lookup or use the correct log endpoint
      endpoint = `/raw-data/session/${q}` // q is the sessionId here
      break
    default:
      throw new Error(`Unknown source: ${src}`)
  }

  const res = await fetch(`${apiUrl}${endpoint}`, {
    method: src === 'database' ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: src === 'database' ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to fetch ${src}`)
  }

  const json = await res.json()

  // ─── Normalize response into common AnalysisResult shape ───
  const normalizedData: AnalysisResult = {
    source: src,
    count: 0,
    posts: [],
    sentiment: [],
    sessionId: json.sessionId,
  }

  if (src === 'reddit_sentiment') {
    normalizedData.count = json.count || (json.posts ? json.posts.length : 0)
    normalizedData.posts =
      json.posts?.map((p: any) => ({
        ...p,
        author: p.author || 'Reddit User',
      })) || []
    normalizedData.sentiment = json.sentiment || []
  } else if (src === 'twitter_sentiment') {
    normalizedData.count = json.count || (json.tweets ? json.tweets.length : 0)
    normalizedData.posts =
      (json.tweets || json.posts)?.map((t: any) => ({
        ...t,
        author: t.author_id
          ? `User ${t.author_id.substring(0, 8)}`
          : 'Twitter User',
      })) || []
    normalizedData.sentiment = json.sentiment || []
  } else if (src === 'web') {
    normalizedData.count = json.count || (json.posts ? json.posts.length : 0)
    normalizedData.posts =
      json.posts?.map((p: any) => ({
        ...p,
        text: p.content || p.text,
      })) || []
    normalizedData.sentiment = json.sentiment || []
  } else if (src === 'commoncrawl') {
    normalizedData.count =
      json.count || (json.records ? json.records.length : 0)
    normalizedData.posts =
      json.records?.map((r: any) => ({
        ...r,
        text: r.text || r.content,
        author:
          r.author ||
          (() => {
            try {
              return new URL(r.url).hostname
            } catch {
              return 'Web Source'
            }
          })(),
      })) || []
    normalizedData.sentiment = json.sentiment || []
  } else if (src === 'database') {
    normalizedData.count = json.count || (json.posts ? json.posts.length : 0);
    normalizedData.posts = json.posts || [];
    normalizedData.sentiment = json.sentiment || [];
  }

  return normalizedData
}
