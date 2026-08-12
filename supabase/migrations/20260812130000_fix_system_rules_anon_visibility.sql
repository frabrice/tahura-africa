/*
  # Fix: system_rules is invisible to the current Ops session

  ## Why
  `system_rules`' SELECT policy has always been `TO authenticated USING (true)`
  (from the original 20260625080658 migration) — but Ops still logs in via the
  legacy anon-key session (`portalAuth.login`), not a real Supabase Auth
  session. That means every read of this table from the running app has
  always returned zero rows to `anon`, silently masked by RulesPage.tsx's
  client-side fallback (`getDefaultRules()`), which does NOT include the new
  "Host Revenue Share" row added in 20260812120000.

  ## What this does
  Adds an `anon`-readable SELECT policy alongside the existing authenticated
  one (RLS policies for the same command are OR'd together, so this doesn't
  remove anything) — matching the trust model already used for every other
  operationally-read table in this app (bookings, partner_listings, guides,
  the new payout_ledger/withdrawal_requests/admin_audit_log, etc.). Once this
  runs, RulesPage.tsx's existing `select('*')` call will see the real rows,
  including "Host Revenue Share", without any code change.
*/

CREATE POLICY "select_system_rules_anon"
  ON system_rules FOR SELECT TO anon USING (true);
