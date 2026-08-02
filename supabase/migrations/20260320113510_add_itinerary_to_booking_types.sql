/*
  # Add Itinerary to Booking Types

  ## Summary
  Expands the bookings table to support itinerary booking type.

  ## Changes
  1. Modified Tables
     - `bookings`: Drops old booking_type CHECK constraint, adds new one that includes 'itinerary'
       alongside the existing 'experience', 'homestay', 'attraction' values

  ## Notes
  - Two itinerary listings already exist in partner_listings but could not be booked due to
    the missing constraint value
  - No data is lost; existing bookings are unaffected
*/

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_booking_type_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_booking_type_check
  CHECK (booking_type IN ('experience', 'homestay', 'attraction', 'itinerary'));
