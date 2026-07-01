'use client'

import { useState, useEffect, useCallback } from 'react'
import { Brand } from '@/types'
import { BrandCard } from '@/components/brands/BrandCard'
import { Topbar } from '@/components/layout/Topbar'
import { BarChart3, Globe, Zap, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBrands = useCallback(async () => {
    const res = await fetch('/api/brands')
    const data = await res.json()
    setBrands(data.brands ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchBrands() }, [fetchBrands])

  const avgScore = brands.length
    ? brands.reduce((s, b) => s + (b.latest_scan?.visibility_score ?? 0), 0) / brands.length
    : 0

  const totalScans = brands.reduce((s, b) => s + (b.latest_scan ? 1 : 0), 0)

  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="p-6 max-w-6xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Brands Tracked', value: brands.length, icon: <Globe className="h-5 w-5 text-indigo-400" /> },
            { label: 'Avg Visibility Score', value: Math.round(avgScore), icon: <BarChart3 className="h-5 w-5 text-green-400" /> },
            { label: 'Total Scans', value: totalScans, icon: <Zap className="h-5 w-5 text-amber-400" /> },
            { label: 'Active Keywords', value: brands.reduce((s, b) => s + (b.keywords?.length ?? 0), 0), icon: <Zap className="h-5 w-5 text-purple-400" /> },
          ].map(stat => (
            <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-zinc-500">{stat.label}</span></div>
              <div className="text-3xl font-bold">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Brands */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Brands</h2>
          <Link
            href="/dashboard/brands/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Brand
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading brands…
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
            <Globe className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No brands yet</h3>
            <p className="text-zinc-500 text-sm mb-6">Add your first brand to start tracking AI visibility.</p>
            <Link
              href="/dashboard/brands/new"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              Add Your First Brand
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map(brand => (
              <BrandCard key={brand.id} brand={brand} onScanComplete={fetchBrands} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
