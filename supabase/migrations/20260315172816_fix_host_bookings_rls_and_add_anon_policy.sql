/*
  # Fix Host Bookings RLS Policy

  ## Problem
  Most partner_hosts rows have traveler_user_id = NULL. The existing
  "Hosts can view bookings for their listings" policy requires
  partner_hosts.traveler_user_id = auth.uid(), which returns zero rows
  for hosts that haven't logged in after traveler_user_id was backfilled.

  The host dashboard uses the Supabase anon key (same as the partner portal),
  and the "Partners can view bookings for their listings" policy already grants
  anon full SELECT access. This means host bookings should already be readable
  via anon — but the host dashboard might be running with an authenticated session
  (traveler JWT) that bypasses anon policies.

  ## Fix
  1. Add an explicit anon-role SELECT policy for hosts that allows reading bookings
     where host_id is not null — matching the existing partner anon policy pattern.
  2. Also backfill traveler_user_id on all partner_hosts rows where a matching
     auth.users record exists by email, so the authenticated policy works going
     forward for hosts who have already signed up as travelers.

  ## Changes
  - New policy: "Hosts can view their bookings (anon)" on bookings table
  - Data backfill: Set traveler_user_id on partner_hosts from auth.users by email
*/

-- Add anon SELECT policy for hosts (mirrors the partner anon policy pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings'
    AND policyname = 'Hosts can view their bookings (anon)'
  ) THEN
    CREATE POLICY "Hosts can view their bookings (anon)"
      ON bookings FOR SELECT
      TO anon
      USING (host_id IS NOT NULL);
  END IF;
END $$;

-- Backfill traveler_user_id on partner_hosts where auth user exists with matching email
UPDATE partner_hosts ph
SET traveler_user_id = au.id
FROM auth.users au
WHERE LOWER(ph.email) = LOWER(au.email)
  AND ph.traveler_user_id IS NULL
  AND ph.email IS NOT NULL
  AND ph.email != '';
