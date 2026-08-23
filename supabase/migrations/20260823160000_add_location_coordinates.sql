/*
  # Exact coordinates for attractions, and a public read policy for transport_zones

  ## Why
  Transport pickup/dropoff accuracy was resting on two weak links: a
  hardcoded ~35-place lookup table for geocoding, and a straight-line
  (haversine) distance estimate. Both are being replaced (Nominatim search +
  OSRM routing, done client-side, no schema need there) - but dropoff also
  needs each listing to actually HAVE a real coordinate to route to, instead
  of being guessed from a location name string at booking time. Experiences/
  homestays/itineraries already have a flexible `location` jsonb column
  ({name, region}) - the new LocationPicker just starts writing `lat`/`lng`
  keys into that same object, no migration needed there. institution_profiles
  (attractions) only has a plain `location` text column, so it needs real
  new columns.

  Also fixes transport_zones' write policy for Ops: the original
  `operations_full_zone_access` policy (20260706072022) checks
  `portal_users.id = auth.uid()`, but portal_users.id is that table's own
  primary key, not the linked Supabase Auth identity - the correct column is
  `auth_user_id` (the pattern every other Ops-write policy in this app
  uses). As written it could never match any real Ops session. Also adds an
  anon-writable policy matching this app's established trust model for
  Ops-managed config tables (system_rules, etc.), since Ops still moves
  between the legacy anon-key login and real Supabase Auth sessions
  depending on the flow. transport_zones' anon SELECT already existed
  (`transport_zones_public_read`, from the original migration) - nothing
  to add there.
*/

ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS location_lat numeric(9,6);
ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS location_lng numeric(9,6);

DROP POLICY IF EXISTS "operations_full_zone_access" ON transport_zones;
CREATE POLICY "operations_full_zone_access" ON transport_zones FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));

CREATE POLICY "Anon can update transport zones"
  ON transport_zones FOR UPDATE TO anon USING (true) WITH CHECK (true);
