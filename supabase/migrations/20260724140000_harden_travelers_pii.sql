/*
  # Harden travelers table (PII + legacy password_hash exposure)

  ## Why
  The `travelers` table shipped with `USING (true)` policies for anon on SELECT,
  INSERT and UPDATE (see 20260505095105_restore_core_tables_part1.sql /
  20260217112129_create_user_management_system.sql). Because the anon key is
  public, anyone could read every traveler's personal data (name, email, phone,
  date of birth, nationality) and legacy `password_hash`, and could modify or
  insert traveler rows at will.

  ## Safe to lock down fully
  A project-wide search shows the app touches this table in exactly ONE place:
  CreateHostForm looks up a traveler by email (id + full_name) to link them as a
  host. Travelers themselves authenticate via Supabase Auth and their profile
  lives in auth metadata, not this table; Operations counts travelers via
  portal_users, not this table. So anon needs no direct access at all.

  ## What this does
  1. Drops the permissive anon policies. RLS stays enabled, so anon now has no
     policy and is denied by default. Revokes table DML from anon/authenticated
     for defense in depth. (The delete-traveler-account edge function uses the
     service role and is unaffected.)
  2. Adds `lookup_traveler_by_email()` — a SECURITY DEFINER function returning
     only id + full_name — for the CreateHostForm host-linking flow. No PII or
     password hash is ever exposed.
*/

-- ============================================================
-- 1. Remove blanket anon access
-- ============================================================
DROP POLICY IF EXISTS "Anyone can create traveler account" ON public.travelers;
DROP POLICY IF EXISTS "Travelers can view own profile" ON public.travelers;
DROP POLICY IF EXISTS "Travelers can update own profile" ON public.travelers;

REVOKE ALL ON public.travelers FROM anon, authenticated;

-- ============================================================
-- 2. Minimal lookup for host-linking (id + full_name only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.lookup_traveler_by_email(p_email text)
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.full_name
  FROM public.travelers t
  WHERE lower(t.email) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_traveler_by_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_traveler_by_email(text) TO anon, authenticated;
