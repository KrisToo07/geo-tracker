'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Zap, LayoutDashboard, Globe, ScanLine, Users, CreditCard, LogOut
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/brands', label: 'Brands', icon: Globe },
  { href: '/dashboard/scans', label: 'Scans', icon: ScanLine },
  { href: '/dashboard/competitors', label: 'Competitors', icon: Users },
  { href: '/dashboard/settings/billing', label: 'Billing', icon: CreditCard },
]

interface SidebarProps {
  userEmail?: string
  userAvatar?: string | null
}

export function Sidebar({ userEmail, userAvatar }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-zinc-800">
        <Zap className="h-6 w-6 text-indigo-400" />
        <span className="font-bold text-lg">GEO Tracker</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          {userAvatar ? (
            <img src={userAvatar} alt="avatar" className="h-8 w-8 rounded-full" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
              {userEmail?.[0]?.toUpperCase() ?? 'U'}
            </div>
          )}
          <span className="text-xs text-zinc-400 truncate flex-1">{userEmail}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors w-full"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
