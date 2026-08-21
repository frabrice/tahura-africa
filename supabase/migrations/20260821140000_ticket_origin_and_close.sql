/*
  # Ticket origin tracking + close-out

  ## Why
  support_tickets can only represent "created by a traveler" (created_by_auth_id)
  or "created by a partner" (created_by_portal_id) - hosts and guides have no
  representable origin at all, since they live in partner_hosts/guides, not
  auth.users or portal_users. The support chat widget is being extended to
  Partner/Host/Guide dashboards and Ops needs to see who actually opened each
  ticket. Also adding a real close-out timestamp for the new "Close & Send
  Transcript" flow.

  ## What this does
  1. created_by_role - the field Ops actually filters/displays by, no join
     needed (created_by_name/created_by_email already exist for display).
  2. created_by_host_id / created_by_guide_id - typed FKs alongside the
     existing created_by_auth_id/created_by_portal_id, matching the pattern
     bookings/conversations already use (separate host_id/guide_id/partner_id
     columns rather than one polymorphic reference).
  3. closed_at - set when a ticket is actually closed via the new flow.
*/

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS created_by_role text NOT NULL DEFAULT 'traveler'
    CHECK (created_by_role IN ('traveler','partner','host','guide')),
  ADD COLUMN IF NOT EXISTS created_by_host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by_role ON support_tickets(created_by_role);
