/*
  # Fix partner_listings/partner_hosts authenticated-role write policies

  ## Why
  Found live while testing the LocationPicker on the partner edit page: a
  real, logged-in (Supabase Auth) partner editing their own listing gets no
  error, but the change never persists. Root cause is the same class of bug
  fixed for bookings/transport_zones/partner_hosts-for-ops earlier this
  session: "Partners can create/update/delete own listings" and the
  equivalent partner_hosts policies (20260505095105) check
  `partner_id = (select auth.uid())`, but `partner_id` stores
  `portal_users.id`, not the Supabase Auth user id - `auth.uid()` only
  matches `portal_users.auth_user_id`. The condition can never be true, so
  every write from a real partner session silently affects 0 rows.

  This is broader than the earlier partner_hosts-for-ops fix
  (20260822150000): that migration added a working path for Ops to write
  partner_hosts on another partner's behalf, but never touched the
  partner's own broken self-service policies - so a partner still can't
  create/edit/delete their own hosts OR listings directly today. This
  migration fixes the partner-self policies on both tables, and adds the
  matching Ops-can-act-for-any-partner policies on partner_listings
  (partner_hosts already got its Ops policies in 20260822150000) since
  operations/local/ListingsTab.tsx creates listings on a partner's behalf
  the same way host-application approval does for partner_hosts.
*/

-- ============================================================
-- partner_listings: fix partner-self policies
-- ============================================================
DROP POLICY IF EXISTS "Partners can create listings" ON partner_listings;
DROP POLICY IF EXISTS "Partners can update own listings" ON partner_listings;
DROP POLICY IF EXISTS "Partners can delete own listings" ON partner_listings;

CREATE POLICY "Partners can create own listings"
  ON partner_listings FOR INSERT TO authenticated
  WITH CHECK (partner_id IN (
    SELECT id FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'partner' AND is_active = true
  ));

CREATE POLICY "Partners can update their own listings"
  ON partner_listings FOR UPDATE TO authenticated
  USING (partner_id IN (
    SELECT id FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'partner' AND is_active = true
  ))
  WITH CHECK (partner_id IN (
    SELECT id FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'partner' AND is_active = true
  ));

CREATE POLICY "Partners can delete their own listings"
  ON partner_listings FOR DELETE TO authenticated
  USING (partner_id IN (
    SELECT id FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'partner' AND is_active = true
  ));

-- ============================================================
-- partner_listings: Ops can act on any partner's behalf
-- ============================================================
CREATE POLICY "Ops can create listings for any partner"
  ON partner_listings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));

CREATE POLICY "Ops can update any listing"
  ON partner_listings FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));

CREATE POLICY "Ops can delete any listing"
  ON partner_listings FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'operations' AND is_active = true
  ));

-- ============================================================
-- partner_hosts: fix partner-self policies (Ops-for-any-partner
-- policies already exist from 20260822150000)
-- ============================================================
DROP POLICY IF EXISTS "Partners can create hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Partners can update own hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Partners can delete own hosts" ON partner_hosts;

CREATE POLICY "Partners can create their own hosts"
  ON partner_hosts FOR INSERT TO authenticated
  WITH CHECK (partner_id IN (
    SELECT id FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'partner' AND is_active = true
  ));

CREATE POLICY "Partners can update their own hosts"
  ON partner_hosts FOR UPDATE TO authenticated
  USING (partner_id IN (
    SELECT id FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'partner' AND is_active = true
  ))
  WITH CHECK (partner_id IN (
    SELECT id FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'partner' AND is_active = true
  ));

CREATE POLICY "Partners can delete their own hosts"
  ON partner_hosts FOR DELETE TO authenticated
  USING (partner_id IN (
    SELECT id FROM portal_users
    WHERE auth_user_id = (select auth.uid()) AND portal_type = 'partner' AND is_active = true
  ));
