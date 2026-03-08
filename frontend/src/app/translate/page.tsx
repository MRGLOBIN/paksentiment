'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import styles from './page.module.scss'
import { useAuthStore } from '../../store/useAuthStore'

const LANGUAGES = [
    { code: 'spanish', native: 'Español', english: 'Spanish' },
    { code: 'french', native: 'Français', english: 'French' },
    { code: 'german', native: 'Deutsch', english: 'German' },
    { code: 'mandarin', native: '中文', english: 'Mandarin' },
    { code: 'arabic', native: 'العربية', english: 'Arabic' },
    { code: 'hindi', native: 'हिन्दी', english: 'Hindi' },
    { code: 'roman_urdu', native: 'Roman Urdu', english: 'Roman Urdu' },
    { code: 'auto', native: 'Auto', english: 'Auto Detect' },
]

export default function TranslatePage() {
    const { token, isAuthenticated } = useAuthStore()
    const authLoading = false // Zustand is sync
    const [sourceText, setSourceText] = useState('')
    const [translatedText, setTranslatedText] = useState('')
    const [sourceLanguage, setSourceLanguage] = useState('auto')
    const [loading, setLoading] = useState(false)

    const handleTranslate = async () => {
        if (!sourceText.trim() || loading) return

        setLoading(true)
        setTranslatedText('')

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
            const res = await fetch(`${apiUrl}/ai/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    text: sourceText.trim(),
                    sourceLanguage: sourceLanguage !== 'auto' ? sourceLanguage : undefined,
                }),
            })

            if (!res.ok) {
                throw new Error('Translation failed')
            }

            const data = await res.json()
            setTranslatedText(data.translation)
        } catch (err) {
            console.error('Translation error:', err)
            setTranslatedText('Sorry, translation failed. Please try again.')
        } finally {
            setLoading(false)
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
                        <p>You need to be logged in to use the translation feature.</p>
                        <br />
                        <Link href="/login">Go to Login</Link>
                    </div>
                ) : (
                    <>
                        <div className={styles.header}>
                            <h1>🌐 Global Language Translator</h1>
                            <p>Translate Spanish, French, Mandarin, Arabic, Hindi & more to English</p>
                        </div>

                        <div className={styles.translatorCard}>
                            <div className={styles.columns}>
                                <div className={styles.column}>
                                    <div className={styles.columnHeader}>
                                        <h3>Source Text</h3>
                                        <select
                                            value={sourceLanguage}
                                            onChange={e => setSourceLanguage(e.target.value)}
                                        >
                                            {LANGUAGES.map(lang => (
                                                <option key={lang.code} value={lang.code}>
                                                    {lang.native} ({lang.english})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <textarea
                                        className={styles.textArea}
                                        placeholder="Enter text in Spanish, French, Mandarin, Arabic, Hindi, or German..."
                                        value={sourceText}
                                        onChange={e => setSourceText(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                <div className={styles.arrow}>→</div>

                                <div className={styles.column}>
                                    <div className={styles.columnHeader}>
                                        <h3>English Translation</h3>
                                    </div>
                                    <textarea
                                        className={styles.textArea}
                                        placeholder="Translation will appear here..."
                                        value={translatedText}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <button
                                className={styles.translateBtn}
                                onClick={handleTranslate}
                                disabled={loading || !sourceText.trim()}
                            >
                                {loading ? 'Translating...' : 'Translate to English'}
                            </button>
                        </div>

                        <div className={styles.supportedLangs}>
                            {LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                                <div key={lang.code} className={styles.langTag}>
                                    <span className={styles.native}>{lang.native}</span>
                                    <span className={styles.english}>{lang.english}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>

            <Footer />
        </div >
    )
}
