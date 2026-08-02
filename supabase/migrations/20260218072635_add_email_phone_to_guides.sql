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
    ALTER TABLE guides ADD COLUMN email text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guides' AND column_name = 'phone'
  ) THEN
    ALTER TABLE guides ADD COLUMN phone text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_guides_email ON guides(email);
