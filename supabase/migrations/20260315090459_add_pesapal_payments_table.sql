/*
  # Add Pesapal Payments Table

  ## Summary
  Adds a `payments` table to track Pesapal payment transactions linked to bookings.
  Also adds a `payment_status` column to the `bookings` table to distinguish between
  booking status (confirmed/cancelled) and payment status (pending/paid/failed).

  ## New Tables
  - `payments`
    - `id` (uuid, primary key)
    - `booking_id` (uuid, FK to bookings) — the booking this payment belongs to
    - `booking_ref` (text) — human-readable booking reference
    - `pesapal_order_tracking_id` (text) — Pesapal's unique order tracking ID returned after order submission
    - `pesapal_merchant_reference` (text) — our own reference sent to Pesapal
    - `amount` (numeric) — amount charged in USD
    - `currency` (text, default 'USD')
    - `status` (text) — 'pending' | 'completed' | 'failed' | 'invalid'
    - `payment_method` (text, nullable) — e.g. 'Visa', 'Mpesa', etc.
    - `payment_account` (text, nullable) — masked card/phone
    - `description` (text, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Modified Tables
  - `bookings`
    - Adds `payment_status` column: 'pending' | 'paid' | 'failed' (default 'pending')
    - Adds `pesapal_tracking_id` column (text, nullable) for quick lookup

  ## Security
  - RLS enabled on `payments`
  - Travelers can only read their own payments (via booking)
  - Service role has full access (used by edge functions)
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  booking_ref text NOT NULL,
  pesapal_order_tracking_id text,
  pesapal_merchant_reference text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'invalid')),
  payment_method text,
  payment_account text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON payments(booking_id);
CREATE INDEX IF NOT EXISTS payments_merchant_reference_idx ON payments(pesapal_merchant_reference);
CREATE INDEX IF NOT EXISTS payments_tracking_id_idx ON payments(pesapal_order_tracking_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Travelers can read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
        AND bookings.traveler_id = auth.uid()
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_status text NOT NULL DEFAULT 'pending'
      CHECK (payment_status IN ('pending', 'paid', 'failed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'pesapal_tracking_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN pesapal_tracking_id text;
  END IF;
END $$;
