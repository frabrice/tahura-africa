/*
# Create Tahura Mobility Schema

## Overview
This migration creates the complete database schema for Tahura Mobility - an integrated
tourism transport infrastructure system. It enables travelers to book transport alongside
their experiences, attractions, and homestays.

## New Tables

### 1. vehicles
Stores all vehicles in the Tahura Mobility network.
- `id` (uuid, primary key)
- `owner_type` (text) - 'tahura', 'partner', or 'independent'
- `owner_id` (uuid, nullable) - references portal_users for partner vehicles
- `vehicle_type` (text) - 'sedan', 'suv', 'van', 'minibus', 'motorcycle'
- `plate_number` (text, unique) - vehicle registration
- `capacity` (integer) - passenger capacity
- `is_ev` (boolean) - electric vehicle flag
- `year_manufactured`, `model`, `color`
- `amenities` (text[]) - wifi, ac, charging_ports, coolbox, etc.
- `status` (text) - 'active', 'maintenance', 'retired'
- `current_location` (jsonb) - {lat, lng, last_updated}
- `documents` (jsonb) - {insurance_url, inspection_url, license_url}

### 2. drivers
Stores driver profiles and performance metrics.
- `id` (uuid, primary key)
- `user_account_type` (text) - 'tahura_employee', 'partner_employee', 'independent'
- `portal_user_id` (uuid, nullable) - for partner employees
- `traveler_user_id` (uuid, nullable) - for independent contractors
- `full_name`, `phone`, `email`, `profile_picture`
- `license_number` (text), `license_expiry` (date)
- `languages` (text[]), `specializations` (text[])
- `status` (text) - 'pending_verification', 'active', 'suspended', 'inactive'
- `tier` (text) - 'bronze', 'silver', 'gold', 'platinum'
- `rating`, `total_trips`, `total_kilometers`
- `max_engagements_per_day` (integer, default 8)
- `bank_account`, `documents` (jsonb)

### 3. driver_vehicles
Links drivers to vehicles (many-to-many, supports primary assignment).

### 4. transports
Core transport booking records.
- Links to bookings, drivers, vehicles
- Transport types: 'pickup', 'dropoff', 'roundtrip', 'inter_location'
- Pickup/dropoff locations (jsonb)
- Scheduled and actual times
- Distance, fare calculations, surge multiplier
- Status: pending_dispatch through completed/cancelled
- Dispatch score, ratings

### 5. transport_zones
Defines pricing zones for fare calculation.
- Region, base_fare, per_km_rate, min_fare
- Surge rules (peak hours, weekend/event multipliers)
- Coverage area

### 6. charging_stations
EV charging infrastructure for the fleet.

### 7. driver_schedules
Daily driver availability and assignment.

### 8. transport_rating_reviews
Transport-specific ratings and reviews.

## Modified Tables

### partner_listings (added columns)
- `transport_required`, `transport_included`
- `transport_mandatory_for` ('none', 'all', 'foreign_travelers', 'first_time_bookers')
- `transport_default_pickup` (jsonb)
- `transport_zone_id` (FK)

### bookings (added columns)
- `transport_requested` (boolean)
- `transport_id` (FK to transports)

### portal_users (added columns)
- `has_mobility_fleet`, `mobility_agreement_signed`, `mobility_agreement_date`

## Security
- RLS enabled on all new tables
- Owner-scoped policies for drivers, vehicles, transports
- Operations can access all mobility data
- Partners can access their own fleet data
*/

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('tahura', 'partner', 'independent')),
  owner_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('sedan', 'suv', 'van', 'minibus', 'motorcycle')),
  plate_number text UNIQUE NOT NULL,
  capacity integer NOT NULL DEFAULT 4,
  is_ev boolean NOT NULL DEFAULT false,
  year_manufactured integer,
  model text,
  color text,
  amenities text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  current_location jsonb DEFAULT '{"lat": null, "lng": null, "last_updated": null}',
  documents jsonb DEFAULT '{"insurance_url": null, "inspection_url": null, "license_url": null}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partners_manage_own_vehicles" ON vehicles;
CREATE POLICY "partners_manage_own_vehicles" ON vehicles FOR ALL
  TO authenticated
  USING (
    owner_type = 'partner' AND owner_id = auth.uid()
  )
  WITH CHECK (
    owner_type = 'partner' AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "operations_full_vehicle_access" ON vehicles;
CREATE POLICY "operations_full_vehicle_access" ON vehicles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

DROP POLICY IF EXISTS "travelers_view_active_vehicles" ON vehicles;
CREATE POLICY "travelers_view_active_vehicles" ON vehicles FOR SELECT
  TO authenticated
  USING (status = 'active');

-- ============================================================================
-- DRIVERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_type text NOT NULL CHECK (user_account_type IN ('tahura_employee', 'partner_employee', 'independent')),
  portal_user_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  traveler_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  profile_picture text,
  license_number text NOT NULL,
  license_expiry date NOT NULL,
  languages text[] DEFAULT '{"English"}',
  specializations text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'active', 'suspended', 'inactive')),
  tier text NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  rating decimal(3,2) DEFAULT 0.00,
  total_trips integer DEFAULT 0,
  total_kilometers decimal(10,2) DEFAULT 0.00,
  max_engagements_per_day integer DEFAULT 8,
  bank_account jsonb DEFAULT '{"bank_name": null, "account_number": null, "account_name": null}',
  documents jsonb DEFAULT '{"id_card_url": null, "license_url": null, "certifications": []}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_view_own_profile" ON drivers;
CREATE POLICY "drivers_view_own_profile" ON drivers FOR SELECT
  TO authenticated
  USING (
    traveler_user_id = auth.uid() 
    OR portal_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "drivers_update_own_profile" ON drivers;
CREATE POLICY "drivers_update_own_profile" ON drivers FOR UPDATE
  TO authenticated
  USING (
    traveler_user_id = auth.uid() 
    OR portal_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "operations_full_driver_access" ON drivers;
CREATE POLICY "operations_full_driver_access" ON drivers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

DROP POLICY IF EXISTS "partners_view_assigned_drivers" ON drivers;
CREATE POLICY "partners_view_assigned_drivers" ON drivers FOR SELECT
  TO authenticated
  USING (
    user_account_type = 'partner_employee' 
    AND portal_user_id = auth.uid()
  );

-- ============================================================================
-- DRIVER_VEHICLES (Junction Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS driver_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  assigned_at date DEFAULT CURRENT_DATE,
  UNIQUE(driver_id, vehicle_id)
);

ALTER TABLE driver_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_view_own_vehicle_assignments" ON driver_vehicles;
CREATE POLICY "drivers_view_own_vehicle_assignments" ON driver_vehicles FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "operations_full_driver_vehicle_access" ON driver_vehicles;
CREATE POLICY "operations_full_driver_vehicle_access" ON driver_vehicles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

-- ============================================================================
-- TRANSPORT_ZONES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transport_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  base_fare decimal(10,2) NOT NULL DEFAULT 1500.00,
  per_km_rate decimal(10,2) NOT NULL DEFAULT 300.00,
  min_fare decimal(10,2) NOT NULL DEFAULT 3000.00,
  surge_rules jsonb DEFAULT '{"peak_hours": [], "weekend_multiplier": 1.0, "event_multiplier": 1.0}',
  coverage_area jsonb DEFAULT '{"center": null, "radius_km": null, "boundaries": null}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transport_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transport_zones_public_read" ON transport_zones;
CREATE POLICY "transport_zones_public_read" ON transport_zones FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "operations_full_zone_access" ON transport_zones;
CREATE POLICY "operations_full_zone_access" ON transport_zones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

-- ============================================================================
-- TRANSPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  transport_type text NOT NULL CHECK (transport_type IN ('pickup', 'dropoff', 'roundtrip', 'inter_location')),
  pickup_location jsonb NOT NULL DEFAULT '{"name": "", "address": "", "coordinates": null, "landmark": ""}',
  dropoff_location jsonb NOT NULL DEFAULT '{"name": "", "address": "", "coordinates": null, "landmark": ""}',
  scheduled_pickup_time timestamptz,
  actual_pickup_time timestamptz,
  scheduled_dropoff_time timestamptz,
  actual_dropoff_time timestamptz,
  distance_km decimal(10,2),
  base_fare decimal(10,2),
  per_km_rate decimal(10,2),
  total_fare decimal(10,2),
  surge_multiplier decimal(3,2) DEFAULT 1.00,
  status text NOT NULL DEFAULT 'pending_dispatch' CHECK (status IN (
    'pending_dispatch', 
    'dispatched', 
    'driver_en_route', 
    'arrived', 
    'in_progress', 
    'completed', 
    'cancelled'
  )),
  dispatch_score integer,
  dispatch_offered_at timestamptz,
  dispatch_accepted_at timestamptz,
  traveler_notes text,
  driver_notes text,
  rating decimal(3,2),
  cancellation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travelers_view_own_transports" ON transports;
CREATE POLICY "travelers_view_own_transports" ON transports FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE traveler_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "drivers_view_assigned_transports" ON transports;
CREATE POLICY "drivers_view_assigned_transports" ON transports FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "drivers_update_assigned_transports" ON transports;
CREATE POLICY "drivers_update_assigned_transports" ON transports FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "partners_view_booking_transports" ON transports;
CREATE POLICY "partners_view_booking_transports" ON transports FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE partner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "institutions_view_booking_transports" ON transports;
CREATE POLICY "institutions_view_booking_transports" ON transports FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE institution_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "operations_full_transport_access" ON transports;
CREATE POLICY "operations_full_transport_access" ON transports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

-- ============================================================================
-- CHARGING_STATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS charging_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  partner_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  location jsonb NOT NULL DEFAULT '{"lat": null, "lng": null}',
  address text,
  charger_type text NOT NULL CHECK (charger_type IN ('level2', 'dc_fast', 'supercharger')),
  num_stalls integer DEFAULT 1,
  available_stalls integer DEFAULT 1,
  pricing_per_kwh decimal(10,2),
  status text NOT NULL DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'planned')),
  amenities text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE charging_stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "charging_stations_public_read" ON charging_stations;
CREATE POLICY "charging_stations_public_read" ON charging_stations FOR SELECT
  TO anon, authenticated
  USING (status = 'operational');

DROP POLICY IF EXISTS "operations_full_charging_access" ON charging_stations;
CREATE POLICY "operations_full_charging_access" ON charging_stations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

DROP POLICY IF EXISTS "partners_manage_own_charging_stations" ON charging_stations;
CREATE POLICY "partners_manage_own_charging_stations" ON charging_stations FOR ALL
  TO authenticated
  USING (
    partner_id = auth.uid()
  );

-- ============================================================================
-- DRIVER_SCHEDULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS driver_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'break', 'off_duty', 'leave')),
  available_start_time time DEFAULT '07:00:00',
  available_end_time time DEFAULT '19:00:00',
  current_trip_id uuid REFERENCES transports(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, date)
);

ALTER TABLE driver_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_manage_own_schedule" ON driver_schedules;
CREATE POLICY "drivers_manage_own_schedule" ON driver_schedules FOR ALL
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "operations_full_schedule_access" ON driver_schedules;
CREATE POLICY "operations_full_schedule_access" ON driver_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

-- ============================================================================
-- TRANSPORT_RATING_REVIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transport_rating_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL REFERENCES transports(id) ON DELETE CASCADE,
  traveler_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transport_rating_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travelers_manage_own_transport_reviews" ON transport_rating_reviews;
CREATE POLICY "travelers_manage_own_transport_reviews" ON transport_rating_reviews FOR ALL
  TO authenticated
  USING (traveler_id = auth.uid());

DROP POLICY IF EXISTS "drivers_view_own_transport_reviews" ON transport_rating_reviews;
CREATE POLICY "drivers_view_own_transport_reviews" ON transport_rating_reviews FOR SELECT
  TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid()));

DROP POLICY IF EXISTS "operations_full_transport_review_access" ON transport_rating_reviews;
CREATE POLICY "operations_full_transport_review_access" ON transport_rating_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE id = auth.uid() 
      AND portal_type = 'operations'
    )
  );

-- ============================================================================
-- ADD COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add transport fields to partner_listings
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_required') THEN
    ALTER TABLE partner_listings ADD COLUMN transport_required boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_included') THEN
    ALTER TABLE partner_listings ADD COLUMN transport_included boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_mandatory_for') THEN
    ALTER TABLE partner_listings ADD COLUMN transport_mandatory_for text DEFAULT 'none' CHECK (transport_mandatory_for IN ('none', 'all', 'foreign_travelers', 'first_time_bookers'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_default_pickup') THEN
    ALTER TABLE partner_listings ADD COLUMN transport_default_pickup jsonb DEFAULT '{"type": "traveler_location"}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_zone_id') THEN
    ALTER TABLE partner_listings ADD COLUMN transport_zone_id uuid REFERENCES transport_zones(id);
  END IF;
END $$;

-- Add transport fields to bookings
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'transport_requested') THEN
    ALTER TABLE bookings ADD COLUMN transport_requested boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'transport_id') THEN
    ALTER TABLE bookings ADD COLUMN transport_id uuid REFERENCES transports(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'transport_status_snapshot') THEN
    ALTER TABLE bookings ADD COLUMN transport_status_snapshot text;
  END IF;
END $$;

-- Add mobility fields to portal_users
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'has_mobility_fleet') THEN
    ALTER TABLE portal_users ADD COLUMN has_mobility_fleet boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'mobility_agreement_signed') THEN
    ALTER TABLE portal_users ADD COLUMN mobility_agreement_signed boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'mobility_agreement_date') THEN
    ALTER TABLE portal_users ADD COLUMN mobility_agreement_date date;
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles USING GIN (current_location);

CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_tier ON drivers(tier);
CREATE INDEX IF NOT EXISTS idx_drivers_portal_user ON drivers(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_traveler_user ON drivers(traveler_user_id);

CREATE INDEX IF NOT EXISTS idx_transports_booking ON transports(booking_id);
CREATE INDEX IF NOT EXISTS idx_transports_driver ON transports(driver_id);
CREATE INDEX IF NOT EXISTS idx_transports_status ON transports(status);
CREATE INDEX IF NOT EXISTS idx_transports_scheduled_pickup ON transports(scheduled_pickup_time);

CREATE INDEX IF NOT EXISTS idx_driver_schedules_date ON driver_schedules(date);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_driver_date ON driver_schedules(driver_id, date);

CREATE INDEX IF NOT EXISTS idx_bookings_transport ON bookings(transport_id);

-- ============================================================================
-- SEED TRANSPORT ZONES FOR RWANDA
-- ============================================================================

INSERT INTO transport_zones (region, base_fare, per_km_rate, min_fare, surge_rules, is_active) VALUES
  ('Kigali City', 1500.00, 350.00, 3000.00, '{"peak_hours": ["07:00-09:00", "17:00-19:00"], "weekend_multiplier": 1.15, "event_multiplier": 1.25}', true),
  ('Northern Province', 2000.00, 400.00, 5000.00, '{"peak_hours": [], "weekend_multiplier": 1.1, "event_multiplier": 1.2}', true),
  ('Eastern Province', 2000.00, 400.00, 5000.00, '{"peak_hours": [], "weekend_multiplier": 1.1, "event_multiplier": 1.2}', true),
  ('Southern Province', 2000.00, 400.00, 5000.00, '{"peak_hours": [], "weekend_multiplier": 1.1, "event_multiplier": 1.2}', true),
  ('Western Province', 2000.00, 450.00, 6000.00, '{"peak_hours": [], "weekend_multiplier": 1.15, "event_multiplier": 1.25}', true),
  ('Airport Transfer', 5000.00, 300.00, 10000.00, '{"peak_hours": [], "weekend_multiplier": 1.0, "event_multiplier": 1.0, "night_surcharge": 2000}', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate transport fare
CREATE OR REPLACE FUNCTION calculate_transport_fare(
  p_zone_id uuid,
  p_distance_km decimal,
  p_is_roundtrip boolean DEFAULT false
) RETURNS decimal AS $$
DECLARE
  v_zone transport_zones%ROWTYPE;
  v_fare decimal;
BEGIN
  SELECT * INTO v_zone FROM transport_zones WHERE id = p_zone_id;
  
  IF v_zone IS NULL THEN
    RAISE EXCEPTION 'Transport zone not found';
  END IF;
  
  v_fare := v_zone.base_fare + (p_distance_km * v_zone.per_km_rate);
  
  IF v_fare < v_zone.min_fare THEN
    v_fare := v_zone.min_fare;
  END IF;
  
  IF p_is_roundtrip THEN
    v_fare := v_fare * 2;
  END IF;
  
  RETURN v_fare;
END;
$$ LANGUAGE plpgsql;

-- Function to get available drivers for dispatch
CREATE OR REPLACE FUNCTION get_available_drivers(
  p_pickup_lat decimal,
  p_pickup_lng decimal,
  p_scheduled_time timestamptz,
  p_max_distance_km integer DEFAULT 30
) RETURNS TABLE (
  driver_id uuid,
  driver_name text,
  driver_tier text,
  driver_rating decimal,
  languages text[],
  specializations text[],
  total_trips integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.full_name,
    d.tier,
    d.rating,
    d.languages,
    d.specializations,
    d.total_trips
  FROM drivers d
  WHERE d.status = 'active'
    AND d.id NOT IN (
      SELECT ds.driver_id 
      FROM driver_schedules ds 
      WHERE ds.date = p_scheduled_time::date 
      AND ds.status IN ('on_trip', 'off_duty', 'leave')
    )
  ORDER BY 
    CASE d.tier 
      WHEN 'platinum' THEN 4 
      WHEN 'gold' THEN 3 
      WHEN 'silver' THEN 2 
      WHEN 'bronze' THEN 1 
    END DESC,
    d.rating DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to mobility tables
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transports_updated_at ON transports;
CREATE TRIGGER update_transports_updated_at BEFORE UPDATE ON transports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();