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
CREATE POLICY "Anonymous can view published experiences"
  ON experiences
  FOR SELECT
  TO anon
  USING (status = 'published');

-- Allow anonymous users to view published homestays
CREATE POLICY "Anonymous can view published homestays"
  ON homestays
  FOR SELECT
  TO anon
  USING (status = 'published');

-- Allow anonymous users to view open attractions
CREATE POLICY "Anonymous can view open attractions"
  ON attractions
  FOR SELECT
  TO anon
  USING (status = 'open');

-- Allow anonymous users to view availability for published experiences
CREATE POLICY "Anonymous can view availability"
  ON availability
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM experiences
      WHERE experiences.id = availability.experience_id
      AND experiences.status = 'published'
    )
  );
