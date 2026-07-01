import { MentionScoreResult, Sentiment } from '@/types';

const POSITIVE_WORDS = ['best','top','leading','excellent','recommended','great','trusted','popular','innovative','reliable'];
const NEGATIVE_WORDS = ['avoid','poor','bad','worst','unreliable','expensive','overpriced','disappointing','slow','buggy'];

export function scoreMentions(
  brandName: string,
  aliases: string[],
  competitors: string[],
  llmResponse: string
): MentionScoreResult {
  const text = llmResponse.toLowerCase();
  const allNames = [brandName, ...aliases].map(n => n.toLowerCase());

  let mentionCount = 0;
  let firstMentionIndex = Infinity;
  for (const name of allNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    // Use exec loop instead of spread to avoid downlevelIteration requirement
    let match: RegExpExecArray | null;
    let localCount = 0;
    while ((match = regex.exec(llmResponse)) !== null) {
      localCount++;
      if (match.index < firstMentionIndex) firstMentionIndex = match.index;
    }
    mentionCount += localCount;
  }

  const mentioned = mentionCount > 0;

  let position: number | null = null;
  if (mentioned) {
    const sentences = llmResponse.split(/[.!?\n]+/);
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i].toLowerCase();
      if (allNames.some(n => s.includes(n))) {
        position = i + 1;
        break;
      }
    }
  }

  let sentiment: Sentiment = 'neutral';
  if (mentioned) {
    const contextWindow = 200;
    let contextText = '';
    for (const name of allNames) {
      const idx = text.indexOf(name.toLowerCase());
      if (idx !== -1) {
        contextText += text.slice(Math.max(0, idx - contextWindow), idx + contextWindow);
      }
    }
    const posCount = POSITIVE_WORDS.filter(w => contextText.includes(w)).length;
    const negCount = NEGATIVE_WORDS.filter(w => contextText.includes(w)).length;
    if (posCount > negCount) sentiment = 'positive';
    else if (negCount > posCount) sentiment = 'negative';
  }

  const competitorsMentioned = competitors.filter(c => text.includes(c.toLowerCase()));

  let excerpt = '';
  if (mentioned) {
    const sentences = llmResponse.split(/[.!?]+/);
    const brandSentences = sentences.filter(s =>
      allNames.some(n => s.toLowerCase().includes(n))
    );
    excerpt = brandSentences.slice(0, 2).join('. ').trim().slice(0, 300);
  }

  let score = 0;
  if (mentioned) {
    score += 40;
    if (position === 1) score += 20;
    else if (position !== null && position <= 3) score += 10;
    score += Math.min(20, (mentionCount - 1) * 5);
    if (sentiment === 'positive') score += 10;
    if (sentiment === 'negative') score -= 10;
    score -= competitorsMentioned.length * 5;
  }

  score = Math.max(0, Math.min(100, score));

  return { mentioned, mentionCount, position, sentiment, competitorsMentioned, excerpt, score };
}
