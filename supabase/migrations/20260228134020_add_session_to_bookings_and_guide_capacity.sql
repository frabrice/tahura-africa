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
    ALTER TABLE bookings ADD COLUMN session text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guides' AND column_name = 'max_engagements_per_day'
  ) THEN
    ALTER TABLE guides ADD COLUMN max_engagements_per_day integer NOT NULL DEFAULT 1;
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

CREATE POLICY "Allow authenticated to view schedule overrides"
  ON schedule_overrides FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated to manage schedule overrides"
  ON schedule_overrides FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to update schedule overrides"
  ON schedule_overrides FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to delete schedule overrides"
  ON schedule_overrides FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anonymous to view schedule overrides"
  ON schedule_overrides FOR SELECT
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

CREATE POLICY "Allow authenticated to view government policies"
  ON government_policies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated to insert government policies"
  ON government_policies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to update government policies"
  ON government_policies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to delete government policies"
  ON government_policies FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anonymous to view government policies"
  ON government_policies FOR SELECT
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_government_policies_portal_user ON government_policies(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_government_policies_status ON government_policies(status);
CREATE INDEX IF NOT EXISTS idx_government_policies_priority ON government_policies(priority);
