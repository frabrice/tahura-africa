/*
  # Create Saved Items Table

  1. New Tables
    - `saved_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `listing_id` (uuid, references partner_listings)
      - `listing_type` (text: 'experience', 'homestay')
      - `institution_id` (uuid, nullable, references institution_profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on saved_items table
    - Users can only view/manage their own saved items
*/

-- Create saved_items table
CREATE TABLE IF NOT EXISTS saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES partner_listings(id) ON DELETE CASCADE,
  listing_type text CHECK (listing_type IN ('experience', 'homestay')),
  institution_id uuid REFERENCES institution_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_listing UNIQUE (user_id, listing_id),
  CONSTRAINT unique_user_institution UNIQUE (user_id, institution_id),
  CONSTRAINT saved_item_type CHECK (
    (listing_id IS NOT NULL AND institution_id IS NULL) OR
    (listing_id IS NULL AND institution_id IS NOT NULL)
  )
);

ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved items"
  ON saved_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved items"
  ON saved_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved items"
  ON saved_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_listing_id ON saved_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_institution_id ON saved_items(institution_id);
