/*
  # Restore Core Tables - Part 3: Bookings, Host Schedules, Saved Items, Payments

  Creates:
  - bookings: core booking records for all listing types
  - host_schedules: partner host weekly schedules
  - saved_items: traveler saved listings and attractions
  - payments: Pesapal payment transactions
  - schedule_overrides: date-specific availability exceptions
  - government_policies: government portal policy records
*/

-- Bookings table (comprehensive - includes all columns added in later migrations)
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text UNIQUE NOT NULL DEFAULT concat('BK-', floor(random() * 900000 + 100000)::text),
  traveler_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  traveler_name text NOT NULL,
  traveler_email text NOT NULL,
  traveler_profile_picture text,
  booking_type text NOT NULL CHECK (booking_type IN ('experience', 'homestay', 'attraction', 'itinerary')),
  item_id uuid,
  item_title text NOT NULL,
  partner_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  institution_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL,
  package_name text,
  guide_name text,
  session text,
  booking_date date NOT NULL,
  guests integer NOT NULL DEFAULT 1,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  service_fee numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  entry_fee_amount numeric(10,2) DEFAULT 0,
  tip_amount numeric(10,2) DEFAULT 0,
  special_requests text DEFAULT '',
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  pesapal_tracking_id text,
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by text,
  duration_days integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Travelers can view their own bookings"
  ON bookings FOR SELECT TO authenticated
  USING ((select auth.uid()) = traveler_id);

CREATE POLICY "Travelers can insert bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = traveler_id);

CREATE POLICY "Anonymous users can insert bookings"
  ON bookings FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Partners can view bookings for their listings"
  ON bookings FOR SELECT TO anon USING (true);

CREATE POLICY "Partners can update booking status"
  ON bookings FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Hosts can view bookings for their listings"
  ON bookings FOR SELECT TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Hosts can update booking status"
  ON bookings FOR UPDATE TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Guides can view their assigned bookings"
  ON bookings FOR SELECT TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Guides can update their booking status"
  ON bookings FOR UPDATE TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Travelers can update cancellation fields"
  ON bookings FOR UPDATE TO authenticated
  USING (traveler_id = (select auth.uid()))
  WITH CHECK (traveler_id = (select auth.uid()));

CREATE INDEX IF NOT EXISTS idx_bookings_traveler_id ON bookings(traveler_id);
CREATE INDEX IF NOT EXISTS idx_bookings_partner_id ON bookings(partner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_institution_id ON bookings(institution_id);
CREATE INDEX IF NOT EXISTS idx_bookings_host_id ON bookings(host_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guide_id ON bookings(guide_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Host schedules table
CREATE TABLE IF NOT EXISTS host_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid REFERENCES partner_hosts(id) ON DELETE CASCADE NOT NULL,
  day_of_week text NOT NULL,
  start_time time DEFAULT '09:00',
  end_time time DEFAULT '17:00',
  is_working boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(host_id, day_of_week)
);

ALTER TABLE host_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view host schedules"
  ON host_schedules FOR SELECT USING (true);

CREATE POLICY "Partners can insert host schedules"
  ON host_schedules FOR INSERT WITH CHECK (true);

CREATE POLICY "Partners can update host schedules"
  ON host_schedules FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Partners can delete host schedules"
  ON host_schedules FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_host_schedules_host_id ON host_schedules(host_id);

-- Saved items table
CREATE TABLE IF NOT EXISTS saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES partner_listings(id) ON DELETE CASCADE,
  listing_type text CHECK (listing_type IN ('experience', 'homestay')),
  institution_id uuid REFERENCES institution_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_listing UNIQUE (user_id, listing_id),
  CONSTRAINT unique_user_institution UNIQUE (user_id, institution_id),
  CONSTRAINT saved_item_type CHECK (
    (listing_id IS NOT NULL AND institution_id IS NULL) OR
    (listing_id IS NULL AND institution_id IS NOT NULL)
  )
);

ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved items"
  ON saved_items FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own saved items"
  ON saved_items FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own saved items"
  ON saved_items FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_listing_id ON saved_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_institution_id ON saved_items(institution_id);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  booking_ref text NOT NULL,
  pesapal_order_tracking_id text,
  pesapal_merchant_reference text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'invalid')),
  payment_method text,
  payment_account text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Travelers can read own payments"
  ON payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
        AND bookings.traveler_id = (select auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON payments(booking_id);
CREATE INDEX IF NOT EXISTS payments_merchant_reference_idx ON payments(pesapal_merchant_reference);
CREATE INDEX IF NOT EXISTS payments_tracking_id_idx ON payments(pesapal_order_tracking_id);

-- Schedule overrides table
CREATE TABLE IF NOT EXISTS schedule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('host', 'guide')),
  entity_id uuid NOT NULL,
  override_date date NOT NULL,
  is_available boolean NOT NULL DEFAULT false,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(entity_type, entity_id, override_date)
);

ALTER TABLE schedule_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view schedule overrides"
  ON schedule_overrides FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow authenticated to manage schedule overrides"
  ON schedule_overrides FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated to update schedule overrides"
  ON schedule_overrides FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated to delete schedule overrides"
  ON schedule_overrides FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_schedule_overrides_entity ON schedule_overrides(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_date ON schedule_overrides(override_date);

-- Government policies table
CREATE TABLE IF NOT EXISTS government_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  focus_points text[] DEFAULT '{}',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE government_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view government policies"
  ON government_policies FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow authenticated to insert government policies"
  ON government_policies FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated to update government policies"
  ON government_policies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated to delete government policies"
  ON government_policies FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_government_policies_portal_user ON government_policies(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_government_policies_status ON government_policies(status);
CREATE INDEX IF NOT EXISTS idx_government_policies_priority ON government_policies(priority);
