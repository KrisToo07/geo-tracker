-- ============================================================
-- 003_rls_hardening.sql
--
-- Closes two authorisation holes left by 001_initial.sql. Both are exploitable from the
-- browser with nothing but the public anon key -- no server bug required.
--
-- Run this in the Supabase SQL editor (or `supabase db push`) BEFORE relying on the
-- app-level checks; every server-side ownership check is moot if the client can talk to
-- Postgres directly and RLS lets it through.
-- ============================================================


-- ------------------------------------------------------------
-- 1. profiles: users could grant themselves a paid plan
--
-- 001 created:
--     CREATE POLICY "Users can update own profile"
--       ON public.profiles FOR UPDATE USING (auth.uid() = id);
--
-- RLS controls WHICH ROWS you may touch, not which COLUMNS. `profiles` holds `plan`,
-- `scans_used_this_month`, `stripe_customer_id` and `stripe_subscription_id`, so any logged-in
-- user could run, straight from the browser:
--
--     supabase.from('profiles')
--       .update({ plan: 'agency', scans_used_this_month: 0 })
--       .eq('id', <their own id>)
--
-- ...and get the top paid tier for free, plus unlimited quota resets. Column-level privileges
-- are the mechanism Postgres provides for this; RLS alone cannot express it.
--
-- `service_role` is unaffected (it holds its own grants and bypasses RLS), so the Stripe
-- webhook and the scan-quota accounting keep working.
-- ------------------------------------------------------------

REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;

-- Only genuinely user-owned presentation fields stay writable by the user.
GRANT UPDATE (full_name, avatar_url, onboarding_done)
  ON public.profiles TO authenticated;

-- Same reasoning for INSERT. The handle_new_user() trigger creates the row, so a client never
-- legitimately inserts one with a chosen plan.
REVOKE INSERT ON public.profiles FROM authenticated;
REVOKE INSERT ON public.profiles FROM anon;
GRANT INSERT (id, email, full_name, avatar_url)
  ON public.profiles TO authenticated;


-- ------------------------------------------------------------
-- 2. scan_results: any user could forge rows into any account
--
-- 001 created:
--     CREATE POLICY "Service role insert scan results"
--       ON public.scan_results FOR INSERT WITH CHECK (true);
--
-- The name says "service role", but service_role bypasses RLS entirely and never needed a
-- policy. What this actually did was let the `authenticated` (and `anon`) roles insert
-- arbitrary rows -- including rows carrying someone else's user_id/brand_id. That is result
-- forgery: poisoning another account's dashboard, scores and CSV exports.
--
-- Every real insert comes from the service-role client (scan route + daily-scan cron), so the
-- policy can simply go. The scoped replacement below keeps client-side inserts possible only
-- for the caller's own rows, in case that is ever needed.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Service role insert scan results" ON public.scan_results;

CREATE POLICY "Users insert own scan results" ON public.scan_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 3. Make the FOR ALL policies explicit about inserts/updates.
--
-- `FOR ALL USING (...)` does have Postgres infer WITH CHECK from USING, so these were not
-- broken -- but relying on an inferred clause for the rule that stops a user writing a row
-- into someone else's account is worth making explicit.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Users manage own brands" ON public.brands;
CREATE POLICY "Users manage own brands" ON public.brands
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own keywords" ON public.keywords;
CREATE POLICY "Users manage own keywords" ON public.keywords
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own competitors" ON public.competitors;
CREATE POLICY "Users manage own competitors" ON public.competitors
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own scans" ON public.scans;
CREATE POLICY "Users manage own scans" ON public.scans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own alert rules" ON public.alert_rules;
CREATE POLICY "Users manage own alert rules" ON public.alert_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ------------------------------------------------------------
-- Verification -- run after applying and read the output.
-- ------------------------------------------------------------
-- Expect: authenticated has UPDATE only on full_name, avatar_url, onboarding_done.
--
--   SELECT grantee, privilege_type, column_name
--   FROM information_schema.column_privileges
--   WHERE table_name = 'profiles' AND grantee IN ('authenticated','anon')
--   ORDER BY grantee, privilege_type, column_name;
--
-- Expect: no policy on scan_results with qual/with_check = 'true'.
--
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
--
-- Expect: rowsecurity = true for all 7 tables.
--
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' ORDER BY tablename;
