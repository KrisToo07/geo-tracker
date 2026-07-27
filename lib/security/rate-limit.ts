/**
 * Sliding-window rate limiter.
 *
 * WHY: every /api route was previously unlimited. The expensive ones fan out to OpenAI,
 * Perplexity and Gemini, so an unauthenticated flood (or one logged-in user in a loop) is a
 * direct bill against us, not just a load problem.
 *
 * SCOPE / LIMITATION -- read before trusting this:
 * state lives in module memory, so each serverless instance keeps its own counters. Under
 * heavy fan-out the effective limit is (limit x instances), not (limit). That still stops
 * naive floods and accidental client loops, which is the common case. For a hard global
 * limit, back it with Redis (Upstash) or a Postgres counter and swap out `hit()` -- the
 * call sites do not change.
 */

export interface RateLimitRule {
  /** max requests allowed inside the window */
  limit: number
  /** window length in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  limit: number
  remaining: number
  /** epoch ms when the current window frees up */
  resetAt: number
  /** seconds the caller should wait; only meaningful when ok === false */
  retryAfter: number
}

type Bucket = { hits: number[] }

const buckets = new Map<string, Bucket>()

// Stop the map growing without bound on a long-lived instance.
const MAX_KEYS = 10_000
let lastSweep = 0

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000 && buckets.size < MAX_KEYS) return
  lastSweep = now
  // forEach rather than for..of: the project's TS target predates downlevelIteration for Map.
  const dead: string[] = []
  buckets.forEach((bucket, key) => {
    const alive = bucket.hits.filter((t) => now - t < windowMs)
    if (alive.length === 0) dead.push(key)
    else bucket.hits = alive
  })
  dead.forEach((key) => buckets.delete(key))
}

/** Record a hit for `key` and report whether it is allowed. */
export function hit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now()
  sweep(now, rule.windowMs)

  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { hits: [] }
    buckets.set(key, bucket)
  }

  // drop anything outside the window, then decide
  bucket.hits = bucket.hits.filter((t) => now - t < rule.windowMs)

  const oldest = bucket.hits[0]
  const resetAt = oldest ? oldest + rule.windowMs : now + rule.windowMs

  if (bucket.hits.length >= rule.limit) {
    return {
      ok: false,
      limit: rule.limit,
      remaining: 0,
      resetAt,
      retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    }
  }

  bucket.hits.push(now)
  return {
    ok: true,
    limit: rule.limit,
    remaining: rule.limit - bucket.hits.length,
    resetAt,
    retryAfter: 0,
  }
}

/**
 * Best-effort client identity.
 *
 * Prefer the authenticated user id: it survives IP rotation, and rate limiting purely by IP
 * punishes everyone behind a shared NAT. Fall back to the proxy-provided IP. We only trust
 * x-forwarded-for because Vercel overwrites it at the edge -- do not copy this into an app
 * that is not behind a trusted proxy, since the header is client-controlled otherwise.
 */
export function clientKey(req: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`
  const xff = req.headers.get('x-forwarded-for') ?? ''
  const ip = xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  const h: Record<string, string> = {
    'RateLimit-Limit': String(r.limit),
    'RateLimit-Remaining': String(r.remaining),
    'RateLimit-Reset': String(Math.ceil((r.resetAt - Date.now()) / 1000)),
  }
  if (!r.ok) h['Retry-After'] = String(r.retryAfter)
  return h
}

/**
 * Tiers. Mutations and anything that spends money are deliberately far tighter than reads.
 */
export const RULES = {
  /** default for authenticated reads */
  read: { limit: 120, windowMs: 60_000 },
  /** create/update/delete */
  write: { limit: 30, windowMs: 60_000 },
  /** unauthenticated or pre-auth traffic -- keep this small */
  anon: { limit: 30, windowMs: 60_000 },
  /** fans out to paid LLM APIs: this one is real money per call */
  expensive: { limit: 5, windowMs: 60_000 },
  /** payment surface: low volume by nature, abuse is suspicious */
  billing: { limit: 10, windowMs: 60_000 },
  /** bulk data egress */
  export: { limit: 10, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>
