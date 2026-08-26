/*
  # Add institution_profiles.image_credit

  ## Why
  Attractions are being seeded with real photos sourced from Wikimedia
  Commons under CC BY / CC BY-SA licenses. Both require visible
  attribution wherever the image is displayed — this column stores that
  attribution line so the traveler-facing attraction pages can render it
  next to the photo. CC0 images don't legally require credit but get one
  anyway for consistency/traceability of where every photo came from.
*/

ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS image_credit text;
