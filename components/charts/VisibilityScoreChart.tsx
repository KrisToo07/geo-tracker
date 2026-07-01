'use client'

import { Scan } from '@/types'
import { format } from 'date-fns'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts'

interface Props {
  scans: Scan[]
}

export function VisibilityScoreChart({ scans }: Props) {
  const data = [...scans]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(s => ({
      date: format(new Date(s.created_at), 'MMM d'),
      Overall: s.visibility_score ? Math.round(s.visibility_score) : null,
      ChatGPT: s.openai_score ? Math.round(s.openai_score) : null,
      Perplexity: s.perplexity_score ? Math.round(s.perplexity_score) : null,
      Gemini: s.gemini_score ? Math.round(s.gemini_score) : null,
    }))

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
        No scan data yet. Run your first scan to see trends.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 12 }} />
        <Tooltip
          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
          labelStyle={{ color: '#e4e4e7' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="Overall" stroke="#6366f1" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="ChatGPT" stroke="#22c55e" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="Perplexity" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="Gemini" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  )
}
