/*
  # Auto-confirm all bookings

  ## Summary
  Changes the booking system so all bookings are automatically confirmed on creation.

  ## Changes
  1. Updates the default value for the `status` column in `bookings` table from 'pending' to 'confirmed'
  2. Backfills all existing 'pending' bookings to 'confirmed' status
     - This resolves the backlog of pending bookings showing in partner, host, and institution dashboards
*/

ALTER TABLE bookings
  ALTER COLUMN status SET DEFAULT 'confirmed';

UPDATE bookings
SET status = 'confirmed', updated_at = now()
WHERE status = 'pending';
