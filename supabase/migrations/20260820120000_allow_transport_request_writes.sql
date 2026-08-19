/*
  # Allow booking flows to actually record a transport request

  ## Why
  The `transports` table (and `bookings.transport_requested`/`transport_id`)
  has existed since the old in-house driver-dispatch design, but nothing in
  the app has ever written to it — travelers could pay for transport and the
  pickup details were silently discarded, since `createTransport()` was never
  called and no RLS policy even allowed a traveler to insert a row here.

  The dispatch/driver-matching side of that old design is NOT being revived.
  This migration only makes the *request* durable: a traveler can record
  their own transport request (pickup location + fare, computed client-side
  from the real gazetteer-based fare calculator), and every party who can
  already see the underlying booking — host, guide, partner, Ops — can also
  see whether transport was requested and its details. `driver_id`/
  `vehicle_id` stay null; arranging the actual pickup is a manual step for
  now (host/partner/Ops), not an automated dispatch.

  ## Changes
  - INSERT policies mirroring how `bookings` itself already accepts inserts
    from both real Supabase-Auth travelers and legacy anon-key sessions.
  - A permissive anon SELECT policy, matching the openness `bookings` already
    grants anon sessions (Hosts/Partners currently read bookings this way) —
    a transport row carries no more sensitive data than the booking it
    belongs to (a pickup location name and a fare number).
*/

CREATE POLICY "Authenticated travelers can insert transports for their bookings"
  ON transports FOR INSERT TO authenticated
  WITH CHECK (booking_id IN (SELECT id FROM bookings WHERE traveler_id = (select auth.uid())));

CREATE POLICY "Anon sessions can insert transports"
  ON transports FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon sessions can view transports"
  ON transports FOR SELECT TO anon USING (true);
