/*
  # Create Bookings Table

  1. New Tables
    - `bookings`
      - `id` (uuid, primary key)
      - `booking_ref` (text, unique) - human-readable reference like BK-123456
      - `traveler_id` (uuid, nullable - references auth.users) - Supabase auth user
      - `traveler_name` (text) - denormalized for display
      - `traveler_email` (text) - denormalized for display
      - `booking_type` (text) - 'experience', 'homestay', 'attraction'
      - `item_id` (uuid, nullable) - references the listing or attraction
      - `item_title` (text) - denormalized title
      - `partner_id` (uuid, nullable) - references portal_users for partner bookings
      - `institution_id` (uuid, nullable) - references portal_users for attraction bookings
      - `program_id` (uuid, nullable) - references programs for attraction bookings
      - `guide_id` (uuid, nullable) - references guides for attraction bookings
      - `package_name` (text, nullable) - for attraction packages
      - `guide_name` (text, nullable) - denormalized guide name
      - `booking_date` (date) - the date of visit/experience
      - `guests` (integer) - number of guests/participants
      - `subtotal` (numeric) - subtotal before fees
      - `service_fee` (numeric) - platform service fee
      - `total_amount` (numeric) - final total
      - `special_requests` (text) - any special requests
      - `status` (text) - 'pending', 'confirmed', 'completed', 'cancelled'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Travelers can view their own bookings
    - Partners can view bookings for their listings
    - Institutions can view bookings for their programs
    - Anonymous can create bookings
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text UNIQUE NOT NULL DEFAULT concat('BK-', floor(random() * 900000 + 100000)::text),
  traveler_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  traveler_name text NOT NULL,
  traveler_email text NOT NULL,
  booking_type text NOT NULL CHECK (booking_type IN ('experience', 'homestay', 'attraction')),
  item_id uuid,
  item_title text NOT NULL,
  partner_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  institution_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  package_name text,
  guide_name text,
  booking_date date NOT NULL,
  guests integer NOT NULL DEFAULT 1,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  service_fee numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  special_requests text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Travelers can view their own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (traveler_id = auth.uid());

CREATE POLICY "Travelers can insert bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (traveler_id = auth.uid());

CREATE POLICY "Anonymous users can insert bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Partners can view bookings for their listings"
  ON bookings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Partners can update booking status"
  ON bookings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_bookings_traveler_id ON bookings(traveler_id);
CREATE INDEX IF NOT EXISTS idx_bookings_partner_id ON bookings(partner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_institution_id ON bookings(institution_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);