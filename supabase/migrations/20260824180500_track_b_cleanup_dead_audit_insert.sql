/*
  # Remove dead admin_audit_log insert from the Track B guard triggers

  ## Why
  20260824180000 originally tried to log blocked tamper attempts to
  admin_audit_log before raising. Verified live against a real booking:
  the raise rolls back the whole transaction, including that insert, so
  it never actually persisted anything — pure dead code, not a real
  behavior change here. This migration just re-defines the two functions
  to match what was actually tested and confirmed working (the RAISE
  EXCEPTION block itself, which does not depend on the insert).
*/

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
    RAISE EXCEPTION 'Direct modification of financial, ownership or payment-provider fields on bookings is not permitted via the client';
  END IF;

  RETURN NEW;
END;
$$;

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
    RAISE EXCEPTION 'Direct modification of amount, destination or ownership fields on a withdrawal request is not permitted — only status/review fields may be updated';
  END IF;

  RETURN NEW;
END;
$$;
