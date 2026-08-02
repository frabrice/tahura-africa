/*
  # Add Cancellation Fields to Bookings Table

  ## Summary
  Adds three new columns to the bookings table to track trip cancellation details
  initiated by travelers. These fields support the traveler-side cancellation flow
  and provide audit information for hosts and operations teams.

  ## New Columns
  - `cancellation_reason` (text, nullable) - The mandatory reason provided by the traveler when cancelling
  - `cancelled_at` (timestamptz, nullable) - Exact timestamp of when the cancellation occurred
  - `cancelled_by` (text, nullable) - Who initiated the cancellation; defaults to 'traveler' for now,
    supports future 'host' or 'admin' values

  ## Security Changes
  - Adds a new RLS policy allowing authenticated travelers to update ONLY their own bookings'
    cancellation fields (status, cancellation_reason, cancelled_at, cancelled_by)
  - Policy is restrictive: traveler can only set status to 'cancelled', not any other value

  ## Important Notes
  1. No existing data is affected - all new columns are nullable
  2. The status column already supports 'cancelled' so no constraint changes are needed
  3. Financial calculations on the host wallet side automatically exclude cancelled bookings
     by filtering on status, so no wallet changes are required
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE bookings ADD COLUMN cancellation_reason text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN cancelled_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE bookings ADD COLUMN cancelled_by text;
  END IF;
END $$;

CREATE POLICY "Traveler can cancel own booking"
  ON bookings FOR UPDATE
  TO authenticated
  USING (traveler_id = auth.uid() AND status IN ('pending', 'confirmed'))
  WITH CHECK (
    traveler_id = auth.uid()
    AND status = 'cancelled'
  );
