
// Auth Types
export interface User {
    id: number
    email: string
    fullName: string
    provider: string
    subscriptionTier?: 'free' | 'premium' | 'super_premium'
}

export interface AuthResponse {
    accessToken: string
    user: User
}

// Activity Types
export interface Activity {
    id: number
    userId: number
    action: string
    details: any
    createdAt: string
}

// Analytics Types
export interface SentimentResult {
    id: string
    sentiment: string
    confidence: number
    summary: string
    topic?: string
    engine?: string
    chunk_results?: any[]
}

export interface Post {
    id: string
    title?: string
    text?: string
    content?: string
    author?: string
    url?: string
    timestamp?: string
    created_utc?: number
    date?: string | number
    sentiment?: string
    confidence?: number
    metadata?: any
}

export interface AnalysisResult {
    source: string
    count: number
    posts: Post[]
    sentiment: SentimentResult[]
    sessionId?: string
    plan?: any[]
}

export interface AnalysisSource {
    id: string
    name: string
}
