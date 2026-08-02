/*
  # Fix Support Tickets Portal Type Constraint

  ## Problem
  The `portal_type` column on `support_tickets` has a CHECK constraint that only allows
  'partner' or 'institution'. However, a later migration intended to allow 'general'
  (for tickets not linked to any specific partner or institution), but only changed
  the default value without updating the CHECK constraint.

  This causes ALL ticket submissions without a related booking to fail with a constraint
  violation error, resulting in "Something went wrong. Please try again." for travelers.

  ## Changes
  1. Drop the old `portal_type` CHECK constraint
  2. Add a new CHECK constraint that allows 'partner', 'institution', and 'general'
  3. Ensure the column default is 'general' to match the intended behavior
*/

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_portal_type_check;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_portal_type_check
  CHECK (portal_type = ANY (ARRAY['partner'::text, 'institution'::text, 'general'::text]));

ALTER TABLE public.support_tickets
  ALTER COLUMN portal_type SET DEFAULT 'general';
