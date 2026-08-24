/*
  # Fix infinite recursion in portal_users RLS

  ## Why
  ops_full_access_portal_users (from the Track A RLS rewrite) checks "is
  the caller an active Ops admin" with a subquery against portal_users —
  defined as a policy ON portal_users itself. Evaluating that policy for
  any SELECT on portal_users requires re-running the policy to satisfy
  its own subquery, which requires re-running it again, forever. Postgres
  detects this and errors the whole query with "infinite recursion
  detected in policy for relation portal_users" — which also broke every
  OTHER table's policy that checks Ops/ownership via a portal_users
  subquery, since resolving *those* subqueries hits the same recursive
  policy. In practice this meant real sign-in succeeded but the
  subsequent portal_users lookup silently failed, surfacing as "invalid
  credentials" with no indication the password was ever the problem.

  ## Fix
  Move the "is caller an active Ops admin" check into a SECURITY DEFINER
  function. Because it runs as its owner (a role that bypasses RLS)
  rather than as the calling `authenticated` role, its internal query
  against portal_users never re-triggers portal_users' own policies —
  breaking the cycle. This is the standard pattern for self-referential
  RLS checks.
*/

CREATE OR REPLACE FUNCTION public.is_active_ops_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_ops_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_active_ops_admin() FROM anon, PUBLIC;

DROP POLICY IF EXISTS "ops_full_access_portal_users" ON portal_users;
CREATE POLICY "ops_full_access_portal_users" ON portal_users FOR ALL TO authenticated
  USING (public.is_active_ops_admin())
  WITH CHECK (public.is_active_ops_admin());
