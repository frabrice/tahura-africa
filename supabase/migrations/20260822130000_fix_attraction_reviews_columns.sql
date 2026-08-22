/*
  # Fix attraction_reviews missing columns

  ## Why
  ReviewModal.tsx has always inserted booking_id, program_id, and
  guide_rating into attraction_reviews - none of these three columns
  exist on the table (the May restore recreated it without them, and
  nothing since re-added them). Every attraction review submission has
  been failing outright.
*/

ALTER TABLE attraction_reviews
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guide_rating integer CHECK (guide_rating BETWEEN 1 AND 5);

CREATE INDEX IF NOT EXISTS idx_attraction_reviews_booking ON attraction_reviews(booking_id);
