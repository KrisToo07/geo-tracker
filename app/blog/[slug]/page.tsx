import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Zap } from 'lucide-react'
import type { Metadata } from 'next'
import { POSTS, getPost } from '@/lib/blog/posts'

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: 'article' },
    alternates: { canonical: `/blog/${post.slug}` },
  }
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)
  if (!post) notFound()

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

      <article className="max-w-3xl mx-auto px-6 py-14">
        <p className="text-indigo-400 text-sm font-medium mb-3">
          <Link href="/blog" className="hover:text-indigo-300">← All articles</Link>
        </p>
        <h1 className="text-4xl font-bold text-white leading-tight mb-8">{post.title}</h1>

        <div className="space-y-6 text-zinc-300 leading-relaxed">
          {post.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-2xl font-bold text-white pt-4 mb-3">{s.heading}</h2>
              {s.body.split(/\n\n+/).map((para, j) => (
                <p key={j} className="mb-4">{para}</p>
              ))}
            </section>
          ))}

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 my-10">
            <h3 className="text-xl font-bold text-white mb-2">See where your brand stands — free</h3>
            <p className="text-zinc-400 mb-4">
              GEO Tracker runs your brand across ChatGPT, Perplexity, and Gemini and shows exactly
              where you&rsquo;re recommended, where a competitor is instead, and where you&rsquo;re
              missing. No credit card.
            </p>
            <Link href="/signup" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold">
              Run my free scan →
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}
