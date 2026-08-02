/*
  # Attraction Booking System Overhaul

  ## Summary
  This migration adds structured entry fee to institution_profiles, a tip column to guides,
  a booking_programs junction table for multi-program bookings, and new financial columns
  to the bookings table for transparent price line items.

  ## Changes

  ### 1. institution_profiles: Structured entry fee
  - Add `entry_fee_amount numeric(10,2) DEFAULT 0` — the numeric fee amount
  - Add `entry_fee_is_free boolean DEFAULT true` — whether entry is free

  ### 2. guides: Tip column
  - Add `tip numeric(10,2) NOT NULL DEFAULT 0` — per-booking tip assigned to this guide

  ### 3. New table: booking_programs
  - Junction table linking bookings to multiple programs
  - Stores price snapshot at time of booking

  ### 4. bookings: New financial columns
  - `entry_fee_amount numeric(10,2) DEFAULT 0` — entry fee charged at booking time
  - `tip_amount numeric(10,2) DEFAULT 0` — guide tip charged at booking time

  ## Security
  - RLS enabled on booking_programs
  - Authenticated users can insert/select their own booking_programs rows
  - Anon users can select (for display purposes in booking context)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'entry_fee_amount'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN entry_fee_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'entry_fee_is_free'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN entry_fee_is_free boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guides' AND column_name = 'tip'
  ) THEN
    ALTER TABLE guides ADD COLUMN tip numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'entry_fee_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN entry_fee_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'tip_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN tip_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS booking_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  program_title text NOT NULL DEFAULT '',
  price_snapshot numeric(10,2) NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE booking_programs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'booking_programs' AND policyname = 'Travelers can insert own booking programs'
  ) THEN
    CREATE POLICY "Travelers can insert own booking programs"
      ON booking_programs FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM bookings
          WHERE bookings.id = booking_programs.booking_id
          AND bookings.traveler_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'booking_programs' AND policyname = 'Travelers can view own booking programs'
  ) THEN
    CREATE POLICY "Travelers can view own booking programs"
      ON booking_programs FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM bookings
          WHERE bookings.id = booking_programs.booking_id
          AND bookings.traveler_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'booking_programs' AND policyname = 'Institution can view their booking programs'
  ) THEN
    CREATE POLICY "Institution can view their booking programs"
      ON booking_programs FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM bookings
          WHERE bookings.id = booking_programs.booking_id
          AND bookings.institution_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'booking_programs' AND policyname = 'Anon can view booking programs'
  ) THEN
    CREATE POLICY "Anon can view booking programs"
      ON booking_programs FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_programs_booking_id ON booking_programs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_programs_program_id ON booking_programs(program_id);
