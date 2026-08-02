/*
  # Allow general support tickets without a target portal

  1. Modified Columns
    - `support_tickets.target_portal_id` - Changed from NOT NULL to nullable
      - Allows tickets with no specific listing/booking to be created
      - These "general inquiry" tickets will be handled by the operations team
    - `support_tickets.portal_type` - Updated default to 'general'
      - Allows storing general tickets that are not tied to any portal

  2. Important Notes
    - Existing data is unaffected; only the constraint is relaxed
    - General tickets (target_portal_id IS NULL) will only appear in Operations Cases
*/

ALTER TABLE support_tickets ALTER COLUMN target_portal_id DROP NOT NULL;

ALTER TABLE support_tickets ALTER COLUMN portal_type SET DEFAULT 'general';
