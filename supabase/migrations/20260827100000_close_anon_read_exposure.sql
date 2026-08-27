/*
  # Close anonymous read exposure on internal/financial/PII tables

  ## Why
  A live RLS sweep found 12 tables still carrying a leftover
  `TO anon, authenticated USING (true)` SELECT policy from
  `20260505095105_restore_core_tables_part1.sql` / `..._part4.sql` /
  `..._part5.sql` (a "restore core tables" pass). Later hardening passes
  (Track A/B) correctly replaced the dangerous anon *write* policies on
  most of these tables but explicitly left reads alone under the rule
  "reads aren't the risk for a public marketplace" — a rule that is
  correct for `partner_listings`/`institution_profiles`/`partner_hosts`
  (genuinely public browsing) but was never revisited for tables that
  aren't public marketplace data at all: portal account PII, support
  conversations, admin tooling, and financial ledgers.

  Every replacement policy below was checked against the actual frontend
  call sites before being written — not assumed. In particular:
  - `portal_users` had NO self-select policy at all before this migration
    (only the anon-open one and an ops-ALL policy) — dropping the anon
    policy without adding a self-select one would have broken every
    portal login's session classification
    (`AuthContext.tsx:classifySupabaseSession`, `auth.ts` login) and the
    partner settings page. Confirmed via grep that every other
    `portal_users` read in the codebase is either already covered by
    `is_active_ops_admin()` (all ops pages) or reads the caller's own row
    by a uuid it already obtained from its own session.
  - `support_tickets`/`ticket_messages` ownership columns
    (`created_by_auth_id`/`created_by_portal_id`/`created_by_host_id`/
    `created_by_guide_id`) were confirmed against
    `SupportChatWidget.tsx`'s `TICKET_ORIGIN_COLUMN` map and the
    `HostDashboard.tsx`/`GuideDashboard.tsx` identity objects that feed
    it — `created_by_host_id`/`created_by_guide_id` store
    `partner_hosts.id`/`guides.id`, not an auth id directly.
  - `admin_conversations`/`admin_messages` have zero frontend consumers
    at all (grepped, no matches) — this looks like dead/unbuilt code.
    Their existing `authenticated` policies are already correctly scoped
    and are left alone; only the anon policies are removed.
  - `custom_quotes` is handled in a separate migration
    (`20260827100500_add_public_quote_rpcs.sql`) because it has a genuine
    anonymous use case (a traveler paying a shared quote link with no
    account) tangled with internal commission fields that must never be
    client-visible — it needs an RPC, not just a policy swap.

  Nothing here changes any *write* policy that Track A/B already fixed.
*/

-- ============================================================
-- 1. portal_users — add the missing self-select, then drop anon-open
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view portal users" ON portal_users;

CREATE POLICY "self_select_portal_users" ON portal_users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- (ops_full_access_portal_users, ALL, is_active_ops_admin() — already exists, covers ops)

-- ============================================================
-- 2. support_tickets / ticket_messages
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view support tickets" ON support_tickets;

CREATE POLICY "own_or_ops_select_support_tickets" ON support_tickets FOR SELECT TO authenticated
  USING (
    created_by_auth_id = auth.uid()
    OR created_by_portal_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
    OR target_portal_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
    OR created_by_host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid())
    OR created_by_guide_id IN (SELECT id FROM guides WHERE traveler_user_id = auth.uid())
    OR assigned_to IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
    OR public.is_active_ops_admin()
  );

DROP POLICY IF EXISTS "Anyone can view ticket messages" ON ticket_messages;

CREATE POLICY "own_or_ops_select_ticket_messages" ON ticket_messages FOR SELECT TO authenticated
  USING (
    public.is_active_ops_admin()
    OR ticket_id IN (
      SELECT id FROM support_tickets WHERE
        created_by_auth_id = auth.uid()
        OR created_by_portal_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
        OR target_portal_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
        OR created_by_host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid())
        OR created_by_guide_id IN (SELECT id FROM guides WHERE traveler_user_id = auth.uid())
        OR assigned_to IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
    )
  );

-- ============================================================
-- 3. admin_conversations / admin_messages — no frontend consumer at
--    all; leave the existing (correctly-scoped) authenticated policies
--    in place, just remove the anon ones.
-- ============================================================
DROP POLICY IF EXISTS "Anon can create admin conversations" ON admin_conversations;
DROP POLICY IF EXISTS "Anon can view admin conversations" ON admin_conversations;

DROP POLICY IF EXISTS "Anyone can send admin messages" ON admin_messages;
DROP POLICY IF EXISTS "Anyone can view admin messages" ON admin_messages;

CREATE POLICY "ops_insert_admin_messages" ON admin_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_active_ops_admin());

CREATE POLICY "ops_select_admin_messages" ON admin_messages FOR SELECT TO authenticated
  USING (public.is_active_ops_admin());

-- ============================================================
-- 4. admin_audit_log — ops only, no legitimate reader otherwise
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view audit log" ON admin_audit_log;

CREATE POLICY "ops_select_admin_audit_log" ON admin_audit_log FOR SELECT TO authenticated
  USING (public.is_active_ops_admin());

-- ============================================================
-- 5. Financial ledgers — own rows or ops
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view payout ledger" ON payout_ledger;

CREATE POLICY "own_or_ops_select_payout_ledger" ON payout_ledger FOR SELECT TO authenticated
  USING (
    public.is_active_ops_admin()
    OR partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
    OR institution_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
    OR host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid())
    OR guide_id IN (SELECT id FROM guides WHERE traveler_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can view institution settlements" ON institution_settlements;

CREATE POLICY "own_or_ops_select_institution_settlements" ON institution_settlements FOR SELECT TO authenticated
  USING (
    public.is_active_ops_admin()
    OR institution_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
    OR guide_id IN (SELECT id FROM guides WHERE traveler_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can view guide salary payments" ON guide_salary_payments;

CREATE POLICY "own_or_ops_select_guide_salary_payments" ON guide_salary_payments FOR SELECT TO authenticated
  USING (
    public.is_active_ops_admin()
    OR institution_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
    OR guide_id IN (SELECT id FROM guides WHERE traveler_user_id = auth.uid())
  );

-- ============================================================
-- 6. content_flags — ops-only moderation tool (FlagContentModal is
--    only ever mounted from operations pages)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can create content flags" ON content_flags;
DROP POLICY IF EXISTS "Anyone can view content flags" ON content_flags;

CREATE POLICY "ops_insert_content_flags" ON content_flags FOR INSERT TO authenticated
  WITH CHECK (public.is_active_ops_admin());

CREATE POLICY "ops_select_content_flags" ON content_flags FOR SELECT TO authenticated
  USING (public.is_active_ops_admin());

-- ============================================================
-- 7. email_logs — zero client consumers at all; only the send-email
--    edge function writes it, via the service role (bypasses RLS).
--    Scoped to ops so a future admin viewer doesn't need another
--    migration, but nothing currently reads this table.
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert email logs" ON email_logs;
DROP POLICY IF EXISTS "Anyone can view email logs" ON email_logs;

CREATE POLICY "ops_select_email_logs" ON email_logs FOR SELECT TO authenticated
  USING (public.is_active_ops_admin());

-- ============================================================
-- 8. listing_submissions — the correct authenticated SELECT policies
--    (host/partner/ops, all properly scoped) already exist alongside
--    the leftover anon one; just remove the anon one.
-- ============================================================
DROP POLICY IF EXISTS "Anon can view listing submissions" ON listing_submissions;
