import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabase } from '@/lib/supabase/route-client'

type RouteContext = { params: { competitorId: string } }

// DELETE /api/competitors/[competitorId]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = getRouteSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: existing } = await supabase
      .from('competitors').select('id').eq('id', params.competitorId).eq('user_id', user.id).single()
    if (!existing) return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })

    const { error } = await supabase
      .from('competitors').delete().eq('id', params.competitorId).eq('user_id', user.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/competitors/[competitorId]
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = getRouteSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const allowedFields = ['name', 'website']
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('competitors').select('id').eq('id', params.competitorId).eq('user_id', user.id).single()
    if (!existing) return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })

    const { data: competitor, error } = await supabase
      .from('competitors').update(updates).eq('id', params.competitorId).eq('user_id', user.id)
      .select().single()
    if (error) throw error

    return NextResponse.json({ competitor })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
