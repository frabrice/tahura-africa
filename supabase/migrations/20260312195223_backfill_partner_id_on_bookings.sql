/*
  # Backfill partner_id on bookings

  1. Data Fix
    - Updates bookings that have a host_id but are missing a partner_id
    - Resolves partner_id by looking up the host's partner from partner_hosts table
    - This ensures all host-related bookings appear in the partner dashboard

  2. Important Notes
    - Only updates rows where partner_id IS NULL and host_id IS NOT NULL
    - Non-destructive: does not modify rows that already have partner_id set
*/

UPDATE bookings
SET partner_id = ph.partner_id
FROM partner_hosts ph
WHERE bookings.host_id = ph.id
  AND bookings.partner_id IS NULL
  AND bookings.host_id IS NOT NULL;
