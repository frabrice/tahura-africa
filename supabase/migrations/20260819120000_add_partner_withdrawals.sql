/*
  Partners currently have no withdrawal path at all — withdrawal_requests only
  supports host_id/guide_id rows, and Partner earnings (payout_ledger.partner_earning)
  can only be viewed, never withdrawn. This extends the existing host/guide
  withdrawal flow to cover partners, following the exact same shape.
*/

ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES portal_users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_partner ON withdrawal_requests(partner_id);

-- Replace the two-column ownership CHECK with a three-column one, found by
-- definition rather than assumed name (Postgres auto-names unnamed table-level
-- CHECKs, and guessing wrong would leave the old, stricter check in place).
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'withdrawal_requests'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%num_nonnulls%'
  LOOP
    EXECUTE format('ALTER TABLE withdrawal_requests DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE withdrawal_requests
  ADD CONSTRAINT withdrawal_requests_owner_check
  CHECK (num_nonnulls(host_id, guide_id, partner_id) = 1);

-- Ops already sees/reviews every row via the existing anon-role policies
-- ("Ops can view all withdrawal requests" / "Ops can review withdrawal
-- requests"), and anon-session portal users already submit via "Anon can
-- submit withdrawal requests" — those need no change. This only adds the
-- authenticated-session path (a Partner on real Supabase Auth), mirroring
-- the existing host/guide authenticated policies.
CREATE POLICY "Partners view own withdrawal requests"
  ON withdrawal_requests FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = (select auth.uid())));

CREATE POLICY "Partners submit own withdrawal requests"
  ON withdrawal_requests FOR INSERT TO authenticated
  WITH CHECK (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = (select auth.uid())));

-- Mirrors fn_host_available_balance exactly: funds release on experience day
-- (booking_date <= today), not merely on booking status, so a Partner can't
-- withdraw against a trip that hasn't happened yet.
CREATE OR REPLACE FUNCTION public.fn_partner_available_balance(p_partner_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE((
      SELECT SUM(pl.partner_earning)
      FROM payout_ledger pl
      JOIN bookings b ON b.id = pl.booking_id
      WHERE pl.partner_id = p_partner_id AND pl.status = 'active' AND b.booking_date <= CURRENT_DATE
    ), 0)
    -
    COALESCE((
      SELECT SUM(wr.amount) FROM withdrawal_requests wr
      WHERE wr.partner_id = p_partner_id AND wr.status IN ('pending', 'paid')
    ), 0)
  , 0);
$$;

REVOKE ALL ON FUNCTION public.fn_partner_available_balance(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_partner_available_balance(uuid) TO anon, authenticated;

-- Extend the amount-check trigger with a partner branch.
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
  ELSIF NEW.guide_id IS NOT NULL THEN
    v_available := fn_guide_available_balance(NEW.guide_id);
  ELSE
    v_available := fn_partner_available_balance(NEW.partner_id);
  END IF;

  IF NEW.amount > v_available THEN
    RAISE EXCEPTION 'Withdrawal amount % exceeds available balance %', NEW.amount, v_available;
  END IF;

  RETURN NEW;
END;
$$;
