#!/usr/bin/env node
/**
 * run-audit.mjs — standalone AI-visibility audit report generator.
 *
 * Usage:
 *   node scripts/run-audit.mjs --brand "Acme" --website "acme.com" \
 *     --category "CRM software" --competitors "HubSpot,Salesforce,Pipedrive" [--queries 25]
 *
 * Requires OPENAI_API_KEY, PERPLEXITY_API_KEY, GEMINI_API_KEY in <project-root>/.env.local
 * No external dependencies (Node 18+ built-in fetch).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const TIMEOUT_MS = 60_000;
const BATCH_SIZE = 3;

/* ---------------------------------------------------------------- args */

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const BRAND = args.brand;
const WEBSITE = args.website || "";
const CATEGORY = args.category;
const COMPETITORS = String(args.competitors || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const NUM_QUERIES = Math.max(1, parseInt(args.queries, 10) || 25);

if (!BRAND || !CATEGORY) {
  console.error(
    'Usage: node scripts/run-audit.mjs --brand "Acme" --website "acme.com" ' +
      '--category "CRM software" --competitors "HubSpot,Salesforce" [--queries 25]'
  );
  process.exit(1);
}

/* ---------------------------------------------------------------- env */

function loadEnvLocal() {
  const envPath = path.join(PROJECT_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error(`ERROR: ${envPath} not found.`);
    process.exit(1);
  }
  const env = {};
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnvLocal();
for (const key of ["OPENAI_API_KEY", "PERPLEXITY_API_KEY", "GEMINI_API_KEY"]) {
  if (!env[key]) {
    console.error(`ERROR: ${key} is missing from .env.local — add it and retry.`);
    process.exit(1);
  }
}

/* ---------------------------------------------------------------- fetch helpers */

async function fetchJSON(url, options, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${label} HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    return JSON.parse(text);
  } catch (err) {
    if (err.name === "AbortError") throw new Error(`${label} timed out after ${TIMEOUT_MS / 1000}s`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(fn, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 1500 * (i + 1))); // backoff: 1.5s, 3s, 4.5s
    }
  }
  throw last;
}

/* ---------------------------------------------------------------- engines */

async function askOpenAI(prompt, { json = false } = {}) {
  const body = {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: json ? 0.7 : 0.4,
  };
  if (json) body.response_format = { type: "json_object" };
  const data = await fetchJSON(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    },
    "OpenAI"
  );
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty response");
  return content;
}

async function askPerplexity(prompt) {
  const data = await fetchJSON(
    "https://api.perplexity.ai/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: prompt }],
      }),
    },
    "Perplexity"
  );
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Perplexity returned an empty response");
  return content;
}

async function askGemini(prompt) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    encodeURIComponent(env.GEMINI_API_KEY);
  const data = await fetchJSON(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
    "Gemini"
  );
  const content = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || "")
    .join("");
  if (!content) throw new Error("Gemini returned an empty response");
  return content;
}

const ENGINES = [
  { id: "openai", name: "OpenAI (GPT-4o mini)", ask: askOpenAI },
  { id: "perplexity", name: "Perplexity (Sonar)", ask: askPerplexity },
  { id: "gemini", name: "Gemini 2.0 Flash", ask: askGemini },
];

/* ---------------------------------------------------------------- query generation */

async function generateQueries() {
  const competitorList = COMPETITORS.length ? COMPETITORS.join(", ") : "well-known competitors";
  const prompt = `You are simulating real buyers researching "${CATEGORY}".
Generate exactly ${NUM_QUERIES} realistic, distinct queries such buyers would type into an AI assistant.
Mix these styles:
- "best ${CATEGORY}" variations
- "${CATEGORY} for [specific use case / company size / industry]"
- "alternatives to [competitor]" (competitors: ${competitorList})
- "[X] vs [Y]" comparison questions
Do NOT mention the brand "${BRAND}" in any query.
Return STRICT JSON only, shaped as: {"queries": ["query 1", "query 2", ...]}`;

  const raw = await withRetry(() => askOpenAI(prompt, { json: true }));
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // salvage: try to extract the first JSON object in the text
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse query list as JSON:\n" + raw.slice(0, 400));
    parsed = JSON.parse(match[0]);
  }
  const list = Array.isArray(parsed) ? parsed : parsed.queries;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Query generation returned no queries.");
  }
  return list.map(String).slice(0, NUM_QUERIES);
}

/* ---------------------------------------------------------------- scoring */

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mentionIndex(text, name) {
  // whole-word-ish, case-insensitive: no letter/digit immediately adjacent
  const re = new RegExp(
    `(?<![A-Za-z0-9])${escapeRegExp(name)}(?![A-Za-z0-9])`,
    "i"
  );
  const m = re.exec(text);
  return m ? m.index : -1;
}

function scoreResponse(text) {
  const names = [BRAND, ...COMPETITORS];
  const found = names
    .map((name) => ({ name, index: mentionIndex(text, name) }))
    .filter((x) => x.index >= 0)
    .sort((a, b) => a.index - b.index);
  const brandHit = found.find((x) => x.name === BRAND);
  return {
    brandMentioned: Boolean(brandHit),
    mentionRank: brandHit ? found.indexOf(brandHit) + 1 : null,
    mentioned: found.map((x) => x.name),
    competitorsMentioned: found.map((x) => x.name).filter((n) => n !== BRAND),
  };
}

/* ---------------------------------------------------------------- audit run */

async function runQuery(query) {
  const engines = {};
  await Promise.all(
    ENGINES.map(async (engine) => {
      try {
        const text = await withRetry(() => engine.ask(query));
        engines[engine.id] = { ok: true, response: text, ...scoreResponse(text) };
      } catch (err) {
        engines[engine.id] = { ok: false, error: String(err.message || err) };
      }
    })
  );
  return { query, engines };
}

async function runAudit(queries) {
  const results = [];
  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE);
    const settled = await Promise.all(batch.map((q) => runQuery(q)));
    results.push(...settled);
    console.log(
      `  [${Math.min(i + BATCH_SIZE, queries.length)}/${queries.length}] queries done`
    );
  }
  return results;
}

function summarize(results) {
  const perEngine = {};
  for (const engine of ENGINES) {
    const ok = results.map((r) => r.engines[engine.id]).filter((e) => e.ok);
    const mentioned = ok.filter((e) => e.brandMentioned).length;
    perEngine[engine.id] = {
      name: engine.name,
      successful: ok.length,
      failed: results.length - ok.length,
      mentioned,
      score: ok.length ? Math.round((mentioned / ok.length) * 100) : null,
    };
  }
  const withData = Object.values(perEngine).filter((e) => e.score !== null);
  const overall = withData.length
    ? Math.round(withData.reduce((s, e) => s + e.score, 0) / withData.length)
    : 0;

  const competitorWins = {};
  for (const r of results) {
    for (const engine of ENGINES) {
      const e = r.engines[engine.id];
      if (!e?.ok) continue;
      for (const c of e.competitorsMentioned) {
        competitorWins[c] = (competitorWins[c] || 0) + 1;
      }
    }
  }
  const topCompetitors = Object.entries(competitorWins)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const gaps = results.filter((r) => {
    const ok = ENGINES.map((en) => r.engines[en.id]).filter((e) => e.ok);
    return ok.length > 0 && ok.every((e) => !e.brandMentioned);
  });

  return { perEngine, overall, topCompetitors, gaps };
}

/* ---------------------------------------------------------------- report */

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "brand";
}

function scoreColor(score) {
  if (score === null) return "#94a3b8";
  if (score >= 60) return "#16a34a";
  if (score >= 30) return "#d97706";
  return "#dc2626";
}

function buildHTML({ results, summary, dateStr }) {
  const { perEngine, overall, topCompetitors, gaps } = summary;

  const engineBars = ENGINES.map((engine) => {
    const e = perEngine[engine.id];
    const score = e.score;
    const pct = score === null ? 0 : score;
    const label = score === null ? "no data" : `${score}%`;
    return `
      <div class="bar-row">
        <div class="bar-label">${esc(e.name)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${scoreColor(score)}"></div>
        </div>
        <div class="bar-value">${label}</div>
      </div>`;
  }).join("");

  const tableRows = results
    .map((r) => {
      const cells = ENGINES.map((engine) => {
        const e = r.engines[engine.id];
        if (!e.ok) return `<td class="cell err" title="${esc(e.error)}">⚠ error</td>`;
        const mark = e.brandMentioned
          ? `<span class="yes">✓</span>`
          : `<span class="no">✗</span>`;
        const who = e.mentioned.length
          ? `<div class="who">${e.mentioned.map((n) => esc(n)).join(", ")}</div>`
          : `<div class="who muted">no brands mentioned</div>`;
        return `<td class="cell">${mark}${who}</td>`;
      }).join("");
      return `<tr><td class="q">${esc(r.query)}</td>${cells}</tr>`;
    })
    .join("\n");

  const competitorList = topCompetitors.length
    ? topCompetitors
        .map(
          (c, i) => `
      <li>
        <span class="rank">#${i + 1}</span>
        <span class="cname">${esc(c.name)}</span>
        <span class="ccount">${c.count} mention${c.count === 1 ? "" : "s"}</span>
      </li>`
        )
        .join("")
    : "<li>No competitor mentions detected.</li>";

  const gapItems = gaps.length
    ? gaps.map((g) => `<li>${esc(g.query)}</li>`).join("")
    : "<li>None — the brand appeared in at least one engine for every query. 🎉</li>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Visibility Audit — ${esc(BRAND)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         color: #0f172a; background: #f1f5f9; line-height: 1.5; }
  .page { max-width: 900px; margin: 0 auto; background: #fff; }
  header { background: #0f172a; color: #f8fafc; padding: 48px 48px 40px; }
  header .eyebrow { text-transform: uppercase; letter-spacing: .18em; font-size: 11px; color: #94a3b8; }
  header h1 { font-size: 34px; margin: 8px 0 4px; }
  header .meta { color: #cbd5e1; font-size: 14px; }
  .score-hero { display: flex; align-items: baseline; gap: 14px; margin-top: 28px; }
  .score-hero .big { font-size: 72px; font-weight: 800; color: ${scoreColor(overall)}; }
  .score-hero .sub { color: #94a3b8; font-size: 14px; max-width: 320px; }
  section { padding: 32px 48px; border-bottom: 1px solid #e2e8f0; }
  h2 { font-size: 18px; margin-bottom: 16px; color: #0f172a; }
  .bar-row { display: flex; align-items: center; gap: 12px; margin: 10px 0; }
  .bar-label { width: 190px; font-size: 13px; color: #334155; flex-shrink: 0; }
  .bar-track { flex: 1; height: 18px; background: #e2e8f0; border-radius: 9px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 9px; min-width: 2px; }
  .bar-value { width: 60px; text-align: right; font-weight: 700; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: left; }
  th { background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; }
  td.q { max-width: 300px; }
  .yes { color: #16a34a; font-weight: 800; }
  .no { color: #dc2626; font-weight: 800; }
  .err { color: #d97706; font-size: 11px; }
  .who { font-size: 11px; color: #475569; margin-top: 2px; }
  .muted { color: #94a3b8; }
  ol.competitors { list-style: none; }
  ol.competitors li { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; }
  .rank { font-weight: 800; color: #64748b; width: 34px; }
  .cname { font-weight: 600; flex: 1; }
  .ccount { color: #64748b; font-size: 13px; }
  ul.gaps { padding-left: 20px; }
  ul.gaps li { margin: 6px 0; }
  footer { padding: 24px 48px; color: #94a3b8; font-size: 12px; }
  @media print {
    body { background: #fff; }
    .page { max-width: none; }
    section { page-break-inside: avoid; padding: 24px 32px; }
    header { padding: 32px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .bar-fill, .bar-track { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  @page { size: A4; margin: 12mm; }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="eyebrow">AI Visibility Audit</div>
    <h1>${esc(BRAND)}</h1>
    <div class="meta">${esc(WEBSITE)}${WEBSITE ? " · " : ""}${esc(CATEGORY)} · ${esc(dateStr)}</div>
    <div class="score-hero">
      <div class="big">${overall}%</div>
      <div class="sub">Overall visibility — share of buyer queries where ${esc(
        BRAND
      )} was mentioned, averaged across ${
    Object.values(perEngine).filter((e) => e.score !== null).length
  } AI engines (${results.length} queries).</div>
    </div>
  </header>

  <section>
    <h2>Visibility by engine</h2>
    ${engineBars}
  </section>

  <section>
    <h2>Query results (${results.length} queries × ${ENGINES.length} engines)</h2>
    <table>
      <thead>
        <tr><th>Buyer query</th>${ENGINES.map((e) => `<th>${esc(e.name)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </section>

  <section>
    <h2>Top competitors winning your queries</h2>
    <ol class="competitors">${competitorList}</ol>
  </section>

  <section>
    <h2>Key gaps — queries where ${esc(BRAND)} was absent in all engines (${gaps.length})</h2>
    <ul class="gaps">${gapItems}</ul>
  </section>

  <footer>
    Generated ${esc(new Date().toISOString())} · ${esc(BRAND)} vs ${
    COMPETITORS.map(esc).join(", ") || "—"
  } · Engines: ${ENGINES.map((e) => esc(e.name)).join(", ")}
  </footer>
</div>
</body>
</html>`;
}

/* ---------------------------------------------------------------- main */

async function main() {
  console.log(`AI Visibility Audit — ${BRAND} (${CATEGORY})`);
  console.log(`Competitors: ${COMPETITORS.join(", ") || "(none)"}`);

  console.log(`\n[1/3] Generating ${NUM_QUERIES} buyer queries via OpenAI...`);
  const queries = await generateQueries();
  console.log(`  Got ${queries.length} queries.`);

  console.log(`\n[2/3] Running ${queries.length} queries against ${ENGINES.length} engines (batches of ${BATCH_SIZE})...`);
  const results = await runAudit(queries);

  console.log(`\n[3/3] Scoring & building report...`);
  const summary = summarize(results);
  for (const engine of ENGINES) {
    const e = summary.perEngine[engine.id];
    console.log(
      `  ${e.name}: ${e.score === null ? "no data" : e.score + "%"} ` +
        `(${e.mentioned}/${e.successful} mentioned, ${e.failed} errors)`
    );
  }
  console.log(`  Overall visibility: ${summary.overall}%`);

  const dateStr = new Date().toISOString().slice(0, 10);
  const slug = slugify(BRAND);
  const outDir = path.join(__dirname, "audits");
  fs.mkdirSync(outDir, { recursive: true });

  const htmlPath = path.join(outDir, `${slug}-${dateStr}.html`);
  const jsonPath = path.join(outDir, `${slug}-${dateStr}.json`);

  fs.writeFileSync(htmlPath, buildHTML({ results, summary, dateStr }), "utf8");
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        brand: BRAND,
        website: WEBSITE,
        category: CATEGORY,
        competitors: COMPETITORS,
        date: dateStr,
        overall: summary.overall,
        perEngine: summary.perEngine,
        topCompetitors: summary.topCompetitors,
        gaps: summary.gaps.map((g) => g.query),
        results,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`\nJSON data:  ${jsonPath}`);
  console.log(`\n${htmlPath}`);
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message || err}`);
  process.exit(1);
});
