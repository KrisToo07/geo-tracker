'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts'

interface Props {
  openai: number
  perplexity: number
  gemini: number
}

export function LLMBreakdownBar({ openai, perplexity, gemini }: Props) {
  const data = [
    { name: 'ChatGPT', score: Math.round(openai), color: '#6366f1' },
    { name: 'Perplexity', score: Math.round(perplexity), color: '#f59e0b' },
    { name: 'Gemini', score: Math.round(gemini), color: '#3b82f6' },
  ]

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 12 }} />
        <Tooltip
          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
        />
        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
          <LabelList dataKey="score" position="top" style={{ fill: '#e4e4e7', fontSize: 12, fontWeight: 600 }} />
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
