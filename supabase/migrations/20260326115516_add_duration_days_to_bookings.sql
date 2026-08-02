/*
  # Add duration_days to bookings table

  ## Summary
  Adds a `duration_days` integer column to the bookings table to support
  multi-day homestay experience bookings.

  ## Changes

  ### Modified Tables
  - `bookings`
    - `duration_days` (integer, nullable): Stores the number of days a homestay
      booking spans. Null for single-day bookings (guides, programs, etc.).
      Used for availability overlap calculations so the system can block all
      days in the range without querying the listing's JSONB details column.

  ## Notes
  - Column is nullable — existing bookings are not affected
  - Only homestay listing bookings will populate this field
  - Availability checks should compare ranges: an existing booking with
    start_date D and duration N blocks dates D through D+N-1
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'duration_days'
  ) THEN
    ALTER TABLE bookings ADD COLUMN duration_days integer;
  END IF;
END $$;
