/*
  # Track A follow-up 2: close the storage and RPC gaps found in a full
  system-wide re-audit after the RLS rewrite

  ## Why
  A second, unrestricted sweep of pg_policies (not limited to the
  public-schema priority list from the first pass) turned up two things
  the table-focused rewrite didn't touch:

  1. storage.objects policies for the listings/programs/guides/
     profile-pictures paths granted INSERT/UPDATE/DELETE to `anon` with
     no ownership check at all — an unauthenticated visitor could delete
     or overwrite any listing/program image, or upload into the guides or
     profile-pictures folders. Every real caller of these upload paths
     (CreateListingForm, host/guide profile forms) is already a logged-in
     portal or traveler session, so dropping anon here costs nothing.

  2. lookup_traveler_by_email(text) is a plain SECURITY DEFINER RPC
     (not a trigger, so directly callable) granted EXECUTE to anon. It
     resolves any email to a traveler's name — an unauthenticated email
     enumeration / PII leak. Its only caller (CreateHostForm.tsx) is a
     partner filling out a host form behind portal login, so it only
     ever needs to run as `authenticated`.
*/

-- ============================================================
-- Storage: require authenticated for all listings/programs/guides/
-- profile-pictures writes. Public SELECT (viewing) is untouched.
-- ============================================================
DROP POLICY IF EXISTS "Allow deletes from listings bucket" ON storage.objects;
CREATE POLICY "Allow deletes from listings bucket" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listings');

DROP POLICY IF EXISTS "Allow anon deletes of program images" ON storage.objects;
CREATE POLICY "Allow deletes of program images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

DROP POLICY IF EXISTS "Allow uploads to listings bucket" ON storage.objects;
CREATE POLICY "Allow uploads to listings bucket" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listings');

DROP POLICY IF EXISTS "Allow anon uploads to programs folder" ON storage.objects;
CREATE POLICY "Allow uploads to programs folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

DROP POLICY IF EXISTS "Allow uploads to guides folder" ON storage.objects;
CREATE POLICY "Allow uploads to guides folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profiles' AND (storage.foldername(name))[1] = 'guides');

DROP POLICY IF EXISTS "Allow uploads to profile-pictures folder" ON storage.objects;
CREATE POLICY "Allow uploads to profile-pictures folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profiles' AND (storage.foldername(name))[1] = 'profile-pictures');

DROP POLICY IF EXISTS "Allow anon updates to program images" ON storage.objects;
CREATE POLICY "Allow updates to program images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs')
  WITH CHECK (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

DROP POLICY IF EXISTS "Allow updates to listings bucket" ON storage.objects;
CREATE POLICY "Allow updates to listings bucket" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listings') WITH CHECK (bucket_id = 'listings');

-- ============================================================
-- lookup_traveler_by_email: only the authenticated partner/ops flow in
-- CreateHostForm.tsx calls this — no anon caller exists or should exist.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.lookup_traveler_by_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lookup_traveler_by_email(text) FROM PUBLIC;
