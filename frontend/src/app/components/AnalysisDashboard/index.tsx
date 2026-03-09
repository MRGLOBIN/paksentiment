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
    AreaChart,
    Area
} from 'recharts'
import { DataGrid } from '@mui/x-data-grid'
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
import { AnalysisResult } from '../../../types'
import {
    COLORS,
    TOPIC_COLORS,
    useAnalysisDashboard,
    getSentimentString
} from './useAnalysisDashboard'

interface AnalysisDashboardProps {
    data: AnalysisResult
}

export default function AnalysisDashboard({ data }: AnalysisDashboardProps) {
    const {
        selectedPost, setSelectedPost,
        exportAnchorEl, setExportAnchorEl,
        handleExportCSV, handleExportPDF,
        hasSentiment, kpis, topicChartData,
        timelineData, confidenceData,
        realTopicChartData, uniqueTopicCount,
        tableRows
    } = useAnalysisDashboard(data)

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
                    rows={tableRows}
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
                            <BarChart data={[...topicChartData].sort((a, b) => b.value - a.value).slice(0, 10)}>
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
                                sx={{ color: 'text.secondary' }}
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
