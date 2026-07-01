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
}

export async function runScan({ brand, keywords, competitors }: ScanInput): Promise<ScanResultRow[]> {
  const competitorNames = competitors.flatMap(c => [c.name, ...(c.aliases ?? [])]);
  const brandAliases = brand.aliases ?? [];
  const activeKeywords = keywords.filter(k => k.is_active !== false);
  const results: ScanResultRow[] = [];

  const batchSize = 3;
  for (let i = 0; i < activeKeywords.length; i += batchSize) {
    const batch = activeKeywords.slice(i, i + batchSize);

    const batchPromises = batch.flatMap(keyword => [
      queryOpenAI(keyword.text)
        .then(response => {
          const score = scoreMentions(brand.name, brandAliases, competitorNames, response);
          return {
            keyword_id: keyword.id,
            platform: 'openai' as const,
            prompt: keyword.text,
            response_text: response,
            brand_mentioned: score.mentioned,
            mention_rank: score.position,
            sentiment: score.sentiment,
            competitors_mentioned: score.competitorsMentioned,
            raw_response: response,
            score: score.score,
          };
        })
        .catch(() => ({
          keyword_id: keyword.id,
          platform: 'openai' as const,
          prompt: keyword.text,
          response_text: '',
          brand_mentioned: false,
          mention_rank: null,
          sentiment: 'neutral' as const,
          competitors_mentioned: [],
          raw_response: '',
          score: 0,
        })),

      queryPerplexity(keyword.text)
        .then(response => {
          const score = scoreMentions(brand.name, brandAliases, competitorNames, response);
          return {
            keyword_id: keyword.id,
            platform: 'perplexity' as const,
            prompt: keyword.text,
            response_text: response,
            brand_mentioned: score.mentioned,
            mention_rank: score.position,
            sentiment: score.sentiment,
            competitors_mentioned: score.competitorsMentioned,
            raw_response: response,
            score: score.score,
          };
        })
        .catch(() => ({
          keyword_id: keyword.id,
          platform: 'perplexity' as const,
          prompt: keyword.text,
          response_text: '',
          brand_mentioned: false,
          mention_rank: null,
          sentiment: 'neutral' as const,
          competitors_mentioned: [],
          raw_response: '',
          score: 0,
        })),

      queryGemini(keyword.text)
        .then(response => {
          const score = scoreMentions(brand.name, brandAliases, competitorNames, response);
          return {
            keyword_id: keyword.id,
            platform: 'gemini' as const,
            prompt: keyword.text,
            response_text: response,
            brand_mentioned: score.mentioned,
            mention_rank: score.position,
            sentiment: score.sentiment,
            competitors_mentioned: score.competitorsMentioned,
            raw_response: response,
            score: score.score,
          };
        })
        .catch(() => ({
          keyword_id: keyword.id,
          platform: 'gemini' as const,
          prompt: keyword.text,
          response_text: '',
          brand_mentioned: false,
          mention_rank: null,
          sentiment: 'neutral' as const,
          competitors_mentioned: [],
          raw_response: '',
          score: 0,
        })),
    ]);

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (i + batchSize < activeKeywords.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}
