
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
    details: Record<string, unknown>
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
    chunk_results?: Record<string, unknown>[]
}

export interface Post {
    id: string
    title: string
    text: string
    content?: string
    author: string
    url: string
    timestamp?: string
    created_utc: number
    date?: string | number
    sentiment?: string
    confidence?: number
    subreddit: string
    score: number
    metadata?: Record<string, unknown>
}

export interface AnalysisResult {
    source: string
    count: number
    posts: Post[]
    sentiment: SentimentResult[]
    sessionId?: string
    plan?: Record<string, unknown>[]
}

export interface AnalysisSource {
    id: string
    name: string
}

export interface TranslationData {
    id: string
    language: string
    translated: boolean
    translatedText: string | null
    text_for_sentiment: string
}

export interface AnalysisResponse {
    source: string
    count: number
    posts: Post[]
    translations: TranslationData[]
    sentiment: SentimentResult[]
}

// UI & Component Types
export interface PlanFeature {
    text: string
    included: boolean
}

export interface Plan {
    name: string
    price: string
    period: string
    description: string
    badge?: string
    highlighted?: boolean
    features: PlanFeature[]
    cta: string
    ctaVariant: 'outline' | 'primary' | 'gradient'
}

export interface PaymentModalProps {
    planName: string
    price: string
    onClose: () => void
    onSuccess: () => void
}

export interface StripeCheckoutFormProps {
    price: string
    onSuccess: () => void
    setIsProcessing: (val: boolean) => void
    isProcessing: boolean
}

// Chat Types
export interface Message {
    role: 'user' | 'assistant'
    content: string
}

// Form Types
export interface FormErrors {
    firstName?: string
    lastName?: string
    email?: string
    password?: string
    confirmPassword?: string
}
