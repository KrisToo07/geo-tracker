const PERPLEXITY_SYSTEM_PROMPT = `You are a helpful assistant answering questions about products, services, and brands. 
Be comprehensive and mention specific brands, companies, and tools when relevant. 
Provide balanced, informative responses.`;

export async function queryPerplexity(keyword: string): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        { role: 'system', content: PERPLEXITY_SYSTEM_PROMPT },
        { role: 'user', content: keyword },
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
  return data.choices?.[0]?.message?.content || '';
}
