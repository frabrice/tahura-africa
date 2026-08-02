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
    ALTER TABLE institution_profiles ADD COLUMN opening_time time DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'closing_time'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN closing_time time DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'closed_days'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN closed_days text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'daily_capacity'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN daily_capacity integer DEFAULT 0;
  END IF;
END $$;
