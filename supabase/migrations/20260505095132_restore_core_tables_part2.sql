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

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Allow all to create reviews"
  ON reviews FOR INSERT TO anon, authenticated WITH CHECK (true);

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

CREATE POLICY "Portal users can view guides they created"
  ON guides FOR SELECT USING (true);

CREATE POLICY "Portal users can insert guides"
  ON guides FOR INSERT WITH CHECK (true);

CREATE POLICY "Portal users can update guides they created"
  ON guides FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Portal users can delete guides they created"
  ON guides FOR DELETE USING (true);

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

CREATE POLICY "Portal users can view programs they created"
  ON programs FOR SELECT USING (true);

CREATE POLICY "Portal users can insert programs"
  ON programs FOR INSERT WITH CHECK (true);

CREATE POLICY "Portal users can update programs they created"
  ON programs FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Portal users can delete programs they created"
  ON programs FOR DELETE USING (true);

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

CREATE POLICY "Users can view program guide assignments"
  ON program_guides FOR SELECT USING (true);

CREATE POLICY "Portal users can assign guides to programs"
  ON program_guides FOR INSERT WITH CHECK (true);

CREATE POLICY "Portal users can remove guide assignments"
  ON program_guides FOR DELETE USING (true);

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

CREATE POLICY "Anyone can view institution profiles"
  ON institution_profiles FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Institution portal users can insert their profile"
  ON institution_profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Institution portal users can update their profile"
  ON institution_profiles FOR UPDATE USING (true) WITH CHECK (true);

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

CREATE POLICY "Anyone can view capacity rules"
  ON capacity_rules FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can create capacity rules"
  ON capacity_rules FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update capacity rules"
  ON capacity_rules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete capacity rules"
  ON capacity_rules FOR DELETE TO anon, authenticated USING (true);

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

CREATE POLICY "Anyone can view guide schedules"
  ON guide_schedules FOR SELECT USING (true);

CREATE POLICY "Portal users can insert guide schedules"
  ON guide_schedules FOR INSERT WITH CHECK (true);

CREATE POLICY "Portal users can update guide schedules"
  ON guide_schedules FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Portal users can delete guide schedules"
  ON guide_schedules FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_guide_schedules_guide_id ON guide_schedules(guide_id);
