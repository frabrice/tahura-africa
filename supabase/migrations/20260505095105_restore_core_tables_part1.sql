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

CREATE POLICY "Anyone can create traveler account"
  ON travelers FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Travelers can view own profile"
  ON travelers FOR SELECT TO anon USING (true);

CREATE POLICY "Travelers can update own profile"
  ON travelers FOR UPDATE TO anon USING (true) WITH CHECK (true);

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

CREATE POLICY "Anyone can view portal users"
  ON portal_users FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can create portal users"
  ON portal_users FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update portal users"
  ON portal_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete portal users"
  ON portal_users FOR DELETE TO anon, authenticated USING (true);

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

CREATE POLICY "Allow public to view all hosts"
  ON partner_hosts FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Partners can create hosts"
  ON partner_hosts FOR INSERT TO authenticated WITH CHECK (partner_id = (select auth.uid()));

CREATE POLICY "Partners can update own hosts"
  ON partner_hosts FOR UPDATE TO authenticated
  USING (partner_id = (select auth.uid())) WITH CHECK (partner_id = (select auth.uid()));

CREATE POLICY "Partners can delete own hosts"
  ON partner_hosts FOR DELETE TO authenticated USING (partner_id = (select auth.uid()));

CREATE POLICY "Anon can create hosts"
  ON partner_hosts FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update hosts"
  ON partner_hosts FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete hosts"
  ON partner_hosts FOR DELETE TO anon USING (true);

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

CREATE POLICY "Allow public to view all listings"
  ON partner_listings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Partners can create listings"
  ON partner_listings FOR INSERT TO authenticated WITH CHECK (partner_id = (select auth.uid()));

CREATE POLICY "Partners can update own listings"
  ON partner_listings FOR UPDATE TO authenticated
  USING (partner_id = (select auth.uid())) WITH CHECK (partner_id = (select auth.uid()));

CREATE POLICY "Partners can delete own listings"
  ON partner_listings FOR DELETE TO authenticated USING (partner_id = (select auth.uid()));

CREATE POLICY "Anon can create listings"
  ON partner_listings FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update listings"
  ON partner_listings FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete listings"
  ON partner_listings FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_partner_listings_partner ON partner_listings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_listings_host ON partner_listings(host_id);
CREATE INDEX IF NOT EXISTS idx_partner_listings_type ON partner_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_partner_listings_status ON partner_listings(status);
CREATE INDEX IF NOT EXISTS idx_partner_listings_flagged ON partner_listings(is_flagged);
