import { useState } from 'react'
import { AnalysisResponse } from '../../types'

export const useAnalysisInput = () => {
    const [inputText, setInputText] = useState('')
    const [subreddit, setSubreddit] = useState('technology')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [results, setResults] = useState<AnalysisResponse | null>(null)
    const [useCustomSentiments, setUseCustomSentiments] = useState(false)
    const [customSentiments, setCustomSentiments] = useState(
        'positive, neutral, negative'
    )

    const handleAnalysis = async () => {
        if (!inputText.trim()) return

        setIsLoading(true)
        setError('')
        setResults(null)

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
            const params = new URLSearchParams({
                subreddit: subreddit,
                query: inputText,
                limit: '10',
            })

            if (useCustomSentiments && customSentiments.trim()) {
                params.append('sentiments', customSentiments)
            }

            const response = await fetch(
                `${apiUrl}/raw-data/reddit/sentiment?${params}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`)
            }

            const data: AnalysisResponse = await response.json()
            setResults(data)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to fetch analysis results'
            )
            console.error('Analysis error:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleAnalysis()
        }
    }

    return {
        inputText, setInputText,
        subreddit, setSubreddit,
        isLoading, error, results,
        useCustomSentiments, setUseCustomSentiments,
        customSentiments, setCustomSentiments,
        handleAnalysis, handleKeyPress
    }
}
