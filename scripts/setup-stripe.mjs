#!/usr/bin/env node
/**
 * setup-stripe.mjs — create the Pro & Agency products + monthly prices in YOUR Stripe
 * account, then print the price IDs to paste into your env.
 *
 * Usage:
 *   node scripts/setup-stripe.mjs
 *
 * It reads STRIPE_SECRET_KEY from the environment, or from .env.local if present, so you
 * never paste your key anywhere but your own machine. Safe to run repeatedly: it reuses
 * existing products/prices (matched by metadata) instead of creating duplicates, and it
 * NEVER deletes, archives, or charges anything.
 *
 * Test vs live is decided by your key: sk_test_… sets up test-mode products, sk_live_…
 * live-mode. Run it once with your test key to try the flow, then again with the live key
 * before launch.
 */
import Stripe from 'stripe';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local (simple parser — no extra dependency) unless the key is already in env.
function loadEnvLocal() {
  if (process.env.STRIPE_SECRET_KEY) return;
  const envPath = join(__dirname, '..', '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnvLocal();

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('\n✗ STRIPE_SECRET_KEY not found (checked env + .env.local).');
  console.error('  Get it from Stripe → Developers → API keys, then either add it to');
  console.error('  .env.local or run:  STRIPE_SECRET_KEY=sk_... node scripts/setup-stripe.mjs\n');
  process.exit(1);
}
const MODE = key.startsWith('sk_live_') ? 'LIVE' : 'TEST';
const stripe = new Stripe(key, { apiVersion: '2024-09-30.acacia' });

// Mirrors lib/stripe/plans.ts — keep the amounts in sync with that file.
const CURRENCY = 'usd';
const PLANS = [
  { plan: 'pro',    name: 'GEO Tracker Pro',    amount: 4900,  env: 'STRIPE_PRO_PRICE_ID' },
  { plan: 'agency', name: 'GEO Tracker Agency', amount: 14900, env: 'STRIPE_AGENCY_PRICE_ID' },
];

async function ensureProduct(p) {
  const found = await stripe.products.search({
    query: `active:'true' AND metadata['app']:'geo-tracker' AND metadata['plan']:'${p.plan}'`,
  });
  if (found.data[0]) {
    console.log(`  • product exists: ${found.data[0].id}`);
    return found.data[0];
  }
  const product = await stripe.products.create({
    name: p.name,
    metadata: { app: 'geo-tracker', plan: p.plan },
  });
  console.log(`  • product created: ${product.id}`);
  return product;
}

async function ensurePrice(product, p) {
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const match = prices.data.find(
    (x) =>
      x.unit_amount === p.amount &&
      x.currency === CURRENCY &&
      x.recurring?.interval === 'month',
  );
  if (match) {
    console.log(`  • price exists:   ${match.id}  ($${p.amount / 100}/mo)`);
    return match;
  }
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: p.amount,
    currency: CURRENCY,
    recurring: { interval: 'month' },
    metadata: { app: 'geo-tracker', plan: p.plan },
  });
  console.log(`  • price created:  ${price.id}  ($${p.amount / 100}/mo)`);
  return price;
}

async function main() {
  console.log(`\nStripe ${MODE} mode — setting up GEO Tracker billing…\n`);
  const out = [];
  for (const p of PLANS) {
    console.log(`${p.name} ($${p.amount / 100}/mo):`);
    const product = await ensureProduct(p);
    const price = await ensurePrice(product, p);
    out.push(`${p.env}=${price.id}`);
  }
  console.log(`\n✔ Done. Paste these ${MODE} price IDs into .env.local AND your Vercel env:\n`);
  console.log(out.join('\n'));
  console.log(
    `\nNext: add the Stripe webhook (Developers → Webhooks → ` +
      `https://<your-domain>/api/webhooks/stripe) and set STRIPE_WEBHOOK_SECRET.\n`,
  );
}

main().catch((err) => {
  console.error('\n✗ Stripe setup failed:', err?.message ?? err);
  process.exit(1);
});
