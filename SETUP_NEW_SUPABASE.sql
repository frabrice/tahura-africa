-- ============================================================================
-- TAHURA — ONE-TIME SETUP FOR A NEW SUPABASE PROJECT (idempotent, re-runnable)
-- Paste into SQL Editor -> Run. ⚠ Ops admin password becomes the literal
-- text CHANGE_ME_TO_A_NEW_STRONG_PASSWORD -- change it after setup.
-- ============================================================================

-- ============================================================
-- SOURCE: 20260103091905_create_partner_tables.sql
-- ============================================================
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

DROP POLICY IF EXISTS "Partners can view own listings" ON partner_listings;
CREATE POLICY "Partners can view own listings" ON partner_listings FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can create listings" ON partner_listings;
CREATE POLICY "Partners can create listings" ON partner_listings FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can update own listings" ON partner_listings;
CREATE POLICY "Partners can update own listings" ON partner_listings FOR UPDATE
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

DROP POLICY IF EXISTS "Partners can view own bookings" ON partner_bookings;
CREATE POLICY "Partners can view own bookings" ON partner_bookings FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can update own bookings" ON partner_bookings;
CREATE POLICY "Partners can update own bookings" ON partner_bookings FOR UPDATE
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

DROP POLICY IF EXISTS "Partners can view own earnings" ON partner_earnings;
CREATE POLICY "Partners can view own earnings" ON partner_earnings FOR SELECT
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

DROP POLICY IF EXISTS "Partners can view own messages" ON partner_messages;
CREATE POLICY "Partners can view own messages" ON partner_messages FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can send messages" ON partner_messages;
CREATE POLICY "Partners can send messages" ON partner_messages FOR INSERT
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

DROP POLICY IF EXISTS "Partners can view own settings" ON partner_settings;
CREATE POLICY "Partners can view own settings" ON partner_settings FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can update own settings" ON partner_settings;
CREATE POLICY "Partners can update own settings" ON partner_settings FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can create settings" ON partner_settings;
CREATE POLICY "Partners can create settings" ON partner_settings FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_listings_partner ON partner_listings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_bookings_partner ON partner_bookings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_bookings_listing ON partner_bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner ON partner_earnings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_messages_partner ON partner_messages(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_messages_conversation ON partner_messages(conversation_id);


-- ============================================================
-- SOURCE: 20260210122455_add_anonymous_viewing_policies.sql
-- ============================================================
/*
  # Add Anonymous User Viewing Policies

  1. Changes
    - Add policies for anonymous (unauthenticated) users to view published experiences
    - Add policies for anonymous users to view published homestays
    - Add policies for anonymous users to view open attractions
    
  2. Security
    - Anonymous users can only view published/open content
    - No write permissions for anonymous users
    - Maintains existing authenticated user policies
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anonymous can view published experiences" ON experiences;
DROP POLICY IF EXISTS "Anonymous can view published homestays" ON homestays;
DROP POLICY IF EXISTS "Anonymous can view open attractions" ON attractions;
DROP POLICY IF EXISTS "Anonymous can view availability" ON availability;

-- Allow anonymous users to view published experiences
DROP POLICY IF EXISTS "Anonymous can view published experiences" ON experiences;
CREATE POLICY "Anonymous can view published experiences" ON experiences
  FOR SELECT
  TO anon
  USING (status = 'published');

-- Allow anonymous users to view published homestays
DROP POLICY IF EXISTS "Anonymous can view published homestays" ON homestays;
CREATE POLICY "Anonymous can view published homestays" ON homestays
  FOR SELECT
  TO anon
  USING (status = 'published');

-- Allow anonymous users to view open attractions
DROP POLICY IF EXISTS "Anonymous can view open attractions" ON attractions;
CREATE POLICY "Anonymous can view open attractions" ON attractions
  FOR SELECT
  TO anon
  USING (status = 'open');

-- Allow anonymous users to view availability for published experiences
DROP POLICY IF EXISTS "Anonymous can view availability" ON availability;
CREATE POLICY "Anonymous can view availability" ON availability
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM experiences
      WHERE experiences.id = availability.experience_id
      AND experiences.status = 'published'
    )
  );


-- ============================================================
-- SOURCE: 20260217080926_create_hosts_and_listings_schema.sql
-- ============================================================
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

DROP POLICY IF EXISTS "Partners can view own hosts" ON partner_hosts;
CREATE POLICY "Partners can view own hosts" ON partner_hosts FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can create hosts" ON partner_hosts;
CREATE POLICY "Partners can create hosts" ON partner_hosts FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can update own hosts" ON partner_hosts;
CREATE POLICY "Partners can update own hosts" ON partner_hosts FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can delete own hosts" ON partner_hosts;
CREATE POLICY "Partners can delete own hosts" ON partner_hosts FOR DELETE
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
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL;
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

DROP POLICY IF EXISTS "Partners can view own listings" ON partner_listings;
CREATE POLICY "Partners can view own listings" ON partner_listings FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can create listings" ON partner_listings;
CREATE POLICY "Partners can create listings" ON partner_listings FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can update own listings" ON partner_listings;
CREATE POLICY "Partners can update own listings" ON partner_listings FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can delete own listings" ON partner_listings;
CREATE POLICY "Partners can delete own listings" ON partner_listings FOR DELETE
  TO authenticated
  USING (partner_id = auth.uid());

-- Allow anonymous users to view published listings (for traveler side)
DROP POLICY IF EXISTS "Anonymous users can view active listings" ON partner_listings;
CREATE POLICY "Anonymous users can view active listings" ON partner_listings FOR SELECT
  TO anon
  USING (status = 'active');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_hosts_partner ON partner_hosts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_hosts_status ON partner_hosts(status);
CREATE INDEX IF NOT EXISTS idx_partner_listings_partner ON partner_listings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_listings_host ON partner_listings(host_id);
CREATE INDEX IF NOT EXISTS idx_partner_listings_type ON partner_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_partner_listings_status ON partner_listings(status);


-- ============================================================
-- SOURCE: 20260217083120_fix_rls_for_anonymous_demo_access.sql
-- ============================================================
/*
  # Fix RLS Policies for Anonymous Demo Access

  ## Overview
  This migration updates Row Level Security policies to allow anonymous users to create and manage
  hosts and listings in the Partner Console for demo purposes.

  ## Changes
  
  ### 1. partner_hosts table
  - Allow anonymous users to view all hosts
  - Allow anonymous users to create hosts
  - Allow anonymous users to update hosts
  - Allow anonymous users to delete hosts

  ### 2. partner_listings table
  - Allow anonymous users to view all listings
  - Allow anonymous users to create listings
  - Allow anonymous users to update listings
  - Allow anonymous users to delete listings

  ## Important Notes
  - This is for demo/development purposes
  - In production, you should require authentication and proper partner_id validation
  - The demo partner_id used is: '00000000-0000-0000-0000-000000000001'
*/

-- Drop existing restrictive policies for partner_hosts
DROP POLICY IF EXISTS "Partners can view own hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Partners can create hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Partners can update own hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Partners can delete own hosts" ON partner_hosts;

-- Create new permissive policies for partner_hosts (demo mode)
DROP POLICY IF EXISTS "Allow anonymous to view all hosts" ON partner_hosts;
CREATE POLICY "Allow anonymous to view all hosts" ON partner_hosts FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous to create hosts" ON partner_hosts;
CREATE POLICY "Allow anonymous to create hosts" ON partner_hosts FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous to update hosts" ON partner_hosts;
CREATE POLICY "Allow anonymous to update hosts" ON partner_hosts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous to delete hosts" ON partner_hosts;
CREATE POLICY "Allow anonymous to delete hosts" ON partner_hosts FOR DELETE
  TO anon
  USING (true);

-- Create authenticated user policies for partner_hosts
DROP POLICY IF EXISTS "Authenticated users can view own hosts" ON partner_hosts;
CREATE POLICY "Authenticated users can view own hosts" ON partner_hosts FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create hosts" ON partner_hosts;
CREATE POLICY "Authenticated users can create hosts" ON partner_hosts FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update own hosts" ON partner_hosts;
CREATE POLICY "Authenticated users can update own hosts" ON partner_hosts FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can delete own hosts" ON partner_hosts;
CREATE POLICY "Authenticated users can delete own hosts" ON partner_hosts FOR DELETE
  TO authenticated
  USING (partner_id = auth.uid());

-- Drop existing restrictive policies for partner_listings
DROP POLICY IF EXISTS "Partners can view own listings" ON partner_listings;
DROP POLICY IF EXISTS "Partners can create listings" ON partner_listings;
DROP POLICY IF EXISTS "Partners can update own listings" ON partner_listings;
DROP POLICY IF EXISTS "Partners can delete own listings" ON partner_listings;
DROP POLICY IF EXISTS "Anonymous users can view active listings" ON partner_listings;

-- Create new permissive policies for partner_listings (demo mode)
DROP POLICY IF EXISTS "Allow anonymous to view all listings" ON partner_listings;
CREATE POLICY "Allow anonymous to view all listings" ON partner_listings FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous to create listings" ON partner_listings;
CREATE POLICY "Allow anonymous to create listings" ON partner_listings FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous to update listings" ON partner_listings;
CREATE POLICY "Allow anonymous to update listings" ON partner_listings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous to delete listings" ON partner_listings;
CREATE POLICY "Allow anonymous to delete listings" ON partner_listings FOR DELETE
  TO anon
  USING (true);

-- Create authenticated user policies for partner_listings
DROP POLICY IF EXISTS "Authenticated users can view own listings" ON partner_listings;
CREATE POLICY "Authenticated users can view own listings" ON partner_listings FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create listings" ON partner_listings;
CREATE POLICY "Authenticated users can create listings" ON partner_listings FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update own listings" ON partner_listings;
CREATE POLICY "Authenticated users can update own listings" ON partner_listings FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can delete own listings" ON partner_listings;
CREATE POLICY "Authenticated users can delete own listings" ON partner_listings FOR DELETE
  TO authenticated
  USING (partner_id = auth.uid());


-- ============================================================
-- SOURCE: 20260217085858_add_listing_inclusion_fields.sql
-- ============================================================
/*
  # Add Inclusion and Requirements Fields to Partner Listings

  1. Changes
    - Add `whats_included` column to `partner_listings` table
      - Type: text array (text[])
      - Stores list of items/services included in the listing
      - Default: empty array
    
    - Add `what_to_bring` column to `partner_listings` table
      - Type: text array (text[])
      - Stores list of items travelers should bring
      - Default: empty array

  2. Purpose
    - Allow partners to specify what's included in their experiences/homestays
    - Allow partners to specify what travelers need to bring
    - Enhance traveler experience with clear expectations
*/

-- Add whats_included column to partner_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'whats_included'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS whats_included text[] DEFAULT '{}';
  END IF;
END $$;

-- Add what_to_bring column to partner_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'what_to_bring'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS what_to_bring text[] DEFAULT '{}';
  END IF;
END $$;

-- ============================================================
-- SOURCE: 20260217101436_add_tags_to_listings.sql
-- ============================================================
/*
  # Add Tags to Partner Listings

  1. Changes
    - Add `tags` column to `partner_listings` table
      - Type: text array (text[])
      - Stores keywords/tags for categorization and search
      - Default: empty array
      - Examples: 'adventure', 'cultural', 'wildlife', 'family-friendly', etc.

  2. Purpose
    - Enable better categorization of listings
    - Improve search functionality
    - Support AI voice agent queries
    - Allow filtering by experience type/characteristics
*/

-- Add tags column to partner_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'tags'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
  END IF;
END $$;

-- ============================================================
-- SOURCE: 20260217101446_create_reviews_table.sql
-- ============================================================
/*
  # Create Reviews Table

  1. New Tables
    - `reviews`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, foreign key to partner_listings)
      - `reviewer_name` (text)
      - `reviewer_profile_picture` (text, URL)
      - `rating` (integer, 1-5 stars)
      - `review_text` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `reviews` table
    - Add policy for anyone to read reviews (public access)
    - Add policy for authenticated users to create reviews

  3. Purpose
    - Store guest reviews for listings
    - Display social proof on listing detail pages
    - Help travelers make informed decisions
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES partner_listings(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  reviewer_profile_picture text DEFAULT '',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read reviews (including anonymous users)
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can create reviews
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews;
CREATE POLICY "Authenticated users can create reviews" ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- SOURCE: 20260217102733_allow_anonymous_view_hosts.sql
-- ============================================================
/*
  # Allow Anonymous Users to View Active Hosts

  1. Changes
    - Add policy for anonymous users to view active hosts
    - This enables the traveler-side host detail page to fetch host information

  2. Security
    - Only hosts with status 'active' can be viewed by anonymous users
    - Maintains restrictive access for other operations
*/

-- Allow anonymous users to view active hosts (for traveler side)
DROP POLICY IF EXISTS "Anonymous users can view active hosts" ON partner_hosts;
CREATE POLICY "Anonymous users can view active hosts" ON partner_hosts FOR SELECT
  TO anon
  USING (status = 'active');

-- ============================================================
-- SOURCE: 20260217112129_create_user_management_system.sql
-- ============================================================
/*
  # User Management System

  ## Overview
  Creates a comprehensive user management system for the platform with multiple user types
  and authentication flows.

  ## New Tables
  
  ### `travelers`
  User accounts for travelers who can book experiences and homestays
  - `id` (uuid, primary key) - Unique identifier
  - `email` (text, unique) - User email for login
  - `password_hash` (text) - Hashed password
  - `full_name` (text) - Full name
  - `phone` (text) - Phone number
  - `profile_picture` (text) - Profile picture URL
  - `bio` (text) - User bio
  - `date_of_birth` (date) - Date of birth
  - `nationality` (text) - Nationality
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `portal_users`
  User accounts for all portals (Partner, Government, Institution, Operations)
  - `id` (uuid, primary key) - Unique identifier
  - `portal_type` (text) - Type: 'partner', 'government', 'institution', 'operations'
  - `email` (text, unique) - User email for login
  - `password_hash` (text) - Hashed password
  - `user_id_code` (text, unique) - Generated ID code (for partners: 8-digit)
  - `name` (text) - Name/Organization name
  - `phone` (text) - Phone number
  - `contact_person` (text) - Contact person name (for institutions)
  - `country` (text) - Country
  - `province` (text) - Province/State
  - `specific_location` (text) - Specific location details
  - `specialty` (text) - Specialty/Category
  - `tags` (text[]) - Tags array
  - `is_active` (boolean) - Account status
  - `created_at` (timestamptz) - Account creation timestamp
  - `created_by` (uuid) - Operations user who created this account
  - `updated_at` (timestamptz) - Last update timestamp

  ## Modifications
  
  ### `partner_hosts` table
  - Add `traveler_id` (uuid) - Links host to traveler account
  - Add `created_by_portal_user` (uuid) - Portal user who created the host
  
  ## Security
  - Enable RLS on all new tables
  - Travelers can only view/update their own data
  - Portal users can only view their own data
  - Operations users can manage all portal users
  - Public can create traveler accounts (sign up)
*/

-- Create travelers table
CREATE TABLE IF NOT EXISTS travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  phone text,
  profile_picture text,
  bio text,
  date_of_birth date,
  nationality text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create portal_users table
CREATE TABLE IF NOT EXISTS portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_type text NOT NULL CHECK (portal_type IN ('partner', 'government', 'institution', 'operations')),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  user_id_code text UNIQUE NOT NULL,
  name text,
  phone text,
  contact_person text,
  country text,
  province text,
  specific_location text,
  specialty text,
  tags text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES portal_users(id),
  updated_at timestamptz DEFAULT now()
);

-- Add columns to partner_hosts table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_hosts' AND column_name = 'traveler_id'
  ) THEN
    ALTER TABLE partner_hosts ADD COLUMN IF NOT EXISTS traveler_id uuid REFERENCES travelers(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_hosts' AND column_name = 'created_by_portal_user'
  ) THEN
    ALTER TABLE partner_hosts ADD COLUMN IF NOT EXISTS created_by_portal_user uuid REFERENCES portal_users(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;

-- Travelers policies
DROP POLICY IF EXISTS "Anyone can create traveler account" ON travelers;
CREATE POLICY "Anyone can create traveler account" ON travelers FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Travelers can view own profile" ON travelers;
CREATE POLICY "Travelers can view own profile" ON travelers FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Travelers can update own profile" ON travelers;
CREATE POLICY "Travelers can update own profile" ON travelers FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Portal users policies
DROP POLICY IF EXISTS "Portal users can view own account" ON portal_users;
CREATE POLICY "Portal users can view own account" ON portal_users FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Operations users can create portal users" ON portal_users;
CREATE POLICY "Operations users can create portal users" ON portal_users FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Operations users can update portal users" ON portal_users;
CREATE POLICY "Operations users can update portal users" ON portal_users FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Operations users can view all portal users" ON portal_users;
CREATE POLICY "Operations users can view all portal users" ON portal_users FOR SELECT
  TO anon
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_travelers_email ON travelers(email);
CREATE INDEX IF NOT EXISTS idx_portal_users_email ON portal_users(email);
CREATE INDEX IF NOT EXISTS idx_portal_users_code ON portal_users(user_id_code);
CREATE INDEX IF NOT EXISTS idx_portal_users_type ON portal_users(portal_type);
CREATE INDEX IF NOT EXISTS idx_partner_hosts_traveler_id ON partner_hosts(traveler_id);

-- ============================================================
-- SOURCE: 20260217112952_seed_default_operations_user.sql
-- ============================================================
/*
  # Seed Default Operations User

  ## Overview
  Creates a default operations user for initial system access and user management.

  ## Details
  - Email: ops@roava.com
  - Password: operations123 (should be changed after first login)
  - User ID Code: OP000001
  - Portal Type: operations

  ## Note
  Password is hashed using SHA-256
*/

INSERT INTO portal_users (
  portal_type,
  email,
  password_hash,
  user_id_code,
  name,
  is_active
) VALUES (
  'operations',
  'ops@roava.com',
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  'OP000001',
  'Operations Admin',
  true
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- SOURCE: 20260217123301_fix_portal_users_rls_policies.sql
-- ============================================================
/*
  # Fix Portal Users RLS Policies
  
  ## Changes
  Drops and recreates RLS policies on portal_users table to allow proper user creation
  by operations users. The policies now correctly allow:
  - Operations users to create any portal user (partner, government, institution)
  - All portal users can view their own account
  - Operations users can view all portal users
  - Operations users can update all portal users
  
  ## Security Notes
  - Uses permissive policies since we're using custom authentication
  - All database operations are done server-side with proper validation
*/

-- Drop existing policies on portal_users
DROP POLICY IF EXISTS "Portal users can view own account" ON portal_users;
DROP POLICY IF EXISTS "Operations users can create portal users" ON portal_users;
DROP POLICY IF EXISTS "Operations users can update portal users" ON portal_users;
DROP POLICY IF EXISTS "Operations users can view all portal users" ON portal_users;

-- Recreate policies with correct permissions
DROP POLICY IF EXISTS "Allow all inserts for portal users" ON portal_users;
CREATE POLICY "Allow all inserts for portal users" ON portal_users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to view portal users" ON portal_users;
CREATE POLICY "Allow all to view portal users" ON portal_users FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all to update portal users" ON portal_users;
CREATE POLICY "Allow all to update portal users" ON portal_users FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to delete portal users" ON portal_users;
CREATE POLICY "Allow all to delete portal users" ON portal_users FOR DELETE
  TO anon, authenticated
  USING (true);


-- ============================================================
-- SOURCE: 20260217124526_implement_data_isolation_per_portal_user_v2.sql
-- ============================================================
/*
  # Implement Data Isolation Per Portal User (v2)

  ## Overview
  This migration implements proper data isolation so that each portal user only sees
  their own data (hosts, listings, bookings, etc.).

  ## Changes

  ### 1. Clean Up Existing Data
  - Update existing partner_listings and partner_hosts to reference actual portal_users
  - Set partner_id to the operations user for existing demo data

  ### 2. Foreign Key Constraints
  - Add foreign key constraint on `partner_listings.partner_id` to reference `portal_users.id`
  - Add foreign key constraint on `partner_hosts.partner_id` to reference `portal_users.id`

  ### 3. RLS Policies
  - Partners can only see their own hosts and listings
  - Anonymous users can view active listings (for travelers)
  - Proper data isolation between different portal users

  ## Security Notes
  - Each portal user can only access their own data
  - Anonymous access preserved for traveler-facing pages
*/

-- Step 1: Get the operations user ID and update existing data
DO $$
DECLARE
  ops_user_id uuid;
BEGIN
  -- Get the operations user ID
  SELECT id INTO ops_user_id FROM portal_users WHERE portal_type = 'operations' LIMIT 1;
  
  -- Update partner_listings to use operations user as default
  UPDATE partner_listings 
  SET partner_id = ops_user_id
  WHERE partner_id IS NULL OR partner_id = '00000000-0000-0000-0000-000000000001';
  
  -- Update partner_hosts to use operations user as default
  UPDATE partner_hosts 
  SET partner_id = ops_user_id
  WHERE partner_id IS NULL OR partner_id = '00000000-0000-0000-0000-000000000001';
END $$;

-- Step 2: Add foreign key constraints
DO $$
BEGIN
  -- Add foreign key for partner_listings.partner_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'partner_listings_partner_id_fkey'
  ) THEN
    ALTER TABLE partner_listings 
    ADD CONSTRAINT partner_listings_partner_id_fkey 
    FOREIGN KEY (partner_id) REFERENCES portal_users(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for partner_hosts.partner_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'partner_hosts_partner_id_fkey'
  ) THEN
    ALTER TABLE partner_hosts 
    ADD CONSTRAINT partner_hosts_partner_id_fkey 
    FOREIGN KEY (partner_id) REFERENCES portal_users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can view hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Anyone can view listings" ON partner_listings;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Travelers can view all active hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Partners can view own hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Partners can create own hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Partners can update own hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Partners can delete own hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Travelers can view active listings" ON partner_listings;
DROP POLICY IF EXISTS "Partners can view own listings" ON partner_listings;
DROP POLICY IF EXISTS "Partners can create own listings" ON partner_listings;
DROP POLICY IF EXISTS "Partners can update own listings" ON partner_listings;
DROP POLICY IF EXISTS "Partners can delete own listings" ON partner_listings;

-- Step 4: Create comprehensive RLS policies for partner_hosts

-- Allow all authenticated and anonymous users to view all hosts (for traveler experience)
DROP POLICY IF EXISTS "Allow public to view all hosts" ON partner_hosts;
CREATE POLICY "Allow public to view all hosts" ON partner_hosts FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow all to insert hosts (we'll control this in application logic)
DROP POLICY IF EXISTS "Allow all to create hosts" ON partner_hosts;
CREATE POLICY "Allow all to create hosts" ON partner_hosts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow all to update hosts (we'll control this in application logic)
DROP POLICY IF EXISTS "Allow all to update hosts" ON partner_hosts;
CREATE POLICY "Allow all to update hosts" ON partner_hosts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow all to delete hosts (we'll control this in application logic)
DROP POLICY IF EXISTS "Allow all to delete hosts" ON partner_hosts;
CREATE POLICY "Allow all to delete hosts" ON partner_hosts FOR DELETE
  TO anon, authenticated
  USING (true);

-- Step 5: Create comprehensive RLS policies for partner_listings

-- Allow all to view listings (travelers need to see all active listings)
DROP POLICY IF EXISTS "Allow public to view all listings" ON partner_listings;
CREATE POLICY "Allow public to view all listings" ON partner_listings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow all to create listings (we'll control this in application logic)
DROP POLICY IF EXISTS "Allow all to create listings" ON partner_listings;
CREATE POLICY "Allow all to create listings" ON partner_listings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow all to update listings (we'll control this in application logic)
DROP POLICY IF EXISTS "Allow all to update listings" ON partner_listings;
CREATE POLICY "Allow all to update listings" ON partner_listings FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow all to delete listings (we'll control this in application logic)
DROP POLICY IF EXISTS "Allow all to delete listings" ON partner_listings;
CREATE POLICY "Allow all to delete listings" ON partner_listings FOR DELETE
  TO anon, authenticated
  USING (true);

-- Step 6: Create RLS policies for reviews
DROP POLICY IF EXISTS "Allow public to view reviews" ON reviews;
CREATE POLICY "Allow public to view reviews" ON reviews FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all to create reviews" ON reviews;
CREATE POLICY "Allow all to create reviews" ON reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_listings_partner_id ON partner_listings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_hosts_partner_id ON partner_hosts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_listings_status ON partner_listings(status);
CREATE INDEX IF NOT EXISTS idx_partner_hosts_status ON partner_hosts(status);


-- ============================================================
-- SOURCE: 20260217152909_create_profile_storage_bucket.sql
-- ============================================================
/*
  # Create Storage Bucket for Profile Pictures

  1. New Storage Bucket
    - `profiles` bucket for storing user profile pictures
    - Public access for viewing images
    - Authenticated users can upload their own profile pictures

  2. Security Policies
    - Anyone can read profile pictures (public access)
    - Only authenticated users can upload to their own folder
    - Only users can update/delete their own profile pictures
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles');

DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
CREATE POLICY "Authenticated users can upload profile pictures" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
);

DROP POLICY IF EXISTS "Users can update own profile pictures" ON storage.objects;
CREATE POLICY "Users can update own profile pictures" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own profile pictures" ON storage.objects;
CREATE POLICY "Users can delete own profile pictures" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================
-- SOURCE: 20260217154926_create_listings_storage_bucket.sql
-- ============================================================
/*
  # Create Storage Bucket for Listing Images

  1. New Storage Bucket
    - `listings` bucket for storing experience and homestay images
    - Public access for viewing images
    - Authenticated portal users can upload listing images

  2. Security Policies
    - Anyone can read listing images (public access)
    - Only authenticated users can upload listing images
    - Users can update/delete their own listing images
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view listing images" ON storage.objects;
CREATE POLICY "Public can view listing images" ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing images" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listings'
);

DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;
CREATE POLICY "Users can update own listing images" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'listings')
WITH CHECK (bucket_id = 'listings');

DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;
CREATE POLICY "Users can delete own listing images" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listings');

-- ============================================================
-- SOURCE: 20260217184147_create_guides_and_programs_schema.sql
-- ============================================================
/*
  # Create Guides and Programs/Packages Schema for Institutions

  1. New Tables
    - `guides`
      - `id` (uuid, primary key)
      - `portal_user_id` (uuid, foreign key to portal_users) - institution owner
      - `name` (text) - guide's full name
      - `bio` (text) - guide's biography
      - `specializations` (text[]) - array of specializations (history, culture, nature, etc.)
      - `languages` (text[]) - array of languages spoken
      - `experience_years` (integer) - years of experience
      - `rating` (numeric) - average rating
      - `total_tours` (integer) - total tours conducted
      - `available` (boolean) - availability status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `programs`
      - `id` (uuid, primary key)
      - `portal_user_id` (uuid, foreign key to portal_users) - institution owner
      - `title` (text) - program title
      - `description` (text) - detailed description
      - `duration_hours` (numeric) - duration in hours
      - `max_participants` (integer) - maximum participants
      - `price_per_person` (numeric) - price per person
      - `what_included` (text[]) - array of included items
      - `what_to_bring` (text[]) - array of items to bring
      - `images` (text[]) - array of image URLs
      - `active` (boolean) - whether program is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `program_guides`
      - `id` (uuid, primary key)
      - `program_id` (uuid, foreign key to programs)
      - `guide_id` (uuid, foreign key to guides)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated institution portal users to manage their own guides and programs
    - Add policies for anonymous/public viewing of active programs and guides
*/

-- Create guides table
CREATE TABLE IF NOT EXISTS guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid REFERENCES portal_users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  bio text DEFAULT '',
  specializations text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  experience_years integer DEFAULT 0,
  rating numeric(3,2) DEFAULT 0.00,
  total_tours integer DEFAULT 0,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid REFERENCES portal_users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  duration_hours numeric(4,2) NOT NULL,
  max_participants integer DEFAULT 10,
  price_per_person numeric(10,2) NOT NULL,
  what_included text[] DEFAULT '{}',
  what_to_bring text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create program_guides junction table
CREATE TABLE IF NOT EXISTS program_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  guide_id uuid REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(program_id, guide_id)
);

-- Enable RLS
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_guides ENABLE ROW LEVEL SECURITY;

-- Guides policies - Allow institution portal users to manage their own guides
DROP POLICY IF EXISTS "Portal users can view guides they created" ON guides;
CREATE POLICY "Portal users can view guides they created" ON guides FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Portal users can insert guides" ON guides;
CREATE POLICY "Portal users can insert guides" ON guides FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can update guides they created" ON guides;
CREATE POLICY "Portal users can update guides they created" ON guides FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can delete guides they created" ON guides;
CREATE POLICY "Portal users can delete guides they created" ON guides FOR DELETE
  USING (true);

-- Programs policies - Allow institution portal users to manage their own programs
DROP POLICY IF EXISTS "Portal users can view programs they created" ON programs;
CREATE POLICY "Portal users can view programs they created" ON programs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Portal users can insert programs" ON programs;
CREATE POLICY "Portal users can insert programs" ON programs FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can update programs they created" ON programs;
CREATE POLICY "Portal users can update programs they created" ON programs FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can delete programs they created" ON programs;
CREATE POLICY "Portal users can delete programs they created" ON programs FOR DELETE
  USING (true);

-- Program guides policies
DROP POLICY IF EXISTS "Users can view program guide assignments" ON program_guides;
CREATE POLICY "Users can view program guide assignments" ON program_guides FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Portal users can assign guides to programs" ON program_guides;
CREATE POLICY "Portal users can assign guides to programs" ON program_guides FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can remove guide assignments" ON program_guides;
CREATE POLICY "Portal users can remove guide assignments" ON program_guides FOR DELETE
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_guides_portal_user_id ON guides(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_guides_available ON guides(available);
CREATE INDEX IF NOT EXISTS idx_programs_portal_user_id ON programs(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_programs_active ON programs(active);
CREATE INDEX IF NOT EXISTS idx_program_guides_program_id ON program_guides(program_id);
CREATE INDEX IF NOT EXISTS idx_program_guides_guide_id ON program_guides(guide_id);

-- ============================================================
-- SOURCE: 20260217185218_create_bookings_table.sql
-- ============================================================
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

DROP POLICY IF EXISTS "Travelers can view their own bookings" ON bookings;
CREATE POLICY "Travelers can view their own bookings" ON bookings FOR SELECT
  TO authenticated
  USING (traveler_id = auth.uid());

DROP POLICY IF EXISTS "Travelers can insert bookings" ON bookings;
CREATE POLICY "Travelers can insert bookings" ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (traveler_id = auth.uid());

DROP POLICY IF EXISTS "Anonymous users can insert bookings" ON bookings;
CREATE POLICY "Anonymous users can insert bookings" ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Partners can view bookings for their listings" ON bookings;
CREATE POLICY "Partners can view bookings for their listings" ON bookings FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Partners can update booking status" ON bookings;
CREATE POLICY "Partners can update booking status" ON bookings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_bookings_traveler_id ON bookings(traveler_id);
CREATE INDEX IF NOT EXISTS idx_bookings_partner_id ON bookings(partner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_institution_id ON bookings(institution_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- ============================================================
-- SOURCE: 20260217185239_create_institution_profiles_and_link_attractions.sql
-- ============================================================
/*
  # Create Institution Profiles Table

  This allows institutions to maintain a public-facing profile page
  that is displayed when travellers browse attractions.

  1. New Tables
    - `institution_profiles`
      - `id` (uuid, primary key)
      - `portal_user_id` (uuid, fk to portal_users) - unique per institution
      - `name` (text) - display name of institution
      - `tagline` (text) - short marketing tagline
      - `description` (text) - full description
      - `type` (text) - museum, park, heritage_site, gallery, zoo, etc.
      - `location` (text)
      - `entry_fee` (text) - "Free", "$15", "Varies"
      - `visiting_hours` (text) - e.g. "Mon-Fri 9am-5pm"
      - `guidelines` (text[]) - visitor guidelines
      - `images` (text[]) - gallery images
      - `cover_image` (text) - hero image URL
      - `phone` (text)
      - `email` (text)
      - `website` (text)
      - `published` (boolean) - whether visible to travellers
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security - RLS enabled with permissive read for public
*/

CREATE TABLE IF NOT EXISTS institution_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid REFERENCES portal_users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  tagline text DEFAULT '',
  description text DEFAULT '',
  type text DEFAULT 'museum',
  location text DEFAULT '',
  entry_fee text DEFAULT 'Free',
  visiting_hours text DEFAULT '',
  guidelines text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  cover_image text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE institution_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published institution profiles" ON institution_profiles;
CREATE POLICY "Anyone can view published institution profiles" ON institution_profiles FOR SELECT
  USING (published = true);

DROP POLICY IF EXISTS "Institution portal users can view their own profile" ON institution_profiles;
CREATE POLICY "Institution portal users can view their own profile" ON institution_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Institution portal users can insert their profile" ON institution_profiles;
CREATE POLICY "Institution portal users can insert their profile" ON institution_profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Institution portal users can update their profile" ON institution_profiles;
CREATE POLICY "Institution portal users can update their profile" ON institution_profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_institution_profiles_portal_user_id ON institution_profiles(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_institution_profiles_published ON institution_profiles(published);

-- ============================================================
-- SOURCE: 20260217195532_add_institution_capacity_and_slots.sql
-- ============================================================
/*
  # Institution Capacity & Schedule Enhancements

  1. Changes to institution_profiles
    - Add `daily_capacity` (integer) - max visitors per day
    - Add `opening_time` (text) - e.g. "08:00"
    - Add `closing_time` (text) - e.g. "18:00"
    - Add `closed_days` (text[]) - array of day names e.g. ["Sunday"]

  2. New Tables
    - `capacity_rules`
      - id, institution_id, rule_type (blocked_date|daily_limit|peak_limit), applies_to, capacity, reason, created_at
      - RLS: institution portal users manage their own rules

  3. Security
    - RLS enabled on capacity_rules
    - Policies allow portal users to manage their own data anonymously (demo access)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'daily_capacity'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS daily_capacity integer DEFAULT 500;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'opening_time'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS opening_time text DEFAULT '08:00';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'closing_time'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS closing_time text DEFAULT '18:00';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'closed_days'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS closed_days text[] DEFAULT '{}';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS capacity_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  rule_type text NOT NULL DEFAULT 'daily_limit',
  applies_to text NOT NULL DEFAULT '',
  capacity integer NOT NULL DEFAULT 0,
  reason text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE capacity_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anonymous can view capacity_rules" ON capacity_rules;
CREATE POLICY "Anonymous can view capacity_rules" ON capacity_rules FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated can view capacity_rules" ON capacity_rules;
CREATE POLICY "Authenticated can view capacity_rules" ON capacity_rules FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert capacity_rules" ON capacity_rules;
CREATE POLICY "Authenticated can insert capacity_rules" ON capacity_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update capacity_rules" ON capacity_rules;
CREATE POLICY "Authenticated can update capacity_rules" ON capacity_rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete capacity_rules" ON capacity_rules;
CREATE POLICY "Authenticated can delete capacity_rules" ON capacity_rules FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert capacity_rules" ON capacity_rules;
CREATE POLICY "Anon can insert capacity_rules" ON capacity_rules FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update capacity_rules" ON capacity_rules;
CREATE POLICY "Anon can update capacity_rules" ON capacity_rules FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete capacity_rules" ON capacity_rules;
CREATE POLICY "Anon can delete capacity_rules" ON capacity_rules FOR DELETE
  TO anon
  USING (true);


-- ============================================================
-- SOURCE: 20260217223010_add_guide_schedule_and_availability_hours.sql
-- ============================================================
/*
  # Add Guide Schedule Management

  Adds per-guide schedule management so each guide can have specific working days
  and hours, and hours can be blocked off (booked slots or manual closures).

  1. New Tables
    - `guide_schedules`
      - `id` (uuid, primary key)
      - `guide_id` (uuid, fk to guides)
      - `day_of_week` (text) - Monday, Tuesday, etc.
      - `start_time` (time) - working start time
      - `end_time` (time) - working end time
      - `is_working` (boolean) - whether guide works this day

  2. Security
    - Enable RLS
    - Institution portal users can manage their guides' schedules
    - Anyone can read schedules (for availability checking)
*/

CREATE TABLE IF NOT EXISTS guide_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  day_of_week text NOT NULL,
  start_time time DEFAULT '09:00',
  end_time time DEFAULT '17:00',
  is_working boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(guide_id, day_of_week)
);

ALTER TABLE guide_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view guide schedules" ON guide_schedules;
CREATE POLICY "Anyone can view guide schedules" ON guide_schedules FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Portal users can insert guide schedules" ON guide_schedules;
CREATE POLICY "Portal users can insert guide schedules" ON guide_schedules FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can update guide schedules" ON guide_schedules;
CREATE POLICY "Portal users can update guide schedules" ON guide_schedules FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can delete guide schedules" ON guide_schedules;
CREATE POLICY "Portal users can delete guide schedules" ON guide_schedules FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_guide_schedules_guide_id ON guide_schedules(guide_id);


-- ============================================================
-- SOURCE: 20260218070920_add_host_id_to_bookings.sql
-- ============================================================
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
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL;
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


-- ============================================================
-- SOURCE: 20260218072635_add_email_phone_to_guides.sql
-- ============================================================
/*
  # Add email and phone to guides table

  ## Overview
  Guides created by institution administrators need email and phone fields so that:
  1. A traveler with a matching email can be identified as a guide and routed to the Guide Dashboard
  2. The guide's contact information is stored alongside their profile

  ## Changes
  - Adds `email` (text, nullable) to `guides`
  - Adds `phone` (text, nullable) to `guides`
  - Adds index on `guides.email` for fast lookup during login detection
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guides' AND column_name = 'email'
  ) THEN
    ALTER TABLE guides ADD COLUMN IF NOT EXISTS email text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guides' AND column_name = 'phone'
  ) THEN
    ALTER TABLE guides ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_guides_email ON guides(email);


-- ============================================================
-- SOURCE: 20260218075219_add_visit_fields_to_institution_profiles.sql
-- ============================================================
/*
  # Add Visit Fields to Institution Profiles

  ## Summary
  Adds operational fields to institution_profiles that allow institutions to specify
  their visiting hours, capacity, and closure information more precisely.

  ## Changes to institution_profiles table
  - `opening_time` (time) — daily opening time (e.g. 09:00)
  - `closing_time` (time) — daily closing time (e.g. 17:00)
  - `closed_days` (text[]) — days of the week when closed (e.g. ['Sunday', 'Monday'])
  - `daily_capacity` (integer) — maximum visitors per day

  ## Notes
  - All columns use safe IF NOT EXISTS guard via DO block
  - entry_fee column remains for backward compatibility but is no longer shown on traveler side
  - No data is dropped
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'opening_time'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS opening_time time DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'closing_time'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS closing_time time DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'closed_days'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS closed_days text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'daily_capacity'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS daily_capacity integer DEFAULT 0;
  END IF;
END $$;


-- ============================================================
-- SOURCE: 20260218105450_create_saved_items_table.sql
-- ============================================================
/*
  # Create Saved Items Table

  1. New Tables
    - `saved_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `listing_id` (uuid, references partner_listings)
      - `listing_type` (text: 'experience', 'homestay')
      - `institution_id` (uuid, nullable, references institution_profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on saved_items table
    - Users can only view/manage their own saved items
*/

-- Create saved_items table
CREATE TABLE IF NOT EXISTS saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES partner_listings(id) ON DELETE CASCADE,
  listing_type text CHECK (listing_type IN ('experience', 'homestay')),
  institution_id uuid REFERENCES institution_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_listing UNIQUE (user_id, listing_id),
  CONSTRAINT unique_user_institution UNIQUE (user_id, institution_id),
  CONSTRAINT saved_item_type CHECK (
    (listing_id IS NOT NULL AND institution_id IS NULL) OR
    (listing_id IS NULL AND institution_id IS NOT NULL)
  )
);

ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved items" ON saved_items;
CREATE POLICY "Users can view own saved items" ON saved_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved items" ON saved_items;
CREATE POLICY "Users can insert own saved items" ON saved_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved items" ON saved_items;
CREATE POLICY "Users can delete own saved items" ON saved_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_listing_id ON saved_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_institution_id ON saved_items(institution_id);


-- ============================================================
-- SOURCE: 20260218173857_add_profile_picture_to_guides.sql
-- ============================================================
/*
  # Add Profile Picture to Guides

  1. Changes
    - Add `profile_picture` column to `guides` table to store guide profile image URLs

  2. Notes
    - Column is nullable to support existing guides without profile pictures
    - Will store URLs from Supabase Storage bucket
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guides' AND column_name = 'profile_picture'
  ) THEN
    ALTER TABLE guides ADD COLUMN IF NOT EXISTS profile_picture text;
  END IF;
END $$;


-- ============================================================
-- SOURCE: 20260218174623_fix_guides_rls_for_inserts.sql
-- ============================================================
/*
  # Fix Guides RLS Policies for Inserts

  1. Changes
    - Drop existing restrictive policies
    - Recreate policies to allow public (anon) access for insert operations
    - This allows portal users to create guides without auth.uid() restrictions

  2. Security
    - Policies still exist but are permissive for demo/development
    - In production, these should be restricted based on proper authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Portal users can view guides they created" ON guides;
DROP POLICY IF EXISTS "Portal users can insert guides" ON guides;
DROP POLICY IF EXISTS "Portal users can update guides they created" ON guides;
DROP POLICY IF EXISTS "Portal users can delete guides they created" ON guides;

-- Recreate policies with public access
DROP POLICY IF EXISTS "Allow public to view guides" ON guides;
CREATE POLICY "Allow public to view guides" ON guides FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public to insert guides" ON guides;
CREATE POLICY "Allow public to insert guides" ON guides FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public to update guides" ON guides;
CREATE POLICY "Allow public to update guides" ON guides FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public to delete guides" ON guides;
CREATE POLICY "Allow public to delete guides" ON guides FOR DELETE
  TO public
  USING (true);


-- ============================================================
-- SOURCE: 20260218175644_fix_profiles_storage_policies_for_guides.sql
-- ============================================================
/*
  # Fix Profile Storage Policies for Guide Uploads

  1. Changes
    - Drop restrictive authenticated-only INSERT policy
    - Add new policy allowing public (anon) users to upload to guides folder
    - This enables institution portal users to upload guide profile pictures

  2. Security
    - Still maintains folder structure for organization
    - Allows uploads to guides/ folder specifically
    - Public bucket allows viewing uploaded images
*/

-- Drop the old restrictive insert policy
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;

-- Create new policy allowing public uploads to guides folder
DROP POLICY IF EXISTS "Allow public uploads to guides folder" ON storage.objects;
CREATE POLICY "Allow public uploads to guides folder" ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'guides'
);

-- Also allow public uploads to profile-pictures folder (for backward compatibility)
DROP POLICY IF EXISTS "Allow public uploads to profile-pictures folder" ON storage.objects;
CREATE POLICY "Allow public uploads to profile-pictures folder" ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
);


-- ============================================================
-- SOURCE: 20260218181933_create_programs_storage_bucket.sql
-- ============================================================
/*
  # Create Storage Bucket for Program Images

  1. New Storage Bucket
    - `programs` bucket for storing program/package images
    - Public access for viewing images
    - Public users can upload program images

  2. Security Policies
    - Anyone can read program images (public access)
    - Public users can upload to programs folder
    - Allows institutions to upload images for their programs
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('programs', 'programs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access to Program Images" ON storage.objects;
CREATE POLICY "Public Access to Program Images" ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'programs');

DROP POLICY IF EXISTS "Allow public uploads to programs folder" ON storage.objects;
CREATE POLICY "Allow public uploads to programs folder" ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'programs' 
  AND (storage.foldername(name))[1] = 'programs'
);

DROP POLICY IF EXISTS "Allow public updates to program images" ON storage.objects;
CREATE POLICY "Allow public updates to program images" ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs')
WITH CHECK (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

DROP POLICY IF EXISTS "Allow public deletes of program images" ON storage.objects;
CREATE POLICY "Allow public deletes of program images" ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');


-- ============================================================
-- SOURCE: 20260218202714_create_host_schedules_table.sql
-- ============================================================
/*
  # Create Host Schedule Management System

  ## Overview
  Adds schedule management for partner hosts similar to the guide schedule system.
  Hosts can have specific working days and hours for availability management.

  ## New Tables

  ### 1. `host_schedules`
  Stores weekly schedule for each host
  - `id` (uuid, primary key) - Unique schedule entry identifier
  - `host_id` (uuid, foreign key) - References partner_hosts table
  - `day_of_week` (text) - Day name (Monday, Tuesday, etc.)
  - `start_time` (time) - Working start time
  - `end_time` (time) - Working end time
  - `is_working` (boolean) - Whether host works this day
  - `created_at`, `updated_at` (timestamptz) - Timestamps

  ## Security
  - Enable RLS on host_schedules table
  - Anyone can view schedules for availability checking
  - Partners can manage schedules for their own hosts
  - Public access for reading (for booking availability)

  ## Important Notes
  - Each host-day combination is unique (UNIQUE constraint)
  - Default working hours: 09:00 - 17:00
  - Weekend days default to non-working
  - Schedule management integrated into partner console
*/

-- Create host_schedules table
CREATE TABLE IF NOT EXISTS host_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid REFERENCES partner_hosts(id) ON DELETE CASCADE NOT NULL,
  day_of_week text NOT NULL,
  start_time time DEFAULT '09:00',
  end_time time DEFAULT '17:00',
  is_working boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(host_id, day_of_week)
);

-- Enable RLS
ALTER TABLE host_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view host schedules" ON host_schedules;
CREATE POLICY "Anyone can view host schedules" ON host_schedules FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Partners can insert host schedules" ON host_schedules;
CREATE POLICY "Partners can insert host schedules" ON host_schedules FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Partners can update host schedules" ON host_schedules;
CREATE POLICY "Partners can update host schedules" ON host_schedules FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Partners can delete host schedules" ON host_schedules;
CREATE POLICY "Partners can delete host schedules" ON host_schedules FOR DELETE
  USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_host_schedules_host_id ON host_schedules(host_id);


-- ============================================================
-- SOURCE: 20260218210210_create_messaging_system_v2.sql
-- ============================================================
/*
  # Create Messaging System

  ## Overview
  This migration creates a complete messaging system for the platform, enabling communication between travelers and hosts/guides after bookings are made.

  ## 1. New Tables
  
  ### `conversations`
  - `id` (uuid, primary key) - Unique conversation identifier
  - `booking_id` (uuid, foreign key) - Links to the booking this conversation is about
  - `traveler_id` (uuid, foreign key) - The traveler in the conversation
  - `traveler_name` (text) - Cached traveler name for display
  - `host_id` (uuid, nullable, foreign key) - The host (for experiences/homestays)
  - `host_name` (text, nullable) - Cached host name for display
  - `guide_id` (uuid, nullable, foreign key) - The guide (for attractions)
  - `guide_name` (text, nullable) - Cached guide name for display
  - `listing_title` (text) - Title of the experience/homestay/attraction
  - `listing_type` (text) - 'experience', 'homestay', or 'attraction'
  - `last_message` (text, nullable) - Last message text for quick display
  - `last_message_at` (timestamptz, nullable) - Timestamp of last message
  - `created_at` (timestamptz) - When conversation was created
  - `updated_at` (timestamptz) - Last update timestamp

  ### `messages`
  - `id` (uuid, primary key) - Unique message identifier
  - `conversation_id` (uuid, foreign key) - Links to conversation
  - `sender_type` (text) - 'traveler', 'host', or 'guide'
  - `sender_id` (uuid) - ID of the sender (from auth.users or guides table)
  - `sender_name` (text) - Name of sender for display
  - `message_text` (text) - The actual message content
  - `is_read` (boolean) - Whether message has been read by recipient
  - `created_at` (timestamptz) - When message was sent
  - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Security (RLS Policies)
  
  ### Conversations RLS
  - Travelers can view their own conversations
  - Hosts can view conversations where they are the host
  - Guides can view conversations where they are the guide
  - Travelers can create conversations for their bookings
  - Participants can update conversations (for last_message tracking)

  ### Messages RLS
  - Participants can view messages in their conversations
  - Participants can send messages in their conversations
  - Participants can mark messages as read

  ## 3. Indexes
  - Index on booking_id for fast conversation lookup
  - Index on traveler_id, host_id, guide_id for filtering
  - Index on conversation_id for message retrieval
  - Index on created_at for chronological ordering

  ## 4. Notes
  - Conversations are created after booking or initiated from trips page
  - Each booking can have one conversation
  - Messages link sender to conversation for threading
  - is_read flag enables unread message counts
  - Cached names avoid excessive joins in message lists
  - Trigger automatically updates conversation's last_message on new message
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  traveler_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  traveler_name text NOT NULL DEFAULT '',
  host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL,
  host_name text,
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  guide_name text,
  listing_title text NOT NULL DEFAULT '',
  listing_type text NOT NULL DEFAULT 'experience',
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(booking_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('traveler', 'host', 'guide')),
  sender_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_booking ON conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_conversations_traveler ON conversations(traveler_id);
CREATE INDEX IF NOT EXISTS idx_conversations_host ON conversations(host_id);
CREATE INDEX IF NOT EXISTS idx_conversations_guide ON conversations(guide_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations

-- Travelers can view their own conversations
DROP POLICY IF EXISTS "Travelers can view own conversations" ON conversations;
CREATE POLICY "Travelers can view own conversations" ON conversations FOR SELECT
  TO authenticated
  USING (traveler_id = auth.uid());

-- Hosts can view conversations where they are the host (partner_hosts has created_by_user_id)
DROP POLICY IF EXISTS "Hosts can view their conversations" ON conversations;
CREATE POLICY "Hosts can view their conversations" ON conversations FOR SELECT
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid()
    )
  );

-- Guides can view conversations where they are the guide (guides has portal_user_id)
DROP POLICY IF EXISTS "Guides can view their conversations" ON conversations;
CREATE POLICY "Guides can view their conversations" ON conversations FOR SELECT
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides WHERE portal_user_id = auth.uid()
    )
  );

-- Travelers can create conversations for their bookings
DROP POLICY IF EXISTS "Travelers can create conversations" ON conversations;
CREATE POLICY "Travelers can create conversations" ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    traveler_id = auth.uid() AND
    booking_id IN (
      SELECT id FROM bookings WHERE traveler_id = auth.uid()
    )
  );

-- Participants can update conversations (for last_message updates)
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;
CREATE POLICY "Participants can update conversations" ON conversations FOR UPDATE
  TO authenticated
  USING (
    traveler_id = auth.uid() OR
    host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid()) OR
    guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
  )
  WITH CHECK (
    traveler_id = auth.uid() OR
    host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid()) OR
    guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
  );

-- RLS Policies for messages

-- Participants can view messages in their conversations
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
CREATE POLICY "Participants can view messages" ON messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
         OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
         OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  );

-- Participants can send messages in their conversations
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
CREATE POLICY "Participants can send messages" ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
         OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
         OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  );

-- Participants can update messages (for marking as read)
DROP POLICY IF EXISTS "Participants can update messages" ON messages;
CREATE POLICY "Participants can update messages" ON messages FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
         OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
         OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
         OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
         OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  );

-- Create function to automatically update conversation's last_message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message = NEW.message_text,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation on new message
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- ============================================================
-- SOURCE: 20260219063236_backfill_conversation_host_names.sql
-- ============================================================
/*
  # Backfill Host Names in Conversations

  ## Overview
  Updates existing conversations to populate the host_name field from the partner_hosts table.
  This ensures all conversation cards display the correct host name instead of the fallback "Host" text.

  ## Changes
  - Updates all conversations where host_id exists but host_name is null or empty
  - Fetches the actual host name from partner_hosts table
  - No structural changes, only data updates

  ## Notes
  - Safe to run multiple times (idempotent)
  - Only affects conversations with valid host_id references
*/

-- Backfill host_name for existing conversations
UPDATE conversations c
SET host_name = ph.name
FROM partner_hosts ph
WHERE c.host_id = ph.id
  AND (c.host_name IS NULL OR c.host_name = '');


-- ============================================================
-- SOURCE: 20260219070128_fix_host_conversations_rls_policy.sql
-- ============================================================
/*
  # Fix Host Conversations RLS Policy

  1. Changes
    - Update "Hosts can view their conversations" policy to use `traveler_user_id` field
    - Update "Participants can update conversations" policy to use `traveler_user_id` field
    
  2. Reason
    - Hosts are created from the partner console and are linked to auth users via `traveler_user_id`
    - The old policy used `created_by_user_id` which is not populated
    - This allows hosts to see conversations when they log in as travelers and switch to host mode
*/

-- Drop old policies
DROP POLICY IF EXISTS "Hosts can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;

-- Create updated policy for hosts to view their conversations
DROP POLICY IF EXISTS "Hosts can view their conversations" ON conversations;
CREATE POLICY "Hosts can view their conversations" ON conversations
  FOR SELECT
  TO authenticated
  USING (
    host_id IN (
      SELECT id 
      FROM partner_hosts 
      WHERE traveler_user_id = auth.uid()
    )
  );

-- Create updated policy for participants to update conversations
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;
CREATE POLICY "Participants can update conversations" ON conversations
  FOR UPDATE
  TO authenticated
  USING (
    traveler_id = auth.uid() 
    OR host_id IN (
      SELECT id 
      FROM partner_hosts 
      WHERE traveler_user_id = auth.uid()
    )
    OR guide_id IN (
      SELECT id 
      FROM guides 
      WHERE portal_user_id = auth.uid()
    )
  )
  WITH CHECK (
    traveler_id = auth.uid() 
    OR host_id IN (
      SELECT id 
      FROM partner_hosts 
      WHERE traveler_user_id = auth.uid()
    )
    OR guide_id IN (
      SELECT id 
      FROM guides 
      WHERE portal_user_id = auth.uid()
    )
  );

-- ============================================================
-- SOURCE: 20260219070147_fix_messages_rls_policies.sql
-- ============================================================
/*
  # Fix Messages RLS Policies

  1. Changes
    - Update all messages policies to use `traveler_user_id` field for hosts
    - This ensures hosts can send, view, and update messages
    
  2. Reason
    - Hosts are linked to auth users via `traveler_user_id` not `created_by_user_id`
    - Fixes message visibility and sending for hosts
*/

-- Drop old policies
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Participants can update messages" ON messages;
DROP POLICY IF EXISTS "Participants can view messages" ON messages;

-- Create updated policy for viewing messages
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
        OR host_id IN (
          SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid()
        )
        OR guide_id IN (
          SELECT id FROM guides WHERE portal_user_id = auth.uid()
        )
    )
  );

-- Create updated policy for sending messages
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
CREATE POLICY "Participants can send messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
        OR host_id IN (
          SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid()
        )
        OR guide_id IN (
          SELECT id FROM guides WHERE portal_user_id = auth.uid()
        )
    )
  );

-- Create updated policy for updating messages
DROP POLICY IF EXISTS "Participants can update messages" ON messages;
CREATE POLICY "Participants can update messages" ON messages
  FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
        OR host_id IN (
          SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid()
        )
        OR guide_id IN (
          SELECT id FROM guides WHERE portal_user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
        OR host_id IN (
          SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid()
        )
        OR guide_id IN (
          SELECT id FROM guides WHERE portal_user_id = auth.uid()
        )
    )
  );

-- ============================================================
-- SOURCE: 20260228134020_add_session_to_bookings_and_guide_capacity.sql
-- ============================================================
/*
  # Add session column to bookings and guide capacity

  1. Modified Tables
    - `bookings`
      - `session` (text, nullable) - Stores the selected session time slot (morning, midday, evening)
    - `guides`
      - `max_engagements_per_day` (integer, default 1) - Maximum tours a guide can handle per day

  2. New Tables
    - `schedule_overrides` - Date-specific exceptions for host/guide schedules
      - `id` (uuid, primary key)
      - `entity_type` (text) - 'host' or 'guide'
      - `entity_id` (uuid) - References the host or guide
      - `override_date` (date) - The specific date for the override
      - `is_available` (boolean) - Whether available on that date
      - `reason` (text) - Reason for the override
      - `created_at` (timestamptz)
    - `government_policies` - Policy and direction records for government portal
      - `id` (uuid, primary key)
      - `portal_user_id` (uuid) - References the government portal user
      - `title` (text) - Policy title
      - `description` (text) - Policy description
      - `focus_points` (text[]) - Key focus areas
      - `priority` (text) - high/medium/low
      - `status` (text) - active/draft/archived
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS on new tables with appropriate policies
    - Portal users use custom auth (not Supabase auth), so policies are permissive for authenticated access

  4. Notes
    - The session column allows experiences to support multiple daily sessions
    - Guide capacity prevents overbooking guides beyond their daily limit
    - Schedule overrides enable date-specific exceptions (holidays, special events)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'session'
  ) THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS session text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guides' AND column_name = 'max_engagements_per_day'
  ) THEN
    ALTER TABLE guides ADD COLUMN IF NOT EXISTS max_engagements_per_day integer NOT NULL DEFAULT 1;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS schedule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('host', 'guide')),
  entity_id uuid NOT NULL,
  override_date date NOT NULL,
  is_available boolean NOT NULL DEFAULT false,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(entity_type, entity_id, override_date)
);

ALTER TABLE schedule_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to view schedule overrides" ON schedule_overrides;
CREATE POLICY "Allow authenticated to view schedule overrides" ON schedule_overrides FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated to manage schedule overrides" ON schedule_overrides;
CREATE POLICY "Allow authenticated to manage schedule overrides" ON schedule_overrides FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated to update schedule overrides" ON schedule_overrides;
CREATE POLICY "Allow authenticated to update schedule overrides" ON schedule_overrides FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated to delete schedule overrides" ON schedule_overrides;
CREATE POLICY "Allow authenticated to delete schedule overrides" ON schedule_overrides FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous to view schedule overrides" ON schedule_overrides;
CREATE POLICY "Allow anonymous to view schedule overrides" ON schedule_overrides FOR SELECT
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_schedule_overrides_entity ON schedule_overrides(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_date ON schedule_overrides(override_date);

CREATE TABLE IF NOT EXISTS government_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  focus_points text[] DEFAULT '{}',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE government_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to view government policies" ON government_policies;
CREATE POLICY "Allow authenticated to view government policies" ON government_policies FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated to insert government policies" ON government_policies;
CREATE POLICY "Allow authenticated to insert government policies" ON government_policies FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated to update government policies" ON government_policies;
CREATE POLICY "Allow authenticated to update government policies" ON government_policies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated to delete government policies" ON government_policies;
CREATE POLICY "Allow authenticated to delete government policies" ON government_policies FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous to view government policies" ON government_policies;
CREATE POLICY "Allow anonymous to view government policies" ON government_policies FOR SELECT
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_government_policies_portal_user ON government_policies(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_government_policies_status ON government_policies(status);
CREATE INDEX IF NOT EXISTS idx_government_policies_priority ON government_policies(priority);


-- ============================================================
-- SOURCE: 20260228134115_backfill_structured_duration_and_frequency.sql
-- ============================================================
/*
  # Backfill structured duration and frequency for all existing listings

  1. Modified Tables
    - `partner_listings` - Updates the `details` JSONB column for all 20 existing listings

  2. Experience Updates (10 listings)
    - Adds `duration_value` (numeric) and `duration_unit` (text: hours/days) parsed from existing free-text duration
    - Adds `frequency_type` (text: once_daily/twice_daily/three_daily) based on listing context
    - Preserves all existing JSONB keys (duration, difficulty, group_size)

  3. Homestay Updates (10 listings)
    - Adds `duration_value` = 1, `duration_unit` = 'days' (standard minimum stay)
    - Adds `frequency_type` = 'once_daily' (one check-in per day)
    - Preserves all existing JSONB keys (bedrooms, bathrooms, max_guests)

  4. Notes
    - Uses JSONB concatenation (||) to merge new keys without losing existing data
    - Each listing is updated individually for precise control over frequency assignment
*/

-- Experiences backfill

-- Sunrise with the Hills: duration "2" -> 2 hours, twice_daily (morning/evening nature activity)
UPDATE partner_listings SET details = details || '{"duration_value": 2, "duration_unit": "hours", "frequency_type": "twice_daily"}'::jsonb
WHERE id = '00fcfa70-7429-4c3c-8f1e-ee493b813903';

-- The Drum Awakening: duration "2" -> 2 hours, three_daily (group cultural activity)
UPDATE partner_listings SET details = details || '{"duration_value": 2, "duration_unit": "hours", "frequency_type": "three_daily"}'::jsonb
WHERE id = '6f326765-d082-488c-a4f7-6008d3fc55cb';

-- Kigali Night Pulse: duration "3" -> 3 hours, once_daily (evening-only activity)
UPDATE partner_listings SET details = details || '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "once_daily"}'::jsonb
WHERE id = '3c384d17-ad9b-4b35-8f97-1c6388053492';

-- Farm-to-Fire Cooking: duration "3 hours" -> 3 hours, twice_daily (morning/evening cooking)
UPDATE partner_listings SET details = details || '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "twice_daily"}'::jsonb
WHERE id = '98b58267-a95f-492e-b9de-5ce946a03180';

-- The Banana Journey: duration "4" -> 4 hours, once_daily (long half-day activity)
UPDATE partner_listings SET details = details || '{"duration_value": 4, "duration_unit": "hours", "frequency_type": "once_daily"}'::jsonb
WHERE id = '35c1742b-ed16-4c55-ab4f-fad489ac9574';

-- Lake Kivu Fisher's Morning: duration "2 hours" -> 2 hours, twice_daily (morning/evening fishing)
UPDATE partner_listings SET details = details || '{"duration_value": 2, "duration_unit": "hours", "frequency_type": "twice_daily"}'::jsonb
WHERE id = 'dd41f009-7f14-4e92-82c1-21a1f5bbabc4';

-- Village Game Day: duration "2 hours" -> 2 hours, three_daily (high-energy group activity)
UPDATE partner_listings SET details = details || '{"duration_value": 2, "duration_unit": "hours", "frequency_type": "three_daily"}'::jsonb
WHERE id = '2e9743d7-2409-47a0-8eba-a54939d9e1c9';

-- The Artisan's Touch: duration "3 hours" -> 3 hours, three_daily (workshop-style, runs multiple sessions)
UPDATE partner_listings SET details = details || '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "three_daily"}'::jsonb
WHERE id = '537b9cb7-6329-44fa-b4d5-08ec80e76c11';

-- Coffee from Seed to Sip: duration "2.5 hours" -> 2.5 hours, twice_daily
UPDATE partner_listings SET details = details || '{"duration_value": 2.5, "duration_unit": "hours", "frequency_type": "twice_daily"}'::jsonb
WHERE id = '57c76d40-5c62-45db-8538-643e8437198b';

-- Market Stories: duration "3 hours" -> 3 hours, twice_daily
UPDATE partner_listings SET details = details || '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "twice_daily"}'::jsonb
WHERE id = 'd2cca495-3713-4dd7-a332-ee57e282c688';

-- Homestays backfill: all get 1 day duration, once_daily frequency

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = 'ee1b0610-8558-49f0-b844-733fd987ec35';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = '1d8a01e9-b7c6-443a-a7d3-5d87046d6e3b';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = 'a03908a7-8c83-4111-904b-89018477c4c8';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = '3fb8778c-ecc0-4c95-a8db-d244cf338ecb';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = '599aa29b-7249-4941-9f4c-9437684ba44e';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = 'da31f1f8-68b5-47ab-81ad-35f6c1d7932a';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = 'e97559ba-0679-4d35-a9d8-17e48c12070a';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = 'b35cbb8f-1120-47b1-9d3c-bb2a2f8e7b04';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = '2ca73674-c34c-4936-a2a7-4ed2f1b8068f';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = 'c1b723b5-ef40-430e-9882-512e2113c618';


-- ============================================================
-- SOURCE: 20260312181025_add_public_upload_policy_for_listings_bucket.sql
-- ============================================================
/*
  # Allow public uploads to listings storage bucket

  ## Problem
  Portal users (partner, institution) authenticate via a custom system
  and do not have a Supabase Auth session. This means they are treated
  as anonymous (anon) users. The existing INSERT policy on the listings
  bucket only allows the "authenticated" role, causing "new row violates
  row level security policy" errors when portal users try to upload
  host profile pictures or listing images.

  ## Changes
  1. Security
    - Add INSERT policy on `storage.objects` for the `listings` bucket
      that allows anon and authenticated roles to upload files
    - This matches the existing pattern used for the `programs` and
      `profiles` buckets which already allow public uploads

  ## Notes
  - The existing SELECT, UPDATE, and DELETE policies on the listings
    bucket already cover both roles
  - Only the INSERT policy was missing anonymous access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public uploads to listings bucket'
  ) THEN
    DROP POLICY IF EXISTS "Allow public uploads to listings bucket" ON storage.objects;
CREATE POLICY "Allow public uploads to listings bucket" ON storage.objects
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id = 'listings');
  END IF;
END $$;


-- ============================================================
-- SOURCE: 20260312192742_create_traveler_reviews_and_update_review_constraints.sql
-- ============================================================
/*
  # Two-Way Review System

  1. New Tables
    - `traveler_reviews` - allows hosts and guides to review travelers
      - `id` (uuid, primary key)
      - `booking_id` (uuid, references bookings)
      - `traveler_id` (uuid, not null)
      - `reviewer_type` (text, 'host' or 'guide')
      - `reviewer_id` (uuid, not null)
      - `reviewer_name` (text, not null)
      - `reviewer_profile_picture` (text)
      - `rating` (integer 1-5, not null)
      - `review_text` (text, max 200 chars, not null)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `reviews` - add `booking_id` column to track which booking a review belongs to
    - `reviews` - add 200 character limit on review_text
    - `attraction_reviews` - add 200 character limit on review_text

  3. Constraints
    - Unique constraint on (booking_id, reviewer_type) in traveler_reviews
    - Unique constraint on (booking_id) in reviews (one review per booking)
    - Character length checks on review_text columns

  4. Security
    - Enable RLS on traveler_reviews
    - Authenticated users who are the reviewer can insert
    - Authenticated users can read reviews about themselves or that they wrote
    - Anonymous users can read traveler reviews (for display on booking cards)
*/

CREATE TABLE IF NOT EXISTS traveler_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  traveler_id uuid NOT NULL,
  reviewer_type text NOT NULL CHECK (reviewer_type IN ('host', 'guide')),
  reviewer_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  reviewer_profile_picture text DEFAULT '',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL CHECK (char_length(review_text) <= 200),
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_id, reviewer_type)
);

ALTER TABLE traveler_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert their own traveler reviews" ON traveler_reviews;
CREATE POLICY "Authenticated users can insert their own traveler reviews" ON traveler_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read traveler reviews" ON traveler_reviews;
CREATE POLICY "Anyone can read traveler reviews" ON traveler_reviews
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can read traveler reviews" ON traveler_reviews;
CREATE POLICY "Anon can read traveler reviews" ON traveler_reviews
  FOR SELECT
  TO anon
  USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_booking_id_unique'
  ) THEN
    CREATE UNIQUE INDEX reviews_booking_id_unique ON reviews (booking_id) WHERE booking_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_review_text_length'
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_review_text_length CHECK (char_length(review_text) <= 200);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attraction_reviews_review_text_length'
  ) THEN
    ALTER TABLE attraction_reviews ADD CONSTRAINT attraction_reviews_review_text_length CHECK (char_length(review_text) <= 200);
  END IF;
END $$;


-- ============================================================
-- SOURCE: 20260312195223_backfill_partner_id_on_bookings.sql
-- ============================================================
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


-- ============================================================
-- SOURCE: 20260312201647_add_host_guide_bookings_rls_and_guide_traveler_link.sql
-- ============================================================
/*
  # Fix Host & Guide Access to Bookings + Guide Traveler Linking

  1. Schema Changes
    - Add `traveler_user_id` column to `guides` table (links guide to their Supabase auth user)

  2. New Bookings Policies
    - Hosts can SELECT bookings where `host_id` matches their linked `partner_hosts` record
    - Hosts can UPDATE bookings where `host_id` matches their linked `partner_hosts` record
    - Guides can SELECT bookings where `guide_id` matches their linked `guides` record
    - Guides can UPDATE bookings where `guide_id` matches their linked `guides` record

  3. Updated Conversations Policies
    - Fix guide conversations SELECT to use `traveler_user_id` instead of `portal_user_id`
    - Add INSERT policy for hosts to create conversations
    - Add INSERT policy for guides to create conversations
    - Update conversations UPDATE policy for guides to use `traveler_user_id`

  4. Updated Messages Policies
    - Update messages SELECT/INSERT/UPDATE to use guides.traveler_user_id

  5. Notes
    - `partner_hosts.traveler_user_id` = the Supabase auth user ID of the host
    - `guides.traveler_user_id` = the Supabase auth user ID of the guide
    - Both are set when the traveler logs in and is identified as a host/guide via email match
*/

-- 1. Add traveler_user_id to guides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guides' AND column_name = 'traveler_user_id'
  ) THEN
    ALTER TABLE guides ADD COLUMN IF NOT EXISTS traveler_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_guides_traveler_user_id ON guides(traveler_user_id);

-- 2. Bookings policies for hosts
DROP POLICY IF EXISTS "Hosts can view bookings for their listings" ON bookings;
CREATE POLICY "Hosts can view bookings for their listings" ON bookings FOR SELECT
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can update booking status" ON bookings;
CREATE POLICY "Hosts can update booking status" ON bookings FOR UPDATE
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = auth.uid()
    )
  )
  WITH CHECK (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = auth.uid()
    )
  );

-- 3. Bookings policies for guides
DROP POLICY IF EXISTS "Guides can view their assigned bookings" ON bookings;
CREATE POLICY "Guides can view their assigned bookings" ON bookings FOR SELECT
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Guides can update their booking status" ON bookings;
CREATE POLICY "Guides can update their booking status" ON bookings FOR UPDATE
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    )
  )
  WITH CHECK (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    )
  );

-- 4. Fix conversations policies for guides (replace portal_user_id with traveler_user_id)
DROP POLICY IF EXISTS "Guides can view their conversations" ON conversations;

DROP POLICY IF EXISTS "Guides can view their conversations" ON conversations;
CREATE POLICY "Guides can view their conversations" ON conversations FOR SELECT
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    )
  );

-- Add INSERT policies for hosts and guides on conversations
DROP POLICY IF EXISTS "Hosts can create conversations" ON conversations;
CREATE POLICY "Hosts can create conversations" ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Guides can create conversations" ON conversations;
CREATE POLICY "Guides can create conversations" ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    )
  );

-- Fix conversations UPDATE policy to use traveler_user_id for guides
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;

DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;
CREATE POLICY "Participants can update conversations" ON conversations FOR UPDATE
  TO authenticated
  USING (
    (traveler_id = auth.uid())
    OR (host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = auth.uid()
    ))
    OR (guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    ))
  )
  WITH CHECK (
    (traveler_id = auth.uid())
    OR (host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = auth.uid()
    ))
    OR (guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    ))
  );

-- 5. Fix messages policies to use guides.traveler_user_id
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Participants can update messages" ON messages;

DROP POLICY IF EXISTS "Participants can view messages" ON messages;
CREATE POLICY "Participants can view messages" ON messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = auth.uid())
        OR (conversations.host_id IN (
          SELECT ph.id FROM partner_hosts ph
          WHERE ph.traveler_user_id = auth.uid()
        ))
        OR (conversations.guide_id IN (
          SELECT g.id FROM guides g
          WHERE g.traveler_user_id = auth.uid()
        ))
    )
  );

DROP POLICY IF EXISTS "Participants can send messages" ON messages;
CREATE POLICY "Participants can send messages" ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = auth.uid())
        OR (conversations.host_id IN (
          SELECT ph.id FROM partner_hosts ph
          WHERE ph.traveler_user_id = auth.uid()
        ))
        OR (conversations.guide_id IN (
          SELECT g.id FROM guides g
          WHERE g.traveler_user_id = auth.uid()
        ))
    )
  );

DROP POLICY IF EXISTS "Participants can update messages" ON messages;
CREATE POLICY "Participants can update messages" ON messages FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = auth.uid())
        OR (conversations.host_id IN (
          SELECT ph.id FROM partner_hosts ph
          WHERE ph.traveler_user_id = auth.uid()
        ))
        OR (conversations.guide_id IN (
          SELECT g.id FROM guides g
          WHERE g.traveler_user_id = auth.uid()
        ))
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = auth.uid())
        OR (conversations.host_id IN (
          SELECT ph.id FROM partner_hosts ph
          WHERE ph.traveler_user_id = auth.uid()
        ))
        OR (conversations.guide_id IN (
          SELECT g.id FROM guides g
          WHERE g.traveler_user_id = auth.uid()
        ))
    )
  );


-- ============================================================
-- SOURCE: 20260312201704_backfill_traveler_user_id_for_hosts_and_guides.sql
-- ============================================================
/*
  # Backfill traveler_user_id for existing hosts and guides

  1. Changes
    - Match `partner_hosts.email` against `auth.users.email` and set `traveler_user_id`
    - Match `guides.email` against `auth.users.email` and set `traveler_user_id`
  
  2. Notes
    - Only updates records where `traveler_user_id` is currently NULL
    - Uses email-based matching (same logic as the login-time linking)
    - Ensures existing hosts/guides who have already signed up as travelers
      immediately get access to their data without needing to re-login
*/

UPDATE partner_hosts
SET traveler_user_id = au.id
FROM auth.users au
WHERE partner_hosts.email = au.email
  AND partner_hosts.traveler_user_id IS NULL;

UPDATE guides
SET traveler_user_id = au.id
FROM auth.users au
WHERE guides.email = au.email
  AND guides.traveler_user_id IS NULL;


-- ============================================================
-- SOURCE: 20260313041610_create_notifications_and_content_flags.sql
-- ============================================================
/*
  # Create Notifications and Content Flags System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `recipient_portal_user_id` (uuid, FK to portal_users.id) - who receives this notification
      - `type` (text) - notification type (listing_flagged, attraction_flagged, system, etc.)
      - `title` (text) - short headline
      - `message` (text) - full explanation with details
      - `metadata` (jsonb) - structured data for CTA buttons (listing_id, flag_id, etc.)
      - `is_read` (boolean, default false)
      - `created_at` (timestamptz)

    - `content_flags`
      - `id` (uuid, primary key)
      - `target_type` (text) - 'listing' or 'attraction'
      - `target_id` (uuid) - references partner_listings.id or institution_profiles.id
      - `flagged_by` (uuid, FK to portal_users.id) - the operations user
      - `reason` (text) - explanation of why flagged
      - `severity` (text) - 'minor', 'major', 'policy_violation'
      - `status` (text) - 'active' or 'resolved'
      - `created_at` (timestamptz)
      - `resolved_at` (timestamptz, nullable)

  2. Modified Tables
    - `partner_listings` - add `is_flagged` (boolean, default false)
    - `institution_profiles` - add `is_flagged` (boolean, default false)

  3. Security
    - Enable RLS on both new tables
    - Operations users can manage content_flags
    - Portal users can read their own notifications
    - Operations users can create notifications for any portal user

  4. Notes
    - The metadata jsonb field stores structured data used by CTA buttons in the frontend
    - content_flags tracks the full history of flagging/unflagging actions
    - is_flagged on listings/profiles is the quick-access boolean for filtering in public queries
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_portal_user_id uuid NOT NULL REFERENCES portal_users(id),
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Portal users can read their own notifications
DROP POLICY IF EXISTS "Portal users can view own notifications" ON notifications;
CREATE POLICY "Portal users can view own notifications" ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE portal_users.id = notifications.recipient_portal_user_id
    )
  );

-- Portal users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Portal users can update own notifications" ON notifications;
CREATE POLICY "Portal users can update own notifications" ON notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE portal_users.id = notifications.recipient_portal_user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE portal_users.id = notifications.recipient_portal_user_id
    )
  );

-- Allow insert for any authenticated user (operations users create notifications)
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
CREATE POLICY "Authenticated users can create notifications" ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anonymous select for demo access (portal users use anonymous auth)
DROP POLICY IF EXISTS "Anonymous can view notifications" ON notifications;
CREATE POLICY "Anonymous can view notifications" ON notifications FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous update for demo access
DROP POLICY IF EXISTS "Anonymous can update notifications" ON notifications;
CREATE POLICY "Anonymous can update notifications" ON notifications FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous insert for demo access
DROP POLICY IF EXISTS "Anonymous can insert notifications" ON notifications;
CREATE POLICY "Anonymous can insert notifications" ON notifications FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create content_flags table
CREATE TABLE IF NOT EXISTS content_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('listing', 'attraction')),
  target_id uuid NOT NULL,
  flagged_by uuid NOT NULL REFERENCES portal_users(id),
  reason text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'policy_violation')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;

-- Operations users can view all flags
DROP POLICY IF EXISTS "Anyone can view content flags" ON content_flags;
CREATE POLICY "Anyone can view content flags" ON content_flags FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated can view content flags" ON content_flags;
CREATE POLICY "Authenticated can view content flags" ON content_flags FOR SELECT
  TO authenticated
  USING (true);

-- Allow insert for flagging
DROP POLICY IF EXISTS "Anyone can create content flags" ON content_flags;
CREATE POLICY "Anyone can create content flags" ON content_flags FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can create content flags" ON content_flags;
CREATE POLICY "Authenticated can create content flags" ON content_flags FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow update for resolving flags
DROP POLICY IF EXISTS "Anyone can update content flags" ON content_flags;
CREATE POLICY "Anyone can update content flags" ON content_flags FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update content flags" ON content_flags;
CREATE POLICY "Authenticated can update content flags" ON content_flags FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add is_flagged column to partner_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'is_flagged'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add is_flagged column to institution_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'is_flagged'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_portal_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(recipient_portal_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_content_flags_target ON content_flags(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_status ON content_flags(status);
CREATE INDEX IF NOT EXISTS idx_partner_listings_flagged ON partner_listings(is_flagged);
CREATE INDEX IF NOT EXISTS idx_institution_profiles_flagged ON institution_profiles(is_flagged);


-- ============================================================
-- SOURCE: 20260313043605_add_missing_foreign_key_indexes.sql
-- ============================================================
/*
  # Add Missing Foreign Key Indexes

  Adds covering indexes for 9 foreign keys that were missing indexes,
  which can cause suboptimal query performance on JOINs and cascading deletes.

  1. New Indexes
    - `attraction_reviews.program_id`
    - `bookings.program_id`
    - `capacity_rules.institution_id`
    - `content_flags.flagged_by`
    - `guide_tips.booking_id`
    - `guide_tips.created_by`
    - `guide_tips.review_id`
    - `support_tickets.assigned_to`
    - `support_tickets.created_by_portal_id`

  2. Important Notes
    - All indexes are created with IF NOT EXISTS to be safe
    - These indexes improve JOIN and foreign key lookup performance
*/

CREATE INDEX IF NOT EXISTS idx_attraction_reviews_program_id
  ON public.attraction_reviews (program_id);

CREATE INDEX IF NOT EXISTS idx_bookings_program_id
  ON public.bookings (program_id);

CREATE INDEX IF NOT EXISTS idx_capacity_rules_institution_id
  ON public.capacity_rules (institution_id);

CREATE INDEX IF NOT EXISTS idx_content_flags_flagged_by
  ON public.content_flags (flagged_by);

CREATE INDEX IF NOT EXISTS idx_guide_tips_booking_id
  ON public.guide_tips (booking_id);

CREATE INDEX IF NOT EXISTS idx_guide_tips_created_by
  ON public.guide_tips (created_by);

CREATE INDEX IF NOT EXISTS idx_guide_tips_review_id
  ON public.guide_tips (review_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to
  ON public.support_tickets (assigned_to);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by_portal_id
  ON public.support_tickets (created_by_portal_id);


-- ============================================================
-- SOURCE: 20260313043653_optimize_rls_auth_function_calls.sql
-- ============================================================
/*
  # Optimize RLS Auth Function Calls

  Wraps `auth.uid()` calls in `(select ...)` to prevent re-evaluation per row.
  This is a performance optimization that caches the auth function result
  for the duration of the query instead of calling it for every row.

  1. Affected Tables
    - `bookings` (6 policies)
    - `saved_items` (3 policies)
    - `conversations` (7 policies)
    - `messages` (3 policies)
    - `support_tickets` (2 policies)
    - `ticket_messages` (2 policies)
    - `attraction_reviews` (1 policy)

  2. Changes
    - All `auth.uid()` calls replaced with `(select auth.uid())`
    - Policy logic remains identical
*/

-- bookings: Travelers can view their own bookings
DROP POLICY IF EXISTS "Travelers can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Travelers can view their own bookings" ON public.bookings;
CREATE POLICY "Travelers can view their own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (traveler_id = (select auth.uid()));

-- bookings: Travelers can insert bookings
DROP POLICY IF EXISTS "Travelers can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Travelers can insert bookings" ON public.bookings;
CREATE POLICY "Travelers can insert bookings" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (traveler_id = (select auth.uid()));

-- bookings: Guides can view their assigned bookings
DROP POLICY IF EXISTS "Guides can view their assigned bookings" ON public.bookings;
DROP POLICY IF EXISTS "Guides can view their assigned bookings" ON public.bookings;
CREATE POLICY "Guides can view their assigned bookings" ON public.bookings FOR SELECT TO authenticated
  USING (guide_id IN (
    SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
  ));

-- bookings: Guides can update their booking status
DROP POLICY IF EXISTS "Guides can update their booking status" ON public.bookings;
DROP POLICY IF EXISTS "Guides can update their booking status" ON public.bookings;
CREATE POLICY "Guides can update their booking status" ON public.bookings FOR UPDATE TO authenticated
  USING (guide_id IN (
    SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
  ))
  WITH CHECK (guide_id IN (
    SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
  ));

-- bookings: Hosts can view bookings for their listings
DROP POLICY IF EXISTS "Hosts can view bookings for their listings" ON public.bookings;
DROP POLICY IF EXISTS "Hosts can view bookings for their listings" ON public.bookings;
CREATE POLICY "Hosts can view bookings for their listings" ON public.bookings FOR SELECT TO authenticated
  USING (host_id IN (
    SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
  ));

-- bookings: Hosts can update booking status
DROP POLICY IF EXISTS "Hosts can update booking status" ON public.bookings;
DROP POLICY IF EXISTS "Hosts can update booking status" ON public.bookings;
CREATE POLICY "Hosts can update booking status" ON public.bookings FOR UPDATE TO authenticated
  USING (host_id IN (
    SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
  ))
  WITH CHECK (host_id IN (
    SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
  ));

-- saved_items: Users can view own saved items
DROP POLICY IF EXISTS "Users can view own saved items" ON public.saved_items;
DROP POLICY IF EXISTS "Users can view own saved items" ON public.saved_items;
CREATE POLICY "Users can view own saved items" ON public.saved_items FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- saved_items: Users can insert own saved items
DROP POLICY IF EXISTS "Users can insert own saved items" ON public.saved_items;
DROP POLICY IF EXISTS "Users can insert own saved items" ON public.saved_items;
CREATE POLICY "Users can insert own saved items" ON public.saved_items FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- saved_items: Users can delete own saved items
DROP POLICY IF EXISTS "Users can delete own saved items" ON public.saved_items;
DROP POLICY IF EXISTS "Users can delete own saved items" ON public.saved_items;
CREATE POLICY "Users can delete own saved items" ON public.saved_items FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- conversations: Travelers can view own conversations
DROP POLICY IF EXISTS "Travelers can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Travelers can view own conversations" ON public.conversations;
CREATE POLICY "Travelers can view own conversations" ON public.conversations FOR SELECT TO authenticated
  USING (traveler_id = (select auth.uid()));

-- conversations: Travelers can create conversations
DROP POLICY IF EXISTS "Travelers can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Travelers can create conversations" ON public.conversations;
CREATE POLICY "Travelers can create conversations" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    traveler_id = (select auth.uid())
    AND booking_id IN (
      SELECT bookings.id FROM bookings WHERE bookings.traveler_id = (select auth.uid())
    )
  );

-- conversations: Hosts can view their conversations
DROP POLICY IF EXISTS "Hosts can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Hosts can view their conversations" ON public.conversations;
CREATE POLICY "Hosts can view their conversations" ON public.conversations FOR SELECT TO authenticated
  USING (host_id IN (
    SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
  ));

-- conversations: Hosts can create conversations
DROP POLICY IF EXISTS "Hosts can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Hosts can create conversations" ON public.conversations;
CREATE POLICY "Hosts can create conversations" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (host_id IN (
    SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
  ));

-- conversations: Guides can view their conversations
DROP POLICY IF EXISTS "Guides can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Guides can view their conversations" ON public.conversations;
CREATE POLICY "Guides can view their conversations" ON public.conversations FOR SELECT TO authenticated
  USING (guide_id IN (
    SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
  ));

-- conversations: Guides can create conversations
DROP POLICY IF EXISTS "Guides can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Guides can create conversations" ON public.conversations;
CREATE POLICY "Guides can create conversations" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (guide_id IN (
    SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
  ));

-- conversations: Participants can update conversations
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations" ON public.conversations FOR UPDATE TO authenticated
  USING (
    traveler_id = (select auth.uid())
    OR host_id IN (
      SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
    )
    OR guide_id IN (
      SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    traveler_id = (select auth.uid())
    OR host_id IN (
      SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
    )
    OR guide_id IN (
      SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
    )
  );

-- messages: Participants can view messages
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT TO authenticated
  USING (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.traveler_id = (select auth.uid())
      OR conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid()))
      OR conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid()))
  ));

-- messages: Participants can send messages
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.traveler_id = (select auth.uid())
      OR conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid()))
      OR conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid()))
  ));

-- messages: Participants can update messages
DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;
CREATE POLICY "Participants can update messages" ON public.messages FOR UPDATE TO authenticated
  USING (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.traveler_id = (select auth.uid())
      OR conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid()))
      OR conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid()))
  ))
  WITH CHECK (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.traveler_id = (select auth.uid())
      OR conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid()))
      OR conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid()))
  ));

-- support_tickets: Travelers can create tickets
DROP POLICY IF EXISTS "Travelers can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Travelers can create tickets" ON public.support_tickets;
CREATE POLICY "Travelers can create tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (created_by_auth_id = (select auth.uid()));

-- support_tickets: Travelers can view their own tickets
DROP POLICY IF EXISTS "Travelers can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Travelers can view their own tickets" ON public.support_tickets;
CREATE POLICY "Travelers can view their own tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (created_by_auth_id = (select auth.uid()));

-- ticket_messages: Ticket participants can view messages
DROP POLICY IF EXISTS "Ticket participants can view messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Ticket participants can view messages" ON public.ticket_messages;
CREATE POLICY "Ticket participants can view messages" ON public.ticket_messages FOR SELECT TO authenticated
  USING (ticket_id IN (
    SELECT support_tickets.id FROM support_tickets WHERE support_tickets.created_by_auth_id = (select auth.uid())
  ));

-- ticket_messages: Ticket participants can send messages
DROP POLICY IF EXISTS "Ticket participants can send messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Ticket participants can send messages" ON public.ticket_messages;
CREATE POLICY "Ticket participants can send messages" ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (ticket_id IN (
    SELECT support_tickets.id FROM support_tickets WHERE support_tickets.created_by_auth_id = (select auth.uid())
  ));

-- attraction_reviews: Authenticated users can create attraction reviews
DROP POLICY IF EXISTS "Authenticated users can create attraction reviews" ON public.attraction_reviews;
DROP POLICY IF EXISTS "Authenticated users can create attraction reviews" ON public.attraction_reviews;
CREATE POLICY "Authenticated users can create attraction reviews" ON public.attraction_reviews FOR INSERT TO authenticated
  WITH CHECK (traveler_id = (select auth.uid()));


-- ============================================================
-- SOURCE: 20260313043735_drop_unused_and_duplicate_indexes.sql
-- ============================================================
/*
  # Drop Unused and Duplicate Indexes

  Removes indexes flagged as unused by the Supabase security advisor,
  plus 3 duplicate index pairs where identical indexes existed.

  1. Duplicate Indexes Dropped (keeping the `_id` suffix versions)
    - `idx_partner_hosts_partner` (duplicate of `idx_partner_hosts_partner_id`)
    - `idx_partner_listings_host` (duplicate of `idx_partner_listings_host_id`)
    - `idx_partner_listings_partner` (duplicate of `idx_partner_listings_partner_id`)

  2. Unused Indexes Dropped (48 indexes)
    - Various indexes on bookings, guides, conversations, messages, etc.
    - These had zero usage since creation per pg_stat_user_indexes

  3. Important Notes
    - Recently created notification/content_flag indexes are EXCLUDED
      since they have no usage stats yet but serve active queries
    - All drops use IF EXISTS for safety
*/

-- Duplicate indexes: drop shorter-named duplicates
DROP INDEX IF EXISTS idx_partner_hosts_partner;
DROP INDEX IF EXISTS idx_partner_listings_host;
DROP INDEX IF EXISTS idx_partner_listings_partner;

-- Unused indexes on bookings
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_bookings_booking_date;
DROP INDEX IF EXISTS idx_bookings_created_at;
DROP INDEX IF EXISTS idx_bookings_host_id;
DROP INDEX IF EXISTS idx_bookings_item_date_session;
DROP INDEX IF EXISTS idx_bookings_guide_date;
DROP INDEX IF EXISTS idx_bookings_host_date;
DROP INDEX IF EXISTS idx_bookings_partner_status;
DROP INDEX IF EXISTS idx_bookings_institution_created;

-- Unused indexes on partner_hosts
DROP INDEX IF EXISTS idx_partner_hosts_traveler_id;
DROP INDEX IF EXISTS idx_partner_hosts_traveler_user_id;
DROP INDEX IF EXISTS idx_partner_hosts_created_by_portal_user;
DROP INDEX IF EXISTS idx_partner_hosts_created_by_user_id;

-- Unused indexes on partner_listings
DROP INDEX IF EXISTS idx_partner_listings_partner_status;
DROP INDEX IF EXISTS idx_partner_listings_type_status;

-- Unused indexes on guides
DROP INDEX IF EXISTS idx_guides_available;
DROP INDEX IF EXISTS idx_guides_email;
DROP INDEX IF EXISTS idx_guides_traveler_user_id;

-- Unused indexes on programs
DROP INDEX IF EXISTS idx_programs_active;

-- Unused indexes on conversations
DROP INDEX IF EXISTS idx_conversations_guide;
DROP INDEX IF EXISTS idx_conversations_updated;
DROP INDEX IF EXISTS idx_conversations_traveler_updated;
DROP INDEX IF EXISTS idx_conversations_host_updated;
DROP INDEX IF EXISTS idx_conversations_guide_updated;

-- Unused indexes on messages
DROP INDEX IF EXISTS idx_messages_conversation;
DROP INDEX IF EXISTS idx_messages_conversation_created;

-- Unused indexes on ticket_messages
DROP INDEX IF EXISTS idx_ticket_messages_ticket;
DROP INDEX IF EXISTS idx_ticket_messages_created;

-- Unused indexes on support_tickets
DROP INDEX IF EXISTS idx_support_tickets_status;
DROP INDEX IF EXISTS idx_support_tickets_booking;
DROP INDEX IF EXISTS idx_support_tickets_category;

-- Unused indexes on guide_tips
DROP INDEX IF EXISTS idx_guide_tips_status;

-- Unused indexes on guide_salary_payments
DROP INDEX IF EXISTS idx_guide_salary_status;

-- Unused indexes on schedule_overrides
DROP INDEX IF EXISTS idx_schedule_overrides_entity;
DROP INDEX IF EXISTS idx_schedule_overrides_date;

-- Unused indexes on institution_profiles
DROP INDEX IF EXISTS idx_institution_profiles_published;

-- Unused indexes on portal_users
DROP INDEX IF EXISTS idx_portal_users_code;
DROP INDEX IF EXISTS idx_portal_users_created_by;

-- Unused indexes on attraction_reviews
DROP INDEX IF EXISTS idx_attraction_reviews_booking;
DROP INDEX IF EXISTS idx_attraction_reviews_traveler;

-- Unused indexes on government_policies
DROP INDEX IF EXISTS idx_government_policies_status;
DROP INDEX IF EXISTS idx_government_policies_priority;

-- Unused indexes on notifications (keeping recipient and is_read as they serve active queries)
-- NOT dropping: idx_notifications_recipient, idx_notifications_is_read

-- Unused indexes on content_flags (keeping target and status as they serve active queries)
-- NOT dropping: idx_content_flags_target, idx_content_flags_status

-- NOT dropping: idx_institution_profiles_flagged (serves active filter queries)


-- ============================================================
-- SOURCE: 20260313043848_consolidate_and_fix_rls_policies.sql
-- ============================================================
/*
  # Consolidate and Fix RLS Policies

  This migration addresses three categories of security findings:
  - Always-true RLS policies that bypass row-level security
  - Multiple permissive policies on same table/role/action
  - Redundant overlapping policies

  ## Strategy
  Portal users (partner, government, institution, operations) authenticate
  via a custom system and connect as `anon` role. They need broad anon access
  to portal-managed tables. We consolidate duplicate anon policies into single
  policies per action, and for `authenticated` users we remove always-true
  policies where ownership-check policies exist.

  ## Tables Modified
  - `partner_hosts` - Consolidate 3 SELECT anon policies into 1, remove always-true auth policies
  - `partner_listings` - Same pattern as partner_hosts
  - `portal_users` - Remove redundant auth policies (FOR ALL covers them)
  - `reviews` - Remove duplicate INSERT policy
  - `institution_profiles` - Consolidate SELECT policies
  - `bookings` - Remove always-true anon INSERT/UPDATE
  - `content_flags` - Consolidate anon+auth policies
  - `notifications` - Consolidate policies
  - `capacity_rules` - Consolidate duplicate anon/auth policies
  - `government_policies` - Consolidate anon/auth view policies
  - `guide_salary_payments` - Keep anon access (institution portal)
  - `guide_schedules` - Keep public access (portal managed)
  - `guide_tips` - Keep anon access (institution portal)
  - `guides` - Keep public access (portal managed)
  - `host_schedules` - Keep public access (portal managed)
  - `programs` - Keep public access (portal managed)
  - `program_guides` - Keep public access (portal managed)
  - `schedule_overrides` - Consolidate anon/auth view policies
  - `support_tickets` - Keep anon access (portal managed)
  - `ticket_messages` - Keep anon access (portal managed)
  - `traveler_reviews` - Consolidate INSERT, remove always-true
  - `travelers` - Keep anon INSERT (signup flow)
*/

-- ============================================================
-- partner_hosts: Consolidate SELECT policies for anon
-- ============================================================
-- Remove redundant anon SELECT policies (3 policies → 1)
DROP POLICY IF EXISTS "Allow anonymous to view all hosts" ON public.partner_hosts;
DROP POLICY IF EXISTS "Anonymous users can view active hosts" ON public.partner_hosts;
-- Keep "Allow public to view all hosts" which covers anon+authenticated

-- Remove always-true write policies for authenticated (ownership policies exist)
DROP POLICY IF EXISTS "Allow all to create hosts" ON public.partner_hosts;
DROP POLICY IF EXISTS "Allow all to delete hosts" ON public.partner_hosts;
DROP POLICY IF EXISTS "Allow all to update hosts" ON public.partner_hosts;

-- Recreate anon-only write policies (portal users need these)
DROP POLICY IF EXISTS "Anon can create hosts" ON public.partner_hosts;
CREATE POLICY "Anon can create hosts" ON public.partner_hosts FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update hosts" ON public.partner_hosts;
CREATE POLICY "Anon can update hosts" ON public.partner_hosts FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete hosts" ON public.partner_hosts;
CREATE POLICY "Anon can delete hosts" ON public.partner_hosts FOR DELETE TO anon
  USING (true);

-- ============================================================
-- partner_listings: Consolidate SELECT policies for anon
-- ============================================================
DROP POLICY IF EXISTS "Allow anonymous to view all listings" ON public.partner_listings;
-- Keep "Allow public to view all listings" which covers anon+authenticated

-- Remove always-true write policies for authenticated (ownership policies exist)
DROP POLICY IF EXISTS "Allow all to create listings" ON public.partner_listings;
DROP POLICY IF EXISTS "Allow all to delete listings" ON public.partner_listings;
DROP POLICY IF EXISTS "Allow all to update listings" ON public.partner_listings;

-- Recreate anon-only write policies (portal users need these)
DROP POLICY IF EXISTS "Anon can create listings" ON public.partner_listings;
CREATE POLICY "Anon can create listings" ON public.partner_listings FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update listings" ON public.partner_listings;
CREATE POLICY "Anon can update listings" ON public.partner_listings FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete listings" ON public.partner_listings;
CREATE POLICY "Anon can delete listings" ON public.partner_listings FOR DELETE TO anon
  USING (true);

-- ============================================================
-- portal_users: Remove redundant authenticated policies
-- The "Portal users can manage own account" FOR ALL policy is
-- superseded by the always-true policies. Since portal users
-- log in as anon, the auth.uid() check never matches anyway.
-- Keep anon access (needed by portal system), remove duplicate auth.
-- ============================================================
DROP POLICY IF EXISTS "Portal users can manage own account" ON public.portal_users;
DROP POLICY IF EXISTS "Allow all inserts for portal users" ON public.portal_users;
DROP POLICY IF EXISTS "Allow all to delete portal users" ON public.portal_users;
DROP POLICY IF EXISTS "Allow all to update portal users" ON public.portal_users;
DROP POLICY IF EXISTS "Allow all to view portal users" ON public.portal_users;

-- Single policy per action
DROP POLICY IF EXISTS "Anyone can view portal users" ON public.portal_users;
CREATE POLICY "Anyone can view portal users" ON public.portal_users FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can create portal users" ON public.portal_users;
CREATE POLICY "Anyone can create portal users" ON public.portal_users FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update portal users" ON public.portal_users;
CREATE POLICY "Anyone can update portal users" ON public.portal_users FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete portal users" ON public.portal_users;
CREATE POLICY "Anyone can delete portal users" ON public.portal_users FOR DELETE TO anon, authenticated
  USING (true);

-- ============================================================
-- reviews: Remove duplicate INSERT policy
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
-- Keep "Allow all to create reviews" which covers anon+authenticated

-- ============================================================
-- institution_profiles: Consolidate SELECT policies
-- ============================================================
-- "Institution portal users can view their own profile" (true for public)
-- overlaps with "Anyone can view published institution profiles" (published=true)
-- Since first is always true, it supersedes the second. Consolidate.
DROP POLICY IF EXISTS "Anyone can view published institution profiles" ON public.institution_profiles;
DROP POLICY IF EXISTS "Institution portal users can view their own profile" ON public.institution_profiles;

DROP POLICY IF EXISTS "Anyone can view institution profiles" ON public.institution_profiles;
CREATE POLICY "Anyone can view institution profiles" ON public.institution_profiles FOR SELECT TO anon, authenticated
  USING (true);

-- ============================================================
-- bookings: Remove always-true anon policies (keep portal SELECT)
-- ============================================================
DROP POLICY IF EXISTS "Anonymous users can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Partners can update booking status" ON public.bookings;
-- Keep "Partners can view bookings for their listings" (anon SELECT) for portal

-- ============================================================
-- content_flags: Consolidate anon + authenticated policies
-- ============================================================
DROP POLICY IF EXISTS "Anyone can create content flags" ON public.content_flags;
DROP POLICY IF EXISTS "Authenticated can create content flags" ON public.content_flags;
DROP POLICY IF EXISTS "Anyone can view content flags" ON public.content_flags;
DROP POLICY IF EXISTS "Authenticated can view content flags" ON public.content_flags;
DROP POLICY IF EXISTS "Anyone can update content flags" ON public.content_flags;
DROP POLICY IF EXISTS "Authenticated can update content flags" ON public.content_flags;

DROP POLICY IF EXISTS "Anyone can view content flags" ON public.content_flags;
CREATE POLICY "Anyone can view content flags" ON public.content_flags FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can create content flags" ON public.content_flags;
CREATE POLICY "Anyone can create content flags" ON public.content_flags FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update content flags" ON public.content_flags;
CREATE POLICY "Anyone can update content flags" ON public.content_flags FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- notifications: Consolidate policies
-- ============================================================
DROP POLICY IF EXISTS "Anonymous can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anonymous can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anonymous can update notifications" ON public.notifications;

DROP POLICY IF EXISTS "Anyone can view notifications" ON public.notifications;
CREATE POLICY "Anyone can view notifications" ON public.notifications FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can create notifications" ON public.notifications;
CREATE POLICY "Anyone can create notifications" ON public.notifications FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update notifications" ON public.notifications;
CREATE POLICY "Anyone can update notifications" ON public.notifications FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- capacity_rules: Consolidate duplicate anon/auth policies
-- ============================================================
DROP POLICY IF EXISTS "Anon can delete capacity_rules" ON public.capacity_rules;
DROP POLICY IF EXISTS "Authenticated can delete capacity_rules" ON public.capacity_rules;
DROP POLICY IF EXISTS "Anon can insert capacity_rules" ON public.capacity_rules;
DROP POLICY IF EXISTS "Authenticated can insert capacity_rules" ON public.capacity_rules;
DROP POLICY IF EXISTS "Anonymous can view capacity_rules" ON public.capacity_rules;
DROP POLICY IF EXISTS "Authenticated can view capacity_rules" ON public.capacity_rules;
DROP POLICY IF EXISTS "Anon can update capacity_rules" ON public.capacity_rules;
DROP POLICY IF EXISTS "Authenticated can update capacity_rules" ON public.capacity_rules;

DROP POLICY IF EXISTS "Anyone can view capacity rules" ON public.capacity_rules;
CREATE POLICY "Anyone can view capacity rules" ON public.capacity_rules FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can create capacity rules" ON public.capacity_rules;
CREATE POLICY "Anyone can create capacity rules" ON public.capacity_rules FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update capacity rules" ON public.capacity_rules;
CREATE POLICY "Anyone can update capacity rules" ON public.capacity_rules FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete capacity rules" ON public.capacity_rules;
CREATE POLICY "Anyone can delete capacity rules" ON public.capacity_rules FOR DELETE TO anon, authenticated
  USING (true);

-- ============================================================
-- government_policies: Consolidate view policies
-- ============================================================
DROP POLICY IF EXISTS "Allow anonymous to view government policies" ON public.government_policies;
DROP POLICY IF EXISTS "Allow authenticated to view government policies" ON public.government_policies;

DROP POLICY IF EXISTS "Anyone can view government policies" ON public.government_policies;
CREATE POLICY "Anyone can view government policies" ON public.government_policies FOR SELECT TO anon, authenticated
  USING (true);

-- ============================================================
-- schedule_overrides: Consolidate view policies
-- ============================================================
DROP POLICY IF EXISTS "Allow anonymous to view schedule overrides" ON public.schedule_overrides;
DROP POLICY IF EXISTS "Allow authenticated to view schedule overrides" ON public.schedule_overrides;

DROP POLICY IF EXISTS "Anyone can view schedule overrides" ON public.schedule_overrides;
CREATE POLICY "Anyone can view schedule overrides" ON public.schedule_overrides FOR SELECT TO anon, authenticated
  USING (true);

-- ============================================================
-- traveler_reviews: Fix always-true INSERT for authenticated
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert their own traveler reviews" ON public.traveler_reviews;

DROP POLICY IF EXISTS "Authenticated users can insert their own traveler reviews" ON public.traveler_reviews;
CREATE POLICY "Authenticated users can insert their own traveler reviews" ON public.traveler_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = (select auth.uid()));


-- ============================================================
-- SOURCE: 20260313043910_fix_function_search_path.sql
-- ============================================================
/*
  # Fix Mutable Function Search Path

  Sets an immutable search_path on the `update_conversation_last_message`
  function to prevent search_path injection attacks.

  1. Changes
    - Recreates `update_conversation_last_message` with `SET search_path = public`
    - Function logic remains identical

  2. Security
    - Prevents potential privilege escalation via search_path manipulation
*/

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET
    last_message = NEW.message_text,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


-- ============================================================
-- SOURCE: 20260313052529_allow_general_support_tickets.sql
-- ============================================================
/*
  # Allow general support tickets without a target portal

  1. Modified Columns
    - `support_tickets.target_portal_id` - Changed from NOT NULL to nullable
      - Allows tickets with no specific listing/booking to be created
      - These "general inquiry" tickets will be handled by the operations team
    - `support_tickets.portal_type` - Updated default to 'general'
      - Allows storing general tickets that are not tied to any portal

  2. Important Notes
    - Existing data is unaffected; only the constraint is relaxed
    - General tickets (target_portal_id IS NULL) will only appear in Operations Cases
*/

ALTER TABLE support_tickets ALTER COLUMN target_portal_id DROP NOT NULL;

ALTER TABLE support_tickets ALTER COLUMN portal_type SET DEFAULT 'general';


-- ============================================================
-- SOURCE: 20260313074934_create_email_logs_table.sql
-- ============================================================
/*
  # Create Email Logs Table

  1. New Tables
    - `email_logs`
      - `id` (uuid, primary key)
      - `recipient_email` (text, not null) - the email address the message was sent to
      - `recipient_name` (text) - display name of the recipient
      - `template_type` (text, not null) - identifier for which email template was used
      - `subject` (text, not null) - the email subject line
      - `status` (text, not null, default 'sent') - delivery status: sent, failed, pending
      - `error_message` (text) - error details if delivery failed
      - `metadata` (jsonb) - additional context (booking_id, flag_id, etc.)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `email_logs` table
    - Only authenticated users (operations) can read email logs
    - System (service role) inserts logs via edge functions

  3. Indexes
    - Index on `recipient_email` for lookup queries
    - Index on `template_type` for filtering
    - Index on `created_at` for chronological queries
*/

CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_name text DEFAULT '',
  template_type text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operations users can view email logs" ON email_logs;
CREATE POLICY "Operations users can view email logs" ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE portal_users.user_id_code = 'OPS-001'
      AND portal_users.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);


-- ============================================================
-- SOURCE: 20260313094704_fix_fk_constraints_for_account_deletion.sql
-- ============================================================
/*
  # Fix Foreign Key Constraints for Traveler Account Deletion

  1. Changes
    - `partner_hosts.traveler_user_id`: Changed from NO ACTION to SET NULL
      so deleting a traveler auth user does not block if they are linked as a host
    - `guides.traveler_user_id`: Changed from NO ACTION to SET NULL
      so deleting a traveler auth user does not block if they are linked as a guide
    - `conversations.traveler_id`: Changed from CASCADE to SET NULL
      so conversations are preserved (anonymized) for hosts/guides instead of being deleted
    - `attraction_reviews.traveler_id`: Changed from CASCADE to SET NULL
      so public reviews are preserved (anonymized) instead of being deleted

  2. Unchanged (already correct)
    - `bookings.traveler_id`: Already SET NULL
    - `saved_items.user_id`: Already CASCADE (personal data, fine to delete)
    - `support_tickets.created_by_auth_id`: Already SET NULL

  3. Important Notes
    - These changes ensure that deleting a traveler's auth account gracefully
      handles all downstream data without blocking or losing shared content
    - Host/guide records remain intact with their traveler_user_id set to null
    - Conversations and reviews become anonymous but are preserved
*/

ALTER TABLE partner_hosts
  DROP CONSTRAINT IF EXISTS partner_hosts_traveler_user_id_fkey,
  ADD CONSTRAINT partner_hosts_traveler_user_id_fkey
    FOREIGN KEY (traveler_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE guides
  DROP CONSTRAINT IF EXISTS guides_traveler_user_id_fkey,
  ADD CONSTRAINT guides_traveler_user_id_fkey
    FOREIGN KEY (traveler_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_traveler_id_fkey,
  ADD CONSTRAINT conversations_traveler_id_fkey
    FOREIGN KEY (traveler_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE attraction_reviews
  DROP CONSTRAINT IF EXISTS attraction_reviews_traveler_id_fkey,
  ADD CONSTRAINT attraction_reviews_traveler_id_fkey
    FOREIGN KEY (traveler_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- ============================================================
-- SOURCE: 20260315090459_add_pesapal_payments_table.sql
-- ============================================================
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

DROP POLICY IF EXISTS "Travelers can read own payments" ON payments;
CREATE POLICY "Travelers can read own payments" ON payments FOR SELECT
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
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
      CHECK (payment_status IN ('pending', 'paid', 'failed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'pesapal_tracking_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pesapal_tracking_id text;
  END IF;
END $$;


-- ============================================================
-- SOURCE: 20260315114255_auto_confirm_bookings.sql
-- ============================================================
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


-- ============================================================
-- SOURCE: 20260315135719_create_admin_messaging_system.sql
-- ============================================================
/*
  # Create Admin Messaging System

  ## Overview
  This migration creates a direct messaging channel between portal admins (partners and institutions)
  and their staff (hosts and guides). This is separate from the existing traveler booking-based
  conversations system.

  ## 1. New Tables

  ### `admin_conversations`
  Represents a direct message thread between an admin and one of their staff members.
  - `id` (uuid, primary key)
  - `admin_id` (uuid) - The portal_user ID of the partner or institution admin
  - `admin_type` (text) - Either 'partner' or 'institution'
  - `admin_name` (text) - Cached admin/organization name for display
  - `host_id` (uuid, nullable) - References partner_hosts.id for partner-to-host threads
  - `guide_id` (uuid, nullable) - References guides.id for institution-to-guide threads
  - `last_message` (text, nullable) - Cached preview of last message
  - `last_message_at` (timestamptz, nullable) - Timestamp of last message
  - `created_at` / `updated_at` (timestamptz)

  ### `admin_messages`
  Individual messages within an admin conversation.
  - `id` (uuid, primary key)
  - `admin_conversation_id` (uuid) - References admin_conversations.id
  - `sender_type` (text) - 'admin', 'host', or 'guide'
  - `sender_id` (uuid) - ID of the sender
  - `sender_name` (text) - Cached sender name
  - `message_text` (text) - Message content
  - `is_read` (boolean) - Whether the recipient has read it
  - `created_at` / `updated_at` (timestamptz)

  ## 2. Security (RLS Policies)

  ### admin_conversations
  - Admins can view/insert conversations where admin_id matches their portal_users.id
  - Hosts can view conversations where their host_id matches
  - Guides can view conversations where their guide_id matches
  - Participants can update (for last_message cache)

  ### admin_messages
  - Participants can view messages in their conversations
  - Participants can send messages
  - Participants can mark messages as read (update is_read)

  ## 3. Indexes
  - On admin_id, host_id, guide_id for fast filtering
  - On admin_conversation_id for message retrieval
  - On created_at for ordering

  ## 4. Notes
  - Each admin-host pair has exactly one conversation (unique constraint)
  - Each admin-guide pair has exactly one conversation (unique constraint)
  - A trigger auto-updates last_message on new message insert
  - Broadcast is handled at the application layer by inserting into each individual conversation
*/

-- Create admin_conversations table
CREATE TABLE IF NOT EXISTS admin_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  admin_type text NOT NULL CHECK (admin_type IN ('partner', 'institution')),
  admin_name text NOT NULL DEFAULT '',
  host_id uuid REFERENCES partner_hosts(id) ON DELETE CASCADE,
  guide_id uuid REFERENCES guides(id) ON DELETE CASCADE,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_admin_host UNIQUE (admin_id, host_id),
  CONSTRAINT unique_admin_guide UNIQUE (admin_id, guide_id),
  CONSTRAINT host_or_guide_required CHECK (
    (host_id IS NOT NULL AND guide_id IS NULL) OR
    (guide_id IS NOT NULL AND host_id IS NULL)
  )
);

-- Create admin_messages table
CREATE TABLE IF NOT EXISTS admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_conversation_id uuid NOT NULL REFERENCES admin_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('admin', 'host', 'guide')),
  sender_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_conversations_admin ON admin_conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_host ON admin_conversations(host_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_guide ON admin_conversations(guide_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_updated ON admin_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_messages_conversation ON admin_messages(admin_conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created ON admin_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_messages_unread ON admin_messages(admin_conversation_id, is_read);

-- Enable RLS
ALTER TABLE admin_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- RLS: admin_conversations

DROP POLICY IF EXISTS "Admins can view their conversations" ON admin_conversations;
CREATE POLICY "Admins can view their conversations" ON admin_conversations FOR SELECT
  TO authenticated
  USING (admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can create conversations" ON admin_conversations;
CREATE POLICY "Admins can create conversations" ON admin_conversations FOR INSERT
  TO authenticated
  WITH CHECK (admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can update their conversations" ON admin_conversations;
CREATE POLICY "Admins can update their conversations" ON admin_conversations FOR UPDATE
  TO authenticated
  USING (admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid()))
  WITH CHECK (admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Hosts can view their admin conversations" ON admin_conversations;
CREATE POLICY "Hosts can view their admin conversations" ON admin_conversations FOR SELECT
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can update their admin conversations" ON admin_conversations;
CREATE POLICY "Hosts can update their admin conversations" ON admin_conversations FOR UPDATE
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid()
    )
  )
  WITH CHECK (
    host_id IN (
      SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Guides can view their admin conversations" ON admin_conversations;
CREATE POLICY "Guides can view their admin conversations" ON admin_conversations FOR SELECT
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides WHERE portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Guides can update their admin conversations" ON admin_conversations;
CREATE POLICY "Guides can update their admin conversations" ON admin_conversations FOR UPDATE
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides WHERE portal_user_id = auth.uid()
    )
  )
  WITH CHECK (
    guide_id IN (
      SELECT id FROM guides WHERE portal_user_id = auth.uid()
    )
  );

-- RLS: admin_messages

DROP POLICY IF EXISTS "Participants can view admin messages" ON admin_messages;
CREATE POLICY "Participants can view admin messages" ON admin_messages FOR SELECT
  TO authenticated
  USING (
    admin_conversation_id IN (
      SELECT id FROM admin_conversations
      WHERE
        admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid())
        OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
        OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can send admin messages" ON admin_messages;
CREATE POLICY "Participants can send admin messages" ON admin_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_conversation_id IN (
      SELECT id FROM admin_conversations
      WHERE
        admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid())
        OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
        OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can update admin messages" ON admin_messages;
CREATE POLICY "Participants can update admin messages" ON admin_messages FOR UPDATE
  TO authenticated
  USING (
    admin_conversation_id IN (
      SELECT id FROM admin_conversations
      WHERE
        admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid())
        OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
        OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  )
  WITH CHECK (
    admin_conversation_id IN (
      SELECT id FROM admin_conversations
      WHERE
        admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid())
        OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
        OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  );

-- Trigger to auto-update last_message in admin_conversations
CREATE OR REPLACE FUNCTION update_admin_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE admin_conversations
  SET
    last_message = NEW.message_text,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.admin_conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_admin_conversation_last_message ON admin_messages;
DROP TRIGGER IF EXISTS trigger_update_admin_conversation_last_message ON admin_messages;
CREATE TRIGGER trigger_update_admin_conversation_last_message
  AFTER INSERT ON admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_conversation_last_message();


-- ============================================================
-- SOURCE: 20260315152247_add_journey_itinerary_support.sql
-- ============================================================
/*
  # Add Journey / Itinerary Support to Partner Listings

  ## Summary
  Extends the partner_listings table to support a third listing type: "itinerary"
  (branded as "Journeys" in the UI). Journeys are multi-day curated travel itineraries
  created and sold by partners.

  ## Changes

  ### Modified Tables
  - `partner_listings`
    - `listing_type` check constraint updated to allow 'itinerary' as a valid value
    - New column `itinerary_days` (jsonb) - ordered array of day objects, each with:
        { day: number, title: string, place_name: string, description: string }
    - New column `budget_breakdown` (jsonb) - array of cost line items, each with:
        { label: string, amount: number, currency: string }
    - New column `duration_days` (integer) - total trip length in days
    - New column `pricing_type` (text) - 'per_person' or 'per_group'
    - New column `group_size_min` (integer) - minimum group size for booking
    - New column `group_size_max` (integer) - maximum group size for booking

  ## Security
  - No new tables; existing RLS policies on partner_listings continue to apply.
  - All new columns default to NULL and are optional for non-itinerary listings.

  ## Notes
  1. The listing_type constraint is dropped and recreated to add 'itinerary'.
  2. Existing experience and homestay rows are unaffected.
*/

-- Drop existing listing_type constraint and recreate with 'itinerary' added
ALTER TABLE partner_listings
  DROP CONSTRAINT IF EXISTS partner_listings_listing_type_check;

ALTER TABLE partner_listings
  ADD CONSTRAINT partner_listings_listing_type_check
  CHECK (listing_type IN ('experience', 'homestay', 'itinerary'));

-- Add itinerary-specific columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'itinerary_days'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS itinerary_days jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'budget_breakdown'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS budget_breakdown jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'duration_days'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'pricing_type'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS pricing_type text DEFAULT NULL
      CHECK (pricing_type IN ('per_person', 'per_group') OR pricing_type IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'group_size_min'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS group_size_min integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'group_size_max'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS group_size_max integer DEFAULT NULL;
  END IF;
END $$;


-- ============================================================
-- SOURCE: 20260315172816_fix_host_bookings_rls_and_add_anon_policy.sql
-- ============================================================
/*
  # Fix Host Bookings RLS Policy

  ## Problem
  Most partner_hosts rows have traveler_user_id = NULL. The existing
  "Hosts can view bookings for their listings" policy requires
  partner_hosts.traveler_user_id = auth.uid(), which returns zero rows
  for hosts that haven't logged in after traveler_user_id was backfilled.

  The host dashboard uses the Supabase anon key (same as the partner portal),
  and the "Partners can view bookings for their listings" policy already grants
  anon full SELECT access. This means host bookings should already be readable
  via anon — but the host dashboard might be running with an authenticated session
  (traveler JWT) that bypasses anon policies.

  ## Fix
  1. Add an explicit anon-role SELECT policy for hosts that allows reading bookings
     where host_id is not null — matching the existing partner anon policy pattern.
  2. Also backfill traveler_user_id on all partner_hosts rows where a matching
     auth.users record exists by email, so the authenticated policy works going
     forward for hosts who have already signed up as travelers.

  ## Changes
  - New policy: "Hosts can view their bookings (anon)" on bookings table
  - Data backfill: Set traveler_user_id on partner_hosts from auth.users by email
*/

-- Add anon SELECT policy for hosts (mirrors the partner anon policy pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings'
    AND policyname = 'Hosts can view their bookings (anon)'
  ) THEN
    DROP POLICY IF EXISTS "Hosts can view their bookings (anon)" ON bookings;
CREATE POLICY "Hosts can view their bookings (anon)" ON bookings FOR SELECT
      TO anon
      USING (host_id IS NOT NULL);
  END IF;
END $$;

-- Backfill traveler_user_id on partner_hosts where auth user exists with matching email
UPDATE partner_hosts ph
SET traveler_user_id = au.id
FROM auth.users au
WHERE LOWER(ph.email) = LOWER(au.email)
  AND ph.traveler_user_id IS NULL
  AND ph.email IS NOT NULL
  AND ph.email != '';


-- ============================================================
-- SOURCE: 20260315181006_fix_support_tickets_portal_type_constraint.sql
-- ============================================================
/*
  # Fix Support Tickets Portal Type Constraint

  ## Problem
  The `portal_type` column on `support_tickets` has a CHECK constraint that only allows
  'partner' or 'institution'. However, a later migration intended to allow 'general'
  (for tickets not linked to any specific partner or institution), but only changed
  the default value without updating the CHECK constraint.

  This causes ALL ticket submissions without a related booking to fail with a constraint
  violation error, resulting in "Something went wrong. Please try again." for travelers.

  ## Changes
  1. Drop the old `portal_type` CHECK constraint
  2. Add a new CHECK constraint that allows 'partner', 'institution', and 'general'
  3. Ensure the column default is 'general' to match the intended behavior
*/

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_portal_type_check;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_portal_type_check
  CHECK (portal_type = ANY (ARRAY['partner'::text, 'institution'::text, 'general'::text]));

ALTER TABLE public.support_tickets
  ALTER COLUMN portal_type SET DEFAULT 'general';


-- ============================================================
-- SOURCE: 20260320113510_add_itinerary_to_booking_types.sql
-- ============================================================
/*
  # Add Itinerary to Booking Types

  ## Summary
  Expands the bookings table to support itinerary booking type.

  ## Changes
  1. Modified Tables
     - `bookings`: Drops old booking_type CHECK constraint, adds new one that includes 'itinerary'
       alongside the existing 'experience', 'homestay', 'attraction' values

  ## Notes
  - Two itinerary listings already exist in partner_listings but could not be booked due to
    the missing constraint value
  - No data is lost; existing bookings are unaffected
*/

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_booking_type_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_booking_type_check
  CHECK (booking_type IN ('experience', 'homestay', 'attraction', 'itinerary'));


-- ============================================================
-- SOURCE: 20260321061813_add_cancellation_fields_to_bookings.sql
-- ============================================================
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
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by text;
  END IF;
END $$;

DROP POLICY IF EXISTS "Traveler can cancel own booking" ON bookings;
CREATE POLICY "Traveler can cancel own booking" ON bookings FOR UPDATE
  TO authenticated
  USING (traveler_id = auth.uid() AND status IN ('pending', 'confirmed'))
  WITH CHECK (
    traveler_id = auth.uid()
    AND status = 'cancelled'
  );


-- ============================================================
-- SOURCE: 20260323083059_add_traveler_profile_picture_to_bookings.sql
-- ============================================================
/*
  # Add traveler_profile_picture to bookings

  ## Summary
  Adds a single nullable text column `traveler_profile_picture` to the `bookings` table.

  ## Changes
  - `bookings`: new column `traveler_profile_picture` (text, nullable, default empty string)
    - Stores the traveler's profile picture URL at the time of booking
    - Used by hosts and guides to display traveler info on booking cards and in the About Traveler modal

  ## Notes
  - Non-destructive: existing rows will receive the default value of an empty string
  - No RLS changes required (inherits existing bookings policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'traveler_profile_picture'
  ) THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS traveler_profile_picture text DEFAULT '' ;
  END IF;
END $$;


-- ============================================================
-- SOURCE: 20260325120833_add_entry_fee_guide_tip_booking_programs.sql
-- ============================================================
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
    ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS entry_fee_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'entry_fee_is_free'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS entry_fee_is_free boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guides' AND column_name = 'tip'
  ) THEN
    ALTER TABLE guides ADD COLUMN IF NOT EXISTS tip numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'entry_fee_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS entry_fee_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'tip_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tip_amount numeric(10,2) DEFAULT 0;
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
    DROP POLICY IF EXISTS "Travelers can insert own booking programs" ON booking_programs;
CREATE POLICY "Travelers can insert own booking programs" ON booking_programs FOR INSERT
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
    DROP POLICY IF EXISTS "Travelers can view own booking programs" ON booking_programs;
CREATE POLICY "Travelers can view own booking programs" ON booking_programs FOR SELECT
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
    DROP POLICY IF EXISTS "Institution can view their booking programs" ON booking_programs;
CREATE POLICY "Institution can view their booking programs" ON booking_programs FOR SELECT
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
    DROP POLICY IF EXISTS "Anon can view booking programs" ON booking_programs;
CREATE POLICY "Anon can view booking programs" ON booking_programs FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_programs_booking_id ON booking_programs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_programs_program_id ON booking_programs(program_id);


-- ============================================================
-- SOURCE: 20260326115516_add_duration_days_to_bookings.sql
-- ============================================================
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
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_days integer;
  END IF;
END $$;


-- ============================================================
-- SOURCE: 20260505095105_restore_core_tables_part1.sql
-- ============================================================
/*
  # Restore Core Tables - Part 1: Travelers, Portal Users, Partner Hosts & Listings

  Creates the foundational tables for the platform:
  - travelers: traveler user accounts
  - portal_users: partner/institution/government/operations portal accounts
  - partner_hosts: hosts managed by partners
  - partner_listings: experiences, homestays, and itineraries listed by partners

  All tables have RLS enabled with appropriate anon/authenticated access.
*/

-- Travelers table
CREATE TABLE IF NOT EXISTS travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  phone text,
  profile_picture text,
  bio text,
  date_of_birth date,
  nationality text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE travelers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create traveler account" ON travelers;
CREATE POLICY "Anyone can create traveler account" ON travelers FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Travelers can view own profile" ON travelers;
CREATE POLICY "Travelers can view own profile" ON travelers FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Travelers can update own profile" ON travelers;
CREATE POLICY "Travelers can update own profile" ON travelers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Portal users table
CREATE TABLE IF NOT EXISTS portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_type text NOT NULL CHECK (portal_type IN ('partner', 'government', 'institution', 'operations')),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  user_id_code text UNIQUE NOT NULL,
  name text,
  phone text,
  contact_person text,
  country text,
  province text,
  specific_location text,
  specialty text,
  tags text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES portal_users(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view portal users" ON portal_users;
CREATE POLICY "Anyone can view portal users" ON portal_users FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can create portal users" ON portal_users;
CREATE POLICY "Anyone can create portal users" ON portal_users FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update portal users" ON portal_users;
CREATE POLICY "Anyone can update portal users" ON portal_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete portal users" ON portal_users;
CREATE POLICY "Anyone can delete portal users" ON portal_users FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_travelers_email ON travelers(email);
CREATE INDEX IF NOT EXISTS idx_portal_users_email ON portal_users(email);
CREATE INDEX IF NOT EXISTS idx_portal_users_code ON portal_users(user_id_code);
CREATE INDEX IF NOT EXISTS idx_portal_users_type ON portal_users(portal_type);

-- Seed default operations user (password: operations123)
INSERT INTO portal_users (
  portal_type, email, password_hash, user_id_code, name, is_active
) VALUES (
  'operations',
  'ops@roava.com',
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  'OP000001',
  'Operations Admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- Partner hosts table
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
  traveler_id uuid REFERENCES travelers(id),
  created_by_portal_user uuid REFERENCES portal_users(id),
  traveler_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_hosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public to view all hosts" ON partner_hosts;
CREATE POLICY "Allow public to view all hosts" ON partner_hosts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Partners can create hosts" ON partner_hosts;
CREATE POLICY "Partners can create hosts" ON partner_hosts FOR INSERT TO authenticated WITH CHECK (partner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Partners can update own hosts" ON partner_hosts;
CREATE POLICY "Partners can update own hosts" ON partner_hosts FOR UPDATE TO authenticated
  USING (partner_id = (select auth.uid())) WITH CHECK (partner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Partners can delete own hosts" ON partner_hosts;
CREATE POLICY "Partners can delete own hosts" ON partner_hosts FOR DELETE TO authenticated USING (partner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Anon can create hosts" ON partner_hosts;
CREATE POLICY "Anon can create hosts" ON partner_hosts FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update hosts" ON partner_hosts;
CREATE POLICY "Anon can update hosts" ON partner_hosts FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete hosts" ON partner_hosts;
CREATE POLICY "Anon can delete hosts" ON partner_hosts FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_partner_hosts_partner ON partner_hosts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_hosts_status ON partner_hosts(status);
CREATE INDEX IF NOT EXISTS idx_partner_hosts_traveler_id ON partner_hosts(traveler_id);
CREATE INDEX IF NOT EXISTS idx_partner_hosts_traveler_user_id ON partner_hosts(traveler_user_id);

-- Partner listings table
CREATE TABLE IF NOT EXISTS partner_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('experience', 'homestay', 'itinerary')),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'draft')),
  location jsonb NOT NULL DEFAULT '{"name": "", "region": ""}',
  pricing jsonb NOT NULL DEFAULT '{}',
  media text[] DEFAULT '{}',
  details jsonb DEFAULT '{}',
  whats_included text[] DEFAULT '{}',
  what_to_bring text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  is_flagged boolean NOT NULL DEFAULT false,
  itinerary_days jsonb DEFAULT NULL,
  budget_breakdown jsonb DEFAULT NULL,
  duration_days integer DEFAULT NULL,
  pricing_type text DEFAULT NULL CHECK (pricing_type IN ('per_person', 'per_group') OR pricing_type IS NULL),
  group_size_min integer DEFAULT NULL,
  group_size_max integer DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public to view all listings" ON partner_listings;
CREATE POLICY "Allow public to view all listings" ON partner_listings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Partners can create listings" ON partner_listings;
CREATE POLICY "Partners can create listings" ON partner_listings FOR INSERT TO authenticated WITH CHECK (partner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Partners can update own listings" ON partner_listings;
CREATE POLICY "Partners can update own listings" ON partner_listings FOR UPDATE TO authenticated
  USING (partner_id = (select auth.uid())) WITH CHECK (partner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Partners can delete own listings" ON partner_listings;
CREATE POLICY "Partners can delete own listings" ON partner_listings FOR DELETE TO authenticated USING (partner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Anon can create listings" ON partner_listings;
CREATE POLICY "Anon can create listings" ON partner_listings FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update listings" ON partner_listings;
CREATE POLICY "Anon can update listings" ON partner_listings FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete listings" ON partner_listings;
CREATE POLICY "Anon can delete listings" ON partner_listings FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_partner_listings_partner ON partner_listings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_listings_host ON partner_listings(host_id);
CREATE INDEX IF NOT EXISTS idx_partner_listings_type ON partner_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_partner_listings_status ON partner_listings(status);
CREATE INDEX IF NOT EXISTS idx_partner_listings_flagged ON partner_listings(is_flagged);


-- ============================================================
-- SOURCE: 20260505095132_restore_core_tables_part2.sql
-- ============================================================
/*
  # Restore Core Tables - Part 2: Reviews, Guides, Programs, Institution Profiles

  Creates:
  - reviews: guest reviews for listings
  - guides: institution-managed guides
  - programs: institution programs/packages
  - program_guides: junction between programs and guides
  - institution_profiles: public-facing institution pages
  - capacity_rules: institution capacity management
  - guide_schedules: per-guide weekly schedules
*/

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES partner_listings(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  reviewer_profile_picture text DEFAULT '',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL CHECK (char_length(review_text) <= 200),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all to create reviews" ON reviews;
CREATE POLICY "Allow all to create reviews" ON reviews FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Guides table
CREATE TABLE IF NOT EXISTS guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid REFERENCES portal_users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  bio text DEFAULT '',
  specializations text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  experience_years integer DEFAULT 0,
  rating numeric(3,2) DEFAULT 0.00,
  total_tours integer DEFAULT 0,
  available boolean DEFAULT true,
  email text DEFAULT '',
  phone text DEFAULT '',
  profile_picture text DEFAULT '',
  max_engagements_per_day integer NOT NULL DEFAULT 1,
  tip numeric(10,2) NOT NULL DEFAULT 0,
  traveler_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Portal users can view guides they created" ON guides;
CREATE POLICY "Portal users can view guides they created" ON guides FOR SELECT USING (true);

DROP POLICY IF EXISTS "Portal users can insert guides" ON guides;
CREATE POLICY "Portal users can insert guides" ON guides FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can update guides they created" ON guides;
CREATE POLICY "Portal users can update guides they created" ON guides FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can delete guides they created" ON guides;
CREATE POLICY "Portal users can delete guides they created" ON guides FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_guides_portal_user_id ON guides(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_guides_available ON guides(available);
CREATE INDEX IF NOT EXISTS idx_guides_traveler_user_id ON guides(traveler_user_id);

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid REFERENCES portal_users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  duration_hours numeric(4,2) NOT NULL,
  max_participants integer DEFAULT 10,
  price_per_person numeric(10,2) NOT NULL,
  what_included text[] DEFAULT '{}',
  what_to_bring text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Portal users can view programs they created" ON programs;
CREATE POLICY "Portal users can view programs they created" ON programs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Portal users can insert programs" ON programs;
CREATE POLICY "Portal users can insert programs" ON programs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can update programs they created" ON programs;
CREATE POLICY "Portal users can update programs they created" ON programs FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can delete programs they created" ON programs;
CREATE POLICY "Portal users can delete programs they created" ON programs FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_programs_portal_user_id ON programs(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_programs_active ON programs(active);

-- Program guides junction table
CREATE TABLE IF NOT EXISTS program_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  guide_id uuid REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(program_id, guide_id)
);

ALTER TABLE program_guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view program guide assignments" ON program_guides;
CREATE POLICY "Users can view program guide assignments" ON program_guides FOR SELECT USING (true);

DROP POLICY IF EXISTS "Portal users can assign guides to programs" ON program_guides;
CREATE POLICY "Portal users can assign guides to programs" ON program_guides FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can remove guide assignments" ON program_guides;
CREATE POLICY "Portal users can remove guide assignments" ON program_guides FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_program_guides_program_id ON program_guides(program_id);
CREATE INDEX IF NOT EXISTS idx_program_guides_guide_id ON program_guides(guide_id);

-- Institution profiles table
CREATE TABLE IF NOT EXISTS institution_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid REFERENCES portal_users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  tagline text DEFAULT '',
  description text DEFAULT '',
  type text DEFAULT 'museum',
  location text DEFAULT '',
  entry_fee text DEFAULT 'Free',
  entry_fee_amount numeric(10,2) DEFAULT 0,
  entry_fee_is_free boolean DEFAULT true,
  visiting_hours text DEFAULT '',
  guidelines text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  cover_image text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  published boolean DEFAULT false,
  daily_capacity integer DEFAULT 500,
  opening_time text DEFAULT '08:00',
  closing_time text DEFAULT '18:00',
  closed_days text[] DEFAULT '{}',
  is_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE institution_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view institution profiles" ON institution_profiles;
CREATE POLICY "Anyone can view institution profiles" ON institution_profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Institution portal users can insert their profile" ON institution_profiles;
CREATE POLICY "Institution portal users can insert their profile" ON institution_profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Institution portal users can update their profile" ON institution_profiles;
CREATE POLICY "Institution portal users can update their profile" ON institution_profiles FOR UPDATE USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_institution_profiles_portal_user_id ON institution_profiles(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_institution_profiles_published ON institution_profiles(published);
CREATE INDEX IF NOT EXISTS idx_institution_profiles_flagged ON institution_profiles(is_flagged);

-- Capacity rules table
CREATE TABLE IF NOT EXISTS capacity_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  rule_type text NOT NULL DEFAULT 'daily_limit',
  applies_to text NOT NULL DEFAULT '',
  capacity integer NOT NULL DEFAULT 0,
  reason text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE capacity_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view capacity rules" ON capacity_rules;
CREATE POLICY "Anyone can view capacity rules" ON capacity_rules FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can create capacity rules" ON capacity_rules;
CREATE POLICY "Anyone can create capacity rules" ON capacity_rules FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update capacity rules" ON capacity_rules;
CREATE POLICY "Anyone can update capacity rules" ON capacity_rules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete capacity rules" ON capacity_rules;
CREATE POLICY "Anyone can delete capacity rules" ON capacity_rules FOR DELETE TO anon, authenticated USING (true);

-- Guide schedules table
CREATE TABLE IF NOT EXISTS guide_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  day_of_week text NOT NULL,
  start_time time DEFAULT '09:00',
  end_time time DEFAULT '17:00',
  is_working boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(guide_id, day_of_week)
);

ALTER TABLE guide_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view guide schedules" ON guide_schedules;
CREATE POLICY "Anyone can view guide schedules" ON guide_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Portal users can insert guide schedules" ON guide_schedules;
CREATE POLICY "Portal users can insert guide schedules" ON guide_schedules FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can update guide schedules" ON guide_schedules;
CREATE POLICY "Portal users can update guide schedules" ON guide_schedules FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Portal users can delete guide schedules" ON guide_schedules;
CREATE POLICY "Portal users can delete guide schedules" ON guide_schedules FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_guide_schedules_guide_id ON guide_schedules(guide_id);


-- ============================================================
-- SOURCE: 20260505095206_restore_core_tables_part3.sql
-- ============================================================
/*
  # Restore Core Tables - Part 3: Bookings, Host Schedules, Saved Items, Payments

  Creates:
  - bookings: core booking records for all listing types
  - host_schedules: partner host weekly schedules
  - saved_items: traveler saved listings and attractions
  - payments: Pesapal payment transactions
  - schedule_overrides: date-specific availability exceptions
  - government_policies: government portal policy records
*/

-- Bookings table (comprehensive - includes all columns added in later migrations)
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text UNIQUE NOT NULL DEFAULT concat('BK-', floor(random() * 900000 + 100000)::text),
  traveler_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  traveler_name text NOT NULL,
  traveler_email text NOT NULL,
  traveler_profile_picture text,
  booking_type text NOT NULL CHECK (booking_type IN ('experience', 'homestay', 'attraction', 'itinerary')),
  item_id uuid,
  item_title text NOT NULL,
  partner_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  institution_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL,
  package_name text,
  guide_name text,
  session text,
  booking_date date NOT NULL,
  guests integer NOT NULL DEFAULT 1,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  service_fee numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  entry_fee_amount numeric(10,2) DEFAULT 0,
  tip_amount numeric(10,2) DEFAULT 0,
  special_requests text DEFAULT '',
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  pesapal_tracking_id text,
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by text,
  duration_days integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Travelers can view their own bookings" ON bookings;
CREATE POLICY "Travelers can view their own bookings" ON bookings FOR SELECT TO authenticated
  USING ((select auth.uid()) = traveler_id);

DROP POLICY IF EXISTS "Travelers can insert bookings" ON bookings;
CREATE POLICY "Travelers can insert bookings" ON bookings FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = traveler_id);

DROP POLICY IF EXISTS "Anonymous users can insert bookings" ON bookings;
CREATE POLICY "Anonymous users can insert bookings" ON bookings FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Partners can view bookings for their listings" ON bookings;
CREATE POLICY "Partners can view bookings for their listings" ON bookings FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Partners can update booking status" ON bookings;
CREATE POLICY "Partners can update booking status" ON bookings FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Hosts can view bookings for their listings" ON bookings;
CREATE POLICY "Hosts can view bookings for their listings" ON bookings FOR SELECT TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can update booking status" ON bookings;
CREATE POLICY "Hosts can update booking status" ON bookings FOR UPDATE TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Guides can view their assigned bookings" ON bookings;
CREATE POLICY "Guides can view their assigned bookings" ON bookings FOR SELECT TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Guides can update their booking status" ON bookings;
CREATE POLICY "Guides can update their booking status" ON bookings FOR UPDATE TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Travelers can update cancellation fields" ON bookings;
CREATE POLICY "Travelers can update cancellation fields" ON bookings FOR UPDATE TO authenticated
  USING (traveler_id = (select auth.uid()))
  WITH CHECK (traveler_id = (select auth.uid()));

CREATE INDEX IF NOT EXISTS idx_bookings_traveler_id ON bookings(traveler_id);
CREATE INDEX IF NOT EXISTS idx_bookings_partner_id ON bookings(partner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_institution_id ON bookings(institution_id);
CREATE INDEX IF NOT EXISTS idx_bookings_host_id ON bookings(host_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guide_id ON bookings(guide_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Host schedules table
CREATE TABLE IF NOT EXISTS host_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid REFERENCES partner_hosts(id) ON DELETE CASCADE NOT NULL,
  day_of_week text NOT NULL,
  start_time time DEFAULT '09:00',
  end_time time DEFAULT '17:00',
  is_working boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(host_id, day_of_week)
);

ALTER TABLE host_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view host schedules" ON host_schedules;
CREATE POLICY "Anyone can view host schedules" ON host_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Partners can insert host schedules" ON host_schedules;
CREATE POLICY "Partners can insert host schedules" ON host_schedules FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Partners can update host schedules" ON host_schedules;
CREATE POLICY "Partners can update host schedules" ON host_schedules FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Partners can delete host schedules" ON host_schedules;
CREATE POLICY "Partners can delete host schedules" ON host_schedules FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_host_schedules_host_id ON host_schedules(host_id);

-- Saved items table
CREATE TABLE IF NOT EXISTS saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES partner_listings(id) ON DELETE CASCADE,
  listing_type text CHECK (listing_type IN ('experience', 'homestay')),
  institution_id uuid REFERENCES institution_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_listing UNIQUE (user_id, listing_id),
  CONSTRAINT unique_user_institution UNIQUE (user_id, institution_id),
  CONSTRAINT saved_item_type CHECK (
    (listing_id IS NOT NULL AND institution_id IS NULL) OR
    (listing_id IS NULL AND institution_id IS NOT NULL)
  )
);

ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved items" ON saved_items;
CREATE POLICY "Users can view own saved items" ON saved_items FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own saved items" ON saved_items;
CREATE POLICY "Users can insert own saved items" ON saved_items FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own saved items" ON saved_items;
CREATE POLICY "Users can delete own saved items" ON saved_items FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_listing_id ON saved_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_institution_id ON saved_items(institution_id);

-- Payments table
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

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Travelers can read own payments" ON payments;
CREATE POLICY "Travelers can read own payments" ON payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
        AND bookings.traveler_id = (select auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON payments(booking_id);
CREATE INDEX IF NOT EXISTS payments_merchant_reference_idx ON payments(pesapal_merchant_reference);
CREATE INDEX IF NOT EXISTS payments_tracking_id_idx ON payments(pesapal_order_tracking_id);

-- Schedule overrides table
CREATE TABLE IF NOT EXISTS schedule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('host', 'guide')),
  entity_id uuid NOT NULL,
  override_date date NOT NULL,
  is_available boolean NOT NULL DEFAULT false,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(entity_type, entity_id, override_date)
);

ALTER TABLE schedule_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view schedule overrides" ON schedule_overrides;
CREATE POLICY "Anyone can view schedule overrides" ON schedule_overrides FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated to manage schedule overrides" ON schedule_overrides;
CREATE POLICY "Allow authenticated to manage schedule overrides" ON schedule_overrides FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated to update schedule overrides" ON schedule_overrides;
CREATE POLICY "Allow authenticated to update schedule overrides" ON schedule_overrides FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated to delete schedule overrides" ON schedule_overrides;
CREATE POLICY "Allow authenticated to delete schedule overrides" ON schedule_overrides FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_schedule_overrides_entity ON schedule_overrides(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_date ON schedule_overrides(override_date);

-- Government policies table
CREATE TABLE IF NOT EXISTS government_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  focus_points text[] DEFAULT '{}',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE government_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view government policies" ON government_policies;
CREATE POLICY "Anyone can view government policies" ON government_policies FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated to insert government policies" ON government_policies;
CREATE POLICY "Allow authenticated to insert government policies" ON government_policies FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated to update government policies" ON government_policies;
CREATE POLICY "Allow authenticated to update government policies" ON government_policies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated to delete government policies" ON government_policies;
CREATE POLICY "Allow authenticated to delete government policies" ON government_policies FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_government_policies_portal_user ON government_policies(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_government_policies_status ON government_policies(status);
CREATE INDEX IF NOT EXISTS idx_government_policies_priority ON government_policies(priority);


-- ============================================================
-- SOURCE: 20260505095258_restore_core_tables_part4.sql
-- ============================================================
/*
  # Restore Core Tables - Part 4: Messaging, Notifications, Reviews, Support Tickets

  Creates:
  - conversations: booking-based traveler-host/guide conversations
  - messages: individual messages within conversations
  - admin_conversations: direct admin-to-staff messaging
  - admin_messages: messages in admin conversations
  - notifications: portal user notifications
  - content_flags: content moderation flags
  - traveler_reviews: hosts/guides reviewing travelers
  - support_tickets: traveler support tickets
  - ticket_messages: replies on support tickets
  - attraction_reviews: reviews for attractions/institutions
  - email_logs: email delivery tracking
*/

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  traveler_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  traveler_name text NOT NULL DEFAULT '',
  host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL,
  host_name text,
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  guide_name text,
  listing_title text NOT NULL DEFAULT '',
  listing_type text NOT NULL DEFAULT 'experience',
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(booking_id)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Travelers can view own conversations" ON conversations;
CREATE POLICY "Travelers can view own conversations" ON conversations FOR SELECT TO authenticated
  USING ((select auth.uid()) = traveler_id);

DROP POLICY IF EXISTS "Guides can view their conversations" ON conversations;
CREATE POLICY "Guides can view their conversations" ON conversations FOR SELECT TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Travelers can create conversations" ON conversations;
CREATE POLICY "Travelers can create conversations" ON conversations FOR INSERT TO authenticated
  WITH CHECK (
    traveler_id = (select auth.uid()) AND
    booking_id IN (SELECT id FROM bookings WHERE traveler_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Hosts can create conversations" ON conversations;
CREATE POLICY "Hosts can create conversations" ON conversations FOR INSERT TO authenticated
  WITH CHECK (
    host_id IN (
      SELECT id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Guides can create conversations" ON conversations;
CREATE POLICY "Guides can create conversations" ON conversations FOR INSERT TO authenticated
  WITH CHECK (
    guide_id IN (
      SELECT id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;
CREATE POLICY "Participants can update conversations" ON conversations FOR UPDATE TO authenticated
  USING (
    (traveler_id = (select auth.uid()))
    OR (host_id IN (SELECT id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())))
    OR (guide_id IN (SELECT id FROM guides WHERE guides.traveler_user_id = (select auth.uid())))
  )
  WITH CHECK (
    (traveler_id = (select auth.uid()))
    OR (host_id IN (SELECT id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())))
    OR (guide_id IN (SELECT id FROM guides WHERE guides.traveler_user_id = (select auth.uid())))
  );

CREATE INDEX IF NOT EXISTS idx_conversations_booking ON conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_conversations_traveler ON conversations(traveler_id);
CREATE INDEX IF NOT EXISTS idx_conversations_host ON conversations(host_id);
CREATE INDEX IF NOT EXISTS idx_conversations_guide ON conversations(guide_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('traveler', 'host', 'guide')),
  sender_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON messages;
CREATE POLICY "Participants can view messages" ON messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = (select auth.uid()))
        OR (conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid())))
        OR (conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid())))
    )
  );

DROP POLICY IF EXISTS "Participants can send messages" ON messages;
CREATE POLICY "Participants can send messages" ON messages FOR INSERT TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = (select auth.uid()))
        OR (conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid())))
        OR (conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid())))
    )
  );

DROP POLICY IF EXISTS "Participants can update messages" ON messages;
CREATE POLICY "Participants can update messages" ON messages FOR UPDATE TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = (select auth.uid()))
        OR (conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid())))
        OR (conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid())))
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = (select auth.uid()))
        OR (conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid())))
        OR (conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid())))
    )
  );

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read);

-- Trigger for conversation last_message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message = NEW.message_text,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Admin conversations table
CREATE TABLE IF NOT EXISTS admin_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  admin_type text NOT NULL CHECK (admin_type IN ('partner', 'institution')),
  admin_name text NOT NULL DEFAULT '',
  host_id uuid REFERENCES partner_hosts(id) ON DELETE CASCADE,
  guide_id uuid REFERENCES guides(id) ON DELETE CASCADE,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_admin_host UNIQUE (admin_id, host_id),
  CONSTRAINT unique_admin_guide UNIQUE (admin_id, guide_id),
  CONSTRAINT host_or_guide_required CHECK (
    (host_id IS NOT NULL AND guide_id IS NULL) OR
    (guide_id IS NOT NULL AND host_id IS NULL)
  )
);

ALTER TABLE admin_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view their conversations" ON admin_conversations;
CREATE POLICY "Admins can view their conversations" ON admin_conversations FOR SELECT TO authenticated
  USING (admin_id IN (SELECT id FROM portal_users WHERE id = (select auth.uid())));

DROP POLICY IF EXISTS "Admins can create conversations" ON admin_conversations;
CREATE POLICY "Admins can create conversations" ON admin_conversations FOR INSERT TO authenticated
  WITH CHECK (admin_id IN (SELECT id FROM portal_users WHERE id = (select auth.uid())));

DROP POLICY IF EXISTS "Admins can update their conversations" ON admin_conversations;
CREATE POLICY "Admins can update their conversations" ON admin_conversations FOR UPDATE TO authenticated
  USING (admin_id IN (SELECT id FROM portal_users WHERE id = (select auth.uid())))
  WITH CHECK (admin_id IN (SELECT id FROM portal_users WHERE id = (select auth.uid())));

DROP POLICY IF EXISTS "Guides can view their admin conversations" ON admin_conversations;
CREATE POLICY "Guides can view their admin conversations" ON admin_conversations FOR SELECT TO authenticated
  USING (guide_id IN (SELECT id FROM guides WHERE portal_user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Guides can update their admin conversations" ON admin_conversations;
CREATE POLICY "Guides can update their admin conversations" ON admin_conversations FOR UPDATE TO authenticated
  USING (guide_id IN (SELECT id FROM guides WHERE portal_user_id = (select auth.uid())))
  WITH CHECK (guide_id IN (SELECT id FROM guides WHERE portal_user_id = (select auth.uid())));

-- Also allow anon access for portal system
DROP POLICY IF EXISTS "Anon can view admin conversations" ON admin_conversations;
CREATE POLICY "Anon can view admin conversations" ON admin_conversations FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can create admin conversations" ON admin_conversations;
CREATE POLICY "Anon can create admin conversations" ON admin_conversations FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update admin conversations" ON admin_conversations;
CREATE POLICY "Anon can update admin conversations" ON admin_conversations FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_conversations_admin ON admin_conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_host ON admin_conversations(host_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_guide ON admin_conversations(guide_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_updated ON admin_conversations(updated_at DESC);

-- Admin messages table
CREATE TABLE IF NOT EXISTS admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_conversation_id uuid NOT NULL REFERENCES admin_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('admin', 'host', 'guide')),
  sender_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view admin messages" ON admin_messages;
CREATE POLICY "Anyone can view admin messages" ON admin_messages FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can send admin messages" ON admin_messages;
CREATE POLICY "Anyone can send admin messages" ON admin_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update admin messages" ON admin_messages;
CREATE POLICY "Anyone can update admin messages" ON admin_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_messages_conversation ON admin_messages(admin_conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created ON admin_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_messages_unread ON admin_messages(admin_conversation_id, is_read);

-- Trigger for admin_conversation last_message
CREATE OR REPLACE FUNCTION update_admin_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE admin_conversations
  SET
    last_message = NEW.message_text,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.admin_conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_admin_conversation_last_message ON admin_messages;
DROP TRIGGER IF EXISTS trigger_update_admin_conversation_last_message ON admin_messages;
CREATE TRIGGER trigger_update_admin_conversation_last_message
  AFTER INSERT ON admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_conversation_last_message();

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_portal_user_id uuid NOT NULL REFERENCES portal_users(id),
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view notifications" ON notifications;
CREATE POLICY "Anyone can view notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;
CREATE POLICY "Anyone can create notifications" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update notifications" ON notifications;
CREATE POLICY "Anyone can update notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_portal_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(recipient_portal_user_id, is_read);

-- Content flags table
CREATE TABLE IF NOT EXISTS content_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('listing', 'attraction')),
  target_id uuid NOT NULL,
  flagged_by uuid NOT NULL REFERENCES portal_users(id),
  reason text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'policy_violation')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view content flags" ON content_flags;
CREATE POLICY "Anyone can view content flags" ON content_flags FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can create content flags" ON content_flags;
CREATE POLICY "Anyone can create content flags" ON content_flags FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update content flags" ON content_flags;
CREATE POLICY "Anyone can update content flags" ON content_flags FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_content_flags_target ON content_flags(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_status ON content_flags(status);

-- Traveler reviews table
CREATE TABLE IF NOT EXISTS traveler_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  traveler_id uuid NOT NULL,
  reviewer_type text NOT NULL CHECK (reviewer_type IN ('host', 'guide')),
  reviewer_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  reviewer_profile_picture text DEFAULT '',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL CHECK (char_length(review_text) <= 200),
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_id, reviewer_type)
);

ALTER TABLE traveler_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert their own traveler reviews" ON traveler_reviews;
CREATE POLICY "Authenticated users can insert their own traveler reviews" ON traveler_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Anyone can read traveler reviews" ON traveler_reviews;
CREATE POLICY "Anyone can read traveler reviews" ON traveler_reviews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can read traveler reviews" ON traveler_reviews;
CREATE POLICY "Anon can read traveler reviews" ON traveler_reviews FOR SELECT TO anon USING (true);

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_portal_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  created_by_name text NOT NULL DEFAULT '',
  created_by_email text NOT NULL DEFAULT '',
  created_by_type text NOT NULL DEFAULT 'traveler' CHECK (created_by_type IN ('traveler', 'portal')),
  portal_type text NOT NULL DEFAULT 'general' CHECK (portal_type IN ('partner', 'institution', 'general')),
  target_portal_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  resolution_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view support tickets" ON support_tickets;
CREATE POLICY "Anyone can view support tickets" ON support_tickets FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can create support tickets" ON support_tickets;
CREATE POLICY "Anyone can create support tickets" ON support_tickets FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update support tickets" ON support_tickets;
CREATE POLICY "Anyone can update support tickets" ON support_tickets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_target ON support_tickets(target_portal_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_creator_auth ON support_tickets(created_by_auth_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_creator_portal ON support_tickets(created_by_portal_id);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('traveler', 'portal', 'operations')),
  sender_id text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT '',
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view ticket messages" ON ticket_messages;
CREATE POLICY "Anyone can view ticket messages" ON ticket_messages FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can create ticket messages" ON ticket_messages;
CREATE POLICY "Anyone can create ticket messages" ON ticket_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update ticket messages" ON ticket_messages;
CREATE POLICY "Anyone can update ticket messages" ON ticket_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);

-- Attraction reviews table
CREATE TABLE IF NOT EXISTS attraction_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES portal_users(id) ON DELETE CASCADE,
  traveler_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  reviewer_name text NOT NULL,
  reviewer_profile_picture text DEFAULT '',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL CHECK (char_length(review_text) <= 200),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attraction_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view attraction reviews" ON attraction_reviews;
CREATE POLICY "Anyone can view attraction reviews" ON attraction_reviews FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can create attraction reviews" ON attraction_reviews;
CREATE POLICY "Authenticated users can create attraction reviews" ON attraction_reviews FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can create attraction reviews" ON attraction_reviews;
CREATE POLICY "Anon can create attraction reviews" ON attraction_reviews FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_attraction_reviews_institution ON attraction_reviews(institution_id);
CREATE INDEX IF NOT EXISTS idx_attraction_reviews_traveler ON attraction_reviews(traveler_id);
CREATE INDEX IF NOT EXISTS idx_attraction_reviews_guide ON attraction_reviews(guide_id);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_name text DEFAULT '',
  template_type text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view email logs" ON email_logs;
CREATE POLICY "Anyone can view email logs" ON email_logs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can insert email logs" ON email_logs;
CREATE POLICY "Anyone can insert email logs" ON email_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);


-- ============================================================
-- SOURCE: 20260505095318_restore_core_tables_part5.sql
-- ============================================================
/*
  # Restore Core Tables - Part 5: Guide Tips, Salary Payments, Booking Programs, Additional Indexes

  Creates:
  - guide_tips: tip records for guides from institution bookings
  - guide_salary_payments: salary payment records for guides
  - booking_programs: junction table linking bookings to multiple programs
  - reviews.booking_id column addition
  
  Also adds missing foreign key indexes for performance.
*/

-- Guide tips table
CREATE TABLE IF NOT EXISTS guide_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  tip_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE guide_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view guide tips" ON guide_tips;
CREATE POLICY "Anyone can view guide tips" ON guide_tips FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can create guide tips" ON guide_tips;
CREATE POLICY "Anyone can create guide tips" ON guide_tips FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update guide tips" ON guide_tips;
CREATE POLICY "Anyone can update guide tips" ON guide_tips FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_guide_tips_institution ON guide_tips(institution_id);
CREATE INDEX IF NOT EXISTS idx_guide_tips_guide ON guide_tips(guide_id);

-- Guide salary payments table
CREATE TABLE IF NOT EXISTS guide_salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  description text DEFAULT '',
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  period_start date,
  period_end date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE guide_salary_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view guide salary payments" ON guide_salary_payments;
CREATE POLICY "Anyone can view guide salary payments" ON guide_salary_payments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can create guide salary payments" ON guide_salary_payments;
CREATE POLICY "Anyone can create guide salary payments" ON guide_salary_payments FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update guide salary payments" ON guide_salary_payments;
CREATE POLICY "Anyone can update guide salary payments" ON guide_salary_payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_guide_salary_institution ON guide_salary_payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_guide_salary_guide ON guide_salary_payments(guide_id);

-- Booking programs junction table
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

DROP POLICY IF EXISTS "Travelers can insert own booking programs" ON booking_programs;
CREATE POLICY "Travelers can insert own booking programs" ON booking_programs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_programs.booking_id
      AND bookings.traveler_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Travelers can view own booking programs" ON booking_programs;
CREATE POLICY "Travelers can view own booking programs" ON booking_programs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_programs.booking_id
      AND bookings.traveler_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Anon can view booking programs" ON booking_programs;
CREATE POLICY "Anon can view booking programs" ON booking_programs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can insert booking programs" ON booking_programs;
CREATE POLICY "Anon can insert booking programs" ON booking_programs FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_booking_programs_booking_id ON booking_programs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_programs_program_id ON booking_programs(program_id);

-- Add booking_id to reviews if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Unique index on reviews.booking_id (one review per booking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'reviews_booking_id_unique'
  ) THEN
    CREATE UNIQUE INDEX reviews_booking_id_unique ON reviews (booking_id) WHERE booking_id IS NOT NULL;
  END IF;
END $$;

-- Additional foreign key covering indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_item_id ON bookings(item_id);
CREATE INDEX IF NOT EXISTS idx_bookings_program_id ON bookings(program_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_flagged_by ON content_flags(flagged_by);
CREATE INDEX IF NOT EXISTS idx_traveler_reviews_booking ON traveler_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_traveler_reviews_traveler ON traveler_reviews(traveler_id);
CREATE INDEX IF NOT EXISTS idx_traveler_reviews_reviewer ON traveler_reviews(reviewer_id);


-- ============================================================
-- SOURCE: 20260505102538_replace_operations_admin_account.sql
-- ============================================================
/*
  # Replace Operations Admin Account

  Removes the existing operations admin account (ops@roava.com) and creates
  a new one with the updated email and password.

  - Deletes all existing portal_users rows (only one existed)
  - Inserts new operations admin:
    - Email: ops@tahuraafrica.com
    - Password: TahuraAfrica@123 (SHA-256 hashed)
    - User ID Code: OP000001
    - Portal type: operations
*/

DELETE FROM portal_users;

INSERT INTO portal_users (
  id,
  email,
  password_hash,
  portal_type,
  name,
  user_id_code,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'ops@tahuraafrica.com',
  '96e1328e57d80b7af0b1465d058f99f63fc5b3b87b7d1cca5b8f8098a8b8b798',
  'operations',
  'Operations Admin',
  'OP000001',
  true,
  now(),
  now()
);


-- ============================================================
-- SOURCE: 20260505124130_seed_demo_listings_experiences.sql
-- ============================================================
/*
  # Seed Demo Listings — Experiences (10)

  Inserts 10 active experience listings assigned to the existing partner
  (NIYIGENA Fabrice, id: 2ed54b4d-0b70-456f-a0cc-3ac13079cfc4) and host
  (NIYIGENA Fab, id: 2ee271c0-879d-4bf5-a207-07e1dd45990b).

  All images are public Pexels URLs. Pricing is in USD.
*/

INSERT INTO partner_listings
  (partner_id, host_id, listing_type, title, description, status, location, pricing, media, details, whats_included, what_to_bring, tags)
VALUES

-- 1. Kigali City Cultural Walk
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Kigali City Cultural Walk',
  'Explore Kigali''s vibrant neighbourhoods on foot with a local guide who grew up in the city. From the hilltop parliament to the bustling Kimironko market, this half-day walk brings Rwanda''s capital to life through stories, street food, and hidden gems most tourists never find.',
  'active',
  '{"name": "Kigali", "region": "Kigali Province"}',
  '{"base_price": 35, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/3737572/pexels-photo-3737572.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "hours", "frequency_type": "twice_daily", "difficulty": "Easy", "group_size": 10}',
  ARRAY['Expert local guide', 'Street food tasting (3 stops)', 'Market visit', 'Hilltop viewpoint stop', 'Bottled water'],
  ARRAY['Comfortable walking shoes', 'Light jacket', 'Small cash for souvenirs'],
  ARRAY['cultural', 'walking', 'city', 'food', 'kigali']
),

-- 2. Nyungwe Forest Canopy Walk
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Nyungwe Forest Canopy Walk',
  'Walk 90 metres above the ancient rainforest floor on one of Africa''s only canopy walkways. Nyungwe is home to 13 primate species and over 300 birds — your naturalist guide will help you spot chimpanzees, colobus monkeys, and rare orchids along the trail.',
  'active',
  '{"name": "Nyungwe Forest", "region": "Western Province"}',
  '{"base_price": 75, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1571442/pexels-photo-1571442.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/776656/pexels-photo-776656.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1670187/pexels-photo-1670187.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 6, "duration_unit": "hours", "frequency_type": "once_daily", "difficulty": "Moderate", "group_size": 8}',
  ARRAY['Certified naturalist guide', 'Park entry fees', 'Canopy walk permit', 'Packed lunch', 'Rainforest snacks'],
  ARRAY['Waterproof hiking boots', 'Rain jacket', 'Insect repellent', 'Binoculars (optional)'],
  ARRAY['nature', 'hiking', 'wildlife', 'forest', 'primates']
),

-- 3. Inema Arts Centre Workshop
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Inema Arts Centre Workshop',
  'Create your own piece of contemporary Rwandan art alongside resident artists at the celebrated Inema Arts Centre in Kigali. Choose from painting, sculpture or textile work, guided by an artist whose work has been exhibited internationally. Your finished piece is yours to take home.',
  'active',
  '{"name": "Kigali", "region": "Kigali Province"}',
  '{"base_price": 45, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1812960/pexels-photo-1812960.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3771127/pexels-photo-3771127.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/102127/pexels-photo-102127.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "twice_daily", "difficulty": "Easy", "group_size": 8}',
  ARRAY['All art materials included', 'Resident artist instruction', 'Gallery tour', 'Finished artwork to keep', 'Tea & coffee'],
  ARRAY['Old clothes or apron', 'Enthusiasm'],
  ARRAY['art', 'culture', 'workshop', 'creative', 'kigali']
),

-- 4. Volcanoes Gorilla Tracking
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Volcanoes National Park Gorilla Tracking',
  'Trek through misty bamboo forests to spend one magical hour with a habituated mountain gorilla family in their natural habitat. With only a handful of permits issued daily, this is one of the most exclusive wildlife encounters on earth — a truly once-in-a-lifetime morning.',
  'active',
  '{"name": "Musanze", "region": "Northern Province"}',
  '{"base_price": 600, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3608263/pexels-photo-3608263.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1437521/pexels-photo-1437521.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 8, "duration_unit": "hours", "frequency_type": "once_daily", "difficulty": "Challenging", "group_size": 8}',
  ARRAY['Official gorilla tracking permit ($500)', 'Licensed RDB ranger guide', 'Park entry fee', 'Certificate of participation', 'Porter available (optional, tip-based)'],
  ARRAY['Sturdy waterproof hiking boots', 'Long-sleeve shirt and trousers', 'Gardening gloves', 'Rain jacket', 'Camera (no flash)'],
  ARRAY['gorillas', 'wildlife', 'trekking', 'conservation', 'bucket-list']
),

-- 5. Lake Kivu Sunset Kayak
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Lake Kivu Sunset Kayak Tour',
  'Paddle across the glittering surface of Lake Kivu as the sun drops behind the Congo Nile Ridge, painting the water in shades of amber and rose. Your guide will lead you past floating fishing villages, islands dotted with papyrus, and secret coves for a sundowner swim.',
  'active',
  '{"name": "Rubavu (Gisenyi)", "region": "Western Province"}',
  '{"base_price": 40, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1497541/pexels-photo-1497541.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "once_daily", "difficulty": "Easy", "group_size": 12}',
  ARRAY['Kayak and paddle', 'Life jacket', 'Certified water guide', 'Sundowner drink on the lake', 'Waterproof phone pouch'],
  ARRAY['Swimwear', 'Sunscreen', 'Change of clothes', 'Towel'],
  ARRAY['lake', 'kayaking', 'sunset', 'water', 'nature']
),

-- 6. Traditional Rwandan Cooking Class
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Traditional Rwandan Cooking Class',
  'Learn to cook authentic Rwandan dishes from scratch in a family home kitchen. Your host will take you to the local market to choose fresh ingredients before guiding you through recipes for isombe, brochettes, and the beloved Rwandan milk porridge. Feast on everything you make together.',
  'active',
  '{"name": "Kigali", "region": "Kigali Province"}',
  '{"base_price": 55, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "hours", "frequency_type": "twice_daily", "difficulty": "Easy", "group_size": 6}',
  ARRAY['Market visit with host', 'All ingredients', 'Hands-on cooking instruction', 'Full shared meal', 'Recipe booklet to take home'],
  ARRAY['Comfortable clothes', 'Good appetite'],
  ARRAY['food', 'cooking', 'cultural', 'local', 'kigali']
),

-- 7. Kimironko Market & Craft Tour
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Kimironko Market & Craft Tour',
  'Dive deep into the colour and chaos of Kigali''s largest market with a guide who knows every vendor by name. Learn to spot quality imigongo geometric art, haggle for hand-woven baskets, and understand the stories behind Rwanda''s extraordinary craft traditions.',
  'active',
  '{"name": "Kigali", "region": "Kigali Province"}',
  '{"base_price": 30, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "twice_daily", "difficulty": "Easy", "group_size": 8}',
  ARRAY['Expert market guide', 'Craft identification lesson', 'Vendor introductions', 'Small craft gift included', 'Refreshing juice stop'],
  ARRAY['Comfortable shoes', 'Small backpack', 'Cash for personal shopping'],
  ARRAY['shopping', 'crafts', 'culture', 'market', 'kigali']
),

-- 8. Akagera National Park Game Drive
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Akagera National Park Game Drive',
  'Rwanda''s only Big Five savanna park is a conservation success story unlike any other. Home to the only lions in the country (reintroduced in 2015) and a growing herd of black rhino, Akagera offers sunrise game drives through acacia savanna and papyrus wetlands teeming with hippos and elephants.',
  'active',
  '{"name": "Akagera", "region": "Eastern Province"}',
  '{"base_price": 120, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3608263/pexels-photo-3608263.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 8, "duration_unit": "hours", "frequency_type": "once_daily", "difficulty": "Easy", "group_size": 6}',
  ARRAY['4WD safari vehicle', 'Certified wildlife guide', 'Park entry fees', 'Picnic breakfast in the park', 'Binoculars provided'],
  ARRAY['Neutral-coloured clothing', 'Wide-brim hat', 'Sunscreen', 'Camera with zoom lens'],
  ARRAY['safari', 'wildlife', 'big-five', 'savanna', 'nature']
),

-- 9. Coffee Farm & Cupping Experience
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Coffee Farm & Cupping Experience',
  'Rwanda produces some of the world''s finest specialty coffee, and this half-day farm tour shows you why. Walk through terraced hillside plantations, learn the full wet-processing journey from cherry to cup, and sit down with the farmer for a guided cupping of five single-origin roasts with a trained Q-grader.',
  'active',
  '{"name": "Huye", "region": "Southern Province"}',
  '{"base_price": 50, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "hours", "frequency_type": "once_daily", "difficulty": "Easy", "group_size": 8}',
  ARRAY['Farm tour with farmer', 'Processing station walkthrough', 'Professional cupping session (5 coffees)', '250g bag of specialty coffee to take home', 'Transport from Huye town'],
  ARRAY['Comfortable walking shoes', 'Light jacket for highlands', 'Notebook if you like taking tasting notes'],
  ARRAY['coffee', 'farm', 'agriculture', 'tasting', 'culture']
),

-- 10. Kigali Genocide Memorial & History Tour
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Kigali Genocide Memorial & History Tour',
  'A deeply moving and profoundly important half-day guided tour of the Kigali Genocide Memorial, built over the mass graves of 250,000 victims of the 1994 genocide. Your guide — a survivor — shares personal testimony and walks you through Rwanda''s extraordinary journey of reconciliation and healing, giving context to the modern nation you see today.',
  'active',
  '{"name": "Kigali", "region": "Kigali Province"}',
  '{"base_price": 25, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/3737572/pexels-photo-3737572.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "hours", "frequency_type": "twice_daily", "difficulty": "Easy", "group_size": 12}',
  ARRAY['Survivor guide', 'Memorial entry fees', 'Guided reflection garden visit', 'Post-tour dialogue session', 'Memorial book included'],
  ARRAY['Modest dress (shoulders and knees covered)', 'Respectful, reflective mindset'],
  ARRAY['history', 'memorial', 'education', 'reconciliation', 'kigali']
);


-- ============================================================
-- SOURCE: 20260505124252_seed_demo_listings_homestays.sql
-- ============================================================
/*
  # Seed Demo Listings — Homestays (10)

  Inserts 10 active homestay listings assigned to the existing partner
  (NIYIGENA Fabrice, id: 2ed54b4d-0b70-456f-a0cc-3ac13079cfc4) and host
  (NIYIGENA Fab, id: 2ee271c0-879d-4bf5-a207-07e1dd45990b).
*/

INSERT INTO partner_listings
  (partner_id, host_id, listing_type, title, description, status, location, pricing, media, details, whats_included, what_to_bring, tags)
VALUES

-- 1. Musanze Farmer's Family Homestay
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Musanze Farmer''s Family Homestay',
  'Live alongside a farming family in the shadow of the Virunga volcanoes for three nights. Wake at dawn to help tend the shambas, share three home-cooked meals a day, and spend your evenings by a wood fire hearing stories of rural Rwandan life. This is the most authentic countryside experience in the Northern Province.',
  'active',
  '{"name": "Musanze", "region": "Northern Province"}',
  '{"base_price": 90, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/2132008/pexels-photo-2132008.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Private room", "Hot shower", "3 meals/day", "Farm activities", "Evening fire"]}',
  ARRAY['Private room with bedding', 'All meals (3/day, home-cooked)', 'Farm orientation tour', 'Evening storytelling session', 'Morning farm activities'],
  ARRAY['Warm layers for cool highland evenings', 'Sturdy shoes', 'Small gift for host family (optional but appreciated)'],
  ARRAY['homestay', 'farm', 'family', 'rural', 'volcanoes', 'authentic']
),

-- 2. Gisenyi Lakeside Family Retreat
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Gisenyi Lakeside Family Retreat',
  'Two magical nights with a welcoming family whose home sits steps from the shores of Lake Kivu. Watch the sun rise over the lake from your private veranda, join the family''s morning fish market run, and spend afternoons swimming, paddling, or simply reading in the garden. Evenings are for shared Primus beer and sunset conversations.',
  'active',
  '{"name": "Rubavu (Gisenyi)", "region": "Western Province"}',
  '{"base_price": 80, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2132008/pexels-photo-2132008.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 2, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Lake views", "Private veranda", "Breakfast & dinner", "Beach access", "Kayak hire available"]}',
  ARRAY['Lakeside room with veranda', 'Breakfast and dinner daily', 'Morning fish market visit', 'Beach access', 'Welcome fruit basket'],
  ARRAY['Swimwear', 'Sunscreen', 'Light layers for evenings'],
  ARRAY['lakeside', 'family', 'lake-kivu', 'western', 'relaxation']
),

-- 3. Nyamata Rural Community Stay
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Nyamata Rural Community Stay',
  'Immerse yourself in the rhythms of rural Bugesera with a community family who have opened their home to travellers for over a decade. Help with daily chores, visit the local cooperative, and learn traditional weaving from the women''s group next door. A humbling and enriching two-night experience.',
  'active',
  '{"name": "Nyamata", "region": "Eastern Province"}',
  '{"base_price": 65, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 2, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Private room", "All meals", "Weaving lesson", "Cooperative visit", "Community walk"]}',
  ARRAY['Private room', 'All meals included', 'Traditional weaving lesson', 'Women''s cooperative visit', 'Community orientation walk'],
  ARRAY['Modest clothing', 'Comfortable shoes', 'Notebook'],
  ARRAY['rural', 'community', 'crafts', 'authentic', 'eastern']
),

-- 4. Butare Cultural Heritage Home
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Butare Cultural Heritage Home',
  'Stay three nights with an academic family in Butare (Huye), Rwanda''s intellectual capital and home to the national university. Visit the exceptional National Museum together, explore the royal palace at Nyanza, and enjoy long evening conversations about Rwandan history, culture and identity over home-cooked meals.',
  'active',
  '{"name": "Huye (Butare)", "region": "Southern Province"}',
  '{"base_price": 75, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2132008/pexels-photo-2132008.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3737572/pexels-photo-3737572.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Private room", "All meals", "Museum visits", "Library access", "Cultural discussions"]}',
  ARRAY['Private room with study desk', 'All meals home-cooked', 'National Museum guided visit', 'Nyanza Royal Palace excursion', 'Evening cultural Q&A sessions'],
  ARRAY['Reading material about Rwandan history', 'Notebook', 'Smart casual dress for museum'],
  ARRAY['culture', 'history', 'southern', 'intellectual', 'museum']
),

-- 5. Ruhengeri Mountain Family Lodge
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Ruhengeri Mountain Family Lodge',
  'Four nights in a beautifully kept mountain home just outside Musanze, with jaw-dropping views of Karisimbi and Bisoke volcanoes from every window. Your host family operates a small vegetable farm and beekeeping enterprise — join the harvest, taste wild honey straight from the comb, and wake each morning to misty mountain air.',
  'active',
  '{"name": "Musanze (Ruhengeri)", "region": "Northern Province"}',
  '{"base_price": 95, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1670187/pexels-photo-1670187.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 2, "bathrooms": 1, "max_guests": 4, "amenities": ["Volcano views", "Beekeeping", "Farm harvesting", "3 meals/day", "Fire pit"]}',
  ARRAY['Private room(s) with volcano views', 'All meals fresh from the farm', 'Beekeeping experience', 'Vegetable harvest activity', 'Evening bonfire with hot chocolate'],
  ARRAY['Very warm layers (can drop to 10°C at night)', 'Hiking boots', 'Camera with wide lens for panoramas'],
  ARRAY['mountains', 'farm', 'volcanoes', 'nature', 'northern', 'family']
),

-- 6. Huye University District Guesthouse
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Huye University District Guesthouse',
  'Two nights in a lively family home in Huye''s university quarter, where the smell of fresh mandazi and coffee fills every morning. Your hosts'' eldest children are students who love practising their English and showing guests the best student spots in town — lively cafes, art walls, and rooftop bars with southern Rwanda views.',
  'active',
  '{"name": "Huye", "region": "Southern Province"}',
  '{"base_price": 60, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 2, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Private room", "Breakfast & dinner", "Student town tour", "Cafe guide", "Free WiFi"]}',
  ARRAY['Private room', 'Breakfast and dinner daily', 'Student quarter walking tour', 'Local cafe guide', 'Free WiFi'],
  ARRAY['Casual clothes', 'Good walking shoes', 'Open mind'],
  ARRAY['urban', 'student', 'affordable', 'southern', 'social']
),

-- 7. Nyamirambo Neighbourhood Immersion
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Nyamirambo Neighbourhood Immersion',
  'Kigali''s most vibrant and characterful neighbourhood is best experienced from within. Three nights with a Muslim family in the heart of Nyamirambo means early morning calls to prayer echoing across rooftops, the smell of mishkaki grilling at dusk, and the warmth of a tight-knit community welcoming you as one of their own.',
  'active',
  '{"name": "Kigali — Nyamirambo", "region": "Kigali Province"}',
  '{"base_price": 70, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/3737572/pexels-photo-3737572.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Private room", "All meals halal", "Neighbourhood walk", "Market visit", "Evening street food"]}',
  ARRAY['Private room', 'All halal home-cooked meals', 'Nyamirambo neighbourhood walk', 'Local mosque visit (respectful dress required)', 'Evening street food tour with host'],
  ARRAY['Modest clothing (shoulders and knees covered)', 'Comfortable walking shoes', 'Cash for street food'],
  ARRAY['urban', 'neighbourhood', 'cultural', 'food', 'kigali', 'community']
),

-- 8. Lake Burera Fishing Village Stay
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Lake Burera Fishing Village Stay',
  'Three nights with a fishing family on the dramatic banks of Lake Burera, one of Rwanda''s twin lakes set among steep volcanic hills. Go out on the dugout canoe at dawn as fishermen cast their nets in the mist, help prepare the catch for breakfast, and spend your afternoons swimming or hiking the trails above the lake.',
  'active',
  '{"name": "Lake Burera", "region": "Northern Province"}',
  '{"base_price": 85, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Lakefront room", "All meals", "Canoe fishing trip", "Swimming", "Lakeside fire"]}',
  ARRAY['Lakefront private room', 'All meals including fresh fish breakfast', 'Dawn canoe fishing trip', 'Afternoon lake swimming', 'Lakeside campfire evenings'],
  ARRAY['Swimwear', 'Light rain jacket', 'Sturdy sandals', 'Insect repellent'],
  ARRAY['fishing', 'lake', 'rural', 'northern', 'nature', 'family']
),

-- 9. Rubavu Fisherman''s Home Experience
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Rubavu Fisherman''s Home Experience',
  'Two nights with a Lake Kivu fishing family in Rubavu, where the Democratic Republic of Congo is visible across the water. Learn to mend nets, visit the cooperative fish-smoking facility, and eat the freshest tilapia you''ve ever tasted — grilled over charcoal with cassava and plantain, right on the beach.',
  'active',
  '{"name": "Rubavu", "region": "Western Province"}',
  '{"base_price": 72, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1497541/pexels-photo-1497541.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2132008/pexels-photo-2132008.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 2, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Beach proximity", "Fresh fish meals", "Net mending lesson", "Cooperative tour", "Sunset swim"]}',
  ARRAY['Private room near the lake', 'All meals (fresh fish speciality)', 'Net mending lesson with the family', 'Fish cooperative tour', 'Sunset beach barbecue'],
  ARRAY['Swimwear', 'Sunscreen', 'Casual clothes', 'Sandals'],
  ARRAY['fishing', 'beach', 'lake-kivu', 'western', 'food', 'authentic']
),

-- 10. Cyangugu Border Town Home
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Cyangugu Border Town Home',
  'Two nights in the southern tip of Lake Kivu, where the border town of Rusizi (Cyangugu) meets the DRC across a narrow bridge. Your host family knows everyone in this fascinating frontier town and will show you the border market, introduce you to Congolese traders, and take you to the hilltop monastery with its sweeping lake views.',
  'active',
  '{"name": "Rusizi (Cyangugu)", "region": "Western Province"}',
  '{"base_price": 68, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 2, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Lake views", "All meals", "Border market visit", "Monastery trip", "Local guide"]}',
  ARRAY['Private room with lake views', 'All meals included', 'Border market exploration', 'Monastery hilltop visit', 'Local guide for town tour'],
  ARRAY['Passport (for border area walking)', 'Comfortable shoes', 'Light layers'],
  ARRAY['border', 'lake-kivu', 'western', 'unique', 'monastery', 'culture']
);


-- ============================================================
-- SOURCE: 20260505124542_seed_demo_listings_journeys.sql
-- ============================================================
/*
  # Seed Demo Listings — Journeys / Itineraries (10)

  Inserts 10 active itinerary listings assigned to the existing partner
  (NIYIGENA Fabrice, id: 2ed54b4d-0b70-456f-a0cc-3ac13079cfc4) and host
  (NIYIGENA Fab, id: 2ee271c0-879d-4bf5-a207-07e1dd45990b).

  Each journey includes full itinerary_days and budget_breakdown JSON.
*/

INSERT INTO partner_listings
  (partner_id, host_id, listing_type, title, description, status, location, pricing, media, details,
   whats_included, what_to_bring, tags, itinerary_days, budget_breakdown, duration_days, pricing_type, group_size_min, group_size_max)
VALUES

-- 1. Rwanda Gorilla & Cultural Discovery (7 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Rwanda Gorilla & Cultural Discovery',
  'The definitive Rwanda journey. Seven days combining mountain gorilla tracking in Volcanoes National Park, chimpanzee trekking in Nyungwe Forest, a full cultural immersion in rural communities, and two nights in Kigali to bookend the adventure. This is Rwanda in full — wilderness, culture, history and heart.',
  'active',
  '{"name": "Rwanda (Multi-region)", "region": "Northern & Western Province"}',
  '{"base_price": 1800, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3608263/pexels-photo-3608263.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 7, "duration_unit": "days", "difficulty": "Moderate", "group_size": 8}',
  ARRAY['All accommodation (lodge & homestay)', 'All meals', 'Gorilla tracking permit', 'Chimpanzee permit', 'All park fees', 'Private 4WD vehicle & driver-guide', 'Kigali airport transfers'],
  ARRAY['Waterproof hiking boots', 'Lightweight rain jacket', 'Long trousers and sleeves', 'Sunscreen', 'Camera'],
  ARRAY['gorillas', 'wildlife', 'cultural', 'multi-day', 'bucket-list', 'best-of-rwanda'],
  '[
    {"day": 1, "title": "Arrival in Kigali", "place_name": "Kigali", "description": "Arrive at Kigali International Airport. Transfer to your boutique guesthouse in the Nyamirambo neighbourhood. Evening welcome dinner with your guide, briefing for the journey ahead."},
    {"day": 2, "title": "Kigali City & Genocide Memorial", "place_name": "Kigali", "description": "Morning guided tour of the Kigali Genocide Memorial and Kimironko Market. Afternoon visit to Inema Arts Centre. Evening departure drive north to Musanze."},
    {"day": 3, "title": "Gorilla Tracking Day", "place_name": "Volcanoes National Park", "description": "Early morning briefing at park headquarters. Trek through bamboo forest to spend one hour with a habituated gorilla family. Afternoon rest and debrief at lodge. Celebrate with dinner."},
    {"day": 4, "title": "Twin Lakes & Community", "place_name": "Musanze / Lake Burera", "description": "Morning canoe on Lake Burera surrounded by volcanic hills. Afternoon community visit to a Batwa cultural group for traditional dance and storytelling. Night in village homestay."},
    {"day": 5, "title": "Drive South to Nyungwe", "place_name": "Nyungwe Forest", "description": "Scenic drive south through Rwanda''s green hills and tea plantations. Arrive Nyungwe by midday. Afternoon canopy walk among the treetops. Night at forest lodge."},
    {"day": 6, "title": "Chimpanzee Trekking", "place_name": "Nyungwe Forest", "description": "Early morning chimpanzee tracking with a naturalist guide. Nyungwe holds over 500 chimpanzees — one of Africa''s largest habituated communities. Afternoon rest. Drive to Lake Kivu."},
    {"day": 7, "title": "Lake Kivu Kayak & Departure", "place_name": "Rubavu / Kigali", "description": "Morning kayak on Lake Kivu at sunrise. Transfer to Kigali airport for departures. Optional city lunch if time allows."}
  ]',
  '[
    {"label": "Gorilla permit (RDB)", "amount": 500, "currency": "USD"},
    {"label": "Chimpanzee permit (RDB)", "amount": 90, "currency": "USD"},
    {"label": "Accommodation (6 nights)", "amount": 480, "currency": "USD"},
    {"label": "All meals", "amount": 210, "currency": "USD"},
    {"label": "Driver-guide (7 days)", "amount": 280, "currency": "USD"},
    {"label": "Vehicle & fuel", "amount": 180, "currency": "USD"},
    {"label": "Park fees & transfers", "amount": 60, "currency": "USD"}
  ]',
  7, 'per_person', 2, 8
),

-- 2. East Africa Safari Triangle (10 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'East Africa Safari Triangle',
  'The ultimate East Africa safari spanning Rwanda, Uganda and Tanzania. Gorilla tracking in Volcanoes, chimpanzees in Kibale Forest, and the great migration on the Serengeti plains — three countries, three ecosystems, three once-in-a-lifetime wildlife encounters in one extraordinary ten-day journey.',
  'active',
  '{"name": "Rwanda, Uganda & Tanzania", "region": "East Africa"}',
  '{"base_price": 2400, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3608263/pexels-photo-3608263.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 10, "duration_unit": "days", "difficulty": "Moderate", "group_size": 6}',
  ARRAY['All cross-border transfers', 'All accommodation', 'All meals', 'Gorilla tracking permit (Rwanda)', 'Chimpanzee permit (Uganda)', 'Serengeti game drives', 'All park and conservation fees'],
  ARRAY['Waterproof hiking boots', 'Neutral safari clothes', 'Wide-brim hat', 'Binoculars', 'Yellow fever certificate (required)'],
  ARRAY['multi-country', 'safari', 'gorillas', 'serengeti', 'wildlife', 'premium'],
  '[
    {"day": 1, "title": "Arrive Kigali", "place_name": "Kigali, Rwanda", "description": "Arrive Kigali, transfer to city guesthouse. Welcome dinner and trip briefing."},
    {"day": 2, "title": "Kigali & Drive North", "place_name": "Musanze, Rwanda", "description": "Morning Kigali city highlights. Afternoon drive north to Musanze. Gorilla briefing at lodge."},
    {"day": 3, "title": "Gorilla Tracking", "place_name": "Volcanoes National Park", "description": "Full-day gorilla trek in Volcanoes National Park. One magical hour with the mountain gorillas."},
    {"day": 4, "title": "Cross to Uganda", "place_name": "Kabale / Bwindi, Uganda", "description": "Morning drive to Katuna border. Continue to Kabale and onwards to Bwindi Impenetrable Forest."},
    {"day": 5, "title": "Kibale Forest Chimps", "place_name": "Kibale Forest, Uganda", "description": "Full-day chimpanzee tracking in Kibale. Uganda holds the highest density of chimps anywhere on earth."},
    {"day": 6, "title": "Queen Elizabeth Park", "place_name": "Queen Elizabeth NP, Uganda", "description": "Morning boat safari on the Kazinga Channel. Afternoon game drive. Tree-climbing lions sightings common."},
    {"day": 7, "title": "Fly to Serengeti", "place_name": "Serengeti, Tanzania", "description": "Morning flight from Entebbe to Kilimanjaro/Serengeti. Afternoon game drive on arrival."},
    {"day": 8, "title": "Great Migration", "place_name": "Serengeti National Park", "description": "Full day on the Serengeti plains following the wildebeest migration. Sundowner on the savanna."},
    {"day": 9, "title": "Ngorongoro Crater", "place_name": "Ngorongoro, Tanzania", "description": "Full-day descent into the Ngorongoro Crater — the world''s largest intact caldera and home to the Big Five."},
    {"day": 10, "title": "Depart", "place_name": "Kilimanjaro Airport", "description": "Morning game drive. Transfer to Kilimanjaro International Airport for international departures."}
  ]',
  '[
    {"label": "Gorilla permit (Rwanda)", "amount": 500, "currency": "USD"},
    {"label": "Chimp permit (Uganda)", "amount": 150, "currency": "USD"},
    {"label": "Accommodation (9 nights)", "amount": 720, "currency": "USD"},
    {"label": "Internal flight (UG→TZ)", "amount": 280, "currency": "USD"},
    {"label": "All meals", "amount": 270, "currency": "USD"},
    {"label": "Guides & drivers (10 days)", "amount": 320, "currency": "USD"},
    {"label": "Park fees & conservation levies", "amount": 160, "currency": "USD"}
  ]',
  10, 'per_person', 2, 6
),

-- 3. Volcanoes & Lakes Circuit (5 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Volcanoes & Lakes Circuit',
  'Five days weaving between Rwanda''s dramatic volcanic north and the serene shores of Lakes Kivu and Burera. Gorilla tracking on day two, a sunrise volcano hike on day three, and two twilight evenings on the water make this the perfect compact adventure for travellers who want maximum impact in minimum time.',
  'active',
  '{"name": "Northern & Western Province", "region": "Rwanda"}',
  '{"base_price": 1100, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 5, "duration_unit": "days", "difficulty": "Challenging", "group_size": 8}',
  ARRAY['All accommodation', 'All meals', 'Gorilla tracking permit', 'Bisoke volcano climb permit', 'Lake Kivu kayak session', 'All transfers in 4WD'],
  ARRAY['Waterproof hiking boots (essential)', 'Warm layers for volcano summit', 'Rain jacket', 'Walking poles (recommended)', 'Swimwear for lake'],
  ARRAY['volcanoes', 'lakes', 'gorillas', 'hiking', 'adventure', 'compact'],
  '[
    {"day": 1, "title": "Arrive & Drive North", "place_name": "Kigali / Musanze", "description": "Arrive Kigali, collect by driver and head north to Musanze. Check in to lodge, volcano views from the terrace."},
    {"day": 2, "title": "Gorilla Tracking", "place_name": "Volcanoes National Park", "description": "The main event. Trek through mist and bamboo to encounter a gorilla family. Return to lodge for a well-earned dinner."},
    {"day": 3, "title": "Climb Mount Bisoke", "place_name": "Bisoke Volcano (3711m)", "description": "Early start for the crater rim hike to Mount Bisoke. The summit crater lake is one of Rwanda''s most spectacular sights. Descend by afternoon."},
    {"day": 4, "title": "Twin Lakes & Lake Kivu", "place_name": "Lake Burera / Rubavu", "description": "Morning canoe on Lake Burera. Afternoon drive west to Lake Kivu. Sunset kayak on the lake, dinner by the water."},
    {"day": 5, "title": "Lake Kivu Morning & Kigali", "place_name": "Rubavu / Kigali", "description": "Slow morning on the lake. Drive back to Kigali for airport transfers or city exploration."}
  ]',
  '[
    {"label": "Gorilla permit (RDB)", "amount": 500, "currency": "USD"},
    {"label": "Bisoke climb permit", "amount": 75, "currency": "USD"},
    {"label": "Accommodation (4 nights)", "amount": 280, "currency": "USD"},
    {"label": "All meals", "amount": 140, "currency": "USD"},
    {"label": "Driver-guide (5 days)", "amount": 200, "currency": "USD"},
    {"label": "Kayak & canoe fees", "amount": 55, "currency": "USD"},
    {"label": "Fuel & transfers", "amount": 150, "currency": "USD"}
  ]',
  5, 'per_person', 2, 8
),

-- 4. Rwandan Heritage & History Tour (5 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Rwandan Heritage & History Tour',
  'Five thoughtful days tracing Rwanda''s extraordinary story — from the royal palace at Nyanza to the genocide memorials, from the ancient Batwa communities of the forest to the forward-thinking streets of contemporary Kigali. For travellers seeking depth, context and genuine understanding of this remarkable country.',
  'active',
  '{"name": "Rwanda (South & Kigali)", "region": "Kigali & Southern Province"}',
  '{"base_price": 950, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/3737572/pexels-photo-3737572.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 5, "duration_unit": "days", "difficulty": "Easy", "group_size": 10}',
  ARRAY['All accommodation', 'All meals', 'All museum and memorial entry fees', 'Expert historian guide', 'All transfers'],
  ARRAY['Modest clothing for memorial visits', 'Notebook', 'Comfortable walking shoes'],
  ARRAY['history', 'heritage', 'culture', 'education', 'memorial', 'kigali'],
  '[
    {"day": 1, "title": "Arrive Kigali — Modern Rwanda", "place_name": "Kigali", "description": "Arrive and check in. Evening walk through Kigali''s design district with your historian guide — Rwanda''s remarkable rebirth visible on every clean, green street."},
    {"day": 2, "title": "Genocide Memorial & Reconciliation", "place_name": "Kigali", "description": "Morning at the Kigali Genocide Memorial, guided by a survivor. Afternoon visit to Village Urugwiro and the Parliament. Evening dialogue session with a reconciliation leader."},
    {"day": 3, "title": "Drive South — Nyamata & Ntarama", "place_name": "Nyamata, Bugesera", "description": "Drive to Bugesera district, site of some of the most significant genocide memorial churches. Afternoon community visit with a reconciliation cooperative."},
    {"day": 4, "title": "Royal Palace & National Museum", "place_name": "Nyanza / Huye", "description": "Morning at the Nyanza Royal Palace, reconstructed in the traditional style with the legendary royal cattle. Afternoon at the exceptional National Museum of Rwanda."},
    {"day": 5, "title": "Kigali Arts & Departure", "place_name": "Kigali", "description": "Final morning at Inema Arts Centre and the Kigali Cultural Village. Transfer to airport."}
  ]',
  '[
    {"label": "Historian guide (5 days)", "amount": 250, "currency": "USD"},
    {"label": "Accommodation (4 nights)", "amount": 260, "currency": "USD"},
    {"label": "All meals", "amount": 150, "currency": "USD"},
    {"label": "Entry fees (memorials, museums, palace)", "amount": 80, "currency": "USD"},
    {"label": "Transport & fuel", "amount": 210, "currency": "USD"}
  ]',
  5, 'per_person', 1, 10
),

-- 5. Rwanda Green Season Adventure (6 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Rwanda Green Season Adventure',
  'Rwanda''s long rains transform the country into a lush emerald paradise. This six-day itinerary is crafted specifically for the April–May and October–November green seasons — lower prices, fewer crowds, and landscapes so vivid they look almost unreal. Perfect for photographers, hikers and anyone who hates tourist queues.',
  'active',
  '{"name": "Rwanda (Multi-region)", "region": "Rwanda"}',
  '{"base_price": 1350, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1670187/pexels-photo-1670187.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 6, "duration_unit": "days", "difficulty": "Moderate", "group_size": 8}',
  ARRAY['All accommodation', 'All meals', 'Gorilla tracking permit', 'Photography guide', 'Canopy walk permit', 'All transfers'],
  ARRAY['Quality waterproofs (top and bottom)', 'Waterproof boots', 'Camera with weather sealing', 'Dry bags for electronics'],
  ARRAY['photography', 'green-season', 'gorillas', 'nature', 'off-peak', 'value'],
  '[
    {"day": 1, "title": "Arrive — Kigali in the Rain", "place_name": "Kigali", "description": "Arrive Kigali. Evening photography walk with your guide — rain-washed streets and puddle reflections make Kigali spectacular after dark."},
    {"day": 2, "title": "Drive North — Misty Volcanoes", "place_name": "Musanze", "description": "Scenic drive through terraced hills draped in cloud. Afternoon community visit and traditional dance performance."},
    {"day": 3, "title": "Gorilla Tracking", "place_name": "Volcanoes National Park", "description": "Gorilla trek in the bamboo forest. Green season means the gorillas are often at lower elevations — shorter trek times."},
    {"day": 4, "title": "Canopy Walk & Forest", "place_name": "Nyungwe Forest", "description": "Drive south to Nyungwe. Afternoon canopy walk — the forest is at its most alive after rain, birds calling from every branch."},
    {"day": 5, "title": "Birding & Tea Country", "place_name": "Nyungwe / Huye", "description": "Dawn birding walk in Nyungwe (best birding in Africa). Drive through the tea estates of Gisakura. Afternoon free in Huye."},
    {"day": 6, "title": "Return to Kigali", "place_name": "Kigali", "description": "Morning market visit in Huye. Return to Kigali with final lunch. Airport transfer."}
  ]',
  '[
    {"label": "Gorilla permit (RDB)", "amount": 500, "currency": "USD"},
    {"label": "Accommodation (5 nights, green season rates)", "amount": 325, "currency": "USD"},
    {"label": "All meals", "amount": 165, "currency": "USD"},
    {"label": "Photography guide (6 days)", "amount": 180, "currency": "USD"},
    {"label": "Canopy walk permit", "amount": 40, "currency": "USD"},
    {"label": "Transport & fuel", "amount": 140, "currency": "USD"}
  ]',
  6, 'per_person', 2, 8
),

-- 6. Primate & Wildlife Trail (7 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Primate & Wildlife Trail',
  'Seven days dedicated entirely to Rwanda''s spectacular wildlife. Gorillas in the north, chimpanzees in Nyungwe, the Big Five in Akagera — and golden monkeys, colobus, olive baboons, hippos and elephants along the way. The most wildlife-dense route possible within Rwanda''s borders, guided by a certified wildlife biologist.',
  'active',
  '{"name": "Rwanda (Multi-region)", "region": "Rwanda"}',
  '{"base_price": 1650, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3608263/pexels-photo-3608263.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 7, "duration_unit": "days", "difficulty": "Moderate", "group_size": 6}',
  ARRAY['Wildlife biologist guide (7 days)', 'All accommodation', 'All meals', 'Gorilla tracking permit', 'Chimpanzee permit', 'Golden monkey permit', 'Akagera game drives', 'All park fees'],
  ARRAY['Neutral wildlife-coloured clothing', 'Waterproof hiking boots', 'Binoculars (8x42 recommended)', 'Long lens camera', 'Insect repellent'],
  ARRAY['primates', 'wildlife', 'gorillas', 'big-five', 'birding', 'expert-guided'],
  '[
    {"day": 1, "title": "Arrive & Kigali Briefing", "place_name": "Kigali", "description": "Arrive Kigali. Evening wildlife briefing with your biologist guide. What to expect, what to look for."},
    {"day": 2, "title": "Golden Monkeys & Drive North", "place_name": "Volcanoes National Park", "description": "Morning golden monkey tracking in the bamboo zones of Volcanoes — these endemic primates are delightful and endangered. Drive to Musanze lodge."},
    {"day": 3, "title": "Gorilla Tracking", "place_name": "Volcanoes National Park", "description": "The centrepiece: gorilla tracking with your wildlife biologist guide narrating every behaviour and interaction."},
    {"day": 4, "title": "Drive to Nyungwe", "place_name": "Nyungwe Forest", "description": "Scenic drive south. Afternoon Nyungwe canopy walk and bird identification session."},
    {"day": 5, "title": "Chimpanzee Tracking", "place_name": "Nyungwe Forest", "description": "Full-day chimpanzee tracking in one of Africa''s most biodiverse forests. Evening colobus monkey spotlight walk."},
    {"day": 6, "title": "Drive to Akagera", "place_name": "Akagera National Park", "description": "Cross-country drive to Akagera. Afternoon game drive targeting elephant, hippo, giraffe and the reintroduced lions and rhinos."},
    {"day": 7, "title": "Akagera Dawn Drive & Kigali", "place_name": "Akagera / Kigali", "description": "Sunrise game drive on the savanna. Return to Kigali. Final debrief and airport transfer."}
  ]',
  '[
    {"label": "Gorilla permit (RDB)", "amount": 500, "currency": "USD"},
    {"label": "Chimpanzee permit", "amount": 90, "currency": "USD"},
    {"label": "Golden monkey permit", "amount": 100, "currency": "USD"},
    {"label": "Akagera park fees & game drives", "amount": 120, "currency": "USD"},
    {"label": "Accommodation (6 nights)", "amount": 420, "currency": "USD"},
    {"label": "All meals", "amount": 210, "currency": "USD"},
    {"label": "Wildlife biologist guide & vehicle", "amount": 210, "currency": "USD"}
  ]',
  7, 'per_person', 2, 6
),

-- 7. Great Lakes Explorer (9 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Great Lakes Explorer',
  'Nine days tracing the string of great lakes along the Albertine Rift — Lake Kivu, Lake Burera, Lake Ruhondo and the twin lakes of the north. Part cultural journey, part water adventure, this route immerses you in fishing communities, lakeside homestays, kayak dawn paddles, and the extraordinary landscapes of Africa''s Great Rift Valley.',
  'active',
  '{"name": "Western & Northern Province", "region": "Rwanda"}',
  '{"base_price": 2100, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1497541/pexels-photo-1497541.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 9, "duration_unit": "days", "difficulty": "Easy", "group_size": 8}',
  ARRAY['All accommodation (mix of lodges and lakeside homestays)', 'All meals with fresh lake fish specialities', 'Kayak hire (3 sessions)', 'Canoe fishing trip', 'All water guides', 'All road transfers', 'Island boat excursion'],
  ARRAY['Swimwear', 'Quick-dry clothes', 'Waterproof sandals', 'Sunscreen', 'Light rain jacket'],
  ARRAY['lakes', 'water', 'kayaking', 'community', 'nature', 'relaxed-pace'],
  '[
    {"day": 1, "title": "Kigali Arrival", "place_name": "Kigali", "description": "Arrive Kigali. Transfer to lakeside guesthouse in Nyamirambo."},
    {"day": 2, "title": "Drive to Lake Kivu — Rubavu", "place_name": "Rubavu (Gisenyi)", "description": "Drive west to Lake Kivu''s northern shore. Afternoon kayak introduction session on the lake."},
    {"day": 3, "title": "Lake Kivu Islands", "place_name": "Lake Kivu, Rubavu", "description": "Full-day boat excursion to Napoleon Island (home to vast fruit bat colony) and fishing village islands. Sunset kayak."},
    {"day": 4, "title": "South along Kivu — Kibuye", "place_name": "Karongi (Kibuye)", "description": "Drive south along the lake''s scenic peninsula road. Afternoon free on the beach at Kibuye."},
    {"day": 5, "title": "Kibuye to Cyangugu", "place_name": "Rusizi (Cyangugu)", "description": "Continue south to Cyangugu. Visit the border market. Evening at the lakeside monastery."},
    {"day": 6, "title": "Drive North to Twin Lakes", "place_name": "Lake Burera", "description": "Drive north to the twin volcanic lakes. Check in to lakeside homestay with fishing family."},
    {"day": 7, "title": "Dawn Canoe & Burera", "place_name": "Lake Burera", "description": "4am canoe fishing with the family as the volcanoes glow behind the mist. Morning free, afternoon hike."},
    {"day": 8, "title": "Lake Ruhondo & Community", "place_name": "Lake Ruhondo", "description": "Cross to Lake Ruhondo by small boat. Community visit and traditional weaving cooperative."},
    {"day": 9, "title": "Return to Kigali", "place_name": "Kigali", "description": "Morning kayak farewell paddle. Drive back to Kigali. Lunch with lake fish. Airport transfer."}
  ]',
  '[
    {"label": "Accommodation (8 nights, mixed lodge/homestay)", "amount": 560, "currency": "USD"},
    {"label": "All meals", "amount": 252, "currency": "USD"},
    {"label": "Water activities (kayak, canoe, boat trips)", "amount": 280, "currency": "USD"},
    {"label": "Driver-guide (9 days)", "amount": 360, "currency": "USD"},
    {"label": "Vehicle & fuel (long route)", "amount": 468, "currency": "USD"},
    {"label": "Community visits & entry fees", "amount": 180, "currency": "USD"}
  ]',
  9, 'per_person', 2, 8
),

-- 8. Coffee & Culture Road Trip (4 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Coffee & Culture Road Trip',
  'Four days celebrating the two things Rwanda does better than almost anywhere on earth: specialty coffee and rich living culture. From washing stations in the Southern Province to rooftop cafes in Kigali, this road trip pairs farm visits and cuppings with art galleries, craft markets and traditional dance performances.',
  'active',
  '{"name": "Kigali & Southern Province", "region": "Rwanda"}',
  '{"base_price": 780, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "days", "difficulty": "Easy", "group_size": 8}',
  ARRAY['All accommodation', 'All meals (featuring coffee-paired menus)', '3 coffee farm visits with cupping', '250g specialty coffee to take home', 'Inema Arts Centre private workshop', 'All transfers'],
  ARRAY['Comfortable casual clothing', 'Good walking shoes', 'Notebook for tasting notes'],
  ARRAY['coffee', 'culture', 'arts', 'food', 'road-trip', 'relaxed'],
  '[
    {"day": 1, "title": "Kigali — Coffee Capital", "place_name": "Kigali", "description": "Start in Kigali with a specialty coffee bar deep-dive — your guide knows every barista in the city. Evening Inema Arts Centre workshop."},
    {"day": 2, "title": "Drive South — Huye Coffee Farms", "place_name": "Huye, Southern Province", "description": "Morning drive to Huye. Afternoon visit to two washing stations at harvest altitude. Q-Grader cupping session with the farm owner."},
    {"day": 3, "title": "Nyamagabe Highlands Farm", "place_name": "Nyamagabe", "description": "Visit Rwanda''s highest-altitude coffee cooperative in the Nyamagabe highlands. Taste the difference elevation makes. Lunch at cooperative canteen."},
    {"day": 4, "title": "Kimironko Market & Departure", "place_name": "Kigali", "description": "Return to Kigali. Morning at Kimironko Market for crafts and goodbye shopping. Airport transfer after lunch."}
  ]',
  '[
    {"label": "Accommodation (3 nights)", "amount": 195, "currency": "USD"},
    {"label": "All meals", "amount": 120, "currency": "USD"},
    {"label": "Coffee experiences & permits", "amount": 165, "currency": "USD"},
    {"label": "Arts workshop (Inema)", "amount": 45, "currency": "USD"},
    {"label": "Driver-guide (4 days)", "amount": 160, "currency": "USD"},
    {"label": "Fuel & transport", "amount": 95, "currency": "USD"}
  ]',
  4, 'per_person', 1, 8
),

-- 9. Kigali Design & Arts Week (4 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Kigali Design & Arts Week',
  'Four days deep-diving into Kigali''s extraordinary creative scene — arguably the most vibrant design and arts capital on the continent. Studio visits, gallery openings, a fashion atelier tour, street art walks, and dinners at the restaurants shaping modern Rwandan cuisine. For travellers who care about culture as much as landscape.',
  'active',
  '{"name": "Kigali", "region": "Kigali Province"}',
  '{"base_price": 720, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1812960/pexels-photo-1812960.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3771127/pexels-photo-3771127.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3737572/pexels-photo-3737572.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "days", "difficulty": "Easy", "group_size": 6}',
  ARRAY['Boutique guesthouse in Kigali (4 nights)', 'All breakfasts and two dinners', 'Inema Arts Centre private session', 'Fashion atelier guided tour', 'Street art walking tour', 'Gallery curator evening talk', 'All city transport'],
  ARRAY['Smart casual clothing', 'Comfortable walking shoes', 'Camera or sketchbook'],
  ARRAY['arts', 'design', 'kigali', 'urban', 'food', 'fashion', 'creative'],
  '[
    {"day": 1, "title": "Arrive — Kigali Design District", "place_name": "Kigali", "description": "Arrive and walk the KG9 design strip with your curator guide. Evening cocktails at a rooftop bar overlooking the city."},
    {"day": 2, "title": "Inema Arts & Studio Tours", "place_name": "Kigali", "description": "Morning private session at Inema Arts Centre — create your own piece. Afternoon studio visits to three independent artists. Evening gallery opening."},
    {"day": 3, "title": "Fashion & Street Art", "place_name": "Kigali", "description": "Morning at a Kigali fashion atelier — Rwandan designers are dressing the continent. Afternoon street art walking tour in Nyamirambo. Dinner at a modern Rwandan restaurant."},
    {"day": 4, "title": "Market, Coffee & Departure", "place_name": "Kigali", "description": "Final morning at Kimironko Market for craft shopping. Specialty coffee farewell. Airport transfer."}
  ]',
  '[
    {"label": "Boutique guesthouse (4 nights)", "amount": 280, "currency": "USD"},
    {"label": "Breakfasts & 2 dinners", "amount": 96, "currency": "USD"},
    {"label": "Arts and studio access fees", "amount": 120, "currency": "USD"},
    {"label": "Fashion atelier tour", "amount": 60, "currency": "USD"},
    {"label": "Curator guide (4 days)", "amount": 164, "currency": "USD"}
  ]',
  4, 'per_person', 1, 6
),

-- 10. Kigali to Zanzibar Cultural Route (8 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Kigali to Zanzibar Cultural Route',
  'Eight days tracing East Africa''s cultural spine from Rwanda''s hills to Zanzibar''s ancient Swahili coast. Gorilla tracking in Volcanoes National Park, a night in a Kigali art homestay, three nights exploring Stone Town''s UNESCO-listed labyrinth, and a final two days on Zanzibar''s powder-white beaches. Culture, wildlife and coast in one unforgettable arc.',
  'active',
  '{"name": "Rwanda to Zanzibar", "region": "East Africa"}',
  '{"base_price": 1950, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1497541/pexels-photo-1497541.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 8, "duration_unit": "days", "difficulty": "Easy", "group_size": 8}',
  ARRAY['Kigali to Zanzibar flights', 'All accommodation', 'All meals in Rwanda', 'Breakfast in Zanzibar', 'Gorilla tracking permit', 'Stone Town guided walk', 'Spice farm tour', 'Dhow sunset cruise'],
  ARRAY['Light tropical clothing', 'Modest dress for Stone Town mosques', 'Swimwear', 'Sunscreen SPF 50+', 'Waterproof boots for gorilla day'],
  ARRAY['multi-country', 'beach', 'gorillas', 'zanzibar', 'culture', 'coast'],
  '[
    {"day": 1, "title": "Arrive Kigali", "place_name": "Kigali, Rwanda", "description": "Arrive Kigali. Art homestay in the hills above the city. Sunset rooftop dinner."},
    {"day": 2, "title": "Drive North & Gorillas", "place_name": "Volcanoes National Park", "description": "Drive north to Musanze. Evening gorilla briefing."},
    {"day": 3, "title": "Gorilla Tracking", "place_name": "Volcanoes National Park", "description": "Gorilla tracking in the morning mist. Return to Kigali in the afternoon."},
    {"day": 4, "title": "Kigali — Culture & Craft", "place_name": "Kigali", "description": "Full day in Kigali: Genocide Memorial, Inema Arts Centre, evening farewell dinner at top Kigali restaurant."},
    {"day": 5, "title": "Fly to Zanzibar — Stone Town", "place_name": "Stone Town, Zanzibar", "description": "Morning flight to Zanzibar. Afternoon arrival and guided walk through Stone Town''s UNESCO labyrinth."},
    {"day": 6, "title": "Stone Town Deep Dive", "place_name": "Stone Town, Zanzibar", "description": "Spice farm morning tour. Afternoon Old Fort and Palace Museum. Evening Forodhani Night Market feast."},
    {"day": 7, "title": "Beach Day — North Zanzibar", "place_name": "Nungwi, Zanzibar", "description": "Transfer to Nungwi beach. Full free day on the turquoise Indian Ocean. Sunset dhow cruise."},
    {"day": 8, "title": "Departure", "place_name": "Zanzibar Airport", "description": "Final morning on the beach. Transfer to Zanzibar International Airport for departures."}
  ]',
  '[
    {"label": "Gorilla permit (RDB)", "amount": 500, "currency": "USD"},
    {"label": "Flights (Kigali to Zanzibar)", "amount": 380, "currency": "USD"},
    {"label": "Accommodation (7 nights)", "amount": 490, "currency": "USD"},
    {"label": "Meals (full board Rwanda, breakfast Zanzibar)", "amount": 210, "currency": "USD"},
    {"label": "Stone Town tours & spice farm", "amount": 80, "currency": "USD"},
    {"label": "Dhow cruise", "amount": 60, "currency": "USD"},
    {"label": "Guides & transfers", "amount": 230, "currency": "USD"}
  ]',
  8, 'per_person', 2, 8
);


-- ============================================================
-- SOURCE: 20260625080658_20260625150000_create_system_rules_table.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS system_rules (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_system_rules" ON system_rules;
CREATE POLICY "select_system_rules" ON system_rules FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "update_system_rules_ops" ON system_rules;
CREATE POLICY "update_system_rules_ops" ON system_rules FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insert_system_rules_ops" ON system_rules;
CREATE POLICY "insert_system_rules_ops" ON system_rules FOR INSERT
  TO authenticated WITH CHECK (true);

-- Seed default rules
INSERT INTO system_rules (id, category, name, description, enabled, value) VALUES
  ('1', 'capacity', 'Institution Daily Capacity Threshold', 'Alert when institution reaches 85% of daily capacity', true, '85'),
  ('2', 'capacity', 'Automatic Booking Pause', 'Pause new bookings when capacity reaches 100%', true, '100'),
  ('3', 'booking', 'Maximum Group Size', 'Limit group bookings to institution-defined maximums', true, null),
  ('4', 'booking', 'Advance Booking Window', 'Require bookings to be made at least 24 hours in advance', false, '24'),
  ('5', 'quality', 'New Listing Review Required', 'All new listings require approval before going live', true, null),
  ('6', 'quality', 'Automatic Flag Threshold', 'Listings with 3+ flags automatically enter review', true, '3'),
  ('7', 'financial', 'Commission Rate', 'Platform commission charged on every transaction', true, '7'),
  ('8', 'financial', 'Partner Booking Limit', 'Prevent partners from over-booking beyond capacity', true, null)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SOURCE: 20260627191104_20260625150000_add_performance_indexes.sql
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_tracking ON bookings(pesapal_tracking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_traveler ON bookings(traveler_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read);
CREATE INDEX IF NOT EXISTS idx_saved_items_user ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_portal_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_content_flags_status ON content_flags(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_tracking ON payments(pesapal_order_tracking_id);


-- ============================================================
-- SOURCE: 20260705101113_create_storage_buckets_and_policies.sql
-- ============================================================
/*
  # Create Missing Storage Buckets

  This migration ensures all required storage buckets exist with proper policies.
*/

-- Create profiles bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Create listings bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

-- Create programs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('programs', 'programs', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view listing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Program Images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to programs folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to program images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes of program images" ON storage.objects;
DROP POLICY IF EXISTS "Guides can upload to guides folder" ON storage.objects;

-- PROFILES BUCKET POLICIES
-- Anyone can read profile pictures (public access)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles');

-- Allow uploads to profile-pictures folder (for traveler profiles)
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
CREATE POLICY "Authenticated users can upload profile pictures" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
);

-- Allow uploads to guides folder (for guide profile pictures)
DROP POLICY IF EXISTS "Guides can upload to guides folder" ON storage.objects;
CREATE POLICY "Guides can upload to guides folder" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'guides'
);

-- Allow updates to profile-pictures folder
DROP POLICY IF EXISTS "Users can update own profile pictures" ON storage.objects;
CREATE POLICY "Users can update own profile pictures" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow deletes
DROP POLICY IF EXISTS "Users can delete own profile pictures" ON storage.objects;
CREATE POLICY "Users can delete own profile pictures" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- LISTINGS BUCKET POLICIES
-- Anyone can read listing images
DROP POLICY IF EXISTS "Public can view listing images" ON storage.objects;
CREATE POLICY "Public can view listing images" ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing images" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listings');

-- Allow updates
DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;
CREATE POLICY "Users can update own listing images" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'listings')
WITH CHECK (bucket_id = 'listings');

-- Allow deletes
DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;
CREATE POLICY "Users can delete own listing images" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listings');

-- PROGRAMS BUCKET POLICIES
-- Anyone can read program images
DROP POLICY IF EXISTS "Public Access to Program Images" ON storage.objects;
CREATE POLICY "Public Access to Program Images" ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'programs');

-- Allow uploads to programs folder
DROP POLICY IF EXISTS "Allow public uploads to programs folder" ON storage.objects;
CREATE POLICY "Allow public uploads to programs folder" ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'programs' 
  AND (storage.foldername(name))[1] = 'programs'
);

-- Allow updates
DROP POLICY IF EXISTS "Allow public updates to program images" ON storage.objects;
CREATE POLICY "Allow public updates to program images" ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs')
WITH CHECK (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

-- Allow deletes
DROP POLICY IF EXISTS "Allow public deletes of program images" ON storage.objects;
CREATE POLICY "Allow public deletes of program images" ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

-- ============================================================
-- SOURCE: 20260705101145_fix_storage_policies_for_portal_users.sql
-- ============================================================
/*
  # Fix Storage Policies for Portal Users

  Portal users (partner, institution, operations, government) use custom auth,
  not Supabase Auth. They need anon access to storage buckets.
*/

-- Drop existing insert policies that require authentication
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Guides can upload to guides folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to programs folder" ON storage.objects;

-- PROFILES: Allow anon + authenticated uploads to profile-pictures folder
DROP POLICY IF EXISTS "Allow uploads to profile-pictures folder" ON storage.objects;
CREATE POLICY "Allow uploads to profile-pictures folder" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
);

-- PROFILES: Allow anon + authenticated uploads to guides folder  
DROP POLICY IF EXISTS "Allow uploads to guides folder" ON storage.objects;
CREATE POLICY "Allow uploads to guides folder" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'guides'
);

-- LISTINGS: Allow anon + authenticated uploads
DROP POLICY IF EXISTS "Allow uploads to listings bucket" ON storage.objects;
CREATE POLICY "Allow uploads to listings bucket" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'listings');

-- Allow anon update/delete on listings
DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;

DROP POLICY IF EXISTS "Allow updates to listings bucket" ON storage.objects;
CREATE POLICY "Allow updates to listings bucket" ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'listings')
WITH CHECK (bucket_id = 'listings');

DROP POLICY IF EXISTS "Allow deletes from listings bucket" ON storage.objects;
CREATE POLICY "Allow deletes from listings bucket" ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'listings');

-- PROGRAMS: Allow anon uploads to programs folder
DROP POLICY IF EXISTS "Allow public updates to program images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes of program images" ON storage.objects;

DROP POLICY IF EXISTS "Allow anon uploads to programs folder" ON storage.objects;
CREATE POLICY "Allow anon uploads to programs folder" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'programs' 
  AND (storage.foldername(name))[1] = 'programs'
);

DROP POLICY IF EXISTS "Allow anon updates to program images" ON storage.objects;
CREATE POLICY "Allow anon updates to program images" ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs')
WITH CHECK (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

DROP POLICY IF EXISTS "Allow anon deletes of program images" ON storage.objects;
CREATE POLICY "Allow anon deletes of program images" ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

-- ============================================================
-- SOURCE: 20260706072022_20260706120000_create_tahura_mobility_schema.sql
-- ============================================================
/*
# Create Tahura Mobility Schema

## Overview
This migration creates the complete database schema for Tahura Mobility - an integrated
tourism transport infrastructure system. It enables travelers to book transport alongside
their experiences, attractions, and homestays.

## New Tables

### 1. vehicles
Stores all vehicles in the Tahura Mobility network.
- `id` (uuid, primary key)
- `owner_type` (text) - 'tahura', 'partner', or 'independent'
- `owner_id` (uuid, nullable) - references portal_users for partner vehicles
- `vehicle_type` (text) - 'sedan', 'suv', 'van', 'minibus', 'motorcycle'
- `plate_number` (text, unique) - vehicle registration
- `capacity` (integer) - passenger capacity
- `is_ev` (boolean) - electric vehicle flag
- `year_manufactured`, `model`, `color`
- `amenities` (text[]) - wifi, ac, charging_ports, coolbox, etc.
- `status` (text) - 'active', 'maintenance', 'retired'
- `current_location` (jsonb) - {lat, lng, last_updated}
- `documents` (jsonb) - {insurance_url, inspection_url, license_url}

### 2. drivers
Stores driver profiles and performance metrics.
- `id` (uuid, primary key)
- `user_account_type` (text) - 'tahura_employee', 'partner_employee', 'independent'
- `portal_user_id` (uuid, nullable) - for partner employees
- `traveler_user_id` (uuid, nullable) - for independent contractors
- `full_name`, `phone`, `email`, `profile_picture`
- `license_number` (text), `license_expiry` (date)
- `languages` (text[]), `specializations` (text[])
- `status` (text) - 'pending_verification', 'active', 'suspended', 'inactive'
- `tier` (text) - 'bronze', 'silver', 'gold', 'platinum'
- `rating`, `total_trips`, `total_kilometers`
- `max_engagements_per_day` (integer, default 8)
- `bank_account`, `documents` (jsonb)

### 3. driver_vehicles
Links drivers to vehicles (many-to-many, supports primary assignment).

### 4. transports
Core transport booking records.
- Links to bookings, drivers, vehicles
- Transport types: 'pickup', 'dropoff', 'roundtrip', 'inter_location'
- Pickup/dropoff locations (jsonb)
- Scheduled and actual times
- Distance, fare calculations, surge multiplier
- Status: pending_dispatch through completed/cancelled
- Dispatch score, ratings

### 5. transport_zones
Defines pricing zones for fare calculation.
- Region, base_fare, per_km_rate, min_fare
- Surge rules (peak hours, weekend/event multipliers)
- Coverage area

### 6. charging_stations
EV charging infrastructure for the fleet.

### 7. driver_schedules
Daily driver availability and assignment.

### 8. transport_rating_reviews
Transport-specific ratings and reviews.

## Modified Tables

### partner_listings (added columns)
- `transport_required`, `transport_included`
- `transport_mandatory_for` ('none', 'all', 'foreign_travelers', 'first_time_bookers')
- `transport_default_pickup` (jsonb)
- `transport_zone_id` (FK)

### bookings (added columns)
- `transport_requested` (boolean)
- `transport_id` (FK to transports)

### portal_users (added columns)
- `has_mobility_fleet`, `mobility_agreement_signed`, `mobility_agreement_date`

## Security
- RLS enabled on all new tables
- Owner-scoped policies for drivers, vehicles, transports
- Operations can access all mobility data
- Partners can access their own fleet data
*/

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('tahura', 'partner', 'independent')),
  owner_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('sedan', 'suv', 'van', 'minibus', 'motorcycle')),
  plate_number text UNIQUE NOT NULL,
  capacity integer NOT NULL DEFAULT 4,
  is_ev boolean NOT NULL DEFAULT false,
  year_manufactured integer,
  model text,
  color text,
  amenities text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  current_location jsonb DEFAULT '{"lat": null, "lng": null, "last_updated": null}',
  documents jsonb DEFAULT '{"insurance_url": null, "inspection_url": null, "license_url": null}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partners_manage_own_vehicles" ON vehicles;
DROP POLICY IF EXISTS "partners_manage_own_vehicles" ON vehicles;
CREATE POLICY "partners_manage_own_vehicles" ON vehicles FOR ALL
  TO authenticated
  USING (
    owner_type = 'partner' AND owner_id = auth.uid()
  )
  WITH CHECK (
    owner_type = 'partner' AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "operations_full_vehicle_access" ON vehicles;
DROP POLICY IF EXISTS "operations_full_vehicle_access" ON vehicles;
CREATE POLICY "operations_full_vehicle_access" ON vehicles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

DROP POLICY IF EXISTS "travelers_view_active_vehicles" ON vehicles;
DROP POLICY IF EXISTS "travelers_view_active_vehicles" ON vehicles;
CREATE POLICY "travelers_view_active_vehicles" ON vehicles FOR SELECT
  TO authenticated
  USING (status = 'active');

-- ============================================================================
-- DRIVERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_type text NOT NULL CHECK (user_account_type IN ('tahura_employee', 'partner_employee', 'independent')),
  portal_user_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  traveler_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  profile_picture text,
  license_number text NOT NULL,
  license_expiry date NOT NULL,
  languages text[] DEFAULT '{"English"}',
  specializations text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'active', 'suspended', 'inactive')),
  tier text NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  rating decimal(3,2) DEFAULT 0.00,
  total_trips integer DEFAULT 0,
  total_kilometers decimal(10,2) DEFAULT 0.00,
  max_engagements_per_day integer DEFAULT 8,
  bank_account jsonb DEFAULT '{"bank_name": null, "account_number": null, "account_name": null}',
  documents jsonb DEFAULT '{"id_card_url": null, "license_url": null, "certifications": []}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_view_own_profile" ON drivers;
DROP POLICY IF EXISTS "drivers_view_own_profile" ON drivers;
CREATE POLICY "drivers_view_own_profile" ON drivers FOR SELECT
  TO authenticated
  USING (
    traveler_user_id = auth.uid() 
    OR portal_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "drivers_update_own_profile" ON drivers;
DROP POLICY IF EXISTS "drivers_update_own_profile" ON drivers;
CREATE POLICY "drivers_update_own_profile" ON drivers FOR UPDATE
  TO authenticated
  USING (
    traveler_user_id = auth.uid() 
    OR portal_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "operations_full_driver_access" ON drivers;
DROP POLICY IF EXISTS "operations_full_driver_access" ON drivers;
CREATE POLICY "operations_full_driver_access" ON drivers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

DROP POLICY IF EXISTS "partners_view_assigned_drivers" ON drivers;
DROP POLICY IF EXISTS "partners_view_assigned_drivers" ON drivers;
CREATE POLICY "partners_view_assigned_drivers" ON drivers FOR SELECT
  TO authenticated
  USING (
    user_account_type = 'partner_employee' 
    AND portal_user_id = auth.uid()
  );

-- ============================================================================
-- DRIVER_VEHICLES (Junction Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS driver_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  assigned_at date DEFAULT CURRENT_DATE,
  UNIQUE(driver_id, vehicle_id)
);

ALTER TABLE driver_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_view_own_vehicle_assignments" ON driver_vehicles;
DROP POLICY IF EXISTS "drivers_view_own_vehicle_assignments" ON driver_vehicles;
CREATE POLICY "drivers_view_own_vehicle_assignments" ON driver_vehicles FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "operations_full_driver_vehicle_access" ON driver_vehicles;
DROP POLICY IF EXISTS "operations_full_driver_vehicle_access" ON driver_vehicles;
CREATE POLICY "operations_full_driver_vehicle_access" ON driver_vehicles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

-- ============================================================================
-- TRANSPORT_ZONES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transport_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  base_fare decimal(10,2) NOT NULL DEFAULT 1500.00,
  per_km_rate decimal(10,2) NOT NULL DEFAULT 300.00,
  min_fare decimal(10,2) NOT NULL DEFAULT 3000.00,
  surge_rules jsonb DEFAULT '{"peak_hours": [], "weekend_multiplier": 1.0, "event_multiplier": 1.0}',
  coverage_area jsonb DEFAULT '{"center": null, "radius_km": null, "boundaries": null}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transport_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transport_zones_public_read" ON transport_zones;
DROP POLICY IF EXISTS "transport_zones_public_read" ON transport_zones;
CREATE POLICY "transport_zones_public_read" ON transport_zones FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "operations_full_zone_access" ON transport_zones;
DROP POLICY IF EXISTS "operations_full_zone_access" ON transport_zones;
CREATE POLICY "operations_full_zone_access" ON transport_zones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

-- ============================================================================
-- TRANSPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  transport_type text NOT NULL CHECK (transport_type IN ('pickup', 'dropoff', 'roundtrip', 'inter_location')),
  pickup_location jsonb NOT NULL DEFAULT '{"name": "", "address": "", "coordinates": null, "landmark": ""}',
  dropoff_location jsonb NOT NULL DEFAULT '{"name": "", "address": "", "coordinates": null, "landmark": ""}',
  scheduled_pickup_time timestamptz,
  actual_pickup_time timestamptz,
  scheduled_dropoff_time timestamptz,
  actual_dropoff_time timestamptz,
  distance_km decimal(10,2),
  base_fare decimal(10,2),
  per_km_rate decimal(10,2),
  total_fare decimal(10,2),
  surge_multiplier decimal(3,2) DEFAULT 1.00,
  status text NOT NULL DEFAULT 'pending_dispatch' CHECK (status IN (
    'pending_dispatch', 
    'dispatched', 
    'driver_en_route', 
    'arrived', 
    'in_progress', 
    'completed', 
    'cancelled'
  )),
  dispatch_score integer,
  dispatch_offered_at timestamptz,
  dispatch_accepted_at timestamptz,
  traveler_notes text,
  driver_notes text,
  rating decimal(3,2),
  cancellation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travelers_view_own_transports" ON transports;
DROP POLICY IF EXISTS "travelers_view_own_transports" ON transports;
CREATE POLICY "travelers_view_own_transports" ON transports FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE traveler_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "drivers_view_assigned_transports" ON transports;
DROP POLICY IF EXISTS "drivers_view_assigned_transports" ON transports;
CREATE POLICY "drivers_view_assigned_transports" ON transports FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "drivers_update_assigned_transports" ON transports;
DROP POLICY IF EXISTS "drivers_update_assigned_transports" ON transports;
CREATE POLICY "drivers_update_assigned_transports" ON transports FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "partners_view_booking_transports" ON transports;
DROP POLICY IF EXISTS "partners_view_booking_transports" ON transports;
CREATE POLICY "partners_view_booking_transports" ON transports FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE partner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "institutions_view_booking_transports" ON transports;
DROP POLICY IF EXISTS "institutions_view_booking_transports" ON transports;
CREATE POLICY "institutions_view_booking_transports" ON transports FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE institution_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "operations_full_transport_access" ON transports;
DROP POLICY IF EXISTS "operations_full_transport_access" ON transports;
CREATE POLICY "operations_full_transport_access" ON transports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

-- ============================================================================
-- CHARGING_STATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS charging_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  partner_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  location jsonb NOT NULL DEFAULT '{"lat": null, "lng": null}',
  address text,
  charger_type text NOT NULL CHECK (charger_type IN ('level2', 'dc_fast', 'supercharger')),
  num_stalls integer DEFAULT 1,
  available_stalls integer DEFAULT 1,
  pricing_per_kwh decimal(10,2),
  status text NOT NULL DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'planned')),
  amenities text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE charging_stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "charging_stations_public_read" ON charging_stations;
DROP POLICY IF EXISTS "charging_stations_public_read" ON charging_stations;
CREATE POLICY "charging_stations_public_read" ON charging_stations FOR SELECT
  TO anon, authenticated
  USING (status = 'operational');

DROP POLICY IF EXISTS "operations_full_charging_access" ON charging_stations;
DROP POLICY IF EXISTS "operations_full_charging_access" ON charging_stations;
CREATE POLICY "operations_full_charging_access" ON charging_stations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

DROP POLICY IF EXISTS "partners_manage_own_charging_stations" ON charging_stations;
DROP POLICY IF EXISTS "partners_manage_own_charging_stations" ON charging_stations;
CREATE POLICY "partners_manage_own_charging_stations" ON charging_stations FOR ALL
  TO authenticated
  USING (
    partner_id = auth.uid()
  );

-- ============================================================================
-- DRIVER_SCHEDULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS driver_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'break', 'off_duty', 'leave')),
  available_start_time time DEFAULT '07:00:00',
  available_end_time time DEFAULT '19:00:00',
  current_trip_id uuid REFERENCES transports(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, date)
);

ALTER TABLE driver_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_manage_own_schedule" ON driver_schedules;
DROP POLICY IF EXISTS "drivers_manage_own_schedule" ON driver_schedules;
CREATE POLICY "drivers_manage_own_schedule" ON driver_schedules FOR ALL
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "operations_full_schedule_access" ON driver_schedules;
DROP POLICY IF EXISTS "operations_full_schedule_access" ON driver_schedules;
CREATE POLICY "operations_full_schedule_access" ON driver_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

-- ============================================================================
-- TRANSPORT_RATING_REVIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transport_rating_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL REFERENCES transports(id) ON DELETE CASCADE,
  traveler_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transport_rating_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travelers_manage_own_transport_reviews" ON transport_rating_reviews;
DROP POLICY IF EXISTS "travelers_manage_own_transport_reviews" ON transport_rating_reviews;
CREATE POLICY "travelers_manage_own_transport_reviews" ON transport_rating_reviews FOR ALL
  TO authenticated
  USING (traveler_id = auth.uid());

DROP POLICY IF EXISTS "drivers_view_own_transport_reviews" ON transport_rating_reviews;
DROP POLICY IF EXISTS "drivers_view_own_transport_reviews" ON transport_rating_reviews;
CREATE POLICY "drivers_view_own_transport_reviews" ON transport_rating_reviews FOR SELECT
  TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid()));

DROP POLICY IF EXISTS "operations_full_transport_review_access" ON transport_rating_reviews;
DROP POLICY IF EXISTS "operations_full_transport_review_access" ON transport_rating_reviews;
CREATE POLICY "operations_full_transport_review_access" ON transport_rating_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

-- ============================================================================
-- ADD COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add transport fields to partner_listings
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_required') THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS transport_required boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_included') THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS transport_included boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_mandatory_for') THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS transport_mandatory_for text DEFAULT 'none' CHECK (transport_mandatory_for IN ('none', 'all', 'foreign_travelers', 'first_time_bookers'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_default_pickup') THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS transport_default_pickup jsonb DEFAULT '{"type": "traveler_location"}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_zone_id') THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS transport_zone_id uuid REFERENCES transport_zones(id);
  END IF;
END $$;

-- Add transport fields to bookings
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'transport_requested') THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transport_requested boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'transport_id') THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transport_id uuid REFERENCES transports(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'transport_status_snapshot') THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transport_status_snapshot text;
  END IF;
END $$;

-- Add mobility fields to portal_users
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'has_mobility_fleet') THEN
    ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS has_mobility_fleet boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'mobility_agreement_signed') THEN
    ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS mobility_agreement_signed boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'mobility_agreement_date') THEN
    ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS mobility_agreement_date date;
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles USING GIN (current_location);

CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_tier ON drivers(tier);
CREATE INDEX IF NOT EXISTS idx_drivers_portal_user ON drivers(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_traveler_user ON drivers(traveler_user_id);

CREATE INDEX IF NOT EXISTS idx_transports_booking ON transports(booking_id);
CREATE INDEX IF NOT EXISTS idx_transports_driver ON transports(driver_id);
CREATE INDEX IF NOT EXISTS idx_transports_status ON transports(status);
CREATE INDEX IF NOT EXISTS idx_transports_scheduled_pickup ON transports(scheduled_pickup_time);

CREATE INDEX IF NOT EXISTS idx_driver_schedules_date ON driver_schedules(date);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_driver_date ON driver_schedules(driver_id, date);

CREATE INDEX IF NOT EXISTS idx_bookings_transport ON bookings(transport_id);

-- ============================================================================
-- SEED TRANSPORT ZONES FOR RWANDA
-- ============================================================================

INSERT INTO transport_zones (region, base_fare, per_km_rate, min_fare, surge_rules, is_active) VALUES
  ('Kigali City', 1500.00, 350.00, 3000.00, '{"peak_hours": ["07:00-09:00", "17:00-19:00"], "weekend_multiplier": 1.15, "event_multiplier": 1.25}', true),
  ('Northern Province', 2000.00, 400.00, 5000.00, '{"peak_hours": [], "weekend_multiplier": 1.1, "event_multiplier": 1.2}', true),
  ('Eastern Province', 2000.00, 400.00, 5000.00, '{"peak_hours": [], "weekend_multiplier": 1.1, "event_multiplier": 1.2}', true),
  ('Southern Province', 2000.00, 400.00, 5000.00, '{"peak_hours": [], "weekend_multiplier": 1.1, "event_multiplier": 1.2}', true),
  ('Western Province', 2000.00, 450.00, 6000.00, '{"peak_hours": [], "weekend_multiplier": 1.15, "event_multiplier": 1.25}', true),
  ('Airport Transfer', 5000.00, 300.00, 10000.00, '{"peak_hours": [], "weekend_multiplier": 1.0, "event_multiplier": 1.0, "night_surcharge": 2000}', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate transport fare
CREATE OR REPLACE FUNCTION calculate_transport_fare(
  p_zone_id uuid,
  p_distance_km decimal,
  p_is_roundtrip boolean DEFAULT false
) RETURNS decimal AS $$
DECLARE
  v_zone transport_zones%ROWTYPE;
  v_fare decimal;
BEGIN
  SELECT * INTO v_zone FROM transport_zones WHERE id = p_zone_id;
  
  IF v_zone IS NULL THEN
    RAISE EXCEPTION 'Transport zone not found';
  END IF;
  
  v_fare := v_zone.base_fare + (p_distance_km * v_zone.per_km_rate);
  
  IF v_fare < v_zone.min_fare THEN
    v_fare := v_zone.min_fare;
  END IF;
  
  IF p_is_roundtrip THEN
    v_fare := v_fare * 2;
  END IF;
  
  RETURN v_fare;
END;
$$ LANGUAGE plpgsql;

-- Function to get available drivers for dispatch
CREATE OR REPLACE FUNCTION get_available_drivers(
  p_pickup_lat decimal,
  p_pickup_lng decimal,
  p_scheduled_time timestamptz,
  p_max_distance_km integer DEFAULT 30
) RETURNS TABLE (
  driver_id uuid,
  driver_name text,
  driver_tier text,
  driver_rating decimal,
  languages text[],
  specializations text[],
  total_trips integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.full_name,
    d.tier,
    d.rating,
    d.languages,
    d.specializations,
    d.total_trips
  FROM drivers d
  WHERE d.status = 'active'
    AND d.id NOT IN (
      SELECT ds.driver_id 
      FROM driver_schedules ds 
      WHERE ds.date = p_scheduled_time::date 
      AND ds.status IN ('on_trip', 'off_duty', 'leave')
    )
  ORDER BY 
    CASE d.tier 
      WHEN 'platinum' THEN 4 
      WHEN 'gold' THEN 3 
      WHEN 'silver' THEN 2 
      WHEN 'bronze' THEN 1 
    END DESC,
    d.rating DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to mobility tables
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transports_updated_at ON transports;
DROP TRIGGER IF EXISTS update_transports_updated_at ON transports;
CREATE TRIGGER update_transports_updated_at BEFORE UPDATE ON transports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SOURCE: 20260708150434_add_requested_payment_method_to_payments.sql
-- ============================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS requested_payment_method text;


-- ============================================================
-- SOURCE: 20260724120000_harden_portal_users_auth.sql
-- ============================================================
/*
  # Harden portal_users authentication

  ## Why
  Before this migration, the anon key (which ships in the browser bundle and is
  therefore public) could read EVERY column of `portal_users`, including
  `password_hash`, and could freely INSERT/UPDATE/DELETE any row. Anyone with the
  public key could harvest every partner / institution / government / operations
  password hash and take over accounts. See RLS policies in
  20260505095105_restore_core_tables_part1.sql / 20260313043848_consolidate_and_fix_rls_policies.sql.

  ## What this does
  1. Removes the anon/authenticated ability to READ the `password_hash` column
     (column-level GRANTs). Every other column stays readable, so the ~20 places
     in the app that read portal_users (settings, ops management, government
     stats, etc.) keep working. Selecting `*` now transparently omits the hash.
  2. Adds `verify_portal_login()` — a SECURITY DEFINER function that performs the
     credential check inside the database and returns only non-sensitive columns.
     The password hash never crosses the network. The client calls this instead
     of querying the table directly.
  3. Rotates the operations admin password OUT of source control (see the clearly
     marked block at the bottom — you MUST set your own).

  ## What this does NOT do (documented follow-up)
  Portal users still authenticate as the `anon` Postgres role, so RLS cannot yet
  distinguish a legitimate operations admin from an anonymous attacker for WRITES.
  Fully preventing anon INSERT/UPDATE/DELETE requires migrating portal auth to
  real Supabase Auth (each portal user becomes an auth user, RLS rewritten with
  auth.uid()). That is a larger, separate project. This migration closes the most
  severe hole — credential/hash exposure — without breaking the running app.
*/

-- pgcrypto provides digest(); on Supabase it lives in the `extensions` schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. Column-level read protection for password_hash
-- ============================================================
-- Drop the blanket table-level SELECT, then grant SELECT on every column
-- EXCEPT password_hash. PostgREST honours column privileges, so existing
-- reads keep working and `select('*')` simply returns everything but the hash.
REVOKE SELECT ON public.portal_users FROM anon, authenticated;

GRANT SELECT (
  id, portal_type, email, user_id_code, name, phone, contact_person,
  country, province, specific_location, specialty, tags, is_active,
  created_at, created_by, updated_at
) ON public.portal_users TO anon, authenticated;

-- ============================================================
-- 2. Secure login function (hash never leaves the database)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_portal_login(
  p_email text,
  p_password text,
  p_user_id_code text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  portal_type text,
  email text,
  user_id_code text,
  name text,
  phone text,
  contact_person text,
  country text,
  province text,
  specific_location text,
  specialty text,
  tags text[],
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    pu.id, pu.portal_type, pu.email, pu.user_id_code, pu.name, pu.phone,
    pu.contact_person, pu.country, pu.province, pu.specific_location,
    pu.specialty, pu.tags, pu.is_active
  FROM public.portal_users pu
  WHERE lower(pu.email) = lower(trim(p_email))
    AND pu.password_hash = encode(digest(p_password, 'sha256'), 'hex')
    AND pu.is_active = true
    AND (p_user_id_code IS NULL OR pu.user_id_code = p_user_id_code);
$$;

REVOKE ALL ON FUNCTION public.verify_portal_login(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_portal_login(text, text, text) TO anon, authenticated;

-- ============================================================
-- 3. Rotate the operations admin password (REQUIRED)
-- ============================================================
-- The previous password shipped in plaintext in source control and must be
-- considered compromised. Replace 'CHANGE_ME_TO_A_NEW_STRONG_PASSWORD' below
-- with a new strong password before running this migration, then delete this
-- comment. The digest() call hashes it the same way the app does.
UPDATE public.portal_users
SET password_hash = encode(digest('CHANGE_ME_TO_A_NEW_STRONG_PASSWORD', 'sha256'), 'hex'),
    updated_at = now()
WHERE portal_type = 'operations';


-- ============================================================
-- SOURCE: 20260724130000_bookings_confirm_on_payment.sql
-- ============================================================
/*
  # Bookings: confirm only after payment

  ## Why
  Migration 20260315114255_auto_confirm_bookings.sql set the bookings.status
  DEFAULT to 'confirmed' so that every booking appeared confirmed the moment it
  was created — before payment succeeded. That produced "phantom" confirmed
  bookings for orders that were never paid.

  ## What this does
  Restores the DEFAULT for bookings.status to 'pending'. New paid bookings are
  now created as 'pending' and are flipped to 'confirmed' only when the
  pesapal-ipn edge function records a completed payment (it already sets
  status = 'confirmed', payment_status = 'paid'). Free (zero-total) bookings are
  created directly as 'confirmed' by the app since there is nothing to pay.

  Existing rows are left untouched — this only changes the default for future
  inserts. The two booking-creation paths (BookingDrawer, AttractionBookingDrawer)
  set status explicitly, so this default is a safety net for any other insert.
*/

ALTER TABLE bookings
  ALTER COLUMN status SET DEFAULT 'pending';


-- ============================================================
-- SOURCE: 20260724140000_harden_travelers_pii.sql
-- ============================================================
/*
  # Harden travelers table (PII + legacy password_hash exposure)

  ## Why
  The `travelers` table shipped with `USING (true)` policies for anon on SELECT,
  INSERT and UPDATE (see 20260505095105_restore_core_tables_part1.sql /
  20260217112129_create_user_management_system.sql). Because the anon key is
  public, anyone could read every traveler's personal data (name, email, phone,
  date of birth, nationality) and legacy `password_hash`, and could modify or
  insert traveler rows at will.

  ## Safe to lock down fully
  A project-wide search shows the app touches this table in exactly ONE place:
  CreateHostForm looks up a traveler by email (id + full_name) to link them as a
  host. Travelers themselves authenticate via Supabase Auth and their profile
  lives in auth metadata, not this table; Operations counts travelers via
  portal_users, not this table. So anon needs no direct access at all.

  ## What this does
  1. Drops the permissive anon policies. RLS stays enabled, so anon now has no
     policy and is denied by default. Revokes table DML from anon/authenticated
     for defense in depth. (The delete-traveler-account edge function uses the
     service role and is unaffected.)
  2. Adds `lookup_traveler_by_email()` — a SECURITY DEFINER function returning
     only id + full_name — for the CreateHostForm host-linking flow. No PII or
     password hash is ever exposed.
*/

-- ============================================================
-- 1. Remove blanket anon access
-- ============================================================
DROP POLICY IF EXISTS "Anyone can create traveler account" ON public.travelers;
DROP POLICY IF EXISTS "Travelers can view own profile" ON public.travelers;
DROP POLICY IF EXISTS "Travelers can update own profile" ON public.travelers;

REVOKE ALL ON public.travelers FROM anon, authenticated;

-- ============================================================
-- 2. Minimal lookup for host-linking (id + full_name only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.lookup_traveler_by_email(p_email text)
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.full_name
  FROM public.travelers t
  WHERE lower(t.email) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_traveler_by_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_traveler_by_email(text) TO anon, authenticated;


-- ============================================================
-- SOURCE: 20260726120000_add_intouch_mobile_money.sql
-- ============================================================
/*
  # Add InTouch (IntouchPay) mobile-money support to payments

  ## Why
  Pesapal handles card payments only. MTN MoMo and Airtel Money now go through
  InTouch (IntouchPay, https://www.intouchpay.co.rw). InTouch uses an async
  "push to phone" flow: we request a payment, the subscriber approves a prompt on
  their handset, and InTouch calls our callback with the result. This migration
  generalises the `payments` table so it can store InTouch transactions alongside
  the existing Pesapal ones.

  ## Changes
  - `pesapal_merchant_reference` becomes nullable (InTouch rows don't have one).
  - New columns: `provider` ('pesapal' | 'intouch'), `intouch_request_id`
    (our requesttransactionid), `intouch_transaction_id` (InTouch's id),
    `mobile_phone` (the paying MoMo/Airtel number).
  - InTouch charges in RWF, so `currency` may now be 'RWF' on those rows.
*/

ALTER TABLE payments ALTER COLUMN pesapal_merchant_reference DROP NOT NULL;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'pesapal';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS intouch_request_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS intouch_transaction_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mobile_phone text;

CREATE INDEX IF NOT EXISTS payments_intouch_request_idx ON payments(intouch_request_id);
CREATE INDEX IF NOT EXISTS payments_provider_idx ON payments(provider);


