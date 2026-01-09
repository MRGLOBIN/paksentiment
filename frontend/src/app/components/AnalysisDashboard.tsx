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
    Download as DownloadIcon
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
export default function AnalysisDashboard({ data }: AnalysisDashboardProps) {
    const [selectedPost, setSelectedPost] = useState<Post | null>(null)
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null)

    // ============ EXPORT HANDLERS ============
    const getExportData = () => {
        return data.posts?.map((post, idx) => {
            const sentiment = data.sentiment?.find(s => s.id === post.id)
            return {
                Date: post.timestamp ? new Date(post.timestamp).toLocaleString() : (post.created_utc ? new Date(post.created_utc * 1000).toLocaleString() : 'N/A'),
                'User Name': post.author || 'Unknown',
                Source: post.url?.includes('reddit') ? 'Reddit' : (post.url?.includes('youtube') ? 'YouTube' : (post.url?.includes('twitter') ? 'Twitter' : 'Web')),
                Content: (post.text || post.content || post.title || '').replace(/[\n\r]+/g, ' ').substring(0, 500),
                Sentiment: post.sentiment || sentiment?.sentiment || 'N/A',
                'Context/Topic': sentiment?.summary || 'N/A',
                Confidence: ((post.confidence || sentiment?.confidence || 0) * 100).toFixed(1) + '%',
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
        const sentimentSource = data.sentiment || data.posts?.filter(p => p.sentiment).map(p => ({
            id: p.id,
            sentiment: p.sentiment!,
            confidence: p.confidence || 0.8,
            summary: ''
        })) || []

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
                                <span className={styles.kpiTitle}>Top Topic ({kpis.topTopicPercent}%)</span>
                            </div>
                        </div>


                    </>
                )}
            </div>

            {/* Charts Grid */}
            {hasSentiment && (
                <div className={styles.chartsGrid}>
                    {/* Topic Distribution Donut - Full Width */}
                    <div className={`${styles.chartCard} ${styles.fullWidth}`}>
                        <h3 className={styles.chartTitle}>Topic Distribution</h3>
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

                    {/* Volume by Topic (Bar) */}
                    <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>Volume by Topic</h3>
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




                </div>
            )}

            {/* Data Table */}
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
                        const sentiment = data.sentiment?.find(s => s.id === post.id)
                        return {
                            id: post.id || idx,
                            author: post.author || 'Unknown',
                            content: post.title || (post.text || post.content || '').substring(0, 120) + '...',
                            topic: post.sentiment || sentiment?.sentiment || null,
                            confidence: post.confidence || sentiment?.confidence || null,
                            fullPost: post // Store full object for retrieval
                        }
                    }) || []}
                    columns={[
                        { field: 'author', headerName: 'SOURCE', flex: 1, minWidth: 150 },
                        { field: 'content', headerName: 'CONTENT PREVIEW', flex: 2.5, minWidth: 400 },
                        {
                            field: 'actions',
                            headerName: 'ACTIONS',
                            width: 150,
                            renderCell: (params) => (
                                <Button
                                    startIcon={<VisibilityIcon />}
                                    size="small"
                                    onClick={() => {
                                        // Find original post using ID or index
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
                                            label={`Sentiment: ${selectedPost.sentiment}`}
                                            sx={{
                                                backgroundColor: TOPIC_COLORS[selectedPost.sentiment.toLowerCase()] || COLORS.neutral,
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
