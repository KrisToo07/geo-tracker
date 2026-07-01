import Link from 'next/link'
import { Zap } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Check if ChatGPT, Perplexity & Gemini Recommend Your Brand',
  description:
    'Buyers now ask AI for recommendations instead of Googling. Here is how to check whether ChatGPT, Perplexity, and Gemini mention your brand — and how to track and improve it.',
  openGraph: {
    title: 'How to Check if AI Recommends Your Brand',
    description:
      'A step-by-step guide to measuring your brand visibility across ChatGPT, Perplexity, and Gemini.',
    type: 'article',
  },
  alternates: { canonical: '/blog/how-to-check-if-ai-recommends-your-brand' },
}

export default function Article() {
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
        <p className="text-indigo-400 text-sm font-medium mb-3">GENERATIVE ENGINE OPTIMIZATION</p>
        <h1 className="text-4xl font-bold text-white leading-tight mb-6">
          How to check if ChatGPT, Perplexity &amp; Gemini recommend your brand
        </h1>
        <p className="text-lg text-zinc-400 mb-10">
          Your customers have quietly changed how they find products. Instead of Googling
          &ldquo;best CRM&rdquo; and comparing ten blue links, they ask ChatGPT and take the answer
          it gives. If your brand isn&rsquo;t in that answer, you don&rsquo;t exist for that buyer —
          and you have no idea it&rsquo;s happening. Here&rsquo;s how to find out.
        </p>

        <div className="space-y-6 text-zinc-300 leading-relaxed">
          <h2 className="text-2xl font-bold text-white pt-4">Why this matters now</h2>
          <p>
            AI assistants have become recommendation engines. When someone asks &ldquo;what&rsquo;s
            the best tool for X?&rdquo;, ChatGPT, Perplexity, and Gemini return a short list of
            named brands — not a page of links. Being on that list is the new page-one ranking.
            Being off it is invisibility. This is called <strong>GEO</strong> (Generative Engine
            Optimization), and it&rsquo;s where SEO was in 2004: mostly unmeasured.
          </p>

          <h2 className="text-2xl font-bold text-white pt-4">The manual way (do this in 10 minutes)</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>List the 5–10 questions a buyer would ask to find a product like yours (&ldquo;best
              [category] for [use case]&rdquo;, &ldquo;[competitor] alternatives&rdquo;).</li>
            <li>Ask each one in ChatGPT, Perplexity, and Gemini — separately.</li>
            <li>For each answer, note: are you mentioned? Where in the list? Which competitors
              appear? What&rsquo;s the tone?</li>
            <li>Repeat a few days later — answers change, so one snapshot lies.</li>
          </ol>
          <p>
            You&rsquo;ll usually find something uncomfortable: you&rsquo;re named by one engine and
            missing from the other two, or a smaller competitor gets recommended and you don&rsquo;t.
          </p>

          <h2 className="text-2xl font-bold text-white pt-4">Why the manual way breaks down</h2>
          <p>
            It&rsquo;s slow, it&rsquo;s not repeatable, and the answers drift daily — so you can&rsquo;t
            tell whether a change you made helped. To actually manage AI visibility you need to run
            the same prompts on a schedule and track a score over time. That&rsquo;s exactly what we
            built GEO Tracker to do.
          </p>

          <h2 className="text-2xl font-bold text-white pt-4">How to improve your AI visibility</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Be the source.</strong> AI models cite content that clearly, factually
              answers the question. Publish direct, well-structured answers to your category&rsquo;s
              real questions.</li>
            <li><strong>Get mentioned where models read.</strong> Comparison articles, Reddit,
              roundups, and reputable directories feed the models&rsquo; recommendations.</li>
            <li><strong>Use consistent, unambiguous naming</strong> so the model can attribute
              mentions to you.</li>
            <li><strong>Track it.</strong> You can&rsquo;t improve what you don&rsquo;t measure —
              watch your Visibility Score move as you make changes.</li>
          </ul>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 my-10">
            <h3 className="text-xl font-bold text-white mb-2">See your score in 2 minutes</h3>
            <p className="text-zinc-400 mb-4">
              GEO Tracker runs your prompts across ChatGPT, Perplexity, and Gemini, shows exactly
              where you&rsquo;re mentioned (and where a competitor is instead), and tracks it over
              time. Free scan, no card.
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
