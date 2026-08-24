/*
  # Track B security guardrails: lock down financial/ownership fields
  regardless of RLS role

  ## Why
  A full RLS/security audit found that most write policies on this platform
  are still `anon`-open with no real restriction, because portal login
  doesn't yet establish a Supabase Auth session the database can verify
  (tracked separately as the Track A auth migration). Until that lands,
  the single worst-case outcome — someone redirecting a payout, inflating
  a withdrawal amount, or forging a booking's payment status — needs to be
  closed off immediately, independent of who is nominally allowed to touch
  the row at all.

  This migration adds BEFORE UPDATE triggers that enforce a strict
  allow-list of columns real client code ever legitimately changes on
  `bookings` and `withdrawal_requests`, for any role except `service_role`
  (Supabase edge functions, which need full write access to confirm
  payments and process withdrawals). Blocked attempts raise and the whole
  transaction rolls back (verified live: a tamper attempt on a real
  booking's total_amount was correctly rejected with the row left
  untouched) — they are NOT also written to `admin_audit_log`, since that
  insert would live in the same transaction and roll back right along
  with it (Postgres has no autonomous transactions without dblink/
  pg_background, not worth adding as a dependency for this stopgap layer).
  Rejected requests are still visible in Supabase's own project logs.

  `partner_payout_settings.payout_details` is the one field a partner is
  *supposed* to be able to edit (their own payout destination), so it
  can't be locked the same way without breaking the feature — instead
  every change is logged to `admin_audit_log` so tampering is at least
  visible, pending the real per-partner ownership check in Track A.

  ## What this does NOT do
  Does not change any RLS policy. Does not fix who can flip a withdrawal
  to "paid" or edit payout settings at all — that requires Track A (real
  Supabase Auth per portal/host/guide account). This only prevents the
  worst-case financial tampering in the meantime.
*/

-- ============================================================
-- 1. bookings: allow-list of client-editable columns
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_protect_booking_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.traveler_id IS DISTINCT FROM OLD.traveler_id
    OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
    OR NEW.institution_id IS DISTINCT FROM OLD.institution_id
    OR NEW.program_id IS DISTINCT FROM OLD.program_id
    OR NEW.guide_id IS DISTINCT FROM OLD.guide_id
    OR NEW.host_id IS DISTINCT FROM OLD.host_id
    OR NEW.item_id IS DISTINCT FROM OLD.item_id
    OR NEW.booking_type IS DISTINCT FROM OLD.booking_type
    OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
    OR NEW.service_fee IS DISTINCT FROM OLD.service_fee
    OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
    OR NEW.entry_fee_amount IS DISTINCT FROM OLD.entry_fee_amount
    OR NEW.tip_amount IS DISTINCT FROM OLD.tip_amount
    OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
    OR NEW.pesapal_tracking_id IS DISTINCT FROM OLD.pesapal_tracking_id
    OR NEW.flutterwave_tx_ref IS DISTINCT FROM OLD.flutterwave_tx_ref
    OR NEW.transport_id IS DISTINCT FROM OLD.transport_id
    OR NEW.transport_status_snapshot IS DISTINCT FROM OLD.transport_status_snapshot
    OR NEW.custom_quote_id IS DISTINCT FROM OLD.custom_quote_id
    OR NEW.booking_date IS DISTINCT FROM OLD.booking_date
    OR NEW.guests IS DISTINCT FROM OLD.guests
    OR NEW.duration_days IS DISTINCT FROM OLD.duration_days
  THEN
    -- Not logged to admin_audit_log: that insert would live in the same
    -- transaction as this trigger and gets rolled back along with it the
    -- instant we RAISE (Postgres has no autonomous transactions without
    -- dblink/pg_background, which aren't worth the added dependency for
    -- this stopgap layer). Rejected attempts are still visible in
    -- Supabase's own project API/Postgres logs.
    RAISE EXCEPTION 'Direct modification of financial, ownership or payment-provider fields on bookings is not permitted via the client';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_booking_financial_fields ON bookings;
CREATE TRIGGER trg_protect_booking_financial_fields
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION fn_protect_booking_financial_fields();

-- ============================================================
-- 2. withdrawal_requests: allow-list of client-editable columns
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_protect_withdrawal_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.host_id IS DISTINCT FROM OLD.host_id
    OR NEW.guide_id IS DISTINCT FROM OLD.guide_id
    OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
    OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.fee IS DISTINCT FROM OLD.fee
    OR NEW.net_amount IS DISTINCT FROM OLD.net_amount
    OR NEW.payout_method IS DISTINCT FROM OLD.payout_method
    OR NEW.payout_details IS DISTINCT FROM OLD.payout_details
    OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
  THEN
    -- See fn_protect_booking_financial_fields for why this isn't also
    -- logged to admin_audit_log (the insert would roll back with the raise).
    RAISE EXCEPTION 'Direct modification of amount, destination or ownership fields on a withdrawal request is not permitted — only status/review fields may be updated';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_withdrawal_financial_fields ON withdrawal_requests;
CREATE TRIGGER trg_protect_withdrawal_financial_fields
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_protect_withdrawal_financial_fields();

-- ============================================================
-- 3. partner_payout_settings: can't lock payout_details (that's the
--    legitimate self-service field) — log every change instead so
--    tampering is at least visible pending Track A's real ownership check
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_log_payout_settings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.payout_details IS DISTINCT FROM OLD.payout_details THEN
    INSERT INTO admin_audit_log (actor_name, action, target_type, target_id, details)
    VALUES (
      'partner (role: ' || COALESCE(auth.role(), 'unknown') || ')',
      'payout_destination_changed',
      'partner_payout_settings',
      NEW.partner_id,
      jsonb_build_object('old_payout_details', OLD.payout_details, 'new_payout_details', NEW.payout_details)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_payout_settings_change ON partner_payout_settings;
CREATE TRIGGER trg_log_payout_settings_change
  BEFORE UPDATE ON partner_payout_settings
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_payout_settings_change();
