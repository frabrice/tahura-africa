/*
  # Payout ledger, withdrawals, partner payout settings, admin audit log

  ## Why
  Host Wallet, Guide Wallet, Partner Earnings, and Ops Finances each currently
  compute "how much money does X have" independently, with three different
  hardcoded commission numbers (10% in Finances/Control Room, a 95/5 split in
  Partner Earnings, a disconnected 7% default in System Rules) and zero
  reconciliation between a partner's revenue and an assigned host's cut of the
  same booking — both sides currently show ~90-100% of the same money as their
  own. `HostWalletPage.tsx`/`GuideWalletPage.tsx`'s "Withdraw" button is also
  UI-only today (flips a local flag, writes nothing to Supabase).

  ## What this does
  1. `payout_ledger` — one immutable row per booking, written by a trigger the
     instant `bookings.payment_status` flips to 'paid' (fires identically for
     both Pesapal and InTouch, since both edge functions just update the same
     column). Snapshots the commission rate and host-share rate at write time,
     splits the remainder between host and partner. This becomes the single
     source of truth every wallet/earnings/finance page reads from instead of
     recomputing their own math.
  2. `withdrawal_requests` — a real request/approval record. A BEFORE INSERT
     trigger revalidates the amount against the live available balance
     server-side (defense in depth beyond the client-side check in the
     existing WithdrawModal). Approval is one step: Ops sets status='paid',
     which is immediately reflected in the balance functions below.
  3. `partner_payout_settings` — backs the Partner Console Settings page's
     Notifications/Payout/Policy tabs, which currently `setTimeout` a fake
     "Saved" toast and persist nothing.
  4. `admin_audit_log` — a real action log, replacing AuditPage.tsx's current
     synthetic feed (last 20 tickets + last 20 bookings merged, which isn't an
     audit trail of admin actions at all).
  5. `partner_hosts.revenue_share_pct` (nullable per-host override) and a new
     `system_rules` row (id '9', "Host Revenue Share", default 60%) as the
     platform-wide default.
  6. `partner_listings.guide_id` — lets a Partner attach an Ops-pool guide to
     their own Experience/Journey listing (guides remain Ops-owned; this only
     adds an assignment link, mirroring the existing host_id column).
  7. Tightens `system_rules` UPDATE/INSERT so a random authenticated Supabase
     user can no longer edit the commission rate directly via the client SDK
     (the existing policy was `TO authenticated USING (true)` — anyone logged
     in, not just Operations). Kept anon-writable for now, matching the actual
     current admin login flow (still anon-key, pre Supabase-Auth-migration) —
     same phased approach as 20260724120000_harden_portal_users_auth.sql.

  ## What this does NOT do
  Institution/attraction booking revenue isn't split further (no institution
  wallet exists in the app; only `platform_commission` is recorded for those).
  RLS on the new tables matches this app's existing, already-established trust
  model (anon-writable, enforced at the app layer) except where explicitly
  tightened above — see `payout_ledger`/`withdrawal_requests` policies below
  for the one place real `auth.uid()` scoping is used, since hosts/guides
  already carry a real Supabase Auth session via their traveler login
  (`partner_hosts.traveler_user_id` / `guides.traveler_user_id`).
*/

-- ============================================================
-- 0. portal_users.auth_user_id was added by 20260802150000 but never
--    granted for client SELECT (20260724120000's column-level grant list
--    predates it). Both the AuthContext session-classification fix and
--    portalAuth.login's new Supabase-Auth branch need to read it to link a
--    Supabase Auth session back to its portal_users row.
-- ============================================================
GRANT SELECT (auth_user_id) ON public.portal_users TO anon, authenticated;

-- ============================================================
-- 1. payout_ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS payout_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  booking_type text NOT NULL,
  partner_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  institution_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL,
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,

  gross_amount numeric(10,2) NOT NULL,
  commission_rate numeric(6,4) NOT NULL,
  platform_commission numeric(10,2) NOT NULL,
  host_share_rate numeric(6,4),
  host_earning numeric(10,2) NOT NULL DEFAULT 0,
  partner_earning numeric(10,2) NOT NULL DEFAULT 0,

  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reversed')),
  reversed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payout_ledger ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payout_ledger_host ON payout_ledger(host_id);
CREATE INDEX IF NOT EXISTS idx_payout_ledger_guide ON payout_ledger(guide_id);
CREATE INDEX IF NOT EXISTS idx_payout_ledger_partner ON payout_ledger(partner_id);
CREATE INDEX IF NOT EXISTS idx_payout_ledger_booking ON payout_ledger(booking_id);

-- Matches this app's existing wide-open read pattern for booking-adjacent
-- data (see "Partners can view bookings for their listings" on `bookings`).
CREATE POLICY "Anyone can view payout ledger"
  ON payout_ledger FOR SELECT TO anon, authenticated USING (true);

-- Only the trigger function (SECURITY DEFINER) writes this table.
CREATE POLICY "No direct client writes to payout ledger"
  ON payout_ledger FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No direct client updates to payout ledger"
  ON payout_ledger FOR UPDATE TO anon, authenticated USING (false);

-- ============================================================
-- 2. withdrawal_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid REFERENCES partner_hosts(id) ON DELETE CASCADE,
  guide_id uuid REFERENCES guides(id) ON DELETE CASCADE,
  CHECK (num_nonnulls(host_id, guide_id) = 1),

  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  fee numeric(10,2) NOT NULL DEFAULT 2.50,
  net_amount numeric(10,2) NOT NULL,
  payout_method text NOT NULL CHECK (payout_method IN ('bank', 'mobile')),
  payout_details jsonb NOT NULL DEFAULT '{}',

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text
);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_host ON withdrawal_requests(host_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_guide ON withdrawal_requests(guide_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

-- A host/guide sees only their own requests, scoped by their real traveler
-- Supabase Auth session (same pattern as the "Hosts can view bookings for
-- their listings" policy on `bookings`) -- plus Ops (anon, current admin
-- login is still anon-key) sees everything to run the approval queue.
CREATE POLICY "Hosts and guides view own withdrawal requests"
  ON withdrawal_requests FOR SELECT TO authenticated
  USING (
    host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = (select auth.uid()))
    OR guide_id IN (SELECT id FROM guides WHERE traveler_user_id = (select auth.uid()))
  );

CREATE POLICY "Ops can view all withdrawal requests"
  ON withdrawal_requests FOR SELECT TO anon USING (true);

CREATE POLICY "Hosts and guides submit own withdrawal requests"
  ON withdrawal_requests FOR INSERT TO authenticated
  WITH CHECK (
    host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = (select auth.uid()))
    OR guide_id IN (SELECT id FROM guides WHERE traveler_user_id = (select auth.uid()))
  );

CREATE POLICY "Anon can submit withdrawal requests"
  ON withdrawal_requests FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Ops can review withdrawal requests"
  ON withdrawal_requests FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 3. partner_payout_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_payout_settings (
  partner_id uuid PRIMARY KEY REFERENCES portal_users(id) ON DELETE CASCADE,
  payout_details jsonb NOT NULL DEFAULT '{}',
  notification_preferences jsonb NOT NULL DEFAULT '{}',
  cancellation_policy text NOT NULL DEFAULT 'flexible',
  payout_schedule text NOT NULL DEFAULT 'monthly',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partner_payout_settings ENABLE ROW LEVEL SECURITY;

-- Matches the existing partner_hosts/partner_listings trust model (anon-key
-- partner accounts, enforced at the app layer, not yet Supabase-Auth-scoped).
CREATE POLICY "Anyone can view partner payout settings"
  ON partner_payout_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can upsert partner payout settings"
  ON partner_payout_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update partner payout settings"
  ON partner_payout_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. admin_audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  actor_name text NOT NULL DEFAULT 'System',
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON admin_audit_log(actor_id);

CREATE POLICY "Anyone can view audit log"
  ON admin_audit_log FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can write audit log"
  ON admin_audit_log FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- 5. Host revenue share columns
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_hosts' AND column_name = 'revenue_share_pct'
  ) THEN
    ALTER TABLE partner_hosts ADD COLUMN revenue_share_pct numeric(5,2);
  END IF;
END $$;

INSERT INTO system_rules (id, category, name, description, enabled, value) VALUES
  ('9', 'financial', 'Host Revenue Share', 'Default percentage of the post-commission booking amount a host earns when fulfilling a partner-owned listing', true, '60')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. Guide-pool assignment on partner listings
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'guide_id'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN guide_id uuid REFERENCES guides(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_listings_guide ON partner_listings(guide_id);

-- ============================================================
-- 7. Tighten system_rules writes (anon kept for the current, still
--    anon-key admin login; authenticated now requires a real Ops link)
-- ============================================================
DROP POLICY IF EXISTS "update_system_rules_ops" ON system_rules;
DROP POLICY IF EXISTS "insert_system_rules_ops" ON system_rules;

CREATE POLICY "update_system_rules_anon_legacy_ops"
  ON system_rules FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "update_system_rules_authenticated_ops_only"
  ON system_rules FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));

CREATE POLICY "insert_system_rules_anon_legacy_ops"
  ON system_rules FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "insert_system_rules_authenticated_ops_only"
  ON system_rules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));

-- ============================================================
-- 8. Ledger-writing trigger (fires for both Pesapal and InTouch, since
--    both edge functions just flip bookings.payment_status)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_write_payout_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_rate numeric(6,4);
  v_default_host_share numeric(6,4);
  v_gross numeric(10,2);
  v_commission numeric(10,2);
  v_remainder numeric(10,2);
  v_host_share_rate numeric(6,4);
  v_host_earning numeric(10,2) := 0;
  v_partner_earning numeric(10,2) := 0;
BEGIN
  BEGIN
    v_gross := COALESCE(NEW.total_amount, 0);
    IF v_gross <= 0 THEN
      RETURN NEW; -- free booking, nothing to record
    END IF;

    SELECT (value::numeric / 100.0) INTO v_commission_rate FROM system_rules WHERE id = '7';
    v_commission_rate := COALESCE(v_commission_rate, 0.10);

    SELECT (value::numeric / 100.0) INTO v_default_host_share FROM system_rules WHERE id = '9';
    v_default_host_share := COALESCE(v_default_host_share, 0.60);

    v_commission := ROUND(v_gross * v_commission_rate, 2);
    v_remainder := v_gross - v_commission;

    IF NEW.host_id IS NOT NULL THEN
      SELECT COALESCE(revenue_share_pct / 100.0, v_default_host_share)
        INTO v_host_share_rate
        FROM partner_hosts WHERE id = NEW.host_id;
      v_host_share_rate := COALESCE(v_host_share_rate, v_default_host_share);
      v_host_earning := ROUND(v_remainder * v_host_share_rate, 2);
    END IF;

    IF NEW.partner_id IS NOT NULL THEN
      v_partner_earning := v_remainder - v_host_earning;
    END IF;

    INSERT INTO payout_ledger (
      booking_id, booking_type, partner_id, institution_id, host_id, guide_id,
      gross_amount, commission_rate, platform_commission,
      host_share_rate, host_earning, partner_earning
    ) VALUES (
      NEW.id, NEW.booking_type, NEW.partner_id, NEW.institution_id, NEW.host_id, NEW.guide_id,
      v_gross, v_commission_rate, v_commission,
      v_host_share_rate, v_host_earning, v_partner_earning
    )
    ON CONFLICT (booking_id) DO NOTHING;

    -- Auto-capture a guide tip recorded at attraction-booking checkout --
    -- bookings.tip_amount/guide_id already existed but nothing wrote to
    -- guide_tips from them before this.
    IF NEW.guide_id IS NOT NULL AND COALESCE(NEW.tip_amount, 0) > 0 AND NEW.institution_id IS NOT NULL THEN
      INSERT INTO guide_tips (institution_id, guide_id, booking_id, tip_amount, status, notes)
      VALUES (NEW.institution_id, NEW.guide_id, NEW.id, NEW.tip_amount, 'paid', 'Auto-captured from booking')
      ON CONFLICT (booking_id) DO NOTHING;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Ledger bookkeeping must never block the payment confirmation itself.
    RAISE WARNING 'fn_write_payout_ledger failed for booking %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- guide_tips had no unique constraint on booking_id; add one so the
-- ON CONFLICT above (and future re-runs / idempotency) work correctly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'guide_tips_booking_id_unique'
  ) THEN
    CREATE UNIQUE INDEX guide_tips_booking_id_unique ON guide_tips (booking_id) WHERE booking_id IS NOT NULL;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_bookings_paid ON bookings;
CREATE TRIGGER trg_bookings_paid
  AFTER UPDATE OF payment_status ON bookings
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid')
  EXECUTE FUNCTION fn_write_payout_ledger();

-- ============================================================
-- 9. Reversal trigger on cancellation
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_reverse_payout_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    UPDATE payout_ledger
    SET status = 'reversed', reversed_at = now()
    WHERE booking_id = NEW.id AND status = 'active';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_reverse_payout_ledger failed for booking %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_cancelled ON bookings;
CREATE TRIGGER trg_bookings_cancelled
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION fn_reverse_payout_ledger();

-- ============================================================
-- 10. Balance functions (used by wallet pages + the withdrawal guard)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_host_available_balance(p_host_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE((
      SELECT SUM(pl.host_earning)
      FROM payout_ledger pl
      JOIN bookings b ON b.id = pl.booking_id
      WHERE pl.host_id = p_host_id AND pl.status = 'active' AND b.booking_date <= CURRENT_DATE
    ), 0)
    -
    COALESCE((
      SELECT SUM(wr.amount) FROM withdrawal_requests wr
      WHERE wr.host_id = p_host_id AND wr.status IN ('pending', 'paid')
    ), 0)
  , 0);
$$;

CREATE OR REPLACE FUNCTION public.fn_guide_available_balance(p_guide_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE((SELECT SUM(tip_amount) FROM guide_tips WHERE guide_id = p_guide_id AND status = 'paid'), 0)
    + COALESCE((SELECT SUM(amount) FROM guide_salary_payments WHERE guide_id = p_guide_id AND status = 'paid'), 0)
    -
    COALESCE((
      SELECT SUM(wr.amount) FROM withdrawal_requests wr
      WHERE wr.guide_id = p_guide_id AND wr.status IN ('pending', 'paid')
    ), 0)
  , 0);
$$;

REVOKE ALL ON FUNCTION public.fn_host_available_balance(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_host_available_balance(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_guide_available_balance(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_guide_available_balance(uuid) TO anon, authenticated;

-- ============================================================
-- 11. Server-side balance check on withdrawal submission
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_check_withdrawal_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available numeric;
BEGIN
  IF NEW.host_id IS NOT NULL THEN
    v_available := fn_host_available_balance(NEW.host_id);
  ELSE
    v_available := fn_guide_available_balance(NEW.guide_id);
  END IF;

  IF NEW.amount > v_available THEN
    RAISE EXCEPTION 'Withdrawal amount % exceeds available balance %', NEW.amount, v_available;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_withdrawal_amount ON withdrawal_requests;
CREATE TRIGGER trg_check_withdrawal_amount
  BEFORE INSERT ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_check_withdrawal_amount();
