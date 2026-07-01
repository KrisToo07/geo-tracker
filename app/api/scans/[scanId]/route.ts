import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabase } from '@/lib/supabase/route-client'

type RouteContext = { params: { scanId: string } }

// GET /api/scans/[scanId] — single scan with results joined with keyword text
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

    const { data: scan, error } = await supabase
      .from('scans')
      .select(
        `
        id, status, started_at, completed_at, created_at,
        brand_id,
        scan_results(
          id,
          platform,
          prompt,
          response_text,
          brand_mentioned,
          mention_rank,
          sentiment,
          competitors_mentioned,
          created_at,
          keywords(
            id,
            text,
            platforms
          )
        )
      `,
      )
      .eq('id', params.scanId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
      }
      throw error
    }

    // Compute summary stats
    const results = (scan as any).scan_results ?? []
    const totalResults = results.length
    const mentionedCount = results.filter((r: any) => r.brand_mentioned).length
    const mentionRate = totalResults > 0 ? Math.round((mentionedCount / totalResults) * 100) : 0

    const sentimentCounts = results.reduce(
      (acc: Record<string, number>, r: any) => {
        if (r.sentiment) acc[r.sentiment] = (acc[r.sentiment] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return NextResponse.json({
      scan: {
        ...scan,
        summary: {
          totalResults,
          mentionedCount,
          mentionRate,
          sentimentCounts,
        },
      },
    })
  } catch (err: any) {
    console.error('[GET /api/scans/[scanId]]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
