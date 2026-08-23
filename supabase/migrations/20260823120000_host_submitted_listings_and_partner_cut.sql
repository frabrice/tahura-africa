/*
  # Host-submitted listings (partner approval) + partner cut revenue model

  ## Why
  1. Hosts have no way to create their own listing today — HostListingsPage.tsx
     is read-only ("Ask your partner administrator to assign you to a
     listing"). The partner is meant to review and approve anything a host
     proposes, not have it go live unmoderated.
  2. partner_hosts.revenue_share_pct (added 20260812120000) already drives the
     host/partner payout split via fn_write_payout_ledger, but its platform
     default is 60% host / ~40% partner. The intended model is the reverse:
     hosts keep the large majority of their earnings, and the partner takes a
     small, capped cut for hosting/managing them — capped at 5% by default,
     configurable by Ops in System Rules. No column rename needed: the trigger
     already computes host_earning from revenue_share_pct exactly as required
     — only the default value changes, plus a new cap rule partners must
     respect when setting a host's cut.

  ## What this does
  1. `partner_listings.created_by_host_id` — tracks a listing that originated
     from a host's own submission (vs partner/Ops-created). Nullable; null
     means partner/Ops authored it, same as before.
  2. `partner_listings.rejection_reason` — lets a partner tell the host why a
     submission was rejected.
  3. Widens the status CHECK to add 'pending_approval' and 'rejected'.
  4. New authenticated-role RLS policies scoped to partner_hosts.traveler_user_id
     = auth.uid() so a logged-in host can submit a listing (forced to
     status='pending_approval', host_id/created_by_host_id = their own row)
     and edit/withdraw their own pending or rejected submissions. The existing
     "Partners can update own listings" policy (partner_id = auth.uid())
     already covers the partner's approve/reject action — no new policy
     needed for that side.
  5. system_rules id '9' ("Host Revenue Share") default flips from 60 to 95.
     New system_rules id '11' ("Max Partner Host Cut", default 5) — the cap
     Ops enforces on how much of a host's post-commission earnings a partner
     may keep. Enforced at the app layer (partner-facing UI), same trust
     model as every other system_rules-driven limit in this app.
*/

-- ============================================================
-- 1. New columns on partner_listings
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'created_by_host_id'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN created_by_host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN rejection_reason text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_listings_created_by_host ON partner_listings(created_by_host_id);

-- ============================================================
-- 2. Widen status CHECK
-- ============================================================
ALTER TABLE partner_listings DROP CONSTRAINT IF EXISTS partner_listings_status_check;
ALTER TABLE partner_listings ADD CONSTRAINT partner_listings_status_check
  CHECK (status IN ('active', 'paused', 'draft', 'pending_approval', 'rejected'));

-- ============================================================
-- 3. Host RLS: submit, edit-own-pending, withdraw-own-pending
-- ============================================================
CREATE POLICY "Hosts can submit listings for partner approval"
  ON partner_listings FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending_approval'
    AND EXISTS (
      SELECT 1 FROM partner_hosts
      WHERE id = partner_listings.host_id
        AND id = partner_listings.created_by_host_id
        AND partner_id = partner_listings.partner_id
        AND traveler_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Hosts can edit their own pending or rejected listings"
  ON partner_listings FOR UPDATE TO authenticated
  USING (
    status IN ('pending_approval', 'rejected')
    AND created_by_host_id IN (
      SELECT id FROM partner_hosts WHERE traveler_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    status IN ('pending_approval', 'rejected')
    AND created_by_host_id IN (
      SELECT id FROM partner_hosts WHERE traveler_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Hosts can withdraw their own pending or rejected listings"
  ON partner_listings FOR DELETE TO authenticated
  USING (
    status IN ('pending_approval', 'rejected')
    AND created_by_host_id IN (
      SELECT id FROM partner_hosts WHERE traveler_user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 4. Revenue model: host keeps the default majority, partner cut is capped
-- ============================================================
UPDATE system_rules
SET value = '95',
    description = 'Default percentage of the post-commission booking amount a host keeps. The remainder is the partner''s cut (capped by "Max Partner Host Cut").'
WHERE id = '9';

INSERT INTO system_rules (id, category, name, description, enabled, value) VALUES
  ('11', 'financial', 'Max Partner Host Cut', 'The highest percentage of a host''s post-commission earnings a partner is allowed to keep as their own cut. Partners set each host''s actual cut (Hosts page) up to this cap.', true, '5')
ON CONFLICT (id) DO NOTHING;
