'use client'

import Link from 'next/link'
import { Brand } from '@/types'
import { cn } from '@/lib/utils'
import { ScanButton } from '@/components/scans/ScanButton'
import { Globe, TrendingUp } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line } from 'recharts'

interface Props {
  brand: Brand
  onScanComplete?: () => void
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

export function BrandCard({ brand, onScanComplete }: Props) {
  const latestScan = brand.latest_scan
  const score = latestScan?.visibility_score ?? null

  // Mini sparkline data from latest scan LLM scores
  const sparkData = latestScan ? [
    { v: latestScan.openai_score ?? 0 },
    { v: latestScan.perplexity_score ?? 0 },
    { v: latestScan.gemini_score ?? 0 },
    { v: latestScan.visibility_score ?? 0 },
  ] : []

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-zinc-50">{brand.name}</h3>
          {brand.domain && (
            <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
              <Globe className="h-3 w-3" />
              {brand.domain}
            </div>
          )}
        </div>
        {score !== null && (
          <div className="text-right">
            <div className={cn('text-3xl font-bold', scoreColor(score))}>
              {Math.round(score)}
            </div>
            <div className="text-xs text-zinc-500">/ 100</div>
          </div>
        )}
        {score === null && (
          <div className="text-zinc-600 text-sm">No scans yet</div>
        )}
      </div>

      {/* Sparkline */}
      {sparkData.length > 0 && (
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* LLM Breakdown */}
      {latestScan && (
        <div className="flex gap-2">
          {[
            { label: 'GPT', score: latestScan.openai_score, color: 'bg-indigo-900 text-indigo-300' },
            { label: 'PPX', score: latestScan.perplexity_score, color: 'bg-amber-900 text-amber-300' },
            { label: 'GEM', score: latestScan.gemini_score, color: 'bg-blue-900 text-blue-300' },
          ].map(({ label, score: s, color }) => (
            <div key={label} className={cn('flex-1 text-center rounded-lg py-1.5 text-xs font-semibold', color)}>
              <div>{label}</div>
              <div className="text-sm font-bold">{s !== null ? Math.round(s) : '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <ScanButton brandId={brand.id} onComplete={onScanComplete} />
        <Link
          href={`/dashboard/brands/${brand.id}`}
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors flex items-center gap-1"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          View
        </Link>
      </div>
    </div>
  )
}
