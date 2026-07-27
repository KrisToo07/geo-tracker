/**
 * Ongoing database security check. Read-only.
 *
 *   npm run security:audit-db
 *
 * Two things it looks for:
 *
 *  1. Accounts on a paid plan with no stripe_subscription_id. Legitimate upgrades are written
 *     by the Stripe webhook and always carry a subscription id, so a paid plan without one
 *     means the row was set some other way. Before migration 003, any logged-in user could do
 *     exactly that to their own row from the browser.
 *
 *  2. scan_results rows whose user_id does not match the owner of their brand -- the signature
 *     of forged results, which the old `WITH CHECK (true)` insert policy allowed.
 *
 * Worth re-running after launches or any auth/billing change.
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
    } catch { /* file may not exist */ }
  }
  return out
}

const env = { ...loadEnv(), ...process.env }
const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const key = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(2)
}

async function q(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status} ${await r.text()}`)
  return r.json()
}

let problems = 0

const profiles = await q(
  'profiles?select=id,plan,stripe_customer_id,stripe_subscription_id,scans_used_this_month',
)
const byPlan = profiles.reduce((a, p) => ((a[p.plan] = (a[p.plan] || 0) + 1), a), {})
console.log(`accounts: ${profiles.length}  ${JSON.stringify(byPlan)}`)

const unpaid = profiles.filter(
  (p) => ['pro', 'agency'].includes(p.plan) && !p.stripe_subscription_id,
)
if (unpaid.length) {
  problems++
  console.log(`\n[!] ${unpaid.length} paid plan(s) with NO stripe_subscription_id:`)
  for (const p of unpaid) console.log(`    id=${p.id} plan=${p.plan}`)
  console.log('    -> verify against the Stripe dashboard; may be a self-upgrade.')
} else {
  console.log('ok  every paid plan has a Stripe subscription behind it')
}

const [results, brands] = await Promise.all([
  q('scan_results?select=id,user_id,brand_id&limit=5000'),
  q('brands?select=id,user_id'),
])
const owner = new Map(brands.map((b) => [b.id, b.user_id]))
const forged = results.filter((r) => owner.has(r.brand_id) && owner.get(r.brand_id) !== r.user_id)
if (forged.length) {
  problems++
  console.log(`\n[!] ${forged.length} scan_results row(s) whose user_id != brand owner`)
  for (const f of forged.slice(0, 10)) console.log(`    ${JSON.stringify(f)}`)
} else {
  console.log(`ok  ${results.length} scan_results all belong to their brand owner`)
}

console.log(problems ? `\nFAILED: ${problems} issue(s)` : '\nPASS: no anomalies')
process.exit(problems ? 1 : 0)
