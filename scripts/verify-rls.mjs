/**
 * Proves migration 003 actually closed the two authorization holes.
 *
 *   node scripts/verify-rls.mjs
 *
 * Checking that the SQL "ran" is not proof. This performs the real attack with a real user
 * session and reports whether the database refuses it:
 *
 *   1. self-upgrade:  update({ plan:'agency', scans_used_this_month:0 }) on your own profile
 *   2. result forgery: insert a scan_results row carrying someone else's user_id
 *
 * Creates a throwaway confirmed user via the admin API and DELETES it in a finally block.
 * Everything it writes is scoped to that user.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const out = {}
  for (const name of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(resolve(root, name), 'utf8').split('\n')) {
        const s = line.trim()
        if (!s || s.startsWith('#') || !s.includes('=')) continue
        const i = s.indexOf('=')
        const k = s.slice(0, i).trim()
        if (!(k in out)) out[k] = s.slice(i + 1).trim().replace(/^["']|["']$/g, '')
      }
    } catch {}
  }
  return out
}

const env = { ...loadEnv(), ...process.env }
const URL_ = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL_ || !SVC || !ANON) {
  console.error('missing SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY')
  process.exit(2)
}

const stamp = Date.now()
const email = `zz-rls-verify-${stamp}@example.com`
const password = `Vf${stamp}!aQ7x`

let userId = null
let failures = 0
const ok = (m) => console.log('  PASS  ' + m)
const bad = (m) => { failures++; console.log('  FAIL  ' + m) }

async function admin(path, init = {}) {
  return fetch(`${URL_}${path}`, {
    ...init,
    headers: {
      apikey: SVC, Authorization: `Bearer ${SVC}`,
      'Content-Type': 'application/json', ...(init.headers || {}),
    },
  })
}

try {
  // ---- create a confirmed throwaway user -------------------------------------------------
  let r = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  if (!r.ok) throw new Error(`create user failed: ${r.status} ${await r.text()}`)
  userId = (await r.json()).id
  console.log(`test user: ${email}\n`)

  // ---- sign in as that user (anon key -> real user JWT) ----------------------------------
  r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!r.ok) throw new Error(`sign-in failed: ${r.status} ${await r.text()}`)
  const jwt = (await r.json()).access_token

  const asUser = (path, init = {}) =>
    fetch(`${URL_}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: ANON, Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json', Prefer: 'return=representation',
        ...(init.headers || {}),
      },
    })

  // wait for the handle_new_user trigger to create the profile row
  for (let i = 0; i < 10; i++) {
    const p = await asUser(`profiles?select=id,plan&id=eq.${userId}`)
    if (p.ok && (await p.json()).length) break
    await new Promise((s) => setTimeout(s, 400))
  }

  console.log('ATTACK 1 — grant myself the agency plan')
  let res = await asUser(`profiles?id=eq.${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ plan: 'agency', scans_used_this_month: 0 }),
  })
  let body = await res.text()

  // Re-read with service role: the authoritative answer is what actually landed in the row.
  let check = await admin(`/rest/v1/profiles?select=plan&id=eq.${userId}`)
  let planNow = (await check.json())[0]?.plan

  if (planNow === 'agency') bad(`plan is now '${planNow}' — STILL VULNERABLE (HTTP ${res.status})`)
  else ok(`blocked (HTTP ${res.status}), plan still '${planNow}'`)
  if (res.status >= 400) console.log(`        db said: ${body.slice(0, 150)}`)

  console.log('\nATTACK 2 — write a scan_results row owned by another user')
  const victim = await admin('/rest/v1/profiles?select=id&limit=5')
  const other = (await victim.json()).map((p) => p.id).find((id) => id !== userId)
  if (!other) {
    console.log('  SKIP  no second account to target')
  } else {
    res = await asUser('scan_results', {
      method: 'POST',
      body: JSON.stringify({ user_id: other, brand_id: null, llm_provider: 'openai', mentioned: false }),
    })
    body = await res.text()
    if (res.ok) bad(`insert accepted — STILL VULNERABLE (HTTP ${res.status})`)
    else ok(`blocked (HTTP ${res.status})`)
    console.log(`        db said: ${body.slice(0, 150)}`)
  }

  console.log('\nCONTROL — a legitimate profile edit must still work')
  res = await asUser(`profiles?id=eq.${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ full_name: 'RLS Verify' }),
  })
  if (res.ok) ok('user can still edit full_name (app not broken)')
  else bad(`legitimate edit rejected (HTTP ${res.status}) — migration too strict: ${(await res.text()).slice(0, 150)}`)
} catch (e) {
  failures++
  console.error('\nERROR:', e.message)
} finally {
  if (userId) {
    const d = await admin(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' })
    console.log(`\ncleanup: test user deleted -> ${d.ok ? 'ok' : 'FAILED (remove ' + email + ' by hand)'}`)
  }
}

console.log(failures ? `\nRESULT: ${failures} problem(s)` : '\nRESULT: both holes closed, app still works')
process.exit(failures ? 1 : 0)
