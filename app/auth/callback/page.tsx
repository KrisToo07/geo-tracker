'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Zap, Loader2 } from 'lucide-react'

/**
 * Client-side OAuth callback. The browser Supabase client stored the PKCE code_verifier,
 * so the exchange must happen here (a server route can't reliably read it from cookies).
 * With detectSessionInUrl the client auto-exchanges the ?code=; we just wait for the
 * session, then send the user to the dashboard.
 */
export default function AuthCallback() {
  const router = useRouter()
  const [msg, setMsg] = useState('Signing you in…')

  useEffect(() => {
    const supabase = createClient()
    let done = false
    const go = (dest: string) => {
      if (done) return
      done = true
      router.replace(dest)
      router.refresh()
    }

    // If the client already established the session from the URL, go straight in.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go('/dashboard')
    })

    // detectSessionInUrl exchanges the code asynchronously → this fires on success.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go('/dashboard')
    })

    // Fallback: if nothing happened in a few seconds, surface the real error.
    const timer = setTimeout(() => {
      if (done) return
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error_description') || params.get('error')
      if (err) {
        go('/auth/error?message=' + encodeURIComponent(err))
      } else {
        setMsg('Still working… if this hangs, try signing in again.')
      }
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Zap className="h-7 w-7 text-indigo-400" />
          <span className="text-xl font-bold">GEO Tracker</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{msg}</span>
        </div>
      </div>
    </div>
  )
}
