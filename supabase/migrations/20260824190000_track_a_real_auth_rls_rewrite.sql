/*
  # Track A: rewrite RLS to require real Supabase Auth, now that every real
  account has been migrated (or wiped and will be recreated through the
  invite flow)

  ## Why
  The RLS audit found that almost every write policy on this platform was
  `anon`-open with `USING (true)`/`WITH CHECK (true)`, because portal login
  never established a real Supabase Auth session the database could verify
  (see auth.ts changes in this same remediation pass). That's now fixed at
  the login layer; this migration is the other half — replacing every
  anon-open policy with one that actually checks `auth.uid()` against
  `portal_users.auth_user_id` (or `traveler_user_id` for hosts/guides, who
  authenticate as travelers), and removing the seven-table `portal_users.id
  = auth.uid()` bug found in the same audit (should always have been
  `auth_user_id`).

  ## Approach per table
  - SELECT stays open where the app is a public marketplace (listings,
    hosts, partners) — reading isn't the risk here, writing is.
  - INSERT/UPDATE/DELETE now require `authenticated` + ownership (via the
    auth_user_id/traveler_user_id join) or Ops (`portal_type = 'operations'`).
  - A handful of genuinely public-facing forms (reviews, waitlist, support
    tickets, custom quote requests, booking creation) keep an anon INSERT
    path, since requiring login there would break real product flows — but
    WITH CHECK is added where there's an obvious invariant to enforce
    (e.g. a new booking can't be inserted already marked "paid").
  - Everything else that was anon-writable purely because nobody had gone
    back to tighten it is moved to Ops-only.
*/

-- ============================================================
-- portal_users
-- ============================================================
DROP POLICY IF EXISTS "Anyone can create portal users" ON portal_users;
DROP POLICY IF EXISTS "Anyone can update portal users" ON portal_users;
DROP POLICY IF EXISTS "Anyone can delete portal users" ON portal_users;

CREATE POLICY "ops_full_access_portal_users" ON portal_users FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users pu WHERE pu.auth_user_id = auth.uid() AND pu.portal_type = 'operations' AND pu.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users pu WHERE pu.auth_user_id = auth.uid() AND pu.portal_type = 'operations' AND pu.is_active = true));

CREATE POLICY "self_update_portal_users" ON portal_users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

-- ============================================================
-- partner_hosts
-- ============================================================
DROP POLICY IF EXISTS "Anon can create hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Anon can update hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Anon can delete hosts" ON partner_hosts;

CREATE POLICY "ops_full_access_partner_hosts" ON partner_hosts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

CREATE POLICY "partner_manage_own_hosts" ON partner_hosts FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "host_update_own_profile" ON partner_hosts FOR UPDATE TO authenticated
  USING (traveler_user_id = auth.uid()) WITH CHECK (traveler_user_id = auth.uid());

-- ============================================================
-- partner_listings
-- ============================================================
DROP POLICY IF EXISTS "Anon can create listings" ON partner_listings;
DROP POLICY IF EXISTS "Anon can update listings" ON partner_listings;
DROP POLICY IF EXISTS "Anon can delete listings" ON partner_listings;

CREATE POLICY "ops_full_access_partner_listings" ON partner_listings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

CREATE POLICY "partner_manage_own_listings" ON partner_listings FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid()));

-- ============================================================
-- bookings — the "Partners can update booking status" anon policy was the
-- single worst finding in the audit: literally anyone could flip any
-- booking's status with no ownership check at all.
-- ============================================================
DROP POLICY IF EXISTS "Partners can update booking status" ON bookings;

CREATE POLICY "ops_update_bookings" ON bookings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

CREATE POLICY "partner_update_own_booking_status" ON bookings FOR UPDATE TO authenticated
  USING (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid()));

-- A fresh booking must always start unpaid — payment_status only ever
-- flips via the payment edge functions (service_role, bypasses RLS).
DROP POLICY IF EXISTS "Anonymous users can insert bookings" ON bookings;
CREATE POLICY "anon_insert_unpaid_bookings" ON bookings FOR INSERT TO anon
  WITH CHECK (payment_status IN ('pending', 'unpaid') OR payment_status IS NULL);

-- ============================================================
-- withdrawal_requests — Ops review was anon-open with no restriction
-- ============================================================
DROP POLICY IF EXISTS "Ops can review withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Ops can view all withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Anon can submit withdrawal requests" ON withdrawal_requests;

CREATE POLICY "ops_full_access_withdrawal_requests" ON withdrawal_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

-- ============================================================
-- partner_payout_settings — anon could redirect anyone's payout destination
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view partner payout settings" ON partner_payout_settings;
DROP POLICY IF EXISTS "Anyone can upsert partner payout settings" ON partner_payout_settings;
DROP POLICY IF EXISTS "Anyone can update partner payout settings" ON partner_payout_settings;

CREATE POLICY "ops_full_access_payout_settings" ON partner_payout_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

CREATE POLICY "partner_manage_own_payout_settings" ON partner_payout_settings FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid()));

-- ============================================================
-- system_rules / transport_zones — drop the anon "legacy_ops" policies
-- added back when no admin account was migrated yet; every Ops account is
-- migrated now
-- ============================================================
DROP POLICY IF EXISTS "update_system_rules_anon_legacy_ops" ON system_rules;
DROP POLICY IF EXISTS "insert_system_rules_anon_legacy_ops" ON system_rules;
DROP POLICY IF EXISTS "insert_system_rules_anon" ON system_rules;
DROP POLICY IF EXISTS "update_system_rules_anon" ON system_rules;

DROP POLICY IF EXISTS "Anon can update transport zones" ON transport_zones;
CREATE POLICY "ops_update_transport_zones" ON transport_zones FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

-- ============================================================
-- institution_profiles / guides / programs / program_guides /
-- guide_schedules / host_schedules — no self-service login exists for
-- these; every write legitimately comes from Ops, so this is purely
-- "require the caller to actually be Ops" with no ownership nuance needed
-- ============================================================
DROP POLICY IF EXISTS "Institution portal users can insert their profile" ON institution_profiles;
DROP POLICY IF EXISTS "Institution portal users can update their profile" ON institution_profiles;
CREATE POLICY "ops_manage_institution_profiles" ON institution_profiles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Portal users can insert guides" ON guides;
DROP POLICY IF EXISTS "Portal users can update guides they created" ON guides;
DROP POLICY IF EXISTS "Portal users can delete guides they created" ON guides;
CREATE POLICY "ops_manage_guides" ON guides FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Portal users can insert programs" ON programs;
DROP POLICY IF EXISTS "Portal users can update programs they created" ON programs;
DROP POLICY IF EXISTS "Portal users can delete programs they created" ON programs;
CREATE POLICY "ops_manage_programs" ON programs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Portal users can assign guides to programs" ON program_guides;
DROP POLICY IF EXISTS "Portal users can remove guide assignments" ON program_guides;
CREATE POLICY "ops_manage_program_guides" ON program_guides FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Portal users can insert guide schedules" ON guide_schedules;
DROP POLICY IF EXISTS "Portal users can update guide schedules" ON guide_schedules;
DROP POLICY IF EXISTS "Portal users can delete guide schedules" ON guide_schedules;
CREATE POLICY "ops_manage_guide_schedules" ON guide_schedules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Partners can insert host schedules" ON host_schedules;
DROP POLICY IF EXISTS "Partners can update host schedules" ON host_schedules;
DROP POLICY IF EXISTS "Partners can delete host schedules" ON host_schedules;
CREATE POLICY "ops_manage_host_schedules" ON host_schedules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

CREATE POLICY "partner_manage_own_host_schedules" ON host_schedules FOR ALL TO authenticated
  USING (host_id IN (SELECT ph.id FROM partner_hosts ph JOIN portal_users pu ON pu.id = ph.partner_id WHERE pu.auth_user_id = auth.uid()))
  WITH CHECK (host_id IN (SELECT ph.id FROM partner_hosts ph JOIN portal_users pu ON pu.id = ph.partner_id WHERE pu.auth_user_id = auth.uid()));

-- ============================================================
-- listing_submissions — host-submits/partner-approves workflow; anon was
-- wide open for insert/update/delete
-- ============================================================
DROP POLICY IF EXISTS "Anon can create listing submissions" ON listing_submissions;
DROP POLICY IF EXISTS "Anon can update listing submissions" ON listing_submissions;
DROP POLICY IF EXISTS "Anon can delete listing submissions" ON listing_submissions;

CREATE POLICY "ops_view_listing_submissions" ON listing_submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

CREATE POLICY "partner_manage_own_listing_submissions" ON listing_submissions FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "host_manage_own_listing_submissions" ON listing_submissions FOR ALL TO authenticated
  USING (host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid()))
  WITH CHECK (host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid()));

-- ============================================================
-- transports — anon could read and insert every traveler's pickup/dropoff
-- record with no login at all
-- ============================================================
DROP POLICY IF EXISTS "Anon sessions can view transports" ON transports;
DROP POLICY IF EXISTS "Anon sessions can insert transports" ON transports;

-- ============================================================
-- Fix the wrong-column bug: portal_users.id was compared to auth.uid()
-- instead of portal_users.auth_user_id, which meant these "Ops full
-- access" policies could never match anyone (functional bug, not a leak —
-- but worth fixing in the same pass since it's the same policies being
-- rewritten)
-- ============================================================
DROP POLICY IF EXISTS "operations_full_charging_access" ON charging_stations;
CREATE POLICY "operations_full_charging_access" ON charging_stations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "operations_full_schedule_access" ON driver_schedules;
CREATE POLICY "operations_full_schedule_access" ON driver_schedules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "operations_full_driver_vehicle_access" ON driver_vehicles;
CREATE POLICY "operations_full_driver_vehicle_access" ON driver_vehicles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "operations_full_driver_access" ON drivers;
CREATE POLICY "operations_full_driver_access" ON drivers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "operations_full_transport_review_access" ON transport_rating_reviews;
CREATE POLICY "operations_full_transport_review_access" ON transport_rating_reviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "operations_full_transport_access" ON transports;
CREATE POLICY "operations_full_transport_access" ON transports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "operations_full_vehicle_access" ON vehicles;
CREATE POLICY "operations_full_vehicle_access" ON vehicles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

-- ============================================================
-- government_policies — any logged-in traveler could delete/edit this;
-- restrict to Ops
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated to update government policies" ON government_policies;
DROP POLICY IF EXISTS "Allow authenticated to delete government policies" ON government_policies;
DROP POLICY IF EXISTS "Allow authenticated to insert government policies" ON government_policies;
CREATE POLICY "ops_manage_government_policies" ON government_policies FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

-- ============================================================
-- Ops/finance/admin tables that were anon-open purely because nobody had
-- gone back to tighten them — moved to Ops-only
-- ============================================================
DROP POLICY IF EXISTS "Anyone can create capacity rules" ON capacity_rules;
DROP POLICY IF EXISTS "Anyone can update capacity rules" ON capacity_rules;
DROP POLICY IF EXISTS "Anyone can delete capacity rules" ON capacity_rules;
CREATE POLICY "ops_manage_capacity_rules" ON capacity_rules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Anyone can update content flags" ON content_flags;
CREATE POLICY "ops_update_content_flags" ON content_flags FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Anyone can update custom quotes" ON custom_quotes;
CREATE POLICY "ops_partner_update_custom_quotes" ON custom_quotes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true)
    OR partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true)
    OR partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can update support tickets" ON support_tickets;
CREATE POLICY "ops_update_support_tickets" ON support_tickets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Anyone can update ticket messages" ON ticket_messages;
CREATE POLICY "ops_update_ticket_messages" ON ticket_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Anyone can update notifications" ON notifications;
CREATE POLICY "ops_update_notifications" ON notifications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Anon can update admin conversations" ON admin_conversations;
CREATE POLICY "ops_update_admin_conversations" ON admin_conversations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Anyone can update admin messages" ON admin_messages;
CREATE POLICY "ops_update_admin_messages" ON admin_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Authenticated can update host availability overrides" ON host_availability_overrides;
DROP POLICY IF EXISTS "Authenticated can delete host availability overrides" ON host_availability_overrides;
CREATE POLICY "ops_manage_host_availability_overrides" ON host_availability_overrides FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));
CREATE POLICY "partner_manage_own_host_availability" ON host_availability_overrides FOR ALL TO authenticated
  USING (host_id IN (SELECT ph.id FROM partner_hosts ph JOIN portal_users pu ON pu.id = ph.partner_id WHERE pu.auth_user_id = auth.uid()))
  WITH CHECK (host_id IN (SELECT ph.id FROM partner_hosts ph JOIN portal_users pu ON pu.id = ph.partner_id WHERE pu.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can update guide salary payments" ON guide_salary_payments;
CREATE POLICY "ops_update_guide_salary_payments" ON guide_salary_payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Anyone can update guide tips" ON guide_tips;
CREATE POLICY "ops_update_guide_tips" ON guide_tips FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

DROP POLICY IF EXISTS "Anyone can insert achievements" ON partner_achievements;
CREATE POLICY "ops_insert_partner_achievements" ON partner_achievements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

-- Schedule overrides / anon "sessions can manage" was a blanket ALL grant
DROP POLICY IF EXISTS "Anon sessions can manage schedule overrides" ON schedule_overrides;
DROP POLICY IF EXISTS "Allow authenticated to manage schedule overrides" ON schedule_overrides;
DROP POLICY IF EXISTS "Allow authenticated to update schedule overrides" ON schedule_overrides;
DROP POLICY IF EXISTS "Allow authenticated to delete schedule overrides" ON schedule_overrides;
CREATE POLICY "ops_manage_schedule_overrides" ON schedule_overrides FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = auth.uid() AND portal_type = 'operations' AND is_active = true));

-- ============================================================
-- Retire the anon-only login RPC — no longer called from anywhere in the
-- app (auth.ts now goes through Supabase Auth exclusively)
-- ============================================================
DROP FUNCTION IF EXISTS public.verify_portal_login(text, text, text);
