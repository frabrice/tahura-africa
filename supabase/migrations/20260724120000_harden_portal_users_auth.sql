/*
  # Harden portal_users authentication

  ## Why
  Before this migration, the anon key (which ships in the browser bundle and is
  therefore public) could read EVERY column of `portal_users`, including
  `password_hash`, and could freely INSERT/UPDATE/DELETE any row. Anyone with the
  public key could harvest every partner / institution / government / operations
  password hash and take over accounts. See RLS policies in
  20260505095105_restore_core_tables_part1.sql / 20260313043848_consolidate_and_fix_rls_policies.sql.

  ## What this does
  1. Removes the anon/authenticated ability to READ the `password_hash` column
     (column-level GRANTs). Every other column stays readable, so the ~20 places
     in the app that read portal_users (settings, ops management, government
     stats, etc.) keep working. Selecting `*` now transparently omits the hash.
  2. Adds `verify_portal_login()` — a SECURITY DEFINER function that performs the
     credential check inside the database and returns only non-sensitive columns.
     The password hash never crosses the network. The client calls this instead
     of querying the table directly.
  3. Rotates the operations admin password OUT of source control (see the clearly
     marked block at the bottom — you MUST set your own).

  ## What this does NOT do (documented follow-up)
  Portal users still authenticate as the `anon` Postgres role, so RLS cannot yet
  distinguish a legitimate operations admin from an anonymous attacker for WRITES.
  Fully preventing anon INSERT/UPDATE/DELETE requires migrating portal auth to
  real Supabase Auth (each portal user becomes an auth user, RLS rewritten with
  auth.uid()). That is a larger, separate project. This migration closes the most
  severe hole — credential/hash exposure — without breaking the running app.
*/

-- pgcrypto provides digest(); on Supabase it lives in the `extensions` schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. Column-level read protection for password_hash
-- ============================================================
-- Drop the blanket table-level SELECT, then grant SELECT on every column
-- EXCEPT password_hash. PostgREST honours column privileges, so existing
-- reads keep working and `select('*')` simply returns everything but the hash.
REVOKE SELECT ON public.portal_users FROM anon, authenticated;

GRANT SELECT (
  id, portal_type, email, user_id_code, name, phone, contact_person,
  country, province, specific_location, specialty, tags, is_active,
  created_at, created_by, updated_at
) ON public.portal_users TO anon, authenticated;

-- ============================================================
-- 2. Secure login function (hash never leaves the database)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_portal_login(
  p_email text,
  p_password text,
  p_user_id_code text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  portal_type text,
  email text,
  user_id_code text,
  name text,
  phone text,
  contact_person text,
  country text,
  province text,
  specific_location text,
  specialty text,
  tags text[],
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    pu.id, pu.portal_type, pu.email, pu.user_id_code, pu.name, pu.phone,
    pu.contact_person, pu.country, pu.province, pu.specific_location,
    pu.specialty, pu.tags, pu.is_active
  FROM public.portal_users pu
  WHERE lower(pu.email) = lower(trim(p_email))
    AND pu.password_hash = encode(digest(p_password, 'sha256'), 'hex')
    AND pu.is_active = true
    AND (p_user_id_code IS NULL OR pu.user_id_code = p_user_id_code);
$$;

REVOKE ALL ON FUNCTION public.verify_portal_login(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_portal_login(text, text, text) TO anon, authenticated;

-- ============================================================
-- 3. Rotate the operations admin password (REQUIRED)
-- ============================================================
-- The previous password shipped in plaintext in source control and must be
-- considered compromised. Replace 'CHANGE_ME_TO_A_NEW_STRONG_PASSWORD' below
-- with a new strong password before running this migration, then delete this
-- comment. The digest() call hashes it the same way the app does.
UPDATE public.portal_users
SET password_hash = encode(digest('CHANGE_ME_TO_A_NEW_STRONG_PASSWORD', 'sha256'), 'hex'),
    updated_at = now()
WHERE portal_type = 'operations';
