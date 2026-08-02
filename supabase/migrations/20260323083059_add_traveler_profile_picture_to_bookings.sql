/*
  # Add traveler_profile_picture to bookings

  ## Summary
  Adds a single nullable text column `traveler_profile_picture` to the `bookings` table.

  ## Changes
  - `bookings`: new column `traveler_profile_picture` (text, nullable, default empty string)
    - Stores the traveler's profile picture URL at the time of booking
    - Used by hosts and guides to display traveler info on booking cards and in the About Traveler modal

  ## Notes
  - Non-destructive: existing rows will receive the default value of an empty string
  - No RLS changes required (inherits existing bookings policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'traveler_profile_picture'
  ) THEN
    ALTER TABLE bookings ADD COLUMN traveler_profile_picture text DEFAULT '' ;
  END IF;
END $$;
