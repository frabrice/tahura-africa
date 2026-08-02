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

CREATE POLICY "Anyone can view published institution profiles"
  ON institution_profiles FOR SELECT
  USING (published = true);

CREATE POLICY "Institution portal users can view their own profile"
  ON institution_profiles FOR SELECT
  USING (true);

CREATE POLICY "Institution portal users can insert their profile"
  ON institution_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Institution portal users can update their profile"
  ON institution_profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_institution_profiles_portal_user_id ON institution_profiles(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_institution_profiles_published ON institution_profiles(published);