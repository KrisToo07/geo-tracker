// Sanity-test citation-aware scoring by transpiling scorer.ts on the fly.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import ts from 'typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let src = readFileSync(join(ROOT, 'lib', 'llm', 'scorer.ts'), 'utf8');
src = src.replace("import { MentionScoreResult, Sentiment } from '@/types';", '');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 } }).outputText;
const tmp = join(mkdtempSync(join(tmpdir(), 'scorer-')), 'scorer.mjs');
writeFileSync(tmp, js);
const { scoreMentions } = await import(pathToFileURL(tmp).href);

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra); }
}

// 1. Mention + engine citation of brand domain -> cited, higher score
const withCite = scoreMentions('Framer', [], ['Webflow'],
  'Framer is a top choice for no-code sites. Webflow is also popular.',
  { brandWebsite: 'https://framer.com', engineCitations: ['https://www.framer.com/blog/launch', 'https://webflow.com/x'] });
check('cited=true with engine citation', withCite.cited === true, JSON.stringify(withCite));
check('citedSources has framer url', withCite.citedSources.length === 1);

// 2. Same answer, no citations -> same minus 20
const noCite = scoreMentions('Framer', [], ['Webflow'],
  'Framer is a top choice for no-code sites. Webflow is also popular.',
  { brandWebsite: 'https://framer.com', engineCitations: [] });
check('citation bonus is +20', withCite.score - noCite.score === 20, `${withCite.score} vs ${noCite.score}`);

// 3. Inline URL in text counts as citation (ChatGPT case)
const inline = scoreMentions('Framer', [], [],
  'Check out Framer (https://framer.com/templates) for templates.',
  { brandWebsite: 'framer.com', engineCitations: [] });
check('inline URL detected', inline.cited === true);

// 4. Subdomain matches
const sub = scoreMentions('Framer', [], [],
  'Framer docs are at their site.',
  { brandWebsite: 'https://framer.com', engineCitations: ['https://docs.framer.com/guide'] });
check('subdomain matches', sub.cited === true);

// 5. Similar-but-different domain does NOT match (framer.community != framer.com)
const near = scoreMentions('Framer', [], [],
  'Framer is discussed here.',
  { brandWebsite: 'https://framer.com', engineCitations: ['https://framer.community/thread'] });
check('lookalike domain rejected', near.cited === false);

// 6. Cited but NOT mentioned -> small credit, mentioned stays false
const citeOnly = scoreMentions('Framer', [], [],
  'For no-code sites there are several options according to sources.',
  { brandWebsite: 'https://framer.com', engineCitations: ['https://framer.com/blog'] });
check('cite-without-mention: mentioned=false', citeOnly.mentioned === false);
check('cite-without-mention: score=10', citeOnly.score === 10, String(citeOnly.score));

// 7. No website on brand -> never cited, no crash
const noSite = scoreMentions('Framer', [], [], 'Framer is great.',
  { brandWebsite: null, engineCitations: ['https://framer.com'] });
check('no website -> cited=false', noSite.cited === false);

// 8. Backwards compat: options omitted entirely
const legacy = scoreMentions('Framer', [], [], 'Framer is the best tool.');
check('legacy call works', legacy.mentioned === true && legacy.cited === false);

// 9. Old bug still fixed: apostrophe brands + token boundary
const apos = scoreMentions('McDonalds', [], [], "McDonald's is the best choice.");
check('apostrophe normalization intact', apos.mentioned === true);
const dub = scoreMentions('Dub', [], [], 'The film was dubbed in French.');
check('token boundary intact', dub.mentioned === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
