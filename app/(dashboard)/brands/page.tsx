'use client'

import { useState, useEffect, useCallback } from 'react'
import { Brand } from '@/types'
import { BrandCard } from '@/components/brands/BrandCard'
import { Topbar } from '@/components/layout/Topbar'
import { Plus, Globe, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBrands = useCallback(async () => {
    const res = await fetch('/api/brands')
    const data = await res.json()
    setBrands(data.brands ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchBrands() }, [fetchBrands])

  return (
    <div>
      <Topbar title="Brands" />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <p className="text-zinc-400 text-sm">{brands.length} brand{brands.length !== 1 ? 's' : ''} tracked</p>
          <Link
            href="/dashboard/brands/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Brand
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
            <Globe className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No brands yet</h3>
            <p className="text-zinc-500 text-sm mb-6">Start tracking your brand across ChatGPT, Perplexity, and Gemini.</p>
            <Link href="/dashboard/brands/new" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors">
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
