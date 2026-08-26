/*
  # Add get_traveler_count() for the Control Room page

  ## Why
  The Control Room's "Travelers" stat queried portal_users WHERE
  portal_type = 'traveler' — but travelers are never written to
  portal_users at all (that table only holds partner/operations/
  institution staff accounts, each linked to auth.users via
  auth_user_id). Real travelers exist only as plain auth.users rows
  with no matching portal_users record. The stat was therefore always
  zero, the same root cause as the earlier lookup_traveler_by_email bug
  against the permanently-empty public.travelers table.

  auth.users isn't readable by the authenticated role directly
  ("permission denied for table users"), so this has to go through a
  SECURITY DEFINER function, same pattern as is_active_ops_admin().
*/

CREATE OR REPLACE FUNCTION public.get_traveler_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF NOT public.is_active_ops_admin() THEN
    RAISE EXCEPTION 'Only operations admins can view platform stats';
  END IF;

  RETURN (
    SELECT count(*)::integer FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM portal_users pu WHERE pu.auth_user_id = u.id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_traveler_count() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_traveler_count() FROM anon, PUBLIC;
