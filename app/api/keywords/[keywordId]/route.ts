import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabase } from '@/lib/supabase/route-client'

type RouteContext = { params: { keywordId: string } }

// PATCH /api/keywords/[keywordId] — update text, category, or is_active
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = getRouteSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const allowedFields = ['text', 'category', 'is_active']
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
    if (updates.text && typeof updates.text === 'string') {
      updates.text = (updates.text as string).trim()
    }

    const { data: existing } = await supabase
      .from('keywords').select('id').eq('id', params.keywordId).eq('user_id', user.id).single()
    if (!existing) return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })

    const { data: keyword, error } = await supabase
      .from('keywords').update(updates).eq('id', params.keywordId).eq('user_id', user.id)
      .select().single()
    if (error) throw error

    return NextResponse.json({ keyword })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/keywords/[keywordId]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = getRouteSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: existing } = await supabase
      .from('keywords').select('id').eq('id', params.keywordId).eq('user_id', user.id).single()
    if (!existing) return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })

    const { error } = await supabase
      .from('keywords').delete().eq('id', params.keywordId).eq('user_id', user.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
