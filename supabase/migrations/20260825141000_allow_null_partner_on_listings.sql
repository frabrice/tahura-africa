/*
  # Allow partner_listings.partner_id to be NULL

  ## Why
  Confirmed live (via a failed test insert) that partner_id was NOT NULL,
  which would have made the whole "create a listing from Ops with no
  partner assigned yet" flow impossible at the schema level regardless of
  what the UI does. A listing with no partner also correctly has no host
  (a host always belongs to some partner), which the existing
  chk_active_listing_requires_host constraint already keeps out of
  'active' status.
*/

ALTER TABLE partner_listings ALTER COLUMN partner_id DROP NOT NULL;
