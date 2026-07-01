'use client'

import { useState } from 'react'
import { PLANS } from '@/lib/stripe/plans'
import { PlanTier } from '@/types'
import { cn } from '@/lib/utils'
import { Check, Loader2 } from 'lucide-react'

interface Props {
  currentPlan: PlanTier
}

export function PricingTable({ currentPlan }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleUpgrade(planId: string) {
    if (planId === 'free' || planId === currentPlan) return
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setLoading(null)
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {Object.values(PLANS).map(plan => {
        const isCurrent = plan.id === currentPlan
        const isPro = plan.id === 'pro'
        return (
          <div
            key={plan.id}
            className={cn(
              'rounded-xl border p-6 flex flex-col',
              isPro ? 'border-indigo-500 bg-indigo-950/20' : 'border-zinc-800 bg-zinc-900',
              isCurrent && 'ring-2 ring-indigo-500'
            )}
          >
            {isPro && (
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
                Most Popular
              </div>
            )}
            {isCurrent && (
              <div className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">
                Current Plan
              </div>
            )}
            <div className="mb-4">
              <div className="text-xl font-bold">{plan.name}</div>
              <div className="mt-1">
                <span className="text-4xl font-bold">${plan.price}</span>
                {plan.price > 0 && <span className="text-zinc-400 text-sm">/mo</span>}
              </div>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="h-4 w-4 text-green-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade(plan.id)}
              disabled={isCurrent || plan.id === 'free' || loading === plan.id}
              className={cn(
                'py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2',
                isCurrent || plan.id === 'free'
                  ? 'border border-zinc-700 text-zinc-500 cursor-default'
                  : isPro
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'border border-zinc-700 hover:border-zinc-500 text-zinc-300'
              )}
            >
              {loading === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
              {isCurrent ? 'Current Plan' : plan.price === 0 ? 'Free Forever' : `Upgrade to ${plan.name}`}
            </button>
          </div>
        )
      })}
    </div>
  )
}
