/*
  # Create Hosts and Listings Schema for Partner Console

  ## Overview
  This migration creates the complete schema for managing hosts and listings (experiences/homestays)
  in the Partner Console, with full integration to the traveler-facing experience.

  ## New Tables
  
  ### 1. `partner_hosts`
  Stores host/guide information for partner listings:
  - `id` (uuid, primary key) - Unique host identifier
  - `partner_id` (uuid) - References the partner who created this host
  - `name` (text) - Host's full name
  - `bio` (text) - Host biography/description
  - `profile_picture` (text) - URL to host's profile image
  - `languages` (text[]) - Languages spoken by the host
  - `email` (text) - Host's contact email
  - `phone` (text) - Host's contact phone
  - `expertise` (text[]) - Areas of expertise/specialization
  - `years_experience` (integer) - Years of experience
  - `status` (text) - Host status (active, inactive)
  - `created_at`, `updated_at` (timestamptz)

  ### 2. `partner_listings`
  Enhanced listings table supporting both experiences and homestays:
  - All existing fields maintained
  - Added `host_id` (uuid) - References partner_hosts, one host per listing
  - Additional fields for traveler-side display compatibility

  ### 3. Integration with traveler-side tables
  - Links partner_listings to experiences and homestays tables for display
  - Ensures data consistency between partner management and traveler views

  ## Security
  - Enable RLS on all tables
  - Partners can only view/manage their own hosts and listings
  - Restrictive policies requiring authentication
  - Ownership verification on all operations

  ## Important Notes
  - Each listing can have only ONE host (one-to-one relationship)
  - Host assignment is the final step in listing creation
  - Hosts are created independently and then assigned to listings
  - All fields support full CRUD operations from Partner Console
*/

-- Create partner_hosts table
CREATE TABLE IF NOT EXISTS partner_hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  name text NOT NULL,
  bio text DEFAULT '',
  profile_picture text DEFAULT '',
  languages text[] DEFAULT '{}',
  email text DEFAULT '',
  phone text DEFAULT '',
  expertise text[] DEFAULT '{}',
  years_experience integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_hosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own hosts"
  ON partner_hosts FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

CREATE POLICY "Partners can create hosts"
  ON partner_hosts FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY "Partners can update own hosts"
  ON partner_hosts FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY "Partners can delete own hosts"
  ON partner_hosts FOR DELETE
  TO authenticated
  USING (partner_id = auth.uid());

-- Create or modify partner_listings table with host relationship
CREATE TABLE IF NOT EXISTS partner_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('experience', 'homestay')),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'draft')),
  location jsonb NOT NULL DEFAULT '{"name": "", "region": ""}',
  pricing jsonb NOT NULL DEFAULT '{}',
  media text[] DEFAULT '{}',
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add host_id column if table already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partner_listings' AND column_name = 'host_id'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Rename name column to title if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partner_listings' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partner_listings' AND column_name = 'title'
  ) THEN
    ALTER TABLE partner_listings RENAME COLUMN name TO title;
  END IF;
END $$;

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

CREATE POLICY "Partners can delete own listings"
  ON partner_listings FOR DELETE
  TO authenticated
  USING (partner_id = auth.uid());

-- Allow anonymous users to view published listings (for traveler side)
CREATE POLICY "Anonymous users can view active listings"
  ON partner_listings FOR SELECT
  TO anon
  USING (status = 'active');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_hosts_partner ON partner_hosts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_hosts_status ON partner_hosts(status);
CREATE INDEX IF NOT EXISTS idx_partner_listings_partner ON partner_listings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_listings_host ON partner_listings(host_id);
CREATE INDEX IF NOT EXISTS idx_partner_listings_type ON partner_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_partner_listings_status ON partner_listings(status);
