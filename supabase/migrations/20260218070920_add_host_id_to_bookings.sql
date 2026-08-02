/*
  # Add host_id to bookings table

  ## Overview
  Links bookings directly to the host assigned to the listing.
  This allows the host dashboard to query bookings relevant to that specific host
  without needing to join through partner_listings every time.

  ## Changes
  - Adds `host_id` (uuid, nullable) to `bookings` referencing `partner_hosts(id)`
  - Backfills `host_id` from `partner_listings.host_id` where `item_id` matches
  - Adds index for performance

  ## Notes
  - Nullable because attraction bookings have no host
  - Application code should set host_id at booking creation time
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'host_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill host_id from partner_listings for existing bookings
UPDATE bookings b
SET host_id = pl.host_id
FROM partner_listings pl
WHERE b.item_id = pl.id
  AND b.host_id IS NULL
  AND pl.host_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_host_id ON bookings(host_id);
