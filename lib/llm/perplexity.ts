import { buildScanPrompt } from './prompt';
import { LLMReply } from './types';

const PERPLEXITY_SYSTEM_PROMPT = `You are a helpful assistant answering questions about products, services, and brands.
Be comprehensive and mention specific brands, companies, and tools when relevant.
Provide balanced, informative responses.`;

export async function queryPerplexity(keyword: string): Promise<LLMReply> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: PERPLEXITY_SYSTEM_PROMPT },
        { role: 'user', content: buildScanPrompt(keyword) },
      ],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Perplexity API error: ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  // Perplexity returns real source URLs: older responses have `citations: string[]`,
  // newer ones also have `search_results: [{ title, url, date }]`. Merge both.
  const citations: string[] = [];
  if (Array.isArray(data.citations)) {
    for (const c of data.citations) if (typeof c === 'string') citations.push(c);
  }
  if (Array.isArray(data.search_results)) {
    for (const r of data.search_results) if (r && typeof r.url === 'string') citations.push(r.url);
  }

  return { text, citations: Array.from(new Set(citations)) };
}
