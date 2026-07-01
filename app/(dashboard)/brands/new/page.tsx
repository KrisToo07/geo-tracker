'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { ArrowLeft, Loader2, Globe, Zap } from 'lucide-react'
import Link from 'next/link'

export default function NewBrandPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [description, setDescription] = useState('')
  const [scanFrequency, setScanFrequency] = useState<'manual' | 'daily' | 'weekly'>('daily')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          website: domain.trim() || null,
          description: description.trim() || null,
          scan_frequency: scanFrequency,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create brand')
      router.push(`/dashboard/brands/${data.brand.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div>
      <Topbar title="Add Brand" />
      <div className="p-6 max-w-2xl mx-auto">
        <Link
          href="/dashboard/brands"
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Brands
        </Link>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Globe className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Add a New Brand</h1>
              <p className="text-sm text-zinc-400">Start tracking your brand across ChatGPT, Perplexity, and Gemini.</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Brand Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. Acme Corp"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-zinc-500 mt-1">This is what we'll search for in AI responses.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Website / Domain
              </label>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="e.g. acmecorp.com"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief description of what your brand does…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Scan Frequency
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['manual', 'daily', 'weekly'] as const).map(freq => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setScanFrequency(freq)}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-colors capitalize ${
                      scanFrequency === freq
                        ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {scanFrequency === 'manual' && 'You trigger scans manually.'}
                {scanFrequency === 'daily' && 'Auto-scanned every day at 6am UTC. Requires Pro or Agency plan.'}
                {scanFrequency === 'weekly' && 'Auto-scanned every week. Requires Pro or Agency plan.'}
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                ) : (
                  <><Zap className="h-4 w-4" /> Create Brand</>
                )}
              </button>
              <Link
                href="/dashboard/brands"
                className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
