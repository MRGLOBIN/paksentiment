'use client'

import Link from 'next/link'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import styles from './page.module.scss'
import { useChat } from './useChat'

export default function ChatPage() {
    const {
        isAuthenticated, authLoading,
        messages, input, setInput,
        loading, messagesEndRef,
        sendMessage, handleKeyPress
    } = useChat()

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
                            <h1>🌐 Global AI Assistant</h1>
                            <p>Chat in Spanish, French, Mandarin, Arabic, or English!</p>
                        </div>

                        <div className={styles.chatContainer}>
                            <div className={styles.messages}>
                                {messages.length === 0 && (
                                    <div className={`${styles.message} ${styles.assistant}`}>
                                        Hello! 👋 How can I help you today?
                                        <br /><br />
                                        Feel free to chat in Spanish, French, Mandarin, Arabic, or English!
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
                                    placeholder="Type your message... (English, Spanish, French, etc.)"
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
                            <span>Español</span>
                            <span>Français</span>
                            <span>中文</span>
                            <span>العربية</span>
                            <span>English</span>
                        </div>
                    </>
                )}
            </main>

            <Footer />
        </div>
    )
}
