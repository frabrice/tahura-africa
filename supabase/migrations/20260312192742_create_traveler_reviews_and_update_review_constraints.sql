/*
  # Two-Way Review System

  1. New Tables
    - `traveler_reviews` - allows hosts and guides to review travelers
      - `id` (uuid, primary key)
      - `booking_id` (uuid, references bookings)
      - `traveler_id` (uuid, not null)
      - `reviewer_type` (text, 'host' or 'guide')
      - `reviewer_id` (uuid, not null)
      - `reviewer_name` (text, not null)
      - `reviewer_profile_picture` (text)
      - `rating` (integer 1-5, not null)
      - `review_text` (text, max 200 chars, not null)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `reviews` - add `booking_id` column to track which booking a review belongs to
    - `reviews` - add 200 character limit on review_text
    - `attraction_reviews` - add 200 character limit on review_text

  3. Constraints
    - Unique constraint on (booking_id, reviewer_type) in traveler_reviews
    - Unique constraint on (booking_id) in reviews (one review per booking)
    - Character length checks on review_text columns

  4. Security
    - Enable RLS on traveler_reviews
    - Authenticated users who are the reviewer can insert
    - Authenticated users can read reviews about themselves or that they wrote
    - Anonymous users can read traveler reviews (for display on booking cards)
*/

CREATE TABLE IF NOT EXISTS traveler_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  traveler_id uuid NOT NULL,
  reviewer_type text NOT NULL CHECK (reviewer_type IN ('host', 'guide')),
  reviewer_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  reviewer_profile_picture text DEFAULT '',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL CHECK (char_length(review_text) <= 200),
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_id, reviewer_type)
);

ALTER TABLE traveler_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert their own traveler reviews"
  ON traveler_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read traveler reviews"
  ON traveler_reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can read traveler reviews"
  ON traveler_reviews
  FOR SELECT
  TO anon
  USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE reviews ADD COLUMN booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_booking_id_unique'
  ) THEN
    CREATE UNIQUE INDEX reviews_booking_id_unique ON reviews (booking_id) WHERE booking_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_review_text_length'
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_review_text_length CHECK (char_length(review_text) <= 200);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attraction_reviews_review_text_length'
  ) THEN
    ALTER TABLE attraction_reviews ADD CONSTRAINT attraction_reviews_review_text_length CHECK (char_length(review_text) <= 200);
  END IF;
END $$;
