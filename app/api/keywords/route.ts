import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabase } from '@/lib/supabase/route-client'

// GET /api/keywords?brandId=xxx
export async function GET(req: NextRequest) {
  try {
    const supabase = getRouteSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const brandId = req.nextUrl.searchParams.get('brandId')
    if (!brandId) return NextResponse.json({ error: 'brandId is required' }, { status: 400 })

    const { data: brand } = await supabase
      .from('brands').select('id').eq('id', brandId).eq('user_id', user.id).single()
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

    const { data: keywords, error } = await supabase
      .from('keywords').select('*').eq('brand_id', brandId).eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (error) throw error

    return NextResponse.json({ keywords })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}

// POST /api/keywords — accepts both brandId (camelCase) and brand_id (snake_case)
export async function POST(req: NextRequest) {
  try {
    const supabase = getRouteSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    // Accept both camelCase (from KeywordManager) and snake_case
    const brandId: string = body.brandId ?? body.brand_id
    const text: string = body.text
    const category: string = body.category ?? 'general'

    if (!brandId || !text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'brandId and text are required' }, { status: 400 })
    }

    const { data: brand } = await supabase
      .from('brands').select('id').eq('id', brandId).eq('user_id', user.id).single()
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

    // Enforce keyword limits per plan
    const { data: profile } = await supabase
      .from('profiles').select('plan').eq('id', user.id).single()
    const { count: keywordCount } = await supabase
      .from('keywords').select('id', { count: 'exact', head: true }).eq('brand_id', brandId)

    const KEYWORD_LIMITS: Record<string, number> = { free: 5, pro: 25, agency: 100 }
    const plan = profile?.plan ?? 'free'
    const limit = KEYWORD_LIMITS[plan] ?? 5

    if ((keywordCount ?? 0) >= limit) {
      return NextResponse.json(
        { error: `Your ${plan} plan allows up to ${limit} keywords per brand. Please upgrade.` },
        { status: 403 },
      )
    }

    const { data: keyword, error } = await supabase
      .from('keywords')
      .insert({ brand_id: brandId, user_id: user.id, text: text.trim(), category, is_active: true })
      .select().single()
    if (error) throw error

    return NextResponse.json({ keyword }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
