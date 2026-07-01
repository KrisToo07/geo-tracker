import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    // Force PKCE so OAuth returns ?code= (which the /api/auth/callback route exchanges),
    // rather than an implicit #access_token the server callback can't read.
    { auth: { flowType: 'pkce' } },
  )
}
