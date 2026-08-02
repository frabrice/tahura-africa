/*
  # Add Journey / Itinerary Support to Partner Listings

  ## Summary
  Extends the partner_listings table to support a third listing type: "itinerary"
  (branded as "Journeys" in the UI). Journeys are multi-day curated travel itineraries
  created and sold by partners.

  ## Changes

  ### Modified Tables
  - `partner_listings`
    - `listing_type` check constraint updated to allow 'itinerary' as a valid value
    - New column `itinerary_days` (jsonb) - ordered array of day objects, each with:
        { day: number, title: string, place_name: string, description: string }
    - New column `budget_breakdown` (jsonb) - array of cost line items, each with:
        { label: string, amount: number, currency: string }
    - New column `duration_days` (integer) - total trip length in days
    - New column `pricing_type` (text) - 'per_person' or 'per_group'
    - New column `group_size_min` (integer) - minimum group size for booking
    - New column `group_size_max` (integer) - maximum group size for booking

  ## Security
  - No new tables; existing RLS policies on partner_listings continue to apply.
  - All new columns default to NULL and are optional for non-itinerary listings.

  ## Notes
  1. The listing_type constraint is dropped and recreated to add 'itinerary'.
  2. Existing experience and homestay rows are unaffected.
*/

-- Drop existing listing_type constraint and recreate with 'itinerary' added
ALTER TABLE partner_listings
  DROP CONSTRAINT IF EXISTS partner_listings_listing_type_check;

ALTER TABLE partner_listings
  ADD CONSTRAINT partner_listings_listing_type_check
  CHECK (listing_type IN ('experience', 'homestay', 'itinerary'));

-- Add itinerary-specific columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'itinerary_days'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN itinerary_days jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'budget_breakdown'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN budget_breakdown jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'duration_days'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN duration_days integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'pricing_type'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN pricing_type text DEFAULT NULL
      CHECK (pricing_type IN ('per_person', 'per_group') OR pricing_type IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'group_size_min'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN group_size_min integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'group_size_max'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN group_size_max integer DEFAULT NULL;
  END IF;
END $$;
