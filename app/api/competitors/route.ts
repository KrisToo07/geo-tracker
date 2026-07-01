import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabase } from '@/lib/supabase/route-client'

// GET /api/competitors?brandId=xxx
export async function GET(req: NextRequest) {
  try {
    const supabase = getRouteSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const brandId = req.nextUrl.searchParams.get('brandId')
    if (!brandId) {
      return NextResponse.json({ error: 'brandId query parameter is required' }, { status: 400 })
    }

    // Verify brand ownership
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const { data: competitors, error } = await supabase
      .from('competitors')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ competitors })
  } catch (err: any) {
    console.error('[GET /api/competitors]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}

// POST /api/competitors — create a competitor for a brand
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
    const { brand_id, name, website } = body

    if (!brand_id || !name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'brand_id and name are required' }, { status: 400 })
    }

    // Verify brand ownership
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brand_id)
      .eq('user_id', user.id)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Enforce competitor limits per plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    const { count: competitorCount } = await supabase
      .from('competitors')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brand_id)

    const COMPETITOR_LIMITS: Record<string, number> = { free: 3, pro: 10, agency: 50 }
    const plan = profile?.plan ?? 'free'
    const limit = COMPETITOR_LIMITS[plan] ?? 3

    if ((competitorCount ?? 0) >= limit) {
      return NextResponse.json(
        {
          error: `Your ${plan} plan allows up to ${limit} competitors per brand. Please upgrade.`,
        },
        { status: 403 },
      )
    }

    const { data: competitor, error } = await supabase
      .from('competitors')
      .insert({
        brand_id,
        user_id: user.id,
        name: name.trim(),
        website: website ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ competitor }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/competitors]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
