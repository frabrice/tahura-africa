/*
  # Let Ops write to partner_hosts under a real Supabase Auth session

  ## Why
  Approving a host application inserts a new partner_hosts row on the
  applicant's behalf, under whichever partner Ops selects - not the
  logged-in user's own partner_id. partner_hosts' authenticated-role
  policies only ever allowed "partner_id = auth.uid()" (a partner
  managing their own hosts), with no path for Ops to write on another
  partner's behalf. This worked by accident as long as Ops was on the
  legacy anon-key login (covered by the fully-permissive anon
  policies) - now that the Ops account has a real Supabase Auth
  session (just fixed separately), those anon policies no longer
  apply and every host-application approval fails outright with an
  RLS violation. guides/host_guide_applications/system_rules already
  had the equivalent "is this caller an active ops account" policy;
  partner_hosts predates that pattern and never got it.
*/

CREATE POLICY "Ops can create hosts for any partner"
  ON partner_hosts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));

CREATE POLICY "Ops can update any host"
  ON partner_hosts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));

CREATE POLICY "Ops can delete any host"
  ON partner_hosts FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));
