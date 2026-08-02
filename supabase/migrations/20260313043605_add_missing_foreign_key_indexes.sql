/*
  # Add Missing Foreign Key Indexes

  Adds covering indexes for 9 foreign keys that were missing indexes,
  which can cause suboptimal query performance on JOINs and cascading deletes.

  1. New Indexes
    - `attraction_reviews.program_id`
    - `bookings.program_id`
    - `capacity_rules.institution_id`
    - `content_flags.flagged_by`
    - `guide_tips.booking_id`
    - `guide_tips.created_by`
    - `guide_tips.review_id`
    - `support_tickets.assigned_to`
    - `support_tickets.created_by_portal_id`

  2. Important Notes
    - All indexes are created with IF NOT EXISTS to be safe
    - These indexes improve JOIN and foreign key lookup performance
*/

CREATE INDEX IF NOT EXISTS idx_attraction_reviews_program_id
  ON public.attraction_reviews (program_id);

CREATE INDEX IF NOT EXISTS idx_bookings_program_id
  ON public.bookings (program_id);

CREATE INDEX IF NOT EXISTS idx_capacity_rules_institution_id
  ON public.capacity_rules (institution_id);

CREATE INDEX IF NOT EXISTS idx_content_flags_flagged_by
  ON public.content_flags (flagged_by);

CREATE INDEX IF NOT EXISTS idx_guide_tips_booking_id
  ON public.guide_tips (booking_id);

CREATE INDEX IF NOT EXISTS idx_guide_tips_created_by
  ON public.guide_tips (created_by);

CREATE INDEX IF NOT EXISTS idx_guide_tips_review_id
  ON public.guide_tips (review_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to
  ON public.support_tickets (assigned_to);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by_portal_id
  ON public.support_tickets (created_by_portal_id);
