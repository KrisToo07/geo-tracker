import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabase, getAdminSupabase } from '@/lib/supabase/route-client'
import { runScan, aggregateScores, ScanResultRow } from '@/lib/llm'
import { PLANS } from '@/lib/stripe/plans'
import { enforceRateLimit, RULES } from '@/lib/security/guard'

type RouteContext = { params: { brandId: string } }

// POST /api/brands/[brandId]/scan — trigger a new scan
export async function POST(_req: NextRequest, { params }: RouteContext) {
  // Declared out here so the catch below can still hand the quota slot back.
  let releaseQuota: () => Promise<void> = async () => {}

  try {
    const supabase = getRouteSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // This endpoint fans out to OpenAI + Perplexity + Gemini, so each call costs real money.
    // The monthly plan quota below is the business limit; this is the burst limit.
    const limited = enforceRateLimit(_req, 'scan', RULES.expensive, user.id)
    if (limited) return limited

    // Verify brand ownership
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, website, description')
      .eq('id', params.brandId)
      .eq('user_id', user.id)
      .single()
    if (brandError || !brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

    // Check plan scan limits
    const { data: profile } = await supabase
      .from('profiles').select('plan, scans_used_this_month').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const plan = profile.plan ?? 'free'
    const planConfig = PLANS[plan as keyof typeof PLANS]
    const scanLimit = planConfig?.limits?.scansPerMonth ?? 10
    const scansUsed = profile.scans_used_this_month ?? 0

    if (scansUsed >= scanLimit) {
      return NextResponse.json(
        { error: `You've used all ${scanLimit} scans for this month on the ${plan} plan. Please upgrade or wait until next month.` },
        { status: 429 },
      )
    }

    /*
     * Reserve the quota slot BEFORE doing any paid work.
     *
     * The previous order was: read count -> run the scan (seconds of LLM calls) -> write
     * count + 1. Two requests firing together both read the same value, both pass the check
     * above, and both run a full scan -- so a free-plan account could burn an unbounded
     * number of paid LLM calls by sending concurrent requests.
     *
     * The .eq() on the value we read makes this a compare-and-set: if another request
     * already incremented, this update matches zero rows and we bail out instead of
     * spending money. The scan is refunded further down if it fails.
     */
    const adminDb = getAdminSupabase()
    const { data: reserved, error: reserveError } = await adminDb
      .from('profiles')
      .update({ scans_used_this_month: scansUsed + 1 })
      .eq('id', user.id)
      .eq('scans_used_this_month', scansUsed)
      .select('id')

    if (reserveError) throw reserveError
    if (!reserved || reserved.length === 0) {
      return NextResponse.json(
        { error: 'Another scan is already starting for this account. Please retry in a moment.' },
        { status: 409 },
      )
    }

    // Give the slot back if we bail out or blow up before the scan completes.
    let scanCommitted = false
    releaseQuota = async () => {
      if (scanCommitted) return
      scanCommitted = true // never refund twice
      await adminDb
        .from('profiles')
        .update({ scans_used_this_month: scansUsed })
        .eq('id', user.id)
        .eq('scans_used_this_month', scansUsed + 1)
    }

    // Fetch keywords and competitors
    const [{ data: keywords }, { data: competitors }] = await Promise.all([
      supabase.from('keywords').select('*').eq('brand_id', params.brandId).eq('user_id', user.id),
      supabase.from('competitors').select('*').eq('brand_id', params.brandId).eq('user_id', user.id),
    ])

    if (!keywords || keywords.length === 0) {
      await releaseQuota() // nothing was spent -- don't charge the slot
      return NextResponse.json({ error: 'Add at least one keyword before running a scan.' }, { status: 400 })
    }

    const adminSupabase = adminDb

    // Create scan record (status: running)
    const { data: scan, error: scanInsertError } = await adminSupabase
      .from('scans')
      .insert({
        brand_id: params.brandId,
        user_id: user.id,
        status: 'running',
        triggered_by: 'manual',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (scanInsertError || !scan) throw scanInsertError ?? new Error('Failed to create scan record')

    // Run LLM scan
    let scanResults: ScanResultRow[]
    try {
      scanResults = await runScan({
        brand: { id: brand.id, name: brand.name, website: brand.website, aliases: [] },
        keywords,
        competitors: competitors ?? [],
      })
    } catch (llmError: any) {
      await adminSupabase
        .from('scans')
        .update({ status: 'failed', error_message: llmError.message, completed_at: new Date().toISOString() })
        .eq('id', scan.id)
      await releaseQuota() // the scan produced nothing usable -- give the slot back
      return NextResponse.json({ error: 'Scan failed during LLM processing. Please try again.' }, { status: 502 })
    }

    // Compute aggregate scores (errored providers are excluded, not counted as 0)
    const {
      openai: openaiScore,
      perplexity: perplexityScore,
      gemini: geminiScore,
      visibility: visibilityScore,
      totalMentions,
    } = aggregateScores(scanResults)

    // Persist scan_results rows
    if (scanResults.length > 0) {
      const rows = scanResults.map(r => ({
        scan_id: scan.id,
        brand_id: params.brandId,
        user_id: user.id,
        keyword_id: r.keyword_id,
        llm_provider: r.platform,
        mentioned: r.brand_mentioned,
        mention_count: r.brand_mentioned ? 1 : 0,
        position: r.mention_rank,
        sentiment: r.sentiment,
        competitors_mentioned: r.competitors_mentioned,
        excerpt: r.response_text?.slice(0, 300) ?? null,
        raw_response: r.raw_response,
        cited: r.cited,
        cited_sources: r.cited_sources,
        score: r.score,
      }))
      let { error: resultsError } = await adminSupabase.from('scan_results').insert(rows)
      // Graceful fallback: if the citation columns don't exist yet (migration 002
      // not applied), strip them and retry so scans keep working.
      if (resultsError && /cited/i.test(resultsError.message ?? '')) {
        const legacyRows = rows.map(({ cited, cited_sources, ...rest }) => rest)
        ;({ error: resultsError } = await adminSupabase.from('scan_results').insert(legacyRows))
      }
      if (resultsError) console.error('[scan] Failed to insert scan_results:', resultsError)
    }

    // Mark scan completed with scores
    const { data: completedScan } = await adminSupabase
      .from('scans')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        visibility_score: visibilityScore,
        openai_score: openaiScore,
        perplexity_score: perplexityScore,
        gemini_score: geminiScore,
        total_mentions: totalMentions,
        total_queries: scanResults.length,
      })
      .eq('id', scan.id)
      .select()
      .single()

    // Quota was already reserved before the scan ran; keep it.
    scanCommitted = true

    return NextResponse.json({ scan: completedScan ?? { ...scan, status: 'completed', visibility_score: visibilityScore } }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/brands/[brandId]/scan]', err)
    // Best effort: don't charge a scan for a request that crashed.
    try { await releaseQuota() } catch { /* refund is best-effort; original error already logged */ }
    // Return a generic message -- err.message here can carry Postgres/Supabase internals.
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
