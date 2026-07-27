/**
 * Shared helpers for API routes: rate limiting, safe error responses, input validation.
 *
 * Pulled into one place so a new route gets the same protections by default instead of
 * relying on whoever writes it remembering all of them.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { hit, clientKey, rateLimitHeaders, RULES, type RateLimitRule } from './rate-limit'

export { RULES }

/**
 * Apply a rate limit. Returns a 429 response to return immediately, or null to continue.
 *
 *   const limited = enforceRateLimit(req, 'scan', RULES.expensive, user.id)
 *   if (limited) return limited
 */
export function enforceRateLimit(
  req: Request,
  scope: string,
  rule: RateLimitRule,
  userId?: string | null,
): NextResponse | null {
  const result = hit(`${scope}:${clientKey(req, userId)}`, rule)
  if (result.ok) return null
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again shortly.' },
    { status: 429, headers: rateLimitHeaders(result) },
  )
}

/**
 * Error response that does not leak internals.
 *
 * Routes used to do `{ error: err.message }`, which hands the client raw Postgres/Supabase
 * text -- table names, column names, constraint names. Log the detail, return a generic
 * message.
 */
export function serverError(context: string, err: unknown): NextResponse {
  console.error(`[${context}]`, err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/**
 * Parse and validate a JSON body against a zod schema.
 * Returns either the typed data or a 400 response listing what was wrong.
 */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { data: null, error: badRequest('Request body must be valid JSON') }
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ')
    return { data: null, error: badRequest(detail) }
  }
  return { data: parsed.data, error: null }
}

/* ---------------------------------------------------------------------------
 * Reusable field schemas.
 * Length caps matter here beyond tidiness: these strings are interpolated into
 * LLM prompts, so an unbounded field is both a cost problem and a prompt-injection
 * surface.
 * ------------------------------------------------------------------------- */

export const uuid = z.string().uuid('must be a valid id')

export const shortText = z
  .string()
  .trim()
  .min(1, 'is required')
  .max(200, 'must be 200 characters or fewer')

export const mediumText = z
  .string()
  .trim()
  .max(1000, 'must be 1000 characters or fewer')

/** http/https only -- blocks javascript:, data:, file: and SSRF-friendly schemes. */
export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url('must be a valid URL')
  .refine(
    (v) => {
      try {
        const p = new URL(v).protocol
        return p === 'http:' || p === 'https:'
      } catch {
        return false
      }
    },
    { message: 'must start with http:// or https://' },
  )
