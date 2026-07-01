import { MentionScoreResult, Sentiment } from '@/types';

const POSITIVE_WORDS = ['best','top','leading','excellent','recommended','great','trusted','popular','innovative','reliable'];
const NEGATIVE_WORDS = ['avoid','poor','bad','worst','unreliable','expensive','overpriced','disappointing','slow','buggy'];

// Match a brand/competitor name as a WHOLE token, not a substring of a bigger word.
// This is the accuracy fix: without it, "Dub" matches "double", "Cal" matches "calendar",
// "Notion" matches "the notion of" — all false positives that inflate the score.
function tokenRegex(name: string): RegExp {
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu');
}

function countMatches(text: string, name: string): { count: number; first: number } {
  if (!name || !name.trim()) return { count: 0, first: Infinity };
  const re = tokenRegex(name);
  let count = 0, first = Infinity, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    count++;
    if (m.index < first) first = m.index;
    if (m.index === re.lastIndex) re.lastIndex++;   // guard against zero-width loops
  }
  return { count, first };
}

function nameInText(text: string, names: string[]): boolean {
  return names.some(n => countMatches(text, n).count > 0);
}

export function scoreMentions(
  brandName: string,
  aliases: string[],
  competitors: string[],
  llmResponse: string,
): MentionScoreResult {
  const allNames = [brandName, ...(aliases ?? [])].filter(n => n && n.trim());

  let mentionCount = 0;
  let firstMentionIndex = Infinity;
  for (const name of allNames) {
    const { count, first } = countMatches(llmResponse, name);
    mentionCount += count;
    if (first < firstMentionIndex) firstMentionIndex = first;
  }
  const mentioned = mentionCount > 0;

  // Which sentence (1-indexed) does the brand first appear in?
  let position: number | null = null;
  if (mentioned) {
    const sentences = llmResponse.split(/[.!?\n]+/);
    for (let i = 0; i < sentences.length; i++) {
      if (nameInText(sentences[i], allNames)) { position = i + 1; break; }
    }
  }

  // Sentiment from the words around the FIRST mention.
  let sentiment: Sentiment = 'neutral';
  if (mentioned && firstMentionIndex !== Infinity) {
    const w = 200;
    const ctx = llmResponse.slice(Math.max(0, firstMentionIndex - w), firstMentionIndex + w).toLowerCase();
    const pos = POSITIVE_WORDS.filter(x => ctx.includes(x)).length;
    const neg = NEGATIVE_WORDS.filter(x => ctx.includes(x)).length;
    if (pos > neg) sentiment = 'positive';
    else if (neg > pos) sentiment = 'negative';
  }

  const competitorsMentioned = (competitors ?? []).filter(c => countMatches(llmResponse, c).count > 0);

  let excerpt = '';
  if (mentioned) {
    const sentences = llmResponse.split(/[.!?]+/);
    const brandSentences = sentences.filter(s => nameInText(s, allNames));
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
