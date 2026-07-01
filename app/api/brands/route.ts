import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabase } from '@/lib/supabase/route-client'

// GET /api/brands — list all brands for the authenticated user
export async function GET(_req: NextRequest) {
  try {
    const supabase = getRouteSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: brands, error } = await supabase
      .from('brands')
      .select(
        `
        id, name, website, description, scan_frequency, is_active, created_at,
        keywords(count),
        competitors(count)
      `,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ brands })
  } catch (err: any) {
    console.error('[GET /api/brands]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}

// POST /api/brands — create a new brand
export async function POST(req: NextRequest) {
  try {
    const supabase = getRouteSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, website, description, scan_frequency = 'weekly' } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })
    }

    // Enforce plan brand limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    const { count: brandCount } = await supabase
      .from('brands')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const BRAND_LIMITS: Record<string, number> = { free: 1, pro: 5, agency: 20 }
    const plan = profile?.plan ?? 'free'
    const limit = BRAND_LIMITS[plan] ?? 1

    if ((brandCount ?? 0) >= limit) {
      return NextResponse.json(
        { error: `Your ${plan} plan allows up to ${limit} brand(s). Please upgrade.` },
        { status: 403 },
      )
    }

    const { data: brand, error } = await supabase
      .from('brands')
      .insert({
        user_id: user.id,
        name: name.trim(),
        website: website ?? null,
        description: description ?? null,
        scan_frequency,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ brand }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/brands]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
