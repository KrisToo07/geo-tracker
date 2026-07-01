'use client'

import { useState } from 'react'
import { ScanResult } from '@/types'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  results: ScanResult[]
}

const SENTIMENT_COLORS = {
  positive: 'bg-green-900 text-green-300',
  neutral: 'bg-zinc-700 text-zinc-300',
  negative: 'bg-red-900 text-red-300',
}

const LLM_LABELS: Record<string, string> = {
  openai: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
}

export function MentionTable({ results }: Props) {
  const [filter, setFilter] = useState<'all' | 'openai' | 'perplexity' | 'gemini'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortDesc, setSortDesc] = useState(true)

  const filtered = results
    .filter(r => filter === 'all' || r.llm_provider === filter)
    .sort((a, b) => sortDesc ? b.score - a.score : a.score - b.score)

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(['all', 'openai', 'perplexity', 'gemini'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === f ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-50'
            )}
          >
            {f === 'all' ? 'All LLMs' : LLM_LABELS[f]}
          </button>
        ))}
        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="ml-auto flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-50"
        >
          Score {sortDesc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Keyword</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">LLM</th>
              <th className="text-center px-4 py-3 text-zinc-400 font-medium">Mentioned</th>
              <th className="text-center px-4 py-3 text-zinc-400 font-medium">Position</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Sentiment</th>
              <th className="text-center px-4 py-3 text-zinc-400 font-medium">Score</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Excerpt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-zinc-500">No results</td>
              </tr>
            )}
            {filtered.map(r => (
              <>
                <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3 text-zinc-200 max-w-[180px] truncate">
                    {r.keyword?.text ?? r.keyword_id}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                      {LLM_LABELS[r.llm_provider] ?? r.llm_provider}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.mentioned ? (
                      <span className="text-green-400 font-bold">✓</span>
                    ) : (
                      <span className="text-red-400">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-400">
                    {r.position ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', SENTIMENT_COLORS[r.sentiment])}>
                      {r.sentiment}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      'font-bold',
                      r.score >= 70 ? 'text-green-400' : r.score >= 40 ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {Math.round(r.score)}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {r.excerpt ? (
                      <button
                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 text-left truncate w-full"
                      >
                        {r.excerpt.slice(0, 60)}…
                      </button>
                    ) : (
                      <span className="text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
                {expandedId === r.id && r.excerpt && (
                  <tr key={`${r.id}-expanded`} className="bg-zinc-900/30">
                    <td colSpan={7} className="px-4 py-3 text-xs text-zinc-300 italic border-b border-zinc-800/50">
                      "{r.excerpt}"
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
