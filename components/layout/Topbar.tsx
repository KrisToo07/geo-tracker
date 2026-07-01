'use client'

import { Bell } from 'lucide-react'
import { PlanTier } from '@/types'
import { cn } from '@/lib/utils'

const PLAN_COLORS: Record<PlanTier, string> = {
  free: 'bg-zinc-700 text-zinc-300',
  pro: 'bg-indigo-600 text-white',
  agency: 'bg-purple-600 text-white',
}

interface TopbarProps {
  title: string
  plan?: PlanTier
}

export function Topbar({ title, plan = 'free' }: TopbarProps) {
  return (
    <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider', PLAN_COLORS[plan])}>
          {plan}
        </span>
        <button className="text-zinc-400 hover:text-zinc-50 transition-colors">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
