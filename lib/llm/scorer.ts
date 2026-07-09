import { MentionScoreResult, Sentiment } from '@/types';

const POSITIVE_WORDS = ['best','top','leading','excellent','recommended','great','trusted','popular','innovative','reliable'];
const NEGATIVE_WORDS = ['avoid','poor','bad','worst','unreliable','expensive','overpriced','disappointing','slow','buggy'];

// Brands are written inconsistently: "McDonald's", "McDonalds", "McDonald’s" (curly apostrophe).
// Strip apostrophes (straight, curly, backtick) so a brand stored as "Mcdonalds" matches them all.
// This was the bug where ChatGPT/Gemini said "McDonald's" but the scan marked it not-mentioned.
function norm(s: string): string {
  return (s || '').replace(/['‘’ʼ`´]/g, '');
}

// Match a name as a WHOLE token, not a substring ("Dub" must not match "dubbed").
function tokenRegex(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu');
}

// Count whole-token occurrences of `normName` in `normText` (both already apostrophe-normalized).
function countIn(normText: string, normName: string): { count: number; first: number } {
  if (!normName || !normName.trim()) return { count: 0, first: Infinity };
  const re = tokenRegex(normName);
  let count = 0, first = Infinity, m: RegExpExecArray | null;
  while ((m = re.exec(normText)) !== null) {
    count++;
    if (m.index < first) first = m.index;
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return { count, first };
}

// --- Citation awareness ---------------------------------------------------

// Pull inline URLs out of answer text (ChatGPT/Gemini often write plain or
// markdown links even without engine-level citations).
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
export function extractInlineUrls(text: string): string[] {
  return Array.from(new Set((text.match(URL_RE) ?? []).map(u => u.replace(/[.,;:!?]+$/, ''))));
}

// "https://www.Framer.com/blog/x" -> "framer.com"
export function urlToDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

/** True when `domain` is the brand's domain or a subdomain of it. */
function domainMatches(domain: string, brandDomain: string): boolean {
  return domain === brandDomain || domain.endsWith('.' + brandDomain);
}

export interface CitationResult {
  cited: boolean;          // brand's own domain appears in the sources
  citedSources: string[];  // the matching URLs
  totalSources: number;    // how many sources the answer had at all
}

export function scoreCitations(
  brandWebsite: string | null | undefined,
  engineCitations: string[],
  responseText: string,
): CitationResult {
  const allUrls = Array.from(new Set([...(engineCitations ?? []), ...extractInlineUrls(responseText)]));
  const brandDomain = brandWebsite
    ? (urlToDomain(brandWebsite.startsWith('http') ? brandWebsite : `https://${brandWebsite}`) ?? '')
    : '';
  if (!brandDomain) return { cited: false, citedSources: [], totalSources: allUrls.length };

  const citedSources = allUrls.filter(u => {
    const d = urlToDomain(u);
    return d !== null && domainMatches(d, brandDomain);
  });
  return { cited: citedSources.length > 0, citedSources, totalSources: allUrls.length };
}

// --- Mention scoring --------------------------------------------------------

export function scoreMentions(
  brandName: string,
  aliases: string[],
  competitors: string[],
  llmResponse: string,
  options?: { brandWebsite?: string | null; engineCitations?: string[] },
): MentionScoreResult {
  const names = [brandName, ...(aliases ?? [])].filter(n => n && n.trim()).map(norm);
  const normResponse = norm(llmResponse);
  const nameInText = (t: string) => names.some(n => countIn(norm(t), n).count > 0);

  let mentionCount = 0;
  let firstMentionIndex = Infinity;
  for (const n of names) {
    const { count, first } = countIn(normResponse, n);
    mentionCount += count;
    if (first < firstMentionIndex) firstMentionIndex = first;
  }
  const mentioned = mentionCount > 0;

  let position: number | null = null;
  if (mentioned) {
    const sentences = llmResponse.split(/[.!?\n]+/);
    for (let i = 0; i < sentences.length; i++) {
      if (nameInText(sentences[i])) { position = i + 1; break; }
    }
  }

  let sentiment: Sentiment = 'neutral';
  if (mentioned && firstMentionIndex !== Infinity) {
    const w = 200;
    const ctx = normResponse.slice(Math.max(0, firstMentionIndex - w), firstMentionIndex + w).toLowerCase();
    const pos = POSITIVE_WORDS.filter(x => ctx.includes(x)).length;
    const neg = NEGATIVE_WORDS.filter(x => ctx.includes(x)).length;
    if (pos > neg) sentiment = 'positive';
    else if (neg > pos) sentiment = 'negative';
  }

  const competitorsMentioned = (competitors ?? []).filter(c => countIn(normResponse, norm(c)).count > 0);

  let excerpt = '';
  if (mentioned) {
    const sentences = llmResponse.split(/[.!?]+/);
    const brandSentences = sentences.filter(s => nameInText(s));
    excerpt = brandSentences.slice(0, 2).join('. ').trim().slice(0, 300);
  }

  // Citation awareness: a mention BACKED BY the brand's own site as a source is
  // stronger than a passing mention — engines that cite you are pulling your
  // content into answers, and that tends to persist across re-asks.
  const citation = scoreCitations(
    options?.brandWebsite,
    options?.engineCitations ?? [],
    llmResponse,
  );

  // Score rubric (kept comparable across engines):
  //   base mention 35, position #1 +20 / top-3 +10, repeats up to +15,
  //   sentiment ±10, cited-with-mention +20, competitor crowding -5 each.
  // A citation with NO mention still counts a little (+10): your site is
  // sourced even though your name didn't surface.
  let score = 0;
  if (mentioned) {
    score += 35;
    if (position === 1) score += 20;
    else if (position !== null && position <= 3) score += 10;
    score += Math.min(15, (mentionCount - 1) * 5);
    if (sentiment === 'positive') score += 10;
    if (sentiment === 'negative') score -= 10;
    if (citation.cited) score += 20;
    score -= competitorsMentioned.length * 5;
  } else if (citation.cited) {
    score += 10;
  }
  score = Math.max(0, Math.min(100, score));

  return {
    mentioned,
    mentionCount,
    position,
    sentiment,
    competitorsMentioned,
    excerpt,
    score,
    cited: citation.cited,
    citedSources: citation.citedSources,
    totalSources: citation.totalSources,
  };
}
