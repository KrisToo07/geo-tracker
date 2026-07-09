-- Citation-aware scoring: record whether the brand's own domain appeared
-- among an answer's sources (engine citations or inline URLs), and which ones.
ALTER TABLE public.scan_results
  ADD COLUMN IF NOT EXISTS cited BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cited_sources TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.scan_results.cited IS
  'Brand''s own domain appeared among the answer''s sources (Perplexity citations, Gemini grounding, or inline URLs).';
COMMENT ON COLUMN public.scan_results.cited_sources IS
  'The specific source URLs that matched the brand''s domain.';
