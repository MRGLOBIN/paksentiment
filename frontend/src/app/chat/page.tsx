'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import styles from './page.module.scss'
import { useAuthStore } from '../../store/useAuthStore'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export default function ChatPage() {
    const { token, isAuthenticated } = useAuthStore()
    const authLoading = false // Zustand is sync
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

    if (authLoading) {
        return (
            <div className={styles.container}>
                <Navbar />
                <main className={styles.main}>
                    <div className={styles.loading}>Loading...</div>
                </main>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <Navbar />

            <main className={styles.main}>
                {!isAuthenticated ? (
                    <div className={styles.loginPrompt}>
                        <h2>Please Log In</h2>
                        <p>You need to be logged in to use the chat feature.</p>
                        <br />
                        <Link href="/login">Go to Login</Link>
                    </div>
                ) : (
                    <>
                        <div className={styles.header}>
                            <h1>🇵🇰 Pakistani AI Assistant</h1>
                            <p>Chat in Urdu, Pashto, Punjabi, Saraiki, or English!</p>
                        </div>

                        <div className={styles.chatContainer}>
                            <div className={styles.messages}>
                                {messages.length === 0 && (
                                    <div className={`${styles.message} ${styles.assistant}`}>
                                        Assalam o Alaikum! 👋 Main aap ki kya madad kar sakta/sakti hoon?
                                        <br /><br />
                                        Feel free to chat in Urdu, Pashto, Punjabi, Saraiki, or English!
                                    </div>
                                )}
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`${styles.message} ${styles[msg.role]}`}
                                    >
                                        {msg.content}
                                    </div>
                                ))}
                                {loading && (
                                    <div className={`${styles.message} ${styles.assistant} ${styles.loading}`}>
                                        Typing...
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className={styles.inputArea}>
                                <input
                                    type="text"
                                    placeholder="Type your message... (Urdu, Pashto, Punjabi, English)"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={loading}
                                />
                                <button
                                    className={styles.sendBtn}
                                    onClick={sendMessage}
                                    disabled={loading || !input.trim()}
                                >
                                    Send
                                </button>
                            </div>
                        </div>

                        <div className={styles.languageHint}>
                            <span>اردو</span>
                            <span>پشتو</span>
                            <span>پنجابی</span>
                            <span>سرائیکی</span>
                            <span>English</span>
                        </div>
                    </>
                )}
            </main>

            <Footer />
        </div>
    )
}
