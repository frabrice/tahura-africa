/*
  # Partner Console Schema

  1. New Tables
    - `partner_listings`
      - Core listing information for both experiences and homestays
      - Includes status, pricing, location details
      - Links to partner profile
    
    - `partner_bookings`
      - Booking records for partner offerings
      - Status tracking (pending, confirmed, completed, cancelled)
      - Links to listings and travelers
    
    - `partner_earnings`
      - Transaction records
      - Payout tracking
      - Links to bookings
    
    - `partner_messages`
      - Conversation threads
      - Links to listings and bookings
      - Message history
    
    - `partner_settings`
      - Partner business configuration
      - Payout details
      - Notification preferences

  2. Security
    - Enable RLS on all tables
    - Partners can only view/edit their own data
    - Authenticated users required for all operations
*/

-- Partner Listings Table
CREATE TABLE IF NOT EXISTS partner_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES profiles(id) NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('experience', 'homestay')),
  name text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'draft')),
  location jsonb NOT NULL,
  pricing jsonb NOT NULL,
  media text[] DEFAULT '{}',
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own listings"
  ON partner_listings FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

CREATE POLICY "Partners can create listings"
  ON partner_listings FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY "Partners can update own listings"
  ON partner_listings FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

-- Partner Bookings Table
CREATE TABLE IF NOT EXISTS partner_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES partner_listings(id) NOT NULL,
  partner_id uuid REFERENCES profiles(id) NOT NULL,
  traveler_id uuid REFERENCES profiles(id),
  traveler_name text NOT NULL,
  traveler_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  booking_date timestamptz NOT NULL,
  booking_details jsonb NOT NULL,
  amount decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own bookings"
  ON partner_bookings FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

CREATE POLICY "Partners can update own bookings"
  ON partner_bookings FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

-- Partner Earnings Table
CREATE TABLE IF NOT EXISTS partner_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES profiles(id) NOT NULL,
  booking_id uuid REFERENCES partner_bookings(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('booking', 'payout', 'refund', 'adjustment')),
  amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payout_date timestamptz,
  transaction_date timestamptz DEFAULT now(),
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partner_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own earnings"
  ON partner_earnings FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

-- Partner Messages Table
CREATE TABLE IF NOT EXISTS partner_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  partner_id uuid REFERENCES profiles(id) NOT NULL,
  listing_id uuid REFERENCES partner_listings(id),
  booking_id uuid REFERENCES partner_bookings(id),
  sender_type text NOT NULL CHECK (sender_type IN ('partner', 'traveler')),
  sender_name text NOT NULL,
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partner_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own messages"
  ON partner_messages FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

CREATE POLICY "Partners can send messages"
  ON partner_messages FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

-- Partner Settings Table
CREATE TABLE IF NOT EXISTS partner_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES profiles(id) NOT NULL UNIQUE,
  business_name text NOT NULL,
  business_description text,
  contact_email text NOT NULL,
  contact_phone text,
  payout_details jsonb DEFAULT '{}',
  notification_preferences jsonb DEFAULT '{}',
  policies jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own settings"
  ON partner_settings FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

CREATE POLICY "Partners can update own settings"
  ON partner_settings FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY "Partners can create settings"
  ON partner_settings FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_listings_partner ON partner_listings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_bookings_partner ON partner_bookings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_bookings_listing ON partner_bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner ON partner_earnings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_messages_partner ON partner_messages(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_messages_conversation ON partner_messages(conversation_id);
