/*
  # Fix: deleting a partner's auth identity can be blocked by a
  traveler-claim link on one of their own hosts (or a guide)

  ## Why
  Confirmed live: a real partner who is also the traveler_user_id linked
  on their own host record (self-registered as both, the normal path for
  a solo operator) could not be deleted — DELETE FROM auth.users failed
  with "violates foreign key constraint partner_hosts_traveler_user_id_fkey".
  partner_hosts.traveler_user_id and guides.traveler_user_id both
  reference auth.users(id) with NO ACTION (no cascade rule at all),
  unlike every other FK to auth.users in this schema which is at least
  ON DELETE SET NULL. This is a real, previously-undiscovered gap, not
  specific to the delete-hosts-choice feature — it would have blocked
  deletion however delete_partner_cascade was written.

  ## Fix
  Before delete_partner_cascade removes the partner's auth.users row,
  clear traveler_user_id anywhere it points at that exact identity on
  both partner_hosts and guides. This only unclaims the traveler-side
  link for that specific person — it doesn't touch the host/guide record
  itself, which keeps operating normally (a host that's kept independent
  simply stops being "claimable" under that now-deleted login; it can be
  re-claimed later if the same email signs up again as a traveler and
  someone re-runs the claim flow).
*/

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
    DELETE FROM partner_hosts WHERE partner_id = p_partner_id;
  ELSE
    UPDATE partner_hosts SET partner_id = NULL, updated_at = now() WHERE partner_id = p_partner_id;
  END IF;

  UPDATE partner_listings SET partner_id = NULL, updated_at = now() WHERE partner_id = p_partner_id;

  DELETE FROM portal_users WHERE id = p_partner_id;

  IF v_auth_user_id IS NOT NULL THEN
    -- Neither of these has a cascade rule to auth.users — clear them first
    -- or the delete below fails outright.
    UPDATE partner_hosts SET traveler_user_id = NULL WHERE traveler_user_id = v_auth_user_id;
    UPDATE guides SET traveler_user_id = NULL WHERE traveler_user_id = v_auth_user_id;
    DELETE FROM auth.users WHERE id = v_auth_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_partner_cascade(uuid, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_partner_cascade(uuid, boolean) FROM anon, PUBLIC;
