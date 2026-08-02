/*
  # Add Profile Picture to Guides

  1. Changes
    - Add `profile_picture` column to `guides` table to store guide profile image URLs

  2. Notes
    - Column is nullable to support existing guides without profile pictures
    - Will store URLs from Supabase Storage bucket
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guides' AND column_name = 'profile_picture'
  ) THEN
    ALTER TABLE guides ADD COLUMN profile_picture text;
  END IF;
END $$;
