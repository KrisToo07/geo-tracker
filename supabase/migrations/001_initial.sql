-- GEO Tracker — Complete Database Schema
-- Run this in your Supabase SQL editor

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  full_name             TEXT,
  avatar_url            TEXT,
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT,
  plan                  TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','agency')),
  plan_expires_at       TIMESTAMPTZ,
  scans_used_this_month INT NOT NULL DEFAULT 0,
  scans_reset_at        TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  onboarding_done       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BRANDS
-- ============================================================
CREATE TABLE public.brands (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  website        TEXT,
  domain         TEXT GENERATED ALWAYS AS (
    CASE WHEN website IS NOT NULL
      THEN regexp_replace(website, '^https?://(www\.)?', '')
      ELSE NULL
    END
  ) STORED,
  description    TEXT,
  aliases        TEXT[] NOT NULL DEFAULT '{}',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  scan_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (scan_frequency IN ('manual','daily','weekly')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- KEYWORDS
-- ============================================================
CREATE TABLE public.keywords (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('awareness','comparison','purchase','general')),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COMPETITORS
-- ============================================================
CREATE TABLE public.competitors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  website    TEXT,
  aliases    TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SCANS
-- ============================================================
CREATE TABLE public.scans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  triggered_by     TEXT NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('cron','manual')),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  visibility_score NUMERIC(5,2),
  openai_score     NUMERIC(5,2),
  perplexity_score NUMERIC(5,2),
  gemini_score     NUMERIC(5,2),
  total_mentions   INT NOT NULL DEFAULT 0,
  total_queries    INT NOT NULL DEFAULT 0,
  error_message    TEXT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SCAN RESULTS
-- ============================================================
CREATE TABLE public.scan_results (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id               UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  brand_id              UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  keyword_id            UUID REFERENCES public.keywords(id) ON DELETE SET NULL,
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  llm_provider          TEXT NOT NULL CHECK (llm_provider IN ('openai','perplexity','gemini')),
  mentioned             BOOLEAN NOT NULL DEFAULT FALSE,
  mention_count         INT NOT NULL DEFAULT 0,
  position              INT,
  sentiment             TEXT NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('positive','neutral','negative')),
  competitors_mentioned TEXT[] NOT NULL DEFAULT '{}',
  excerpt               TEXT,
  raw_response          TEXT,
  score                 NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ALERT RULES
-- ============================================================
CREATE TABLE public.alert_rules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('score_drop','not_mentioned')),
  threshold  NUMERIC(5,2),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_brands_user_id ON public.brands(user_id);
CREATE INDEX idx_keywords_brand_id ON public.keywords(brand_id);
CREATE INDEX idx_competitors_brand_id ON public.competitors(brand_id);
CREATE INDEX idx_scans_brand_id ON public.scans(brand_id);
CREATE INDEX idx_scans_user_id ON public.scans(user_id);
CREATE INDEX idx_scans_created_at ON public.scans(created_at DESC);
CREATE INDEX idx_scan_results_scan_id ON public.scan_results(scan_id);
CREATE INDEX idx_scan_results_brand_id ON public.scan_results(brand_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Brands
CREATE POLICY "Users manage own brands" ON public.brands FOR ALL USING (auth.uid() = user_id);

-- Keywords
CREATE POLICY "Users manage own keywords" ON public.keywords FOR ALL USING (auth.uid() = user_id);

-- Competitors
CREATE POLICY "Users manage own competitors" ON public.competitors FOR ALL USING (auth.uid() = user_id);

-- Scans
CREATE POLICY "Users manage own scans" ON public.scans FOR ALL USING (auth.uid() = user_id);

-- Scan Results — users can read their own; service role can insert
CREATE POLICY "Users view own scan results" ON public.scan_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role insert scan results" ON public.scan_results
  FOR INSERT WITH CHECK (true);

-- Alert Rules
CREATE POLICY "Users manage own alert rules" ON public.alert_rules FOR ALL USING (auth.uid() = user_id);
