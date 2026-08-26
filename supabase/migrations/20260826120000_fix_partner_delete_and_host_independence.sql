/*
  # Fix partner deletion + allow independent (partner-less) hosts

  ## Bug 1: delete_partner_cascade fails whenever the partner has a booking
  Confirmed live by simulating the exact call: deleting a partner's
  portal_users row triggers Postgres's own ON DELETE SET NULL cascade onto
  bookings.partner_id, which fires trg_protect_booking_financial_fields
  (added in the Track B security pass) — that trigger can't distinguish a
  legitimate system-driven cascade from a malicious direct edit, and
  rejects both. Real-world impact: any partner with at least one booking
  could never be deleted. Fixed by adding a transaction-local bypass flag
  that only trusted SECURITY DEFINER admin functions can set.

  ## Feature: choice of what happens to a deleted partner's hosts
  delete_partner_cascade previously always hard-deleted every host and
  listing belonging to the partner with no alternative. Per explicit
  product requirement, Ops must be able to choose: delete the hosts too
  (their listings draft first, exactly like deleting a host individually
  already does), or detach the hosts to become independent/ops-managed
  (partner_id set to null, their listings keep working exactly as they
  were, just no longer tied to a partner).

  ## Feature: hosts with no partner at all
  partner_hosts.partner_id was NOT NULL, making an "independent host
  created directly by Ops" impossible at the schema level (the same class
  of bug fixed for partner_listings.partner_id in
  20260825141000_allow_null_partner_on_listings.sql). Dropped here.
  partner_listings.partner_id/host_id were already nullable — no schema
  change needed there.

  ## Feature: reassigning a host to a different (or no) partner
  New reassign_host_partner RPC. If the host has zero listings, it just
  reassigns silently. If they have any, the caller passes p_move_listings
  to say whether those listings should follow the host to the new partner
  (partner_id updated, host_id unchanged) or stay behind as drafts waiting
  for a new host (host_id and partner_id both cleared, status forced back
  to draft) — the same two-way choice as the partner-delete case, just for
  a single host instead of all of a partner's hosts at once.
*/

-- ============================================================
-- 1. Bypass flag for the Track B financial-field guardrails
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_protect_booking_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR current_setting('app.bypass_financial_guard', true) = 'true' THEN
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
  IF auth.role() = 'service_role' OR current_setting('app.bypass_financial_guard', true) = 'true' THEN
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

-- ============================================================
-- 2. partner_hosts.partner_id becomes nullable (independent hosts)
-- ============================================================
ALTER TABLE partner_hosts ALTER COLUMN partner_id DROP NOT NULL;

-- ============================================================
-- 3. delete_partner_cascade: choice of what happens to hosts
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_partner_cascade(p_partner_id uuid, p_delete_hosts boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid;
BEGIN
  IF NOT public.is_active_ops_admin() THEN
    RAISE EXCEPTION 'Only operations admins can delete partners';
  END IF;

  SELECT auth_user_id INTO v_auth_user_id FROM portal_users WHERE id = p_partner_id AND portal_type = 'partner';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partner not found';
  END IF;

  PERFORM set_config('app.bypass_financial_guard', 'true', true);

  IF p_delete_hosts THEN
    -- Deleting each host fires trg_draft_listings_on_host_delete (drafts
    -- their active listings first) then the FK ON DELETE SET NULL clears
    -- host_id — same behavior as deleting a host individually.
    DELETE FROM partner_hosts WHERE partner_id = p_partner_id;
  ELSE
    -- Hosts survive, detached — they become independent/ops-managed.
    UPDATE partner_hosts SET partner_id = NULL, updated_at = now() WHERE partner_id = p_partner_id;
  END IF;

  -- partner_listings.partner_id has no FK back to portal_users (confirmed
  -- live — never did), so it's never auto-cleared by the delete below.
  -- Whether hosts were deleted or detached, no listing should keep
  -- pointing at a partner that's about to stop existing.
  UPDATE partner_listings SET partner_id = NULL, updated_at = now() WHERE partner_id = p_partner_id;

  DELETE FROM portal_users WHERE id = p_partner_id;

  IF v_auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_partner_cascade(uuid, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_partner_cascade(uuid, boolean) FROM anon, PUBLIC;

-- ============================================================
-- 4. reassign_host_partner: move a host to a different/no partner
-- ============================================================
CREATE OR REPLACE FUNCTION public.reassign_host_partner(
  p_host_id uuid,
  p_new_partner_id uuid,
  p_move_listings boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_active_ops_admin() THEN
    RAISE EXCEPTION 'Only operations admins can reassign a host''s partner';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM partner_hosts WHERE id = p_host_id) THEN
    RAISE EXCEPTION 'Host not found';
  END IF;

  IF p_new_partner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM portal_users WHERE id = p_new_partner_id AND portal_type = 'partner'
  ) THEN
    RAISE EXCEPTION 'Target partner not found';
  END IF;

  IF p_move_listings THEN
    UPDATE partner_listings SET partner_id = p_new_partner_id, updated_at = now()
    WHERE host_id = p_host_id;
  ELSE
    UPDATE partner_listings SET host_id = NULL, partner_id = NULL, status = 'draft', updated_at = now()
    WHERE host_id = p_host_id;
  END IF;

  UPDATE partner_hosts SET partner_id = p_new_partner_id, updated_at = now() WHERE id = p_host_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reassign_host_partner(uuid, uuid, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reassign_host_partner(uuid, uuid, boolean) FROM anon, PUBLIC;
