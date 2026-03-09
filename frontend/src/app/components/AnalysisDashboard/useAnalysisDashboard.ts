import { useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { AnalysisResult, Post } from '../../../types'

// Setup constants
export const COLORS = {
    primary: 'var(--primary)',
    secondary: 'var(--primary-dark)',
    accent: 'var(--primary-hover)',
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280',
    background: 'var(--background)',
    cardBg: 'var(--card-bg)',
    text: 'var(--foreground)',
    textMuted: 'var(--text-muted)',
    border: 'var(--border-color)'
}

export const TOPIC_COLORS: Record<string, string> = {
    politics: '#118DFF',
    economy: '#10b981',
    sports: '#F2C811',
    entertainment: '#E044A7',
    technology: '#8B5CF6',
    crime: '#EF4444',
    education: '#0EA5E9',
    environment: '#14B8A6',
    health: '#F97316',
    society: '#8884D8',
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280'
}

export const TOPIC_COLOR_MAP: Record<string, string> = {
    economics: '#F59E0B', politics: '#EF4444', technology: '#8B5CF6',
    health: '#F97316', education: '#0EA5E9', sports: '#10B981',
    science: '#6366F1', culture: '#EC4899', environment: '#14B8A6',
    law: '#A855F7', general: '#6B7280', society: '#8884D8',
}

// Helper methods 
export const getSafeString = (val: any, defaultStr = '—'): string => {
    if (!val) return defaultStr;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'object') {
        if (typeof val.label === 'string') return val.label;
        if (typeof val.sentiment === 'string') return val.sentiment;
        if (typeof val.topic === 'string') return val.topic;
        if (typeof val.value === 'string') return val.value;
        if (typeof val.summary === 'string') return val.summary;
        return defaultStr;
    }
    return String(val)
}

export const getSentimentString = (val: any): string => {
    const s = getSafeString(val, 'Neutral').trim();
    if (s === '—') return 'Neutral';
    const lower = s.toLowerCase();
    if (lower.includes('positive')) return 'Positive';
    if (lower.includes('negative')) return 'Negative';
    if (lower.includes('neutral')) return 'Neutral';

    if (s.length > 20 || s.includes(' ')) {
        return 'Neutral';
    }
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export const getConfidenceValue = (val: any, defaultConf = 0.8): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object' && typeof val.score === 'number') return val.score;
    if (val && typeof val === 'object' && typeof val.confidence === 'number') return val.confidence;
    return defaultConf;
}

export const sanitizeTopic = (raw: any): string => {
    let t = getSafeString(raw, 'General').trim();
    if (t === '—') return t;
    if (t.length > 25 || t.includes(' ') || t.includes('http') || t.includes('[')) {
        const match = t.match(/[a-zA-Z]{3,}/);
        t = match ? match[0] : 'General';
    }
    t = t.substring(0, 15);
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export const useAnalysisDashboard = (data: AnalysisResult) => {
    const [selectedPost, setSelectedPost] = useState<Post | null>(null)
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null)

    // ============ EXPORT HANDLERS ============
    const getExportData = () => {
        return data.posts?.map((post) => {
            const sentimentObj = data.sentiment?.find(s => s.id === post.id)
            const rawSentiment = post.sentiment || sentimentObj?.sentiment

            return {
                Date: post.timestamp ? new Date(post.timestamp).toLocaleString() : (post.created_utc ? new Date(post.created_utc * 1000).toLocaleString() : 'N/A'),
                'User Name': post.author || 'Unknown',
                Source: post.url?.includes('reddit') ? 'Reddit' : (post.url?.includes('youtube') ? 'YouTube' : (post.url?.includes('twitter') ? 'Twitter' : 'Web')),
                Content: (post.text || post.content || post.title || '').replace(/[\n\r]+/g, ' ').substring(0, 500),
                Sentiment: getSentimentString(rawSentiment),
                'Context/Topic': sentimentObj?.summary || 'N/A',
                Confidence: ((post.confidence || sentimentObj?.confidence || getConfidenceValue(rawSentiment, 0)) * 100).toFixed(1) + '%',
                URL: post.url || 'N/A'
            }
        }) || []
    }

    const handleExportCSV = () => {
        const rows = getExportData()
        if (rows.length === 0) return

        const headers = Object.keys(rows[0])
        const csvContent = [
            headers.join(','),
            ...rows.map(row => headers.map(header => JSON.stringify(row[header as keyof typeof row] || '')).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `paksentiment_analysis_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setExportAnchorEl(null)
    }

    const handleExportPDF = () => {
        const rows = getExportData()
        if (rows.length === 0) return

        const doc = new jsPDF()

        // Header
        doc.setFontSize(18)
        doc.text('DataInsight Analysis Report', 14, 20)

        doc.setFontSize(11)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)
        doc.text(`Source: ${data.source?.toUpperCase() || 'MIXED'} | Documents: ${data.count || 0}`, 14, 36)

        // Table
        const columns = ['Date', 'Source', 'User Name', 'Content', 'Sentiment', 'Context/Topic']
        const tableData = rows.map(r => [
            r.Date,
            r.Source,
            r['User Name'],
            r.Content.substring(0, 50) + (r.Content.length > 50 ? '...' : ''),
            r.Sentiment,
            r['Context/Topic']
        ])

        autoTable(doc, {
            head: [columns],
            body: tableData,
            startY: 45,
            theme: 'grid',
            styles: { fontSize: 8, overflow: 'linebreak' },
            columnStyles: {
                3: { cellWidth: 50 }, // Content
                5: { cellWidth: 40 }  // Topic
            },
            headStyles: { fillColor: [5, 150, 105] } // Primary Green
        })

        doc.save(`datainsight_report_${new Date().toISOString().slice(0, 10)}.pdf`)
        setExportAnchorEl(null)
    }

    // ============ KPI CALCULATIONS ============
    const hasSentiment = useMemo(() =>
        (data.sentiment && data.sentiment.length > 0) ||
        (data.posts && data.posts.some(p => !!p.sentiment)),
        [data]
    )

    const kpis = useMemo(() => {
        const totalDocs = data.count || data.posts?.length || 0
        const uniqueAuthors = new Set(data.posts?.map(p => p.author).filter(Boolean)).size

        const sentimentSource = (data.sentiment || data.posts?.filter(p => p.sentiment).map(p => ({
            id: p.id || '',
            sentiment: p.sentiment,
            confidence: p.confidence,
            summary: ''
        })) || []).map(s => ({
            id: s.id,
            sentiment: getSentimentString(s.sentiment),
            confidence: s.confidence ?? getConfidenceValue(s.sentiment),
            summary: s.summary
        }))

        const topicCounts = sentimentSource.reduce((acc, curr) => {
            acc[curr.sentiment] = (acc[curr.sentiment] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const topTopicItems = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
        const topTopic = topTopicItems.length > 0 ? topTopicItems[0] : null;

        const avgConfidence = sentimentSource.length > 0
            ? sentimentSource.reduce((sum, s) => sum + (s.confidence || 0), 0) / sentimentSource.length
            : 0

        return {
            totalDocs,
            uniqueAuthors,
            topTopic: topTopic ? topTopic[0] : 'N/A',
            topTopicCount: topTopic ? topTopic[1] : 0,
            topTopicPercent: topTopic && totalDocs > 0 ? ((topTopic[1] / totalDocs) * 100).toFixed(1) : '0',
            avgConfidence: (avgConfidence * 100).toFixed(1),
            topicCounts,
            sentimentSource
        }
    }, [data])

    // ============ CHART DATA ============
    const topicChartData = useMemo(() =>
        Object.entries(kpis.topicCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            color: TOPIC_COLORS[name.toLowerCase()] || COLORS.primary
        })),
        [kpis.topicCounts]
    )

    const sourceData = useMemo(() => {
        const sources: Record<string, number> = {}
        data.posts?.forEach(p => {
            let source = 'Unknown'
            if (p.url?.includes('reddit.com')) source = 'Reddit'
            else if (p.url?.includes('youtube.com')) source = 'YouTube'
            else if (p.author?.includes('.')) source = p.author.split('.')[0]
            else if (data.source) source = data.source
            sources[source] = (sources[source] || 0) + 1
        })
        return Object.entries(sources).map(([name, size]) => ({
            name,
            size,
            fill: name === 'Reddit' ? '#FF4500' :
                name === 'YouTube' ? '#FF0000' :
                    COLORS.primary
        }))
    }, [data])

    const timelineData = useMemo(() => {
        const dateMap: Record<string, number> = {}
        data.posts?.forEach(p => {
            let dateStr = 'Unknown'
            if (p.timestamp) {
                dateStr = new Date(p.timestamp).toISOString().split('T')[0]
            } else if (p.created_utc) {
                dateStr = new Date(p.created_utc * 1000).toISOString().split('T')[0]
            } else if (p.date) {
                const d = p.date.toString()
                if (d.length >= 8) {
                    dateStr = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
                }
            }
            if (dateStr !== 'Unknown') {
                dateMap[dateStr] = (dateMap[dateStr] || 0) + 1
            }
        })
        return Object.entries(dateMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, count]) => ({ date, count }))
    }, [data])

    const confidenceData = useMemo(() => {
        const buckets = { '0-20%': 0, '20-40%': 0, '40-60%': 0, '60-80%': 0, '80-100%': 0 }
        kpis.sentimentSource.forEach(s => {
            const conf = (s.confidence || 0) * 100
            if (conf <= 20) buckets['0-20%']++
            else if (conf <= 40) buckets['20-40%']++
            else if (conf <= 60) buckets['40-60%']++
            else if (conf <= 80) buckets['60-80%']++
            else buckets['80-100%']++
        })
        return Object.entries(buckets).map(([range, count]) => ({ range, count }))
    }, [kpis.sentimentSource])

    const realTopicCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        const sentiments = data.sentiment || []
        sentiments.forEach((s: any) => {
            const topic = sanitizeTopic(s.topic)
            counts[topic] = (counts[topic] || 0) + 1
        })
        return counts
    }, [data.sentiment])

    const realTopicChartData = useMemo(() => {
        const sorted = Object.entries(realTopicCounts)
            .map(([name, value]) => ({
                name,
                value,
                color: TOPIC_COLOR_MAP[name.toLowerCase()] || COLORS.primary
            }))
            .sort((a, b) => b.value - a.value);

        if (sorted.length > 6) {
            const top5 = sorted.slice(0, 5);
            const others = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
            top5.push({ name: 'Other', value: others, color: '#9CA3AF' });
            return top5;
        }
        return sorted;
    }, [realTopicCounts])

    const uniqueTopicCount = Object.keys(realTopicCounts).length

    // Table Data
    const tableRows = useMemo(() => {
        return data.posts?.map((post, idx) => {
            const sentimentObj = data.sentiment?.find(s => s.id === post.id)
            const rawSentimentValue = sentimentObj?.sentiment || post.sentiment;

            let safeSummary = getSafeString(sentimentObj?.summary, '');
            if (!safeSummary) {
                safeSummary = getSafeString(post.title, '');
                if (!safeSummary) {
                    safeSummary = getSafeString(post.text || post.content, '').substring(0, 200) + '...';
                }
            }

            return {
                id: post.id || idx,
                source: getSafeString(post.author, 'Unknown'),
                topic: sanitizeTopic(sentimentObj?.topic),
                summary: safeSummary,
                sentiment: getSafeString(rawSentimentValue, '—'),
                confidence: sentimentObj?.confidence ?? post.confidence ?? getConfidenceValue(rawSentimentValue, 0),
                fullPost: post
            }
        }) || []
    }, [data])

    return {
        selectedPost, setSelectedPost,
        exportAnchorEl, setExportAnchorEl,
        handleExportCSV, handleExportPDF,
        hasSentiment, kpis, topicChartData,
        sourceData, timelineData, confidenceData,
        realTopicChartData, uniqueTopicCount,
        tableRows
    }
}
