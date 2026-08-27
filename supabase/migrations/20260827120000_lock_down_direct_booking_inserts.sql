/*
  # Close the booking-amount forgery gap: lock down direct booking inserts

  ## Why
  bookings.total_amount/subtotal/service_fee were computed entirely
  client-side and trusted at INSERT time — anon_insert_unpaid_bookings
  and "Travelers can insert bookings" only ever checked payment_status/
  traveler_id, never the price fields. A client could insert a booking
  referencing any real listing/attraction with an arbitrary total_amount,
  then legitimately pay that forged (lower) amount through a payment
  gateway that correctly charges whatever bookings.total_amount says.

  The existing fn_protect_booking_financial_fields trigger already closed
  this at UPDATE time (confirmed live: a tampered total_amount on an
  existing booking is rejected) — this was always specifically an
  INSERT-time gap.

  ## Fix
  All booking creation now goes through the new create-booking edge
  function (service role), which looks up the real price server-side per
  booking type (partner_listings.pricing, institution_profiles/programs/
  guides for attractions, custom_quotes.client_total for quotes) and
  reads the live commission rate from system_rules — never from
  anything the client sends. BookingDrawer.tsx, AttractionBookingDrawer.tsx,
  and QuotePage.tsx were updated to call it instead of inserting directly.

  With that migration complete, direct client INSERT into bookings,
  booking_programs, and transports is removed entirely — service_role
  (via the edge function) becomes the only path in, closing the gap
  rather than just making it harder to hit.
*/

DROP POLICY IF EXISTS "Travelers can insert bookings" ON bookings;
DROP POLICY IF EXISTS "anon_insert_unpaid_bookings" ON bookings;

DROP POLICY IF EXISTS "Anon can insert booking programs" ON booking_programs;
DROP POLICY IF EXISTS "Travelers can insert own booking programs" ON booking_programs;

DROP POLICY IF EXISTS "Authenticated travelers can insert transports for their booking" ON transports;
