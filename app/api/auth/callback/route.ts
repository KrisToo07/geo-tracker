import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabase } from '@/lib/supabase/route-client'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?message=missing_code`)
  }

  const supabase = getRouteSupabase()

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`,
    )
  }

  // Ensure a profile row exists (idempotent upsert)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.from('profiles').upsert(
      { id: user.id, email: user.email, plan: 'free' },
      { onConflict: 'id', ignoreDuplicates: true },
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
