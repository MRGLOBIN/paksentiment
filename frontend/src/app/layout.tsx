import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from './providers/ThemeProvider'

export const metadata: Metadata = {
  title: 'PakSentiment — AI-Powered Sentiment Analysis',
  description:
    "Monitor public sentiment, detect trends, and gain real-time insights across Pakistan's digital landscape using advanced AI.",
  keywords: 'sentiment analysis, Pakistan, AI, NLP, social media analytics',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
