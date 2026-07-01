import Link from 'next/link'
import { PLANS } from '@/lib/stripe/plans'
import { Check, Zap, BarChart3, Bell } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-indigo-400" />
          <span className="font-bold text-lg">GEO Tracker</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-zinc-400 hover:text-zinc-50 text-sm transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-8">
          <Zap className="h-3.5 w-3.5" />
          Track ChatGPT · Perplexity · Gemini
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
          Does AI recommend<br />your brand?
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
          GEO Tracker monitors your brand visibility across every major AI assistant.
          Get a unified Visibility Score, trend charts, competitor comparisons, and email alerts.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/signup" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors">
            Start for Free
          </Link>
          <Link href="/dashboard" className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 px-8 py-3 rounded-lg font-semibold text-lg transition-colors">
            View Demo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need to win in the AI era</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Zap className="h-6 w-6 text-indigo-400" />,
              title: 'Track 3 LLMs at once',
              desc: 'Query ChatGPT, Perplexity, and Gemini simultaneously for every keyword. See exactly where you appear and where you don\'t.',
            },
            {
              icon: <BarChart3 className="h-6 w-6 text-green-400" />,
              title: 'Unified Visibility Score',
              desc: 'A single 0–100 score aggregated across all LLMs and keywords. Track trends over time and benchmark against competitors.',
            },
            {
              icon: <Bell className="h-6 w-6 text-orange-400" />,
              title: 'Instant Email Alerts',
              desc: 'Get notified the moment your score drops or your brand stops being mentioned. Never miss a visibility change.',
            },
          ].map((f, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Simple, transparent pricing</h2>
        <p className="text-zinc-400 text-center mb-12">Start free. Upgrade when you need more.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {Object.values(PLANS).map((plan) => (
            <div key={plan.id} className={`rounded-xl border p-6 flex flex-col ${plan.id === 'pro' ? 'border-indigo-500 bg-indigo-950/30' : 'border-zinc-800 bg-zinc-900'}`}>
              {plan.id === 'pro' && (
                <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">Most Popular</div>
              )}
              <div className="mb-4">
                <div className="text-xl font-bold">{plan.name}</div>
                <div className="mt-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  {plan.price > 0 && <span className="text-zinc-400 text-sm">/mo</span>}
                </div>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${plan.id === 'pro' ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'border border-zinc-700 hover:border-zinc-500 text-zinc-300'}`}
              >
                {plan.price === 0 ? 'Get Started Free' : `Start ${plan.name}`}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 text-center text-zinc-500 text-sm">
        <p>© 2026 GEO Tracker. Built to help brands win in the AI era.</p>
      </footer>
    </div>
  )
}
