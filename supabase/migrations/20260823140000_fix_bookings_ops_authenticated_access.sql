/*
  # Let Ops read/write bookings under a real Supabase Auth session

  ## Why
  Discovered while verification-testing the new attraction guide-fee feature
  with a real Ops login: bookings' SELECT/UPDATE policies only ever covered
  "Partners can view/update bookings" as a fully-open `anon`-role policy
  (USING true), plus narrowly-scoped `authenticated` policies for
  travelers/hosts/guides (traveler_id/host_id/guide_id = auth.uid() or a
  linked traveler_user_id) - none of which match an Ops admin. This worked
  by accident as long as Ops was on the legacy anon-key login; now that the
  Ops account has a real Supabase Auth session (fixed separately, along
  with the identical gap on partner_hosts), every bookings query from Ops
  returns zero rows under RLS - the entire Bookings page, and the
  booking-derived stats on Control Room, silently show nothing.
  guides/host_guide_applications/system_rules/partner_hosts already have the
  equivalent "is this caller an active ops account" policy; bookings
  predates that pattern and never got it.
*/

CREATE POLICY "Ops can view all bookings"
  ON bookings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));

CREATE POLICY "Ops can update any booking"
  ON bookings FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));
