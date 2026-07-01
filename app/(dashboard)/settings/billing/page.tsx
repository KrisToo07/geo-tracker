'use client'

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { PricingTable } from '@/components/billing/PricingTable'
import { createClient } from '@/lib/supabase/client'
import { PlanTier } from '@/types'
import { PLANS } from '@/lib/stripe/plans'
import { CreditCard, Zap, BarChart3, Globe, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export default function BillingPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [plan, setPlan] = useState<PlanTier>('free')
  const [scansUsed, setScansUsed] = useState(0)
  const [loading, setLoading] = useState(true)

  const upgradeStatus = searchParams.get('upgrade')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, scans_used_this_month')
        .eq('id', user.id)
        .single()
      if (profile) {
        setPlan((profile.plan as PlanTier) ?? 'free')
        setScansUsed(profile.scans_used_this_month ?? 0)
      }
      setLoading(false)
    }
    load()
  }, [])

  const currentPlanConfig = PLANS[plan]
  const scanLimit = currentPlanConfig?.limits.scansPerMonth ?? 10
  const scanPct = Math.min(100, Math.round((scansUsed / scanLimit) * 100))

  return (
    <div>
      <Topbar title="Billing" plan={plan} />
      <div className="p-6 max-w-5xl mx-auto space-y-8">

        {upgradeStatus === 'success' && (
          <div className="bg-green-950 border border-green-700 text-green-300 rounded-xl px-5 py-4 text-sm font-medium">
            🎉 Upgrade successful! Your plan has been updated.
          </div>
        )}
        {upgradeStatus === 'cancelled' && (
          <div className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl px-5 py-4 text-sm">
            Upgrade cancelled. You're still on the {plan} plan.
          </div>
        )}

        {/* Current plan summary */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-400" /> Current Plan
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Plan</span>
                </div>
                <div className="text-2xl font-bold capitalize">{plan}</div>
                <div className="text-sm text-zinc-400">${currentPlanConfig?.price ?? 0}/mo</div>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Scans This Month</span>
                </div>
                <div className="text-2xl font-bold">
                  {scansUsed}
                  <span className="text-sm font-normal text-zinc-400">
                    /{scanLimit === 999999 ? '∞' : scanLimit}
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${scanPct > 80 ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${scanPct}%` }}
                  />
                </div>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Brands Allowed</span>
                </div>
                <div className="text-2xl font-bold">{currentPlanConfig?.limits.brands ?? 1}</div>
                <div className="text-sm text-zinc-400">
                  {currentPlanConfig?.limits.keywords ?? 5} keywords/brand
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Pricing table */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Upgrade Your Plan</h2>
          <PricingTable currentPlan={plan} />
        </section>
      </div>
    </div>
  )
}
