'use client'

import { useMemo, useState } from 'react'
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
    AreaChart,
    Area,
    Treemap
} from 'recharts'
import { DataGrid, GridRenderCellParams } from '@mui/x-data-grid'
import {
    BarChart as BarChartIcon,
    Label,
    ListAlt,
    Close as CloseIcon,
    Visibility as VisibilityIcon,
    Download as DownloadIcon,
    TrendingUp
} from '@mui/icons-material'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Typography,
    Button,
    Box,
    Chip,
    Stack,
    Menu,
    MenuItem
} from '@mui/material'
import styles from './AnalysisDashboard.module.scss'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { AnalysisResult, Post, SentimentResult } from '../../types'

interface AnalysisDashboardProps {
    data: AnalysisResult
}

// ============ COLOR PALETTE (Light Green Theme) ============
const COLORS = {
    primary: 'var(--primary)',
    secondary: 'var(--primary-dark)',
    accent: 'var(--primary-hover)',
    positive: '#10b981', // Keep semantic colors fixed for now or map to vars if available
    negative: '#ef4444',
    neutral: '#6b7280',
    background: 'var(--background)',
    cardBg: 'var(--card-bg)',
    text: 'var(--foreground)',
    textMuted: 'var(--text-muted)',
    border: 'var(--border-color)'
}

const TOPIC_COLORS: Record<string, string> = {
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

// ============ COMPONENT ============
const getSafeString = (val: any, defaultStr = '—'): string => {
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

const getSentimentString = (val: any): string => {
    let s = getSafeString(val, 'Neutral').trim();
    if (s === '—') return 'Neutral';
    const lower = s.toLowerCase();
    if (lower.includes('positive')) return 'Positive';
    if (lower.includes('negative')) return 'Negative';
    if (lower.includes('neutral')) return 'Neutral';

    // If it's a huge hallucinated sentence, fallback to Neutral
    if (s.length > 20 || s.includes(' ')) {
        return 'Neutral';
    }
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const getConfidenceValue = (val: any, defaultConf = 0.8): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object' && typeof val.score === 'number') return val.score;
    if (val && typeof val === 'object' && typeof val.confidence === 'number') return val.confidence;
    return defaultConf;
}

const sanitizeTopic = (raw: any): string => {
    let t = getSafeString(raw, 'General').trim();
    if (t === '—') return t;
    // If it's a URL, contains markdown, or is very long, extract the first real word
    if (t.length > 25 || t.includes(' ') || t.includes('http') || t.includes('[')) {
        const match = t.match(/[a-zA-Z]{3,}/);
        t = match ? match[0] : 'General';
    }
    t = t.substring(0, 15);
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export default function AnalysisDashboard({ data }: AnalysisDashboardProps) {
    const [selectedPost, setSelectedPost] = useState<Post | null>(null)
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null)

    // ============ EXPORT HANDLERS ============
    const getExportData = () => {
        return data.posts?.map((post, idx) => {
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
        doc.text('PakSentiment Analysis Report', 14, 20)

        doc.setFontSize(11)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)
        doc.text(`Source: ${data.source?.toUpperCase()} | Documents: ${data.count}`, 14, 36)

        // Table
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

        doc.save(`paksentiment_report_${new Date().toISOString().slice(0, 10)}.pdf`)
        setExportAnchorEl(null)
    }

    // Derived State
    const hasSentiment = useMemo(() =>
        (data.sentiment && data.sentiment.length > 0) ||
        (data.posts && data.posts.some(p => !!p.sentiment)),
        [data]
    )

    // ============ KPI CALCULATIONS ============
    const kpis = useMemo(() => {
        const totalDocs = data.count || data.posts?.length || 0
        const uniqueAuthors = new Set(data.posts?.map(p => p.author).filter(Boolean)).size

        // Sentiment/Topic counts
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

        const topTopic = Object.entries(topicCounts)
            .sort((a, b) => b[1] - a[1])[0]

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
    // Topic Distribution (Donut)
    const topicChartData = useMemo(() =>
        Object.entries(kpis.topicCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            color: TOPIC_COLORS[name.toLowerCase()] || COLORS.primary
        })),
        [kpis.topicCounts]
    )

    // Source Distribution (Treemap)
    const sourceData = useMemo(() => {
        const sources: Record<string, number> = {}
        data.posts?.forEach(p => {
            let source = 'Unknown'
            if (p.url?.includes('reddit.com')) source = 'Reddit'
            else if (p.url?.includes('youtube.com')) source = 'YouTube'
            else if (p.author?.includes('.')) source = p.author.split('.')[0] // Domain
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

    // Timeline Data
    const timelineData = useMemo(() => {
        const dateMap: Record<string, number> = {}
        data.posts?.forEach(p => {
            let dateStr = 'Unknown'
            if (p.timestamp) {
                dateStr = new Date(p.timestamp).toISOString().split('T')[0]
            } else if (p.created_utc) {
                dateStr = new Date(p.created_utc * 1000).toISOString().split('T')[0]
            } else if (p.date) {
                // CommonCrawl format: 20251118172631
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

    // Confidence Distribution
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

    // ============ TOPIC ANALYTICS ============
    const TOPIC_COLOR_MAP: Record<string, string> = {
        economics: '#F59E0B', politics: '#EF4444', technology: '#8B5CF6',
        health: '#F97316', education: '#0EA5E9', sports: '#10B981',
        science: '#6366F1', culture: '#EC4899', environment: '#14B8A6',
        law: '#A855F7', general: '#6B7280', society: '#8884D8',
    }

    // Count documents per actual topic (from Ollama)
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

    // Sentiment breakdown per topic (for stacked bar) — removed per user request

    // ============ RENDER ============
    return (
        <div className={styles.dashboard}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>Analysis Dashboard</h1>
                <span className={styles.subtitle}>
                    Source: <strong>{data.source?.toUpperCase() || 'MIXED'}</strong> |
                    {data.count} documents analyzed
                </span>

                <Box sx={{ marginLeft: 'auto', display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={(event) => setExportAnchorEl(event.currentTarget)}
                        sx={{ color: COLORS.primary, borderColor: COLORS.primary }}
                    >
                        Export Data
                    </Button>
                    <Menu
                        anchorEl={exportAnchorEl}
                        open={Boolean(exportAnchorEl)}
                        onClose={() => setExportAnchorEl(null)}
                    >
                        <MenuItem onClick={handleExportCSV}>Export as CSV</MenuItem>
                        <MenuItem onClick={handleExportPDF}>Export as PDF</MenuItem>
                    </Menu>
                </Box>
            </div>

            {/* KPI Cards */}
            <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                    <span className={styles.kpiIcon}>
                        <BarChartIcon fontSize="inherit" />
                    </span>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiValue}>{kpis.totalDocs.toLocaleString()}</span>
                        <span className={styles.kpiTitle}>Total Documents</span>
                    </div>
                </div>



                {hasSentiment && (
                    <>
                        <div className={styles.kpiCard}>
                            <span className={styles.kpiIcon}>
                                <Label fontSize="inherit" />
                            </span>
                            <div className={styles.kpiContent}>
                                <span className={styles.kpiValue} style={{ color: TOPIC_COLORS[kpis.topTopic.toLowerCase()] || COLORS.primary }}>
                                    {kpis.topTopic}
                                </span>
                                <span className={styles.kpiTitle}>Top Sentiment ({kpis.topTopicPercent}%)</span>
                            </div>
                        </div>

                        <div className={styles.kpiCard}>
                            <span className={styles.kpiIcon}>
                                <TrendingUp fontSize="inherit" />
                            </span>
                            <div className={styles.kpiContent}>
                                <span className={styles.kpiValue} style={{ color: COLORS.primary }}>
                                    {uniqueTopicCount}
                                </span>
                                <span className={styles.kpiTitle}>Unique Topics</span>
                            </div>
                        </div>

                    </>
                )}
            </div>

            {/* Data Table — shown first, above charts */}
            <div className={styles.dataGridSection}>
                <div className={styles.sectionHeader}>
                    <h3>
                        <ListAlt fontSize="inherit" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                        Data Feed
                    </h3>
                    <span className={styles.recordCount}>{data.posts?.length || 0} records</span>
                </div>
                <DataGrid
                    rows={data.posts?.map((post, idx) => {
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
                    }) || []}
                    columns={[
                        { field: 'source', headerName: 'SOURCE', flex: 0.8, minWidth: 120 },
                        {
                            field: 'topic',
                            headerName: 'TOPIC',
                            flex: 0.6,
                            minWidth: 100,
                            renderCell: (params) => (
                                <Chip
                                    label={params.value}
                                    size="small"
                                    sx={{
                                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                        color: '#a78bfa',
                                        fontWeight: 600,
                                        fontSize: '0.7rem',
                                        letterSpacing: '0.03em',
                                    }}
                                />
                            )
                        },
                        { field: 'summary', headerName: 'SUMMARY', flex: 2.5, minWidth: 350 },
                        {
                            field: 'sentiment',
                            headerName: 'SENTIMENT',
                            flex: 0.7,
                            minWidth: 110,
                            renderCell: (params) => {
                                const val = String(params.value || '').toLowerCase()
                                const color = val.includes('positive') ? '#10b981'
                                    : val.includes('negative') ? '#ef4444'
                                        : '#6b7280'
                                return (
                                    <Chip
                                        label={params.value}
                                        size="small"
                                        sx={{
                                            backgroundColor: `${color}22`,
                                            color: color,
                                            fontWeight: 700,
                                            fontSize: '0.7rem',
                                            letterSpacing: '0.03em',
                                            border: `1px solid ${color}44`,
                                        }}
                                    />
                                )
                            }
                        },
                        {
                            field: 'confidence',
                            headerName: 'CONFIDENCE',
                            flex: 0.6,
                            minWidth: 100,
                            renderCell: (params) => {
                                if (params.value == null) return '—'
                                const pct = Math.round(params.value * 100)
                                const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
                                return (
                                    <span style={{ color, fontWeight: 700, fontSize: '0.85rem' }}>
                                        {pct}%
                                    </span>
                                )
                            }
                        },

                        {
                            field: 'actions',
                            headerName: 'ACTIONS',
                            width: 120,
                            renderCell: (params) => (
                                <Button
                                    startIcon={<VisibilityIcon />}
                                    size="small"
                                    onClick={() => {
                                        const original = data.posts?.find((p, i) => (p.id || i) === params.id)
                                        setSelectedPost(original || null)
                                    }}
                                    sx={{ color: COLORS.primary }}
                                >
                                    Details
                                </Button>
                            )
                        }
                    ]}
                    initialState={{
                        pagination: { paginationModel: { page: 0, pageSize: 25 } },
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    sx={{
                        border: 'none',
                        backgroundColor: COLORS.cardBg,
                        fontFamily: '"Inter", "Segoe UI", sans-serif',
                        '& .MuiDataGrid-columnHeader': {
                            backgroundColor: COLORS.secondary,
                            color: COLORS.text,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                        },
                        '& .MuiDataGrid-cell': {
                            borderBottom: `1px solid ${COLORS.border}`,
                            color: COLORS.text,
                            fontSize: '0.875rem',
                        },
                        '& .MuiDataGrid-row': {
                            backgroundColor: COLORS.cardBg,
                            '&:nth-of-type(even)': {
                                backgroundColor: 'rgba(255,255,255,0.02)'
                            },
                            '&:hover': {
                                backgroundColor: 'rgba(17, 141, 255, 0.1) !important'
                            },
                        },
                        '& .MuiDataGrid-footerContainer': {
                            backgroundColor: COLORS.cardBg,
                            borderTop: `1px solid ${COLORS.border}`,
                            color: COLORS.textMuted
                        },
                        '& .MuiTablePagination-root': { color: COLORS.textMuted },
                        '& .MuiIconButton-root': { color: COLORS.textMuted },
                        '& .MuiDataGrid-sortIcon': { color: COLORS.text },
                    }}
                    autoHeight
                    disableRowSelectionOnClick
                />
            </div>

            {/* Charts Grid — below the table */}
            {hasSentiment && (
                <div className={styles.chartsGrid}>
                    {/* Sentiment Distribution Donut - Full Width */}
                    <div className={`${styles.chartCard} ${styles.fullWidth}`}>
                        <h3 className={styles.chartTitle}>Sentiment Distribution</h3>
                        <ResponsiveContainer width="100%" height={450}>
                            <PieChart>
                                <Pie
                                    data={topicChartData}
                                    innerRadius={100}
                                    outerRadius={160}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => (percent ?? 0) > 0.03 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''}
                                    labelLine={true}
                                >
                                    {topicChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                    itemStyle={{ color: COLORS.text }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    wrapperStyle={{ color: COLORS.textMuted }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Volume by Sentiment (Bar) */}
                    <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>Volume by Sentiment</h3>
                        <ResponsiveContainer width="100%" height={380}>
                            <BarChart data={topicChartData.sort((a, b) => b.value - a.value).slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                <XAxis dataKey="name" stroke={COLORS.textMuted} tick={{ fontSize: 12 }} />
                                <YAxis stroke={COLORS.textMuted} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {topicChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Timeline */}
                    {timelineData.length > 1 && (
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>Content Over Time</h3>
                            <ResponsiveContainer width="100%" height={380}>
                                <AreaChart data={timelineData}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                    <XAxis dataKey="date" stroke={COLORS.textMuted} tick={{ fontSize: 10 }} />
                                    <YAxis stroke={COLORS.textMuted} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke={COLORS.primary}
                                        fill="url(#colorCount)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Confidence Distribution */}
                    <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>Confidence Distribution</h3>
                        <ResponsiveContainer width="100%" height={380}>
                            <BarChart data={confidenceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                <XAxis dataKey="range" stroke={COLORS.textMuted} tick={{ fontSize: 12 }} />
                                <YAxis stroke={COLORS.textMuted} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                />
                                <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Topic Distribution Donut */}
                    {realTopicChartData.length > 0 && (
                        <div className={`${styles.chartCard} ${styles.fullWidth}`}>
                            <h3 className={styles.chartTitle}>📚 Topic Distribution</h3>
                            <ResponsiveContainer width="100%" height={420}>
                                <PieChart>
                                    <Pie
                                        data={realTopicChartData}
                                        innerRadius={90}
                                        outerRadius={150}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, percent }) => (percent ?? 0) > 0.03 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''}
                                        labelLine={true}
                                    >
                                        {realTopicChartData.map((entry, index) => (
                                            <Cell key={`topic-cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                        itemStyle={{ color: COLORS.text }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        wrapperStyle={{ color: COLORS.textMuted }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                </div>
            )}

            {/* Post Detail Dialog */}
            <Dialog
                open={!!selectedPost}
                onClose={() => setSelectedPost(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    style: { borderRadius: 12 }
                }}
            >
                {selectedPost && (
                    <>
                        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                                Post Details
                            </Typography>
                            <IconButton
                                aria-label="close"
                                onClick={() => setSelectedPost(null)}
                                sx={{ color: (theme) => theme.palette.grey[500] }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Stack spacing={2}>
                                {/* Meta Info */}
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip label={`Author: ${selectedPost.author || 'Unknown'}`} variant="outlined" />
                                    {selectedPost.sentiment && (
                                        <Chip
                                            label={`Sentiment: ${getSentimentString(selectedPost.sentiment)}`}
                                            sx={{
                                                backgroundColor: TOPIC_COLORS[getSentimentString(selectedPost.sentiment).toLowerCase()] || COLORS.neutral,
                                                color: '#fff'
                                            }}
                                        />
                                    )}
                                    {selectedPost.confidence && (
                                        <Chip label={`Confidence: ${(selectedPost.confidence * 100).toFixed(1)}%`} variant="outlined" />
                                    )}
                                    {selectedPost.timestamp && (
                                        <Chip label={`Date: ${new Date(selectedPost.timestamp).toLocaleString()}`} variant="outlined" />
                                    )}
                                </Box>

                                {/* Title */}
                                {selectedPost.title && (
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">Title</Typography>
                                        <Typography variant="h6">{selectedPost.title}</Typography>
                                    </Box>
                                )}

                                {/* Content */}
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">Content</Typography>
                                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                                        {selectedPost.text || selectedPost.content || 'No content provided'}
                                    </Typography>
                                </Box>

                                {/* URL */}
                                {selectedPost.url && (
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">Source URL</Typography>
                                        <a href={selectedPost.url} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.primary }}>
                                            {selectedPost.url}
                                        </a>
                                    </Box>
                                )}
                            </Stack>
                        </DialogContent>
                    </>
                )}
            </Dialog>
        </div>
    )
}
