import { queryOpenAI } from './openai';
import { queryPerplexity } from './perplexity';
import { queryGemini } from './gemini';
import { scoreMentions } from './scorer';

export interface ScanInput {
  brand: { id: string; name: string; website?: string | null; aliases?: string[] };
  keywords: { id: string; text: string; is_active?: boolean }[];
  competitors: { name: string; aliases?: string[] }[];
}

export interface ScanResultRow {
  keyword_id: string;
  platform: 'openai' | 'perplexity' | 'gemini';
  prompt: string;
  response_text: string;
  brand_mentioned: boolean;
  mention_rank: number | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  competitors_mentioned: string[];
  raw_response: string;
  score: number;
  error: boolean;              // true = the LLM call failed (NOT the same as "not mentioned")
}

const PROVIDERS: { platform: ScanResultRow['platform']; fn: (k: string) => Promise<string> }[] = [
  { platform: 'openai', fn: queryOpenAI },
  { platform: 'perplexity', fn: queryPerplexity },
  { platform: 'gemini', fn: queryGemini },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < tries - 1) await sleep(600);
    }
  }
  throw last;
}

export async function runScan({ brand, keywords, competitors }: ScanInput): Promise<ScanResultRow[]> {
  const competitorNames = competitors.flatMap((c) => [c.name, ...(c.aliases ?? [])]);
  const brandAliases = brand.aliases ?? [];
  const activeKeywords = keywords.filter((k) => k.is_active !== false);

  const scanOne = async (
    keyword: { id: string; text: string },
    platform: ScanResultRow['platform'],
    fn: (k: string) => Promise<string>,
  ): Promise<ScanResultRow> => {
    try {
      const response = await withRetry(() => fn(keyword.text));
      const s = scoreMentions(brand.name, brandAliases, competitorNames, response);
      return {
        keyword_id: keyword.id,
        platform,
        prompt: keyword.text,
        response_text: response,
        brand_mentioned: s.mentioned,
        mention_rank: s.position,
        sentiment: s.sentiment,
        competitors_mentioned: s.competitorsMentioned,
        raw_response: response,
        score: s.score,
        error: false,
      };
    } catch {
      // The call failed after retries — record it as an ERROR, not a real 0. The aggregation
      // below excludes errored rows so a transient failure doesn't tank the visibility score.
      return {
        keyword_id: keyword.id,
        platform,
        prompt: keyword.text,
        response_text: '',
        brand_mentioned: false,
        mention_rank: null,
        sentiment: 'neutral',
        competitors_mentioned: [],
        raw_response: '',
        score: 0,
        error: true,
      };
    }
  };

  const results: ScanResultRow[] = [];
  const batchSize = 3; // keywords per batch (×3 providers) — keeps us under rate limits
  for (let i = 0; i < activeKeywords.length; i += batchSize) {
    const batch = activeKeywords.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.flatMap((keyword) => PROVIDERS.map((p) => scanOne(keyword, p.platform, p.fn))),
    );
    results.push(...batchResults);
    if (i + batchSize < activeKeywords.length) await sleep(400);
  }
  return results;
}

/**
 * Aggregate per-provider + overall visibility scores from scan rows. A provider's score is
 * the average of its NON-errored rows (null if every call failed), and visibility is the
 * average of the providers that actually returned data — so one dead engine doesn't drag the
 * number to zero or show a misleading 0.
 */
export function aggregateScores(rows: ScanResultRow[]) {
  const providerAvg = (platform: string): number | null => {
    const ok = rows.filter((r) => r.platform === platform && !r.error);
    if (!ok.length) return null;
    return ok.reduce((sum, r) => sum + r.score, 0) / ok.length;
  };
  const openai = providerAvg('openai');
  const perplexity = providerAvg('perplexity');
  const gemini = providerAvg('gemini');
  const present = [openai, perplexity, gemini].filter((s): s is number => s != null);
  const visibility = present.length ? present.reduce((a, b) => a + b, 0) / present.length : 0;
  const totalMentions = rows.filter((r) => r.brand_mentioned).length;
  const successfulQueries = rows.filter((r) => !r.error).length;
  return { openai, perplexity, gemini, visibility, totalMentions, successfulQueries };
}
