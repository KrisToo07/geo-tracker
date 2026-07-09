// Fresh-verify outreach claims: for each target brand, ask its key buyer query
// on all 3 engines and record whether the brand is mentioned + who is.
// Output: scripts/audits/outreach-verify-<date>.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const TARGETS = [
  { brand: 'Framer', query: 'What are the best no-code website builders?', rivals: ['Webflow', 'Wix', 'Squarespace'] },
  { brand: 'Attio', query: 'What is the best CRM for startups?', rivals: ['HubSpot', 'Pipedrive', 'Salesforce'] },
  { brand: 'Dub', query: 'What are the best Bitly alternatives for link shortening?', rivals: ['Bitly', 'Rebrandly', 'Short.io'] },
  { brand: 'Cal.com', query: 'What are the best Calendly alternatives?', rivals: ['Calendly', 'Acuity', 'SavvyCal'] },
  { brand: 'Tally', query: 'What are the best online form builders?', rivals: ['Typeform', 'Google Forms', 'Jotform'] },
  { brand: 'Superhuman', query: 'What are the best email client apps?', rivals: ['Gmail', 'Outlook', 'Spark'] },
  { brand: 'WorkOS', query: 'What are the best enterprise SSO / SAML solutions?', rivals: ['Okta', 'Auth0', 'Azure AD'] },
  { brand: 'Trigger.dev', query: 'What are the best background job and workflow platforms for developers?', rivals: ['Temporal', 'BullMQ', 'Inngest'] },
  { brand: 'Unkey', query: 'What are the best API key management tools?', rivals: ['Kong', 'AWS API Gateway', 'Tyk'] },
  { brand: 'Outseta', query: 'What are the best all-in-one platforms for SaaS startups?', rivals: ['Stripe', 'Memberstack', 'Chargebee'] },
];

const TIMEOUT = 60000;
async function withTimeout(promise) {
  return promise; // fetch has its own AbortController below
}
async function post(url, headers, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 120)}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

const engines = {
  openai: async (q) => {
    const d = await post('https://api.openai.com/v1/chat/completions',
      { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      { model: 'gpt-4o-mini', messages: [{ role: 'user', content: q }] });
    return d.choices[0].message.content;
  },
  perplexity: async (q) => {
    const d = await post('https://api.perplexity.ai/chat/completions',
      { 'Content-Type': 'application/json', Authorization: `Bearer ${env.PERPLEXITY_API_KEY}` },
      { model: 'sonar', messages: [{ role: 'user', content: q }] });
    return d.choices[0].message.content;
  },
  gemini: async (q) => {
    const d = await post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      { 'Content-Type': 'application/json' },
      { contents: [{ parts: [{ text: q }] }] });
    return d.candidates[0].content.parts.map((p) => p.text || '').join('');
  },
};

async function retry(fn, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 1500 * (i + 1))); }
  }
  throw last;
}

const mentioned = (name, text) =>
  new RegExp(`(?<![A-Za-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'i').test(text);

const out = [];
for (const t of TARGETS) {
  const row = { brand: t.brand, query: t.query, engines: {} };
  await Promise.all(Object.entries(engines).map(async ([name, fn]) => {
    try {
      const text = await retry(() => fn(t.query));
      row.engines[name] = {
        ok: true,
        brandMentioned: mentioned(t.brand, text),
        rivalsMentioned: t.rivals.filter((r) => mentioned(r, text)),
      };
    } catch (e) {
      row.engines[name] = { ok: false, error: String(e).slice(0, 150) };
    }
  }));
  const misses = Object.values(row.engines).filter((e) => e.ok && !e.brandMentioned).length;
  const oks = Object.values(row.engines).filter((e) => e.ok).length;
  console.log(`${t.brand}: invisible in ${misses}/${oks} engines`);
  out.push(row);
}

mkdirSync(join(ROOT, 'scripts', 'audits'), { recursive: true });
const file = join(ROOT, 'scripts', 'audits', `outreach-verify-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(file, JSON.stringify(out, null, 2));
console.log('DONE ' + file);
