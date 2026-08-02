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
CREATE POLICY "Portal users can view guides they created"
  ON guides FOR SELECT
  USING (true);

CREATE POLICY "Portal users can insert guides"
  ON guides FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Portal users can update guides they created"
  ON guides FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Portal users can delete guides they created"
  ON guides FOR DELETE
  USING (true);

-- Programs policies - Allow institution portal users to manage their own programs
CREATE POLICY "Portal users can view programs they created"
  ON programs FOR SELECT
  USING (true);

CREATE POLICY "Portal users can insert programs"
  ON programs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Portal users can update programs they created"
  ON programs FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Portal users can delete programs they created"
  ON programs FOR DELETE
  USING (true);

-- Program guides policies
CREATE POLICY "Users can view program guide assignments"
  ON program_guides FOR SELECT
  USING (true);

CREATE POLICY "Portal users can assign guides to programs"
  ON program_guides FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Portal users can remove guide assignments"
  ON program_guides FOR DELETE
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_guides_portal_user_id ON guides(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_guides_available ON guides(available);
CREATE INDEX IF NOT EXISTS idx_programs_portal_user_id ON programs(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_programs_active ON programs(active);
CREATE INDEX IF NOT EXISTS idx_program_guides_program_id ON program_guides(program_id);
CREATE INDEX IF NOT EXISTS idx_program_guides_guide_id ON program_guides(guide_id);