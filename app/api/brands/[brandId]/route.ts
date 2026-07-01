import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabase } from '@/lib/supabase/route-client'

type RouteContext = { params: { brandId: string } }

// GET /api/brands/[brandId] — single brand with keywords, competitors, and latest scan
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = getRouteSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: brand, error } = await supabase
      .from('brands')
      .select(
        `
        *,
        keywords(*),
        competitors(*),
        scans(
          id, status, started_at, completed_at, created_at,
          scan_results(*)
        )
      `,
      )
      .eq('id', params.brandId)
      .eq('user_id', user.id)
      .order('created_at', { referencedTable: 'scans', ascending: false })
      .limit(1, { referencedTable: 'scans' })
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ brand })
  } catch (err: any) {
    console.error('[GET /api/brands/[brandId]]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/brands/[brandId] — update brand fields
export async function PATCH(req: NextRequest, { params }: RouteContext) {
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
    const allowedFields = ['name', 'website', 'description', 'scan_frequency', 'is_active']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Verify ownership first
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .eq('id', params.brandId)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const { data: brand, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', params.brandId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ brand })
  } catch (err: any) {
    console.error('[PATCH /api/brands/[brandId]]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/brands/[brandId] — delete brand (cascades to keywords, competitors, scans via FK)
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = getRouteSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership before delete
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .eq('id', params.brandId)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', params.brandId)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/brands/[brandId]]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
