/*
  # Add Inclusion and Requirements Fields to Partner Listings

  1. Changes
    - Add `whats_included` column to `partner_listings` table
      - Type: text array (text[])
      - Stores list of items/services included in the listing
      - Default: empty array
    
    - Add `what_to_bring` column to `partner_listings` table
      - Type: text array (text[])
      - Stores list of items travelers should bring
      - Default: empty array

  2. Purpose
    - Allow partners to specify what's included in their experiences/homestays
    - Allow partners to specify what travelers need to bring
    - Enhance traveler experience with clear expectations
*/

-- Add whats_included column to partner_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'whats_included'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN whats_included text[] DEFAULT '{}';
  END IF;
END $$;

-- Add what_to_bring column to partner_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'what_to_bring'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN what_to_bring text[] DEFAULT '{}';
  END IF;
END $$;