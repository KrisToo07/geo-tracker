import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabase } from '@/lib/supabase/route-client'
import Papa from 'papaparse'

// GET /api/export/mentions?brandId=xxx[&scanId=yyy]
// Returns a CSV file of scan_results for the given brand (optionally filtered by scan)
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

    const { searchParams } = req.nextUrl
    const brandId = searchParams.get('brandId')
    const scanId = searchParams.get('scanId')

    if (!brandId) {
      return NextResponse.json({ error: 'brandId query parameter is required' }, { status: 400 })
    }

    // Verify brand ownership
    const { data: brand } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('scan_results')
      .select(
        `
        id,
        platform,
        prompt,
        brand_mentioned,
        mention_rank,
        sentiment,
        competitors_mentioned,
        created_at,
        scans(id, started_at, completed_at),
        keywords(id, text)
      `,
      )
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (scanId) {
      query = query.eq('scan_id', scanId)
    }

    const { data: results, error } = await query

    if (error) throw error

    if (!results || results.length === 0) {
      // Return empty CSV with headers
      const csv = Papa.unparse([])
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="mentions-${brand.name}-empty.csv"`,
        },
      })
    }

    // Flatten nested data for CSV
    const rows = results.map((r: any) => ({
      result_id: r.id,
      platform: r.platform,
      keyword: r.keywords?.text ?? '',
      prompt: r.prompt ?? '',
      brand_mentioned: r.brand_mentioned ? 'Yes' : 'No',
      mention_rank: r.mention_rank ?? '',
      sentiment: r.sentiment ?? '',
      competitors_mentioned: Array.isArray(r.competitors_mentioned)
        ? r.competitors_mentioned.join('; ')
        : '',
      scan_id: r.scans?.id ?? '',
      scan_started_at: r.scans?.started_at ?? '',
      scan_completed_at: r.scans?.completed_at ?? '',
      result_created_at: r.created_at,
    }))

    const csv = Papa.unparse(rows, { header: true })

    const filename = `mentions-${brand.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[GET /api/export/mentions]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
