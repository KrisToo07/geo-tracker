'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Globe, Zap, ArrowRight, ArrowLeft } from 'lucide-react'

interface Props {
  onComplete?: (brandId: string) => void
}

type Step = 'brand' | 'keywords' | 'done'

export function BrandWizard({ onComplete }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('brand')
  const [brandId, setBrandId] = useState<string | null>(null)

  // Brand step state
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [description, setDescription] = useState('')
  const [creatingBrand, setCreatingBrand] = useState(false)
  const [brandError, setBrandError] = useState<string | null>(null)

  // Keywords step state
  const [keywords, setKeywords] = useState<string[]>([''])
  const [addingKeywords, setAddingKeywords] = useState(false)

  async function handleCreateBrand(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreatingBrand(true)
    setBrandError(null)
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          website: domain.trim() || null,
          description: description.trim() || null,
          scan_frequency: 'daily',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create brand')
      setBrandId(data.brand.id)
      setStep('keywords')
    } catch (err: any) {
      setBrandError(err.message)
    } finally {
      setCreatingBrand(false)
    }
  }

  async function handleAddKeywords(e: React.FormEvent) {
    e.preventDefault()
    if (!brandId) return
    setAddingKeywords(true)
    const validKeywords = keywords.filter(k => k.trim().length > 0)
    await Promise.all(
      validKeywords.map(text =>
        fetch('/api/keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandId, text: text.trim(), category: 'general' }),
        })
      )
    )
    setAddingKeywords(false)
    setStep('done')
    if (onComplete && brandId) onComplete(brandId)
    else if (brandId) router.push(`/dashboard/brands/${brandId}`)
  }

  function updateKeyword(index: number, value: string) {
    setKeywords(prev => {
      const next = [...prev]
      next[index] = value
      // Auto-add new empty slot when last field is filled
      if (index === next.length - 1 && value.trim().length > 0) {
        next.push('')
      }
      return next
    })
  }

  if (step === 'brand') {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Globe className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Add Your Brand</h2>
            <p className="text-sm text-zinc-400">Step 1 of 2</p>
          </div>
        </div>

        {brandError && (
          <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
            {brandError}
          </div>
        )}

        <form onSubmit={handleCreateBrand} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Brand Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. Acme Corp"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Website</label>
            <input
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="acmecorp.com"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="What does your brand do?"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={creatingBrand || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            {creatingBrand ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Continue
          </button>
        </form>
      </div>
    )
  }

  if (step === 'keywords') {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Zap className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Add Keywords</h2>
            <p className="text-sm text-zinc-400">Step 2 of 2 — What should AI mention you for?</p>
          </div>
        </div>

        <form onSubmit={handleAddKeywords} className="space-y-3">
          {keywords.map((kw, i) => (
            <input
              key={i}
              type="text"
              value={kw}
              onChange={e => updateKeyword(i, e.target.value)}
              placeholder={`Keyword ${i + 1} — e.g. "best CRM for startups"`}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ))}
          <p className="text-xs text-zinc-500">Type in a field to add more keywords automatically.</p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('brand')}
              className="flex items-center gap-2 border border-zinc-700 text-zinc-400 hover:text-zinc-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="submit"
              disabled={addingKeywords}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              {addingKeywords ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {keywords.filter(k => k.trim()).length > 0 ? 'Save & Go to Dashboard' : 'Skip & Go to Dashboard'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return null
}
