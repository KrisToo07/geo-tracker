'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Globe, BarChart3, Zap, Download, ArrowLeft, Loader2 } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { VisibilityScoreChart } from '@/components/charts/VisibilityScoreChart'
import { MentionTable } from '@/components/scans/MentionTable'
import { KeywordManager } from '@/components/brands/KeywordManager'
import { ScanButton } from '@/components/scans/ScanButton'
import { cn } from '@/lib/utils'
import type { Brand, Scan, ScanResult } from '@/types'

type BrandDetail = Brand & {
  scans: (Scan & { results?: ScanResult[] })[]
}

function scoreColor(score: number | null | undefined) {
  if (score == null) return 'text-zinc-400'
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400',
    running: 'bg-amber-500/20 text-amber-400',
    failed: 'bg-red-500/20 text-red-400',
    pending: 'bg-zinc-700 text-zinc-400',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', map[status] ?? 'bg-zinc-700 text-zinc-400')}>
      {status}
    </span>
  )
}

function formatDuration(scan: Scan) {
  if (!scan.started_at || !scan.completed_at) return '—'
  const ms = new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime()
  return `${Math.round(ms / 1000)}s`
}

export default function BrandDetailPage() {
  const { brandId } = useParams<{ brandId: string }>()
  const router = useRouter()
  const [brand, setBrand] = useState<BrandDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const fetchBrand = useCallback(async () => {
    try {
      const res = await fetch(`/api/brands/${brandId}`)
      if (res.status === 404) { setNotFound(true); return }
      if (!res.ok) throw new Error('Failed to fetch brand')
      const data = await res.json()
      setBrand(data.brand)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => { fetchBrand() }, [fetchBrand])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  if (notFound || !brand) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-xl font-semibold">Brand not found</p>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300">
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
      </div>
    )
  }

  const latestScan = brand.scans?.[0] ?? null
  const latestResults: ScanResult[] = latestScan?.results ?? []
  const recentScans = brand.scans?.slice(0, 10) ?? []

  const llmCards = [
    { label: 'ChatGPT', score: latestScan?.openai_score, accent: 'border-indigo-500/40 bg-indigo-500/10', icon: <Zap className="h-4 w-4 text-indigo-400" /> },
    { label: 'Perplexity', score: latestScan?.perplexity_score, accent: 'border-amber-500/40 bg-amber-500/10', icon: <BarChart3 className="h-4 w-4 text-amber-400" /> },
    { label: 'Gemini', score: latestScan?.gemini_score, accent: 'border-blue-500/40 bg-blue-500/10', icon: <Globe className="h-4 w-4 text-blue-400" /> },
  ]

  return (
    <div>
      <Topbar title={brand.name} />
      <div className="mx-auto max-w-6xl space-y-6 p-6">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> All brands
        </button>

        {/* Hero */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">{brand.name}</h1>
              {brand.domain && (
                <p className="flex items-center gap-1.5 text-sm text-zinc-400">
                  <Globe className="h-3.5 w-3.5" />{brand.domain}
                </p>
              )}
              {brand.description && <p className="max-w-xl text-sm text-zinc-400">{brand.description}</p>}
            </div>
            <div className="flex flex-col items-center rounded-xl border border-zinc-700 bg-zinc-800 px-8 py-4">
              <span className={cn('text-5xl font-extrabold tabular-nums', scoreColor(latestScan?.visibility_score))}>
                {latestScan?.visibility_score != null ? Math.round(latestScan.visibility_score) : '—'}
              </span>
              <span className="mt-1 text-xs font-medium uppercase tracking-widest text-zinc-500">Visibility Score</span>
            </div>
          </div>

          {/* LLM cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {llmCards.map(({ label, score, accent, icon }) => (
              <div key={label} className={cn('flex items-center justify-between rounded-xl border p-4', accent)}>
                <div className="flex items-center gap-2">{icon}<span className="text-sm font-medium text-zinc-200">{label}</span></div>
                <span className={cn('text-2xl font-bold tabular-nums', scoreColor(score))}>
                  {score != null ? Math.round(score) : '—'}<span className="text-sm font-normal text-zinc-500">/100</span>
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ScanButton brandId={brandId} onComplete={fetchBrand} />
            <a
              href={`/api/export/mentions?brandId=${brandId}`}
              download
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
            >
              <Download className="h-4 w-4" /> Export CSV
            </a>
          </div>
        </section>

        {/* Chart */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <BarChart3 className="h-5 w-5 text-indigo-400" /> Visibility Over Time
          </h2>
          <VisibilityScoreChart scans={brand.scans ?? []} />
        </section>

        {/* Mention table */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Latest Mentions</h2>
          <MentionTable results={latestResults} />
        </section>

        {/* Keywords */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <KeywordManager brandId={brandId} />
        </section>

        {/* Scan history */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Scan History</h2>
          {recentScans.length === 0 ? (
            <p className="text-sm text-zinc-500">No scans yet. Run your first scan above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    <th className="pb-3 pr-6">Date</th>
                    <th className="pb-3 pr-6">Status</th>
                    <th className="pb-3 pr-6">Score</th>
                    <th className="pb-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {recentScans.map(scan => (
                    <tr key={scan.id} className="hover:bg-zinc-800/50">
                      <td className="py-3 pr-6 text-zinc-300">{new Date(scan.created_at).toLocaleString()}</td>
                      <td className="py-3 pr-6">{statusBadge(scan.status)}</td>
                      <td className={cn('py-3 pr-6 font-semibold tabular-nums', scoreColor(scan.visibility_score))}>
                        {scan.visibility_score != null ? Math.round(scan.visibility_score) : '—'}
                      </td>
                      <td className="py-3 text-zinc-400">{formatDuration(scan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
