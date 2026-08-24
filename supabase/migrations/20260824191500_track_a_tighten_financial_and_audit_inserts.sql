/*
  # Track A follow-up: tighten the anon-INSERT policies that were still
  live after the main RLS rewrite

  ## Why
  A post-migration diagnostic query against pg_policies confirmed most of
  the remaining anon-INSERT-open tables are legitimate public forms
  (reviews, waitlist signup, support tickets, guide tips, job
  applications) and were left alone deliberately. Four were not:
  - institution_settlements / guide_salary_payments are payout records —
    anon being able to insert an arbitrary settlement or salary payment
    row is a fabrication risk, not a "contact form" risk.
  - admin_audit_log allowed anon to write arbitrary entries into what's
    supposed to be a trustworthy audit trail — defeats its own purpose.
  - host_availability_overrides had a leftover "Authenticated can manage"
    policy whose roles array actually included anon, now redundant with
    (and more permissive than) the ops/partner-scoped policies already
    added in the main rewrite.
*/

DROP POLICY IF EXISTS "Anyone can create institution settlements" ON institution_settlements;
CREATE POLICY "ops_insert_institution_settlements" ON institution_settlements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Anyone can create guide salary payments" ON guide_salary_payments;
CREATE POLICY "ops_insert_guide_salary_payments" ON guide_salary_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Anyone can write audit log" ON admin_audit_log;
CREATE POLICY "authenticated_write_audit_log" ON admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage host availability overrides" ON host_availability_overrides;
