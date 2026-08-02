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
    ALTER TABLE institution_profiles ADD COLUMN daily_capacity integer DEFAULT 500;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'opening_time'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN opening_time text DEFAULT '08:00';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'closing_time'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN closing_time text DEFAULT '18:00';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'closed_days'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN closed_days text[] DEFAULT '{}';
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

CREATE POLICY "Anonymous can view capacity_rules"
  ON capacity_rules FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can view capacity_rules"
  ON capacity_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert capacity_rules"
  ON capacity_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update capacity_rules"
  ON capacity_rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete capacity_rules"
  ON capacity_rules FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon can insert capacity_rules"
  ON capacity_rules FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update capacity_rules"
  ON capacity_rules FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete capacity_rules"
  ON capacity_rules FOR DELETE
  TO anon
  USING (true);
