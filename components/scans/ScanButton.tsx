'use client'

import { useState } from 'react'
import { Loader2, Zap } from 'lucide-react'

interface Props {
  brandId: string
  onComplete?: () => void
}

export function ScanButton({ brandId, onComplete }: Props) {
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleScan() {
    setScanning(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/brands/${brandId}/scan`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      setMessage({ type: 'success', text: `Scan complete! Score: ${Math.round(data.scan?.visibility_score ?? 0)}` })
      onComplete?.()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleScan}
        disabled={scanning}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {scanning ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</>
        ) : (
          <><Zap className="h-4 w-4" /> Scan Now</>
        )}
      </button>
      {message && (
        <p className={`text-xs ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
