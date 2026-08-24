/*
  # Fix the host/guide login-claim flow and two leftover anon-open reads

  ## Why
  Auditing every account-creation path before real usage begins turned up
  three issues the original Track A rewrite missed:

  1. Hosts and guides don't get a login when created — they "graduate"
     into one later by signing up as a Traveler with a matching email,
     which travelerAuth.checkIsHost() (src/lib/auth.ts) detects and links
     by setting partner_hosts.traveler_user_id / guides.traveler_user_id
     from NULL to their own auth.uid(). No policy actually permits that
     specific transition: host_update_own_profile requires
     traveler_user_id = auth.uid(), which is never true while it's still
     NULL, and guides had no traveler-facing UPDATE policy at all. So
     this flow has been silently broken since the RLS rewrite. Fixed with
     two narrow SECURITY DEFINER RPCs (claim_host_profile /
     claim_guide_profile) rather than a raw UPDATE policy, since a raw
     policy's WITH CHECK can't stop a crafted request from also rewriting
     unrelated columns (name, partner_id, bio, ...) in the same call —
     the RPC only ever touches traveler_user_id, verifies the row is
     currently unclaimed, and verifies the caller's own JWT email
     (auth.jwt() ->> 'email' — regular sessions can't read auth.users
     directly, confirmed live) matches the row's stored email.

  2. bookings had a pre-existing policy named "Partners can view bookings
     for their listings" that was actually granted to `anon` with
     `USING (true)` — anyone unauthenticated could read every booking row
     via the REST API, including traveler names/contact info and payment
     amounts. Replaced with a real ownership-scoped authenticated policy.

  3. notifications had "Anyone can view notifications" open to
     anon+authenticated with USING(true) — same issue, scoped to the
     owning portal_users row instead.
*/

-- ============================================================
-- 1. Host/guide claim RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_host_profile(p_host_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_host_email text;
  v_current_link uuid;
BEGIN
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email, traveler_user_id INTO v_host_email, v_current_link
  FROM partner_hosts WHERE id = p_host_id AND status = 'active';

  IF v_host_email IS NULL THEN
    RAISE EXCEPTION 'Host not found';
  END IF;

  IF lower(v_host_email) <> lower(v_email) THEN
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
  v_email text;
  v_guide_email text;
  v_current_link uuid;
BEGIN
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email, traveler_user_id INTO v_guide_email, v_current_link
  FROM guides WHERE id = p_guide_id AND available = true;

  IF v_guide_email IS NULL THEN
    RAISE EXCEPTION 'Guide not found';
  END IF;

  IF lower(v_guide_email) <> lower(v_email) THEN
    RAISE EXCEPTION 'Email does not match this guide profile';
  END IF;

  IF v_current_link IS NOT NULL AND v_current_link <> auth.uid() THEN
    RAISE EXCEPTION 'This guide profile is already linked to a different account';
  END IF;

  UPDATE guides SET traveler_user_id = auth.uid() WHERE id = p_guide_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_host_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_guide_profile(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_host_profile(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_guide_profile(uuid) FROM anon, PUBLIC;

-- ============================================================
-- 2. bookings — close the anon-open read
-- ============================================================
DROP POLICY IF EXISTS "Partners can view bookings for their listings" ON bookings;
CREATE POLICY "partner_view_own_bookings" ON bookings FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 3. notifications — close the anon-open read, and the anon-open insert
-- (every real caller — CreateListingForm, ModerationPage, FlagContentModal,
-- the Manage tabs — is already an authenticated partner/ops session; no
-- unauthenticated caller exists for this table)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view notifications" ON notifications;
CREATE POLICY "recipient_view_own_notifications" ON notifications FOR SELECT TO authenticated
  USING (
    recipient_portal_user_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true)
  );

DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;
CREATE POLICY "authenticated_create_notifications" ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);
