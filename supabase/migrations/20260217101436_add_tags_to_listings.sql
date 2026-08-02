/*
  # Add Tags to Partner Listings

  1. Changes
    - Add `tags` column to `partner_listings` table
      - Type: text array (text[])
      - Stores keywords/tags for categorization and search
      - Default: empty array
      - Examples: 'adventure', 'cultural', 'wildlife', 'family-friendly', etc.

  2. Purpose
    - Enable better categorization of listings
    - Improve search functionality
    - Support AI voice agent queries
    - Allow filtering by experience type/characteristics
*/

-- Add tags column to partner_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'tags'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;