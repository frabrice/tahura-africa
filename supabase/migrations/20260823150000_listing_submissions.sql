/*
  # Listing submissions: hosts propose, partners approve, ops watches

  ## Why
  20260823120000 let hosts insert directly into partner_listings as
  status='pending_approval', gated by an authenticated-role RLS policy
  requiring partner_hosts.traveler_user_id = auth.uid(). That's broken
  today: not a single partner_hosts row has traveler_user_id set (hosts
  are still 100% on the legacy anon-key login), so the policy could never
  match and every real host submission failed with an RLS violation. On
  top of that, the UI's last step showed a guide picker - wrong, guides
  aren't a host's concern; a host submission should end at "submit for
  review."

  ## What this does
  Replaces the partner_listings-direct approach with a dedicated
  `listing_submissions` staging table: a host inserts here (never touches
  partner_listings directly), a partner reviews and either approves - which
  creates the real partner_listings row and links back via
  resulting_listing_id - or rejects with a reason the host can see. Ops
  gets read-only visibility across all of it (no approve/reject action -
  Ops isn't the approver, just wants oversight to nudge partners).

  Also drops the 3 host-facing RLS policies added on partner_listings in
  20260823120000 (submit/edit/withdraw) - hosts no longer write to that
  table at all, so those policies are now just an open door to nowhere
  useful. Leaves partner_listings.created_by_host_id/rejection_reason and
  the widened status CHECK in place (harmless, unused going forward).

  RLS follows this app's established hybrid trust model: anon-role
  policies (open, enforced at the app layer) so today's legacy-login hosts
  and partners work right now, plus authenticated-role policies scoped by
  identity for whenever they migrate to real Supabase Auth sessions - same
  dual pattern already used for partner_hosts/bookings/guides.
*/

DROP POLICY IF EXISTS "Hosts can submit listings for partner approval" ON partner_listings;
DROP POLICY IF EXISTS "Hosts can edit their own pending or rejected listings" ON partner_listings;
DROP POLICY IF EXISTS "Hosts can withdraw their own pending or rejected listings" ON partner_listings;

CREATE TABLE IF NOT EXISTS listing_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES partner_hosts(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  listing_type text NOT NULL CHECK (listing_type IN ('experience', 'homestay', 'itinerary')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location jsonb NOT NULL DEFAULT '{"name": "", "region": ""}',
  pricing jsonb NOT NULL DEFAULT '{}',
  details jsonb DEFAULT '{}',
  media text[] DEFAULT '{}',
  whats_included text[] DEFAULT '{}',
  what_to_bring text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  itinerary_days jsonb DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  rejection_reason text,
  resulting_listing_id uuid REFERENCES partner_listings(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE listing_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_listing_submissions_host ON listing_submissions(host_id);
CREATE INDEX IF NOT EXISTS idx_listing_submissions_partner ON listing_submissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_listing_submissions_status ON listing_submissions(status);

-- anon (legacy login - the only login path any host or most partners use today)
CREATE POLICY "Anon can view listing submissions"
  ON listing_submissions FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can create listing submissions"
  ON listing_submissions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update listing submissions"
  ON listing_submissions FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete listing submissions"
  ON listing_submissions FOR DELETE TO anon USING (true);

-- authenticated: host, scoped to their own submissions (for whenever hosts
-- migrate to real Supabase Auth sessions)
CREATE POLICY "Hosts can view their own submissions"
  ON listing_submissions FOR SELECT TO authenticated
  USING (host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = (select auth.uid())));

CREATE POLICY "Hosts can create their own submissions"
  ON listing_submissions FOR INSERT TO authenticated
  WITH CHECK (
    host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = (select auth.uid()))
    AND partner_id = (SELECT partner_id FROM partner_hosts WHERE id = listing_submissions.host_id)
  );

CREATE POLICY "Hosts can edit or withdraw their own pending submissions"
  ON listing_submissions FOR UPDATE TO authenticated
  USING (
    status IN ('pending_review', 'rejected')
    AND host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = (select auth.uid()))
  )
  WITH CHECK (
    status IN ('pending_review', 'rejected')
    AND host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = (select auth.uid()))
  );

CREATE POLICY "Hosts can delete their own pending submissions"
  ON listing_submissions FOR DELETE TO authenticated
  USING (
    status IN ('pending_review', 'rejected')
    AND host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = (select auth.uid()))
  );

-- authenticated: partner, scoped to their own submissions
CREATE POLICY "Partners can view their own submissions"
  ON listing_submissions FOR SELECT TO authenticated
  USING (partner_id = (select auth.uid()));

CREATE POLICY "Partners can review their own submissions"
  ON listing_submissions FOR UPDATE TO authenticated
  USING (partner_id = (select auth.uid()))
  WITH CHECK (partner_id = (select auth.uid()));

-- authenticated: ops, read-only across everything
CREATE POLICY "Ops can view all submissions"
  ON listing_submissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));
