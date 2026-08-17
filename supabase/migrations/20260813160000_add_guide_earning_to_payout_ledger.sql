/*
  # Guide earning on the payout ledger

  ## Why
  fn_write_payout_ledger (20260812120000) already splits a paid booking's
  post-commission remainder between host_earning/partner_earning, but a
  guide has never had a commission-split earning path — only tips
  (guide_tips) and salary (guide_salary_payments). Custom Quotes needs this:
  when a Guide creates a solo custom quote with no Partner/Host attached,
  they should keep 100% of the post-commission remainder, the same way a
  Partner or Host does today when acting alone.

  ## What this does
  Adds payout_ledger.guide_earning, and extends fn_write_payout_ledger so
  that IF a booking has guide_id set AND neither partner_id nor host_id is
  set, the full remainder goes to guide_earning. The moment a partner or
  host is also attributed, behavior is unchanged from today — guide
  compensation in that case still runs through the existing partner/host
  relationship, not through this column. fn_guide_available_balance is
  extended to include guide_earning alongside its existing tip/salary
  sources, so this shows up in the Guide Wallet page with no further
  frontend change needed there.
*/

ALTER TABLE payout_ledger ADD COLUMN IF NOT EXISTS guide_earning numeric(10,2) NOT NULL DEFAULT 0;

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

    -- Solo guide (custom quote with no partner/host attached): guide keeps
    -- the full post-commission remainder. Whenever a partner or host is
    -- also on the booking, guide compensation still runs through that
    -- relationship as before — guide_earning stays 0 in that case.
    IF NEW.guide_id IS NOT NULL AND NEW.partner_id IS NULL AND NEW.host_id IS NULL THEN
      v_guide_earning := v_remainder;
    END IF;

    INSERT INTO payout_ledger (
      booking_id, booking_type, partner_id, institution_id, host_id, guide_id,
      gross_amount, commission_rate, platform_commission,
      host_share_rate, host_earning, partner_earning, guide_earning
    ) VALUES (
      NEW.id, NEW.booking_type, NEW.partner_id, NEW.institution_id, NEW.host_id, NEW.guide_id,
      v_gross, v_commission_rate, v_commission,
      v_host_share_rate, v_host_earning, v_partner_earning, v_guide_earning
    )
    ON CONFLICT (booking_id) DO NOTHING;

    IF NEW.guide_id IS NOT NULL AND COALESCE(NEW.tip_amount, 0) > 0 AND NEW.institution_id IS NOT NULL THEN
      INSERT INTO guide_tips (institution_id, guide_id, booking_id, tip_amount, status, notes)
      VALUES (NEW.institution_id, NEW.guide_id, NEW.id, NEW.tip_amount, 'paid', 'Auto-captured from booking')
      ON CONFLICT (booking_id) DO NOTHING;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_write_payout_ledger failed for booking %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
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
    + COALESCE((
        SELECT SUM(pl.guide_earning)
        FROM payout_ledger pl
        JOIN bookings b ON b.id = pl.booking_id
        WHERE pl.guide_id = p_guide_id AND pl.status = 'active' AND b.booking_date <= CURRENT_DATE
      ), 0)
    -
    COALESCE((
      SELECT SUM(wr.amount) FROM withdrawal_requests wr
      WHERE wr.guide_id = p_guide_id AND wr.status IN ('pending', 'paid')
    ), 0)
  , 0);
$$;
