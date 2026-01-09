
import { useState, useCallback } from 'react'
import { AnalysisResult, Post, SentimentResult } from '../types'

interface UseAnalyticsProps {
    token: string | null
    apiUrl: string
}

export function useAnalytics({ token, apiUrl }: UseAnalyticsProps) {
    const [mode, setMode] = useState<'manual' | 'smart'>('manual')

    // Manual inputs
    const [source, setSource] = useState('reddit_sentiment')
    const [query, setQuery] = useState('')
    const [useLocal, setUseLocal] = useState(true)
    const [followLinks, setFollowLinks] = useState(false)
    const [crawlLimit, setCrawlLimit] = useState(3)
    const [customTags, setCustomTags] = useState('')

    // Smart inputs
    const [smartPrompt, setSmartPrompt] = useState('')

    // Results state
    const [loading, setLoading] = useState(false)
    const [statusMsg, setStatusMsg] = useState('')
    const [error, setError] = useState('')

    // Data storage
    const [searchData, setSearchData] = useState<AnalysisResult | null>(null)
    const [dbData, setDbData] = useState<AnalysisResult | null>(null)
    const [sessionId, setSessionId] = useState<string | null>(null)

    // Merged view
    const displayedData: AnalysisResult = {
        source: searchData ? `${searchData.source} ${dbData ? '+ Database' : ''}` : 'Database (Historical)',
        count: (searchData?.count || 0) + (dbData?.count || 0),
        posts: [...(searchData?.posts || []), ...(dbData?.posts || [])],
        sentiment: [...(searchData?.sentiment || []), ...(dbData?.sentiment || [])]
    }

    const resetResults = useCallback(() => {
        setSearchData(null)
        setDbData(null)
        setError('')
    }, [])

    const fetchSession2 = useCallback(async (sid: string) => {
        setLoading(true)
        setStatusMsg('Fetching historical session data...')
        try {
            const res = await fetch(`${apiUrl}/raw-data/session/${sid}`, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            })
            if (!res.ok) throw new Error('Failed to fetch session data')
            const data = await res.json()
            setSearchData(data)
            setSessionId(sid)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
            setStatusMsg('')
        }
    }, [apiUrl, token])

    const runAnalysis = useCallback(async (overrideSessionId?: string) => {
        const activeSessionId = overrideSessionId || sessionId

        if (!activeSessionId && mode === 'manual' && !query) return
        if (!activeSessionId && mode === 'smart' && !smartPrompt) return

        setLoading(true)
        setError('')
        setSearchData(null)
        setDbData(null)
        setStatusMsg(mode === 'smart' ? 'Planning query...' : 'Fetching data...')

        try {
            if (activeSessionId) {
                // Fetch by Session ID (History)
                // Re-use logic from fetchSession2 but inline to avoid deps issues or just call it?
                // Easier to call fetch endpoint here directly to keep loading state unified
                setStatusMsg('Fetching historical session data...')
                const res = await fetch(`${apiUrl}/raw-data/session/${activeSessionId}`, {
                    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
                })
                if (!res.ok) throw new Error('Failed to fetch session data')
                const data = await res.json()
                setSearchData(data)
                setSessionId(activeSessionId)
            } else if (mode === 'manual') {
                const result = await fetchSource(apiUrl, source, query, undefined, useLocal, followLinks, crawlLimit, customTags, token)
                setSearchData(result)
            } else {
                // Smart Search
                setStatusMsg('Running Smart Analysis (AI Planned)...')
                const res = await fetch(`${apiUrl}/raw-data/smart`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ query: smartPrompt, customTags: customTags || undefined })
                })

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Smart search failed');
                }

                const data = await res.json()
                setSearchData(data)
                if (data.sessionId) setSessionId(data.sessionId)
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
            setStatusMsg('')
        }
    }, [apiUrl, token, mode, source, query, useLocal, followLinks, crawlLimit, customTags, smartPrompt, sessionId])

    return {
        mode, setMode,
        source, setSource,
        query, setQuery,
        useLocal, setUseLocal,
        followLinks, setFollowLinks,
        crawlLimit, setCrawlLimit,
        customTags, setCustomTags,
        smartPrompt, setSmartPrompt,
        loading, statusMsg, error,
        sessionId, setSessionId,
        displayedData,
        runAnalysis,
        fetchSession: fetchSession2
    }
}

// Helper fetchSource logic extracted and kept pure(ish)
async function fetchSource(apiUrl: string, src: string, q: string, customBody: any = undefined, useLocal: boolean, doCrawl: boolean, limit: number, customTags: string, token: string | null) {
    let endpoint = ''
    let body: any = customBody || {}

    // Add customTags to body if present
    const addTags = (b: any) => {
        if (customTags) b.customTags = customTags
        return b
    }

    if (!customBody) {
        switch (src) {
            case 'reddit':
                endpoint = '/raw-data/reddit'
                body = addTags({ subreddit: 'pakistan', query: q, limit: 10 })
                break;
            case 'reddit_sentiment':
                endpoint = '/raw-data/reddit/sentiment'
                const subMatch = q.match(/r\/(\w+)/)
                const sub = subMatch ? subMatch[1] : 'pakistan'
                const cleanQ = subMatch ? q.replace(subMatch[0], '').trim() : q
                body = addTags({ subreddit: sub, query: cleanQ || 'general', limit: 10 })
                break;
            case 'twitter':
                endpoint = '/raw-data/twitter'
                body = addTags({ query: q, maxResults: 10 })
                break;
            case 'twitter_sentiment':
                endpoint = '/raw-data/twitter/sentiment'
                body = addTags({ query: q, maxResults: 10 })
                break;
            case 'youtube':
                endpoint = '/raw-data/youtube/search'
                body = addTags({ query: q, max_results: 10 })
                break;
            case 'commoncrawl':
                endpoint = '/raw-data/commoncrawl'
                body = addTags({ domain: q, limit: 10 })
                break;
            case 'scrapling':
                endpoint = '/raw-data/scrapling'
                body = addTags({ url: q, useLocal: useLocal, followLinks: doCrawl, fetchLimit: limit.toString() })
                break;
            case 'database':
                endpoint = '/raw-data/stored'
                body = { limit: 100 } // Database might not support custom tags re-classification yet
                break;
        }
    }

    const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
    })

    if (!res.ok) throw new Error(`Failed to fetch ${src}`)
    const json = await res.json()

    // Normalize
    const normalizedData: AnalysisResult = {
        source: src,
        count: 0,
        posts: [],
        sentiment: []
    }

    // Logic to normalize response identical to original
    if (src.includes('reddit')) {
        normalizedData.count = json.count || (json.posts ? json.posts.length : 0);
        normalizedData.posts = json.posts?.map((p: any) => ({ ...p, author: p.author || 'Reddit User' })) || [];
        normalizedData.sentiment = json.sentiment || [];
    } else if (src.includes('twitter')) {
        normalizedData.count = json.count || (json.tweets ? json.tweets.length : 0);
        normalizedData.posts = json.tweets?.map((t: any) => ({ ...t, author: t.author_id ? `User ${t.author_id.substring(0, 8)}` : 'Twitter User' })) || [];
        normalizedData.sentiment = json.sentiment || [];
    } else if (src === 'youtube') {
        normalizedData.count = json.videos ? json.videos.length : 0;
        normalizedData.posts = json.videos?.map((v: any) => ({
            id: v.id?.videoId || v.id,
            title: v.snippet?.title,
            text: v.snippet?.description,
            author: v.snippet?.channelTitle || 'YouTube Channel',
            url: `https://www.youtube.com/watch?v=${v.id?.videoId || v.id}`,
            timestamp: v.snippet?.publishedAt
        })) || [];
    } else if (src === 'commoncrawl') {
        normalizedData.count = json.records ? json.records.length : 0;
        normalizedData.posts = json.records?.map((r: any) => ({ ...r, author: new URL(r.url).hostname || 'Web Source' })) || [];
    } else if (src === 'scrapling') {
        normalizedData.count = json.count || (json.posts ? json.posts.length : 0);
        normalizedData.posts = json.posts || [];
        normalizedData.sentiment = json.sentiment || [];
    } else if (src === 'database') {
        normalizedData.count = json.count || 0;
        normalizedData.posts = json.posts?.map((p: any) => ({
            ...p,
            author: p.author || (p.metadata?.author_name || p.metadata?.author || 'Database Record'),
            text: p.cleanText || p.content || p.metadata?.summary
        })) || [];
        normalizedData.sentiment = json.posts.map((p: any) => ({
            id: p.rawPostSourceId || p._id,
            sentiment: p.sentiment,
            score: p.confidence,
            summary: p.metadata?.summary
        }));
    }

    return normalizedData
}
