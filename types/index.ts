// types/index.ts

export type LLMProvider = 'openai' | 'perplexity' | 'gemini';
export type PlanTier = 'free' | 'pro' | 'agency';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type ScanFrequency = 'manual' | 'daily' | 'weekly';
export type KeywordCategory = 'awareness' | 'comparison' | 'purchase' | 'general';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  plan: PlanTier;
  plan_expires_at: string | null;
  scans_used_this_month: number;
  scans_reset_at: string;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  domain: string | null;
  description: string | null;
  aliases: string[];
  is_active: boolean;
  scan_frequency: ScanFrequency;
  created_at: string;
  updated_at: string;
  // joined
  latest_scan?: Scan | null;
  keywords?: Keyword[];
  competitors?: Competitor[];
}

export interface Keyword {
  id: string;
  brand_id: string;
  user_id: string;
  text: string;
  category: KeywordCategory;
  is_active: boolean;
  created_at: string;
}

export interface Competitor {
  id: string;
  brand_id: string;
  user_id: string;
  name: string;
  domain: string | null;
  aliases: string[];
  created_at: string;
}

export interface Scan {
  id: string;
  brand_id: string;
  user_id: string;
  triggered_by: 'cron' | 'manual';
  status: ScanStatus;
  visibility_score: number | null;
  openai_score: number | null;
  perplexity_score: number | null;
  gemini_score: number | null;
  total_mentions: number;
  total_queries: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  // joined
  brand?: Brand;
  results?: ScanResult[];
}

export interface ScanResult {
  id: string;
  scan_id: string;
  brand_id: string;
  keyword_id: string;
  llm_provider: LLMProvider;
  mentioned: boolean;
  mention_count: number;
  position: number | null;
  sentiment: Sentiment;
  competitors_mentioned: string[];
  excerpt: string | null;
  raw_response: string | null;
  score: number;
  created_at: string;
  // joined
  keyword?: Keyword;
}

export interface AlertRule {
  id: string;
  brand_id: string;
  user_id: string;
  type: 'score_drop' | 'not_mentioned';
  threshold: number | null;
  is_active: boolean;
  created_at: string;
}

export interface PlanLimits {
  brands: number;
  keywords: number;
  scansPerMonth: number;
  autoScan: boolean;
  csvExport: boolean;
}

export interface Plan {
  id: PlanTier;
  name: string;
  price: number;
  priceId: string;
  limits: PlanLimits;
  features: string[];
}

export interface MentionScoreResult {
  mentioned: boolean;
  mentionCount: number;
  position: number | null;
  sentiment: Sentiment;
  competitorsMentioned: string[];
  excerpt: string;
  score: number;
}

export interface LLMQueryResult {
  provider: LLMProvider;
  keyword: string;
  keywordId: string;
  response: string;
  score: MentionScoreResult;
}

export interface ScanResultData {
  results: LLMQueryResult[];
  visibilityScore: number;
  openaiScore: number;
  perplexityScore: number;
  geminiScore: number;
  totalMentions: number;
  totalQueries: number;
}
