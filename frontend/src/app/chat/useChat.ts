import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { Message } from '../../types'

export const useChat = () => {
    const { token, isAuthenticated } = useAuthStore()
    const authLoading = false
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const sendMessage = async () => {
        if (!input.trim() || loading) return

        const userMessage: Message = { role: 'user', content: input.trim() }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
            const res = await fetch(`${apiUrl}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            })

            if (!res.ok) {
                throw new Error('Failed to get response')
            }

            const data = await res.json()
            const assistantMessage: Message = {
                role: 'assistant',
                content: data.response,
            }
            setMessages(prev => [...prev, assistantMessage])
        } catch (err) {
            console.error('Chat error:', err)
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.',
                },
            ])
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return {
        isAuthenticated, authLoading,
        messages, input, setInput,
        loading, messagesEndRef,
        sendMessage, handleKeyPress
    }
}
