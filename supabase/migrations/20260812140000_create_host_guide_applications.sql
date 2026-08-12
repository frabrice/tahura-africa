/*
  # Become a Local — Host/Guide application funnel

  ## Why
  Today a traveler can only become a Host or Guide if a Partner or Ops admin
  manually creates the record for them first (partner_hosts / guides). There
  is no self-serve way to apply. This adds a public application table backing
  a new "Become a Local" landing page + form, and an Operations review queue.

  ## What this does
  1. `host_guide_applications` — one shared table for both roles (mirrors how
     `withdrawal_requests` already handles dual-purpose host/guide rows),
     with nullable type-specific columns and a full review lifecycle
     (pending/approved/rejected, reviewed_by/at, resulting_host_id/guide_id
     for traceability once Ops converts an approved application into a real
     record).
  2. RLS is intentionally NOT this app's usual anon-everywhere convention —
     this table holds real applicant PII (name/email/phone, a free-text
     "why do you want to join" field people may over-share in) with zero
     legitimate anon read use case. INSERT stays anon (the whole point is a
     public form, no account required). SELECT/UPDATE require a real
     Supabase Auth session (`TO authenticated`) tied to an active operations
     portal_users row — mirrors the tightening already done this session for
     system_rules writes and the harden_* migrations.
     NOTE: as of this migration, the live Operations admin has NOT completed
     the Supabase-Auth invite migration (portal_users.auth_user_id IS NULL
     for it) — that admin needs to be migrated (invite a new admin account +
     complete /portal/activate) before anyone can see this queue. This is a
     deliberate trade-off given the PII involved, not an oversight.
  3. No new storage policy needed — the `listings` bucket already has an
     open anon+authenticated INSERT policy (20260312181025), so applicant
     photos just land in a new `applications/` folder there, same pattern
     CreateHostForm.tsx already uses (`host-pictures/`).
*/

CREATE TABLE IF NOT EXISTS host_guide_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_type text NOT NULL CHECK (applicant_type IN ('host', 'guide')),

  -- shared
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  bio text NOT NULL DEFAULT '',
  profile_picture text DEFAULT '',
  languages text[] NOT NULL DEFAULT '{}',
  years_experience integer NOT NULL DEFAULT 0,
  motivation text NOT NULL DEFAULT '',

  -- host-specific
  host_expertise text[] DEFAULT '{}',
  preferred_partner_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,

  -- guide-specific
  guide_specializations text[] DEFAULT '{}',
  operating_region text DEFAULT '',

  -- optional — applying with no Tahura account at all must work
  traveler_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- lifecycle
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  internal_notes text,
  resulting_host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL,
  resulting_guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE host_guide_applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_host_guide_applications_status ON host_guide_applications(status);
CREATE INDEX IF NOT EXISTS idx_host_guide_applications_type ON host_guide_applications(applicant_type);
CREATE INDEX IF NOT EXISTS idx_host_guide_applications_traveler ON host_guide_applications(traveler_user_id);

CREATE POLICY "Anyone can submit an application"
  ON host_guide_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated ops can view applications"
  ON host_guide_applications FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));

CREATE POLICY "Authenticated ops can update applications"
  ON host_guide_applications FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));
