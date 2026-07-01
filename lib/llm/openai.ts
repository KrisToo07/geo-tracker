import OpenAI from 'openai';
import { buildScanPrompt } from './prompt';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' });
  }
  return _client;
}

const SYSTEM_PROMPT = `You are a helpful assistant answering questions about products, services, and brands. 
Be comprehensive and mention specific brands, companies, and tools when relevant to the question. 
Provide balanced, informative responses that help users make decisions.`;

export async function queryOpenAI(keyword: string): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildScanPrompt(keyword) },
    ],
    max_tokens: 800,
    temperature: 0.3,
  });
  return response.choices[0]?.message?.content || '';
}
