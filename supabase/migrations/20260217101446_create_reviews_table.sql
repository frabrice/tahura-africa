/*
  # Create Reviews Table

  1. New Tables
    - `reviews`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, foreign key to partner_listings)
      - `reviewer_name` (text)
      - `reviewer_profile_picture` (text, URL)
      - `rating` (integer, 1-5 stars)
      - `review_text` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `reviews` table
    - Add policy for anyone to read reviews (public access)
    - Add policy for authenticated users to create reviews

  3. Purpose
    - Store guest reviews for listings
    - Display social proof on listing detail pages
    - Help travelers make informed decisions
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES partner_listings(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  reviewer_profile_picture text DEFAULT '',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read reviews (including anonymous users)
CREATE POLICY "Anyone can view reviews"
  ON reviews
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (true);