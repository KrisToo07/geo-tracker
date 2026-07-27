import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hit, clientKey, rateLimitHeaders, RULES } from '@/lib/security/rate-limit'

/**
 * Baseline rate limit for every /api route.
 *
 * Doing it here rather than per-route means a route added later is covered by default
 * instead of depending on someone remembering. Money-spending routes (scan, checkout)
 * additionally apply their own much tighter limit inside the handler -- this is the floor,
 * not the whole story.
 */
function apiRateLimit(request: NextRequest, userId: string | null): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith('/api/')) return null

  // Stripe calls this one; it is authenticated by signature, not by session, and Stripe
  // legitimately retries/bursts. Limiting it by IP would risk dropping real payment events.
  if (request.nextUrl.pathname.startsWith('/api/webhooks/')) return null

  const isWrite = request.method !== 'GET' && request.method !== 'HEAD'
  const rule = !userId ? RULES.anon : isWrite ? RULES.write : RULES.read

  const result = hit(`api:${clientKey(request, userId)}`, rule)
  if (result.ok) return null

  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again shortly.' },
    { status: 429, headers: rateLimitHeaders(result) },
  )
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rate limit /api before anything else touches the database or an LLM provider.
  const limited = apiRateLimit(request, user?.id ?? null)
  if (limited) return limited

  // Protect /dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
