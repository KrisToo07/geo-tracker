import Link from 'next/link'
import { Check, Zap, FileSearch, Map as MapIcon } from 'lucide-react'

export const metadata = {
  title: 'AI Visibility Audit — GEO Tracker',
  description:
    'A professional done-for-you audit of your brand visibility across ChatGPT, Perplexity & Gemini. 25 real buyer queries, competitor benchmark, gap analysis — delivered in 48 hours.',
}

const AUDIT_LINK = 'https://buy.stripe.com/6oU4gB64tafdgXq6ja3Je02'
const ROADMAP_LINK = 'https://buy.stripe.com/6oU14p9gFdrp6iMePG3Je03'

export default function AuditPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-indigo-400" />
          <span className="font-bold text-lg">GEO Tracker</span>
        </Link>
        <Link
          href="/signup"
          className="text-zinc-400 hover:text-zinc-50 text-sm transition-colors"
        >
          Or track it yourself — free scan
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-8">
          <FileSearch className="h-3.5 w-3.5" />
          Done-for-you · Delivered in 48 hours
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Your buyers ask AI who to choose.
          <br />
          <span className="bg-gradient-to-br from-indigo-300 to-indigo-500 bg-clip-text text-transparent">
            Find out if you&apos;re the answer.
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-4">
          We run 25 real buyer queries for your category across ChatGPT, Perplexity
          and Gemini, benchmark you against 5 competitors, and hand you a clear
          report: where you show up, where you don&apos;t, and who&apos;s taking
          your place.
        </p>
        <p className="text-sm text-zinc-500 mb-10">
          Agencies charge $2,000–$4,000 for this exact audit. We productized it.
        </p>
      </section>

      {/* Offers */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Audit */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <FileSearch className="h-5 w-5 text-indigo-400" />
              <span className="font-bold text-xl">AI Visibility Audit</span>
            </div>
            <div className="mb-6">
              <span className="text-5xl font-bold">$499</span>
              <span className="text-zinc-400 text-sm ml-2">one-time</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1 text-sm text-zinc-300">
              {[
                '25 real buyer queries in your category',
                'All 3 engines: ChatGPT, Perplexity, Gemini',
                'Benchmark vs 5 competitors of your choice',
                'Per-query mention & ranking breakdown',
                'Unified Visibility Score + gap analysis',
                'PDF report delivered within 48 hours',
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={AUDIT_LINK}
              className="text-center bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Get the Audit — $499
            </a>
          </div>

          {/* Audit + Roadmap */}
          <div className="rounded-xl border border-indigo-500 bg-indigo-950/30 p-8 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              BEST VALUE
            </div>
            <div className="flex items-center gap-2 mb-4">
              <MapIcon className="h-5 w-5 text-indigo-300" />
              <span className="font-bold text-xl">Audit + Fix Roadmap</span>
            </div>
            <div className="mb-6">
              <span className="text-5xl font-bold">$999</span>
              <span className="text-zinc-400 text-sm ml-2">one-time</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1 text-sm text-zinc-300">
              {[
                'Everything in the Audit, plus:',
                'Prioritized 90-day action plan',
                'Per-engine tactics (what moves each LLM)',
                '5 ready-to-write content briefs',
                'Schema & entity fixes for your site',
                '30-min walkthrough call included',
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={ROADMAP_LINK}
              className="text-center bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Get Audit + Roadmap — $999
            </a>
          </div>
        </div>

        {/* Retainer */}
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-8 md:flex items-center justify-between gap-8">
          <div>
            <div className="font-bold text-xl mb-2">GEO Growth Retainer</div>
            <p className="text-sm text-zinc-400 max-w-xl">
              Done-for-you, every month: audit refresh, content briefs, schema &
              entity fixes, competitor watch, and a monthly strategy call.
              For brands serious about owning the AI answer. Cancel anytime.
            </p>
          </div>
          <div className="text-center mt-6 md:mt-0 shrink-0">
            <div className="mb-3">
              <span className="text-4xl font-bold">$1,999</span>
              <span className="text-zinc-400 text-sm">/mo</span>
            </div>
            <a
              href="https://buy.stripe.com/4gM5kFboN5YXdLefTK3Je04"
              className="inline-block bg-zinc-100 hover:bg-white text-zinc-900 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Start the Retainer
            </a>
          </div>
        </div>

        <p className="text-center text-zinc-500 text-sm mt-8">
          After checkout, reply to your receipt with your brand, website and top 5
          competitors. Audit lands in 48h — or your money back.
        </p>

        {/* Agency Kit */}
        <div className="mt-12 rounded-xl border border-amber-700/50 bg-amber-950/20 p-8 md:flex items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-950 border border-amber-800 rounded-full px-3 py-1 text-xs text-amber-300 mb-3">
              FOR AGENCIES
            </div>
            <div className="font-bold text-xl mb-2">
              Run these audits yourself — under your own brand
            </div>
            <p className="text-sm text-zinc-400 max-w-xl">
              The GEO Agency Kit is our audit engine, white-labeled: your name,
              your colors, your footer on every report. Sell audits at
              $500–$1,500 each to unlimited clients. Includes the pricing guide
              and outreach templates we use ourselves.
            </p>
          </div>
          <div className="text-center mt-6 md:mt-0 shrink-0">
            <div className="mb-3">
              <span className="text-4xl font-bold">$299</span>
              <span className="text-zinc-400 text-sm ml-2">one-time</span>
            </div>
            <a
              href="https://khangtnb.gumroad.com/l/geokit"
              className="inline-block bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Get the Agency Kit
            </a>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-zinc-400">
            Want continuous tracking instead?{' '}
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 underline">
              GEO Tracker plans start free →
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8 text-center text-zinc-500 text-sm">
        <p>© 2026 GEO Tracker. Built to help brands win in the AI era.</p>
      </footer>
    </div>
  )
}
