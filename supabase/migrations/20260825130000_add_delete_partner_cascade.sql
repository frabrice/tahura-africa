/*
  # Add delete_partner_cascade RPC

  ## Why
  There was no way to delete a partner from Ops, and partner_hosts /
  partner_listings both turned out to have NO foreign key at all back to
  portal_users (confirmed live via information_schema) — so even a plain
  `DELETE FROM portal_users` would silently leave every one of that
  partner's hosts and listings behind as permanent orphaned rows with a
  partner_id pointing at nothing. Per the explicit requirement ("once a
  partner is deleted, they should go with their hosts"), this wraps the
  whole thing in one SECURITY DEFINER function so it can't happen
  partially: listings and hosts are deleted first, then the portal_users
  row itself (which does cascade correctly for the tables that already
  have a real FK — partner_payout_settings, withdrawal_requests,
  listing_submissions — via their existing ON DELETE CASCADE).
*/

CREATE OR REPLACE FUNCTION public.delete_partner_cascade(p_partner_id uuid)
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

  DELETE FROM partner_listings WHERE partner_id = p_partner_id;
  DELETE FROM partner_hosts WHERE partner_id = p_partner_id;
  DELETE FROM portal_users WHERE id = p_partner_id;

  -- Also remove their login identity so a "deleted" partner can't still
  -- authenticate (even though they'd hit a dead end with no portal_users
  -- row afterward — cleaner to not leave the identity dangling at all).
  IF v_auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_partner_cascade(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_partner_cascade(uuid) FROM anon, PUBLIC;
