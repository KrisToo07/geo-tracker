'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Users, Plus, Trash2, Globe, Loader2 } from 'lucide-react'

interface Brand {
  id: string
  name: string
}

interface Competitor {
  id: string
  name: string
  website?: string | null
  brand_id: string
}

export default function CompetitorsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newWebsite, setNewWebsite] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadBrands() {
      const res = await fetch('/api/brands')
      const data = await res.json()
      const list: Brand[] = data.brands ?? []
      setBrands(list)
      if (list.length > 0) setSelectedBrand(list[0].id)
    }
    loadBrands()
  }, [])

  const fetchCompetitors = useCallback(async () => {
    if (!selectedBrand) return
    setLoading(true)
    const res = await fetch(`/api/competitors?brandId=${selectedBrand}`)
    const data = await res.json()
    setCompetitors(data.competitors ?? [])
    setLoading(false)
  }, [selectedBrand])

  useEffect(() => { fetchCompetitors() }, [fetchCompetitors])

  async function addCompetitor(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !selectedBrand) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: selectedBrand,
          name: newName.trim(),
          website: newWebsite.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add competitor')
      setNewName('')
      setNewWebsite('')
      await fetchCompetitors()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function deleteCompetitor(id: string) {
    await fetch(`/api/competitors/${id}`, { method: 'DELETE' })
    setCompetitors(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div>
      <Topbar title="Competitors" />
      <div className="p-6 max-w-4xl mx-auto">
        {/* Brand selector */}
        <div className="flex items-center gap-4 mb-6">
          <Globe className="h-5 w-5 text-zinc-400 shrink-0" />
          <select
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" /> Tracked Competitors
          </h2>
          <p className="text-sm text-zinc-400 mb-5">
            Competitors you add here will be detected in AI responses and shown in your scan results.
          </p>

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-2 mb-5">
              {competitors.length === 0 && (
                <p className="text-zinc-500 text-sm">No competitors yet. Add one below.</p>
              )}
              {competitors.map(c => (
                <div key={c.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg px-4 py-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-zinc-200">{c.name}</div>
                    {c.website && (
                      <div className="text-xs text-zinc-500 mt-0.5">{c.website}</div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteCompetitor(c.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          <form onSubmit={addCompetitor} className="flex gap-2 flex-wrap">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Competitor name…"
              className="flex-1 min-w-[160px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={newWebsite}
              onChange={e => setNewWebsite(e.target.value)}
              placeholder="Website (optional)"
              className="flex-1 min-w-[160px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
