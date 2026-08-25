/*
  # Fix the host/guide claim RPCs and the traveler-lookup RPC

  ## Why
  1. claim_host_profile/claim_guide_profile read the caller's email via
     `auth.jwt() ->> 'email'`. Confirmed live: with a JWT payload that
     carries `sub`/`role` but no top-level `email` claim, this returns
     NULL and the function raises "Not authenticated" — reproducing
     exactly what was reported ("switching to host doesn't work") for
     two real host rows that otherwise have a perfectly matching,
     confirmed auth.users account (one email/password, one Google).
     Rather than debug JWT claim shape further, both functions now read
     the caller's email directly from auth.users via auth.uid() instead
     — confirmed live that a SECURITY DEFINER function can read
     auth.users even though the calling `authenticated` role can't
     directly (same bypass-via-ownership pattern as is_active_ops_admin
     for portal_users). This removes the dependency on JWT claim shape
     entirely.

  2. lookup_traveler_by_email queries `public.travelers`, which has 0
     rows — real traveler signups go through Supabase Auth directly and
     never write to that legacy table. Every "does this email already
     have a traveler account" check has therefore always returned no
     match, even when the account genuinely exists. Rewritten to query
     auth.users instead (already SECURITY DEFINER, so no new grant
     issue).
*/

CREATE OR REPLACE FUNCTION public.claim_host_profile(p_host_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email text;
  v_host_email text;
  v_current_link uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();
  IF v_caller_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email, traveler_user_id INTO v_host_email, v_current_link
  FROM partner_hosts WHERE id = p_host_id AND status = 'active';

  IF v_host_email IS NULL THEN
    RAISE EXCEPTION 'Host not found';
  END IF;

  IF lower(v_host_email) <> lower(v_caller_email) THEN
    RAISE EXCEPTION 'Email does not match this host profile';
  END IF;

  IF v_current_link IS NOT NULL AND v_current_link <> auth.uid() THEN
    RAISE EXCEPTION 'This host profile is already linked to a different account';
  END IF;

  UPDATE partner_hosts SET traveler_user_id = auth.uid() WHERE id = p_host_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_guide_profile(p_guide_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email text;
  v_guide_email text;
  v_current_link uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();
  IF v_caller_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email, traveler_user_id INTO v_guide_email, v_current_link
  FROM guides WHERE id = p_guide_id AND available = true;

  IF v_guide_email IS NULL THEN
    RAISE EXCEPTION 'Guide not found';
  END IF;

  IF lower(v_guide_email) <> lower(v_caller_email) THEN
    RAISE EXCEPTION 'Email does not match this guide profile';
  END IF;

  IF v_current_link IS NOT NULL AND v_current_link <> auth.uid() THEN
    RAISE EXCEPTION 'This guide profile is already linked to a different account';
  END IF;

  UPDATE guides SET traveler_user_id = auth.uid() WHERE id = p_guide_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_traveler_by_email(p_email text)
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id, COALESCE(au.raw_user_meta_data->>'full_name', '') AS full_name
  FROM auth.users au
  WHERE lower(au.email) = lower(trim(p_email))
  LIMIT 1;
$$;
