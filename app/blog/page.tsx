import Link from 'next/link'
import { Zap, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { ALL_ARTICLES } from '@/lib/blog/posts'

export const metadata: Metadata = {
  title: 'GEO Tracker Blog — AI Brand Visibility & Generative Engine Optimization',
  description:
    'Guides on getting your brand recommended by ChatGPT, Perplexity, and Gemini — what GEO is, how to rank in AI answers, and how to measure it.',
  alternates: { canonical: '/blog' },
}

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <header className="border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-indigo-400" />
            <span className="font-bold">GEO Tracker</span>
          </Link>
          <Link href="/signup" className="text-sm bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-medium">
            Free scan
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-4xl font-bold text-white mb-2">The GEO Tracker Blog</h1>
        <p className="text-lg text-zinc-400 mb-10">
          How to get your brand recommended by ChatGPT, Perplexity, and Gemini — and how to measure it.
        </p>

        <div className="space-y-4">
          {ALL_ARTICLES.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-6 transition-colors group"
            >
              <h2 className="text-xl font-bold text-white group-hover:text-indigo-300 flex items-center gap-2">
                {a.title}
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h2>
              <p className="text-zinc-400 mt-2 text-sm leading-relaxed">{a.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
