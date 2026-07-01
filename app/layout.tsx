import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://getgeotracker.com'
const TITLE = 'GEO Tracker — AI Brand Visibility'
const DESCRIPTION = 'Track your brand visibility across ChatGPT, Perplexity, and Gemini.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: APP_URL,
    siteName: 'GEO Tracker',
    type: 'website',
    // /opengraph-image (app/opengraph-image.tsx) is auto-injected here by Next.js
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-zinc-950 text-zinc-50 antialiased`}>
        {children}
      </body>
    </html>
  )
}
