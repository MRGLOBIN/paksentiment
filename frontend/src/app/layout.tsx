import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from './providers/ThemeProvider'

export const metadata: Metadata = {
  title: 'DataInsight - Advanced Sentiment Analytics & Search',
  description:
    "Monitor public sentiment, detect trends, and gain real-time insights across the global digital landscape using advanced AI.",
  keywords: 'sentiment analysis, data analytics, AI, NLP, social media analytics',
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
