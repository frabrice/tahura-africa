/*
  # Bookings: confirm only after payment

  ## Why
  Migration 20260315114255_auto_confirm_bookings.sql set the bookings.status
  DEFAULT to 'confirmed' so that every booking appeared confirmed the moment it
  was created — before payment succeeded. That produced "phantom" confirmed
  bookings for orders that were never paid.

  ## What this does
  Restores the DEFAULT for bookings.status to 'pending'. New paid bookings are
  now created as 'pending' and are flipped to 'confirmed' only when the
  pesapal-ipn edge function records a completed payment (it already sets
  status = 'confirmed', payment_status = 'paid'). Free (zero-total) bookings are
  created directly as 'confirmed' by the app since there is nothing to pay.

  Existing rows are left untouched — this only changes the default for future
  inserts. The two booking-creation paths (BookingDrawer, AttractionBookingDrawer)
  set status explicitly, so this default is a safety net for any other insert.
*/

ALTER TABLE bookings
  ALTER COLUMN status SET DEFAULT 'pending';
