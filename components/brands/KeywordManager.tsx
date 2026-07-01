'use client'

import { useState, useEffect } from 'react'
import { Keyword, KeywordCategory } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Loader2 } from 'lucide-react'

const CATEGORY_COLORS: Record<KeywordCategory, string> = {
  awareness: 'bg-blue-900 text-blue-300',
  comparison: 'bg-purple-900 text-purple-300',
  purchase: 'bg-green-900 text-green-300',
  general: 'bg-zinc-700 text-zinc-300',
}

interface Props {
  brandId: string
}

export function KeywordManager({ brandId }: Props) {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [newCategory, setNewCategory] = useState<KeywordCategory>('general')
  const [adding, setAdding] = useState(false)

  async function fetchKeywords() {
    const res = await fetch(`/api/keywords?brandId=${brandId}`)
    const data = await res.json()
    setKeywords(data.keywords ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchKeywords() }, [brandId])

  async function addKeyword(e: React.FormEvent) {
    e.preventDefault()
    if (!newText.trim()) return
    setAdding(true)
    await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, text: newText.trim(), category: newCategory }),
    })
    setNewText('')
    await fetchKeywords()
    setAdding(false)
  }

  async function deleteKeyword(id: string) {
    await fetch(`/api/keywords/${id}`, { method: 'DELETE' })
    setKeywords(prev => prev.filter(k => k.id !== id))
  }

  async function toggleKeyword(kw: Keyword) {
    await fetch(`/api/keywords/${kw.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !kw.is_active }),
    })
    setKeywords(prev => prev.map(k => k.id === kw.id ? { ...k, is_active: !k.is_active } : k))
  }

  return (
    <div>
      <h3 className="font-semibold text-zinc-200 mb-3">Keywords</h3>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {keywords.length === 0 && (
            <p className="text-zinc-500 text-sm">No keywords yet. Add one below.</p>
          )}
          {keywords.map(kw => (
            <div key={kw.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg px-3 py-2">
              <button
                onClick={() => toggleKeyword(kw)}
                className={cn(
                  'w-4 h-4 rounded border-2 shrink-0 transition-colors',
                  kw.is_active ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600'
                )}
              />
              <span className={cn('text-sm flex-1', !kw.is_active && 'line-through text-zinc-500')}>
                {kw.text}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', CATEGORY_COLORS[kw.category])}>
                {kw.category}
              </span>
              <button
                onClick={() => deleteKeyword(kw.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addKeyword} className="flex gap-2">
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Add a keyword…"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={newCategory}
          onChange={e => setNewCategory(e.target.value as KeywordCategory)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="general">General</option>
          <option value="awareness">Awareness</option>
          <option value="comparison">Comparison</option>
          <option value="purchase">Purchase</option>
        </select>
        <button
          type="submit"
          disabled={adding || !newText.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </form>
    </div>
  )
}
