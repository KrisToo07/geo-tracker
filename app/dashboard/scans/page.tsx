'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import { ScanLine, Loader2, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Brand {
  id: string
  name: string
}

interface Scan {
  id: string
  status: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  brand_id: string
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

function duration(scan: Scan) {
  if (!scan.started_at || !scan.completed_at) return '—'
  const ms = new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime()
  return `${Math.round(ms / 1000)}s`
}

export default function ScansPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    async function loadBrands() {
      const res = await fetch('/api/brands')
      const data = await res.json()
      const list: Brand[] = data.brands ?? []
      setBrands(list)
      const preselect = searchParams.get('brandId')
      if (preselect) setSelectedBrand(preselect)
      else if (list.length > 0) setSelectedBrand(list[0].id)
    }
    loadBrands()
  }, [])

  const fetchScans = useCallback(async () => {
    if (!selectedBrand) return
    setLoading(true)
    const res = await fetch(`/api/scans?brandId=${selectedBrand}&page=${page}&pageSize=20`)
    const data = await res.json()
    setScans(data.scans ?? [])
    setTotalPages(data.pagination?.totalPages ?? 1)
    setLoading(false)
  }, [selectedBrand, page])

  useEffect(() => { fetchScans() }, [fetchScans])

  const brandName = brands.find(b => b.id === selectedBrand)?.name ?? ''

  return (
    <div>
      <Topbar title="Scan History" />
      <div className="p-6 max-w-5xl mx-auto">
        {/* Brand selector */}
        <div className="flex items-center gap-4 mb-6">
          <Globe className="h-5 w-5 text-zinc-400 shrink-0" />
          <select
            value={selectedBrand}
            onChange={e => { setSelectedBrand(e.target.value); setPage(1) }}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {brandName && (
            <Link
              href={`/dashboard/brands/${selectedBrand}`}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              View brand →
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading scans…
          </div>
        ) : scans.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
            <ScanLine className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No scans yet</h3>
            <p className="text-zinc-500 text-sm">Run your first scan from the brand detail page.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900">
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                    <th className="text-center px-4 py-3 text-zinc-400 font-medium">Duration</th>
                    <th className="text-right px-4 py-3 text-zinc-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map(scan => (
                    <tr key={scan.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                      <td className="px-4 py-3 text-zinc-300">
                        {new Date(scan.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{statusBadge(scan.status)}</td>
                      <td className="px-4 py-3 text-center text-zinc-400">{duration(scan)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/brands/${scan.brand_id}`}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          View brand
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-zinc-700 disabled:opacity-40 hover:bg-zinc-800 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-zinc-400">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-zinc-700 disabled:opacity-40 hover:bg-zinc-800 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
