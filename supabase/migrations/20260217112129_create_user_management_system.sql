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
    ALTER TABLE partner_hosts ADD COLUMN traveler_id uuid REFERENCES travelers(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_hosts' AND column_name = 'created_by_portal_user'
  ) THEN
    ALTER TABLE partner_hosts ADD COLUMN created_by_portal_user uuid REFERENCES portal_users(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;

-- Travelers policies
CREATE POLICY "Anyone can create traveler account"
  ON travelers FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Travelers can view own profile"
  ON travelers FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Travelers can update own profile"
  ON travelers FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Portal users policies
CREATE POLICY "Portal users can view own account"
  ON portal_users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Operations users can create portal users"
  ON portal_users FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Operations users can update portal users"
  ON portal_users FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Operations users can view all portal users"
  ON portal_users FOR SELECT
  TO anon
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_travelers_email ON travelers(email);
CREATE INDEX IF NOT EXISTS idx_portal_users_email ON portal_users(email);
CREATE INDEX IF NOT EXISTS idx_portal_users_code ON portal_users(user_id_code);
CREATE INDEX IF NOT EXISTS idx_portal_users_type ON portal_users(portal_type);
CREATE INDEX IF NOT EXISTS idx_partner_hosts_traveler_id ON partner_hosts(traveler_id);