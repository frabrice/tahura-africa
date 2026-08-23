/*
  # Attraction guide fee + institution settlement tracking

  ## Why
  Attraction bookings (entry fee + programs) currently mis-credit the guide:
  fn_write_payout_ledger's "solo guide, no partner/host attached" branch
  (built for solo custom-quote guides) also fires for every attraction
  booking, since attraction bookings never set partner_id/host_id — so the
  guide's payout_ledger.guide_earning ends up as 100% of the post-commission
  remainder, and the institution (the actual owner of that entry-fee/program
  money) gets nothing tracked anywhere. There's also no wallet/balance
  concept for institutions at all, since they have no login portal to
  withdraw through — Ops needs to track what's owed and record how it was
  settled (paid directly, or handed to the guide to deliver on-site).

  ## What this does
  1. `institution_profiles.guide_fee_amount` — the flat, per-attraction fee a
     guide earns per booking, set by Ops when creating/editing the
     attraction. Independent of what programs/entry fee the traveler
     actually picked.
  2. `payout_ledger.institution_earning` — mirrors host_earning/
     partner_earning/guide_earning.
  3. `institution_settlements` — Ops-recorded settlement events (mirrors
     guide_salary_payments/withdrawal_requests): how the institution's cut
     was settled for a booking (or a bulk settlement), paid directly or
     handed to a guide.
  4. `fn_institution_available_balance` — same GREATEST(...,0)-of-earnings-
     minus-settlements shape as fn_host_available_balance/
     fn_guide_available_balance.
  5. Rewrites fn_write_payout_ledger: an institution-specific branch (fires
     whenever institution_id IS NOT NULL) takes priority over the existing
     solo-guide branch, which stays untouched for whatever non-attraction
     flow originally needed it. guide_earning = the attraction's configured
     guide_fee_amount in full (paid even if it exceeds the remainder — per
     product decision, the guide fee is a fixed cost, never reduced);
     institution_earning = GREATEST(0, remainder - guide_earning) (never
     negative — any shortfall is absorbed by the platform, not tracked as a
     debt). Also stops the automatic guide_tips insert for attraction
     bookings — guide_fee_amount is now the sole automatic guide-earning
     path for attractions, replacing the old (unconfigurable, double-paying)
     tip auto-capture. guide_tips/guides.tip stay in the schema for history
     and for Ops's existing manual "Record Payment" tool, which is untouched.
*/

-- ============================================================
-- 1. Guide fee on the attraction
-- ============================================================
ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS guide_fee_amount numeric(10,2);

-- ============================================================
-- 2. Institution's cut, tracked on the ledger
-- ============================================================
ALTER TABLE payout_ledger ADD COLUMN IF NOT EXISTS institution_earning numeric(10,2) NOT NULL DEFAULT 0;

-- ============================================================
-- 3. Settlement ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS institution_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('paid_to_institution', 'handed_to_guide')),
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  recorded_by uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (method = 'paid_to_institution' OR guide_id IS NOT NULL)
);

ALTER TABLE institution_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view institution settlements"
  ON institution_settlements FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can create institution settlements"
  ON institution_settlements FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_institution_settlements_institution ON institution_settlements(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_settlements_booking ON institution_settlements(booking_id);

-- ============================================================
-- 4. Balance function
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_institution_available_balance(p_institution_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE((
      SELECT SUM(pl.institution_earning)
      FROM payout_ledger pl
      JOIN bookings b ON b.id = pl.booking_id
      WHERE pl.institution_id = p_institution_id AND pl.status = 'active' AND b.booking_date <= CURRENT_DATE
    ), 0)
    -
    COALESCE((
      SELECT SUM(s.amount) FROM institution_settlements s WHERE s.institution_id = p_institution_id
    ), 0)
  , 0);
$$;

REVOKE ALL ON FUNCTION public.fn_institution_available_balance(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_institution_available_balance(uuid) TO anon, authenticated;

-- ============================================================
-- 5. Rewrite the payout trigger
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
  v_guide_earning numeric(10,2) := 0;
  v_institution_earning numeric(10,2) := 0;
  v_guide_fee numeric(10,2);
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

    IF NEW.institution_id IS NOT NULL THEN
      -- Attraction booking: the guide (if any) earns the attraction's fixed
      -- guide fee in full, regardless of how much was actually collected.
      -- Everything else collected is the institution's, floored at zero.
      IF NEW.guide_id IS NOT NULL THEN
        SELECT guide_fee_amount INTO v_guide_fee FROM institution_profiles WHERE portal_user_id = NEW.institution_id;
        v_guide_earning := COALESCE(v_guide_fee, 0);
      END IF;
      v_institution_earning := GREATEST(0, v_remainder - v_guide_earning);
    ELSIF NEW.guide_id IS NOT NULL AND NEW.partner_id IS NULL AND NEW.host_id IS NULL THEN
      -- Solo guide (e.g. custom quote with no partner/host/institution
      -- attached): guide keeps the full post-commission remainder, as
      -- before.
      v_guide_earning := v_remainder;
    END IF;

    INSERT INTO payout_ledger (
      booking_id, booking_type, partner_id, institution_id, host_id, guide_id,
      gross_amount, commission_rate, platform_commission,
      host_share_rate, host_earning, partner_earning, guide_earning, institution_earning
    ) VALUES (
      NEW.id, NEW.booking_type, NEW.partner_id, NEW.institution_id, NEW.host_id, NEW.guide_id,
      v_gross, v_commission_rate, v_commission,
      v_host_share_rate, v_host_earning, v_partner_earning, v_guide_earning, v_institution_earning
    )
    ON CONFLICT (booking_id) DO NOTHING;

  EXCEPTION WHEN OTHERS THEN
    -- Ledger bookkeeping must never block the payment confirmation itself.
    RAISE WARNING 'fn_write_payout_ledger failed for booking %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
