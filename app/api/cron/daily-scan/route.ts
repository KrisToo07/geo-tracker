import { NextRequest, NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/route-client'
import { runScan, aggregateScores, ScanResultRow } from '@/lib/llm'
import { PLANS } from '@/lib/stripe/plans'

// GET /api/cron/daily-scan — called by Vercel Cron with Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getAdminSupabase()
  const results = { processed: 0, skipped: 0, failed: 0, errors: [] as string[] }

  try {
    const { data: brands, error: brandsError } = await db
      .from('brands')
      .select('id, name, website, user_id')
      .eq('scan_frequency', 'daily')
      .eq('is_active', true)

    if (brandsError) throw brandsError
    if (!brands || brands.length === 0) {
      return NextResponse.json({ message: 'No brands to scan', ...results })
    }

    for (const brand of brands) {
      try {
        const { data: profile } = await db
          .from('profiles').select('plan, scans_used_this_month').eq('id', brand.user_id).single()

        const plan = profile?.plan ?? 'free'
        const planConfig = PLANS[plan as keyof typeof PLANS]
        const scanLimit = planConfig?.limits?.scansPerMonth ?? 10
        const scansUsed = profile?.scans_used_this_month ?? 0

        if (scansUsed >= scanLimit) { results.skipped++; continue }

        const [{ data: keywords }, { data: competitors }] = await Promise.all([
          db.from('keywords').select('*').eq('brand_id', brand.id),
          db.from('competitors').select('*').eq('brand_id', brand.id),
        ])

        if (!keywords || keywords.length === 0) { results.skipped++; continue }

        const { data: scan, error: scanInsertError } = await db
          .from('scans')
          .insert({
            brand_id: brand.id,
            user_id: brand.user_id,
            status: 'running',
            triggered_by: 'cron',
            started_at: new Date().toISOString(),
          })
          .select().single()
        if (scanInsertError || !scan) throw scanInsertError ?? new Error('Failed to create scan record')

        let scanResults: ScanResultRow[]
        try {
          scanResults = await runScan({
            brand: { id: brand.id, name: brand.name, website: brand.website, aliases: [] },
            keywords,
            competitors: competitors ?? [],
          })
        } catch (llmErr: any) {
          await db.from('scans')
            .update({ status: 'failed', error_message: llmErr.message, completed_at: new Date().toISOString() })
            .eq('id', scan.id)
          throw llmErr
        }

        const {
          openai: openaiScore,
          perplexity: perplexityScore,
          gemini: geminiScore,
          visibility: visibilityScore,
          totalMentions,
        } = aggregateScores(scanResults)

        if (scanResults.length > 0) {
          const rows = scanResults.map(r => ({
            scan_id: scan.id,
            brand_id: brand.id,
            user_id: brand.user_id,
            keyword_id: r.keyword_id,
            llm_provider: r.platform,
            mentioned: r.brand_mentioned,
            mention_count: r.brand_mentioned ? 1 : 0,
            position: r.mention_rank,
            sentiment: r.sentiment,
            competitors_mentioned: r.competitors_mentioned,
            excerpt: r.response_text?.slice(0, 300) ?? null,
            raw_response: r.raw_response,
            score: r.score,
          }))
          await db.from('scan_results').insert(rows)
        }

        await Promise.all([
          db.from('scans').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            visibility_score: visibilityScore,
            openai_score: openaiScore,
            perplexity_score: perplexityScore,
            gemini_score: geminiScore,
            total_mentions: totalMentions,
            total_queries: scanResults.length,
          }).eq('id', scan.id),
          db.from('profiles')
            .update({ scans_used_this_month: scansUsed + 1 }).eq('id', brand.user_id),
        ])

        results.processed++
      } catch (brandErr: any) {
        results.failed++
        results.errors.push(`brand ${brand.id}: ${brandErr.message}`)
        console.error(`[cron/daily-scan] Failed for brand ${brand.id}:`, brandErr)
      }
    }

    return NextResponse.json({ message: 'Daily scan cron completed', ...results })
  } catch (err: any) {
    console.error('[cron/daily-scan] Fatal error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
