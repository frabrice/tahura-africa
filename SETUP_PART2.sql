-- ============================================================================
-- TAHURA SETUP — PART 2 (remaining third) — CORRECTED (storage policy fix).
-- Run in SQL Editor after Part 1. Safe to re-run.
-- ============================================================================

-- SOURCE: 20260625080658_20260625150000_create_system_rules_table.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS system_rules (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_system_rules" ON system_rules;
CREATE POLICY "select_system_rules" ON system_rules FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "update_system_rules_ops" ON system_rules;
CREATE POLICY "update_system_rules_ops" ON system_rules FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insert_system_rules_ops" ON system_rules;
CREATE POLICY "insert_system_rules_ops" ON system_rules FOR INSERT
  TO authenticated WITH CHECK (true);

-- Seed default rules
INSERT INTO system_rules (id, category, name, description, enabled, value) VALUES
  ('1', 'capacity', 'Institution Daily Capacity Threshold', 'Alert when institution reaches 85% of daily capacity', true, '85'),
  ('2', 'capacity', 'Automatic Booking Pause', 'Pause new bookings when capacity reaches 100%', true, '100'),
  ('3', 'booking', 'Maximum Group Size', 'Limit group bookings to institution-defined maximums', true, null),
  ('4', 'booking', 'Advance Booking Window', 'Require bookings to be made at least 24 hours in advance', false, '24'),
  ('5', 'quality', 'New Listing Review Required', 'All new listings require approval before going live', true, null),
  ('6', 'quality', 'Automatic Flag Threshold', 'Listings with 3+ flags automatically enter review', true, '3'),
  ('7', 'financial', 'Commission Rate', 'Platform commission charged on every transaction', true, '7'),
  ('8', 'financial', 'Partner Booking Limit', 'Prevent partners from over-booking beyond capacity', true, null)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SOURCE: 20260627191104_20260625150000_add_performance_indexes.sql
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_tracking ON bookings(pesapal_tracking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_traveler ON bookings(traveler_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read);
CREATE INDEX IF NOT EXISTS idx_saved_items_user ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_portal_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_content_flags_status ON content_flags(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_tracking ON payments(pesapal_order_tracking_id);


-- ============================================================
-- SOURCE: 20260705101113_create_storage_buckets_and_policies.sql
-- ============================================================
/*
  # Create Missing Storage Buckets

  This migration ensures all required storage buckets exist with proper policies.
*/

-- Create profiles bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Create listings bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

-- Create programs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('programs', 'programs', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view listing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Program Images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to programs folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to program images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes of program images" ON storage.objects;
DROP POLICY IF EXISTS "Guides can upload to guides folder" ON storage.objects;

-- PROFILES BUCKET POLICIES
-- Anyone can read profile pictures (public access)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles');

-- Allow uploads to profile-pictures folder (for traveler profiles)
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
CREATE POLICY "Authenticated users can upload profile pictures" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
);

-- Allow uploads to guides folder (for guide profile pictures)
DROP POLICY IF EXISTS "Guides can upload to guides folder" ON storage.objects;
CREATE POLICY "Guides can upload to guides folder" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'guides'
);

-- Allow updates to profile-pictures folder
DROP POLICY IF EXISTS "Users can update own profile pictures" ON storage.objects;
CREATE POLICY "Users can update own profile pictures" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow deletes
DROP POLICY IF EXISTS "Users can delete own profile pictures" ON storage.objects;
CREATE POLICY "Users can delete own profile pictures" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- LISTINGS BUCKET POLICIES
-- Anyone can read listing images
DROP POLICY IF EXISTS "Public can view listing images" ON storage.objects;
CREATE POLICY "Public can view listing images" ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing images" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listings');

-- Allow updates
DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;
CREATE POLICY "Users can update own listing images" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'listings')
WITH CHECK (bucket_id = 'listings');

-- Allow deletes
DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;
CREATE POLICY "Users can delete own listing images" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listings');

-- PROGRAMS BUCKET POLICIES
-- Anyone can read program images
DROP POLICY IF EXISTS "Public Access to Program Images" ON storage.objects;
CREATE POLICY "Public Access to Program Images" ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'programs');

-- Allow uploads to programs folder
DROP POLICY IF EXISTS "Allow public uploads to programs folder" ON storage.objects;
CREATE POLICY "Allow public uploads to programs folder" ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'programs' 
  AND (storage.foldername(name))[1] = 'programs'
);

-- Allow updates
DROP POLICY IF EXISTS "Allow public updates to program images" ON storage.objects;
CREATE POLICY "Allow public updates to program images" ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs')
WITH CHECK (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

-- Allow deletes
DROP POLICY IF EXISTS "Allow public deletes of program images" ON storage.objects;
CREATE POLICY "Allow public deletes of program images" ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

-- ============================================================
-- SOURCE: 20260705101145_fix_storage_policies_for_portal_users.sql
-- ============================================================
/*
  # Fix Storage Policies for Portal Users

  Portal users (partner, institution, operations, government) use custom auth,
  not Supabase Auth. They need anon access to storage buckets.
*/

-- Drop existing insert policies that require authentication
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Guides can upload to guides folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to programs folder" ON storage.objects;

-- PROFILES: Allow anon + authenticated uploads to profile-pictures folder
DROP POLICY IF EXISTS "Allow uploads to profile-pictures folder" ON storage.objects;
CREATE POLICY "Allow uploads to profile-pictures folder" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
);

-- PROFILES: Allow anon + authenticated uploads to guides folder  
DROP POLICY IF EXISTS "Allow uploads to guides folder" ON storage.objects;
CREATE POLICY "Allow uploads to guides folder" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'guides'
);

-- LISTINGS: Allow anon + authenticated uploads
DROP POLICY IF EXISTS "Allow uploads to listings bucket" ON storage.objects;
CREATE POLICY "Allow uploads to listings bucket" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'listings');

-- Allow anon update/delete on listings
DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;

DROP POLICY IF EXISTS "Allow updates to listings bucket" ON storage.objects;
CREATE POLICY "Allow updates to listings bucket" ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'listings')
WITH CHECK (bucket_id = 'listings');

DROP POLICY IF EXISTS "Allow deletes from listings bucket" ON storage.objects;
CREATE POLICY "Allow deletes from listings bucket" ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'listings');

-- PROGRAMS: Allow anon uploads to programs folder
DROP POLICY IF EXISTS "Allow public updates to program images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes of program images" ON storage.objects;

DROP POLICY IF EXISTS "Allow anon uploads to programs folder" ON storage.objects;
CREATE POLICY "Allow anon uploads to programs folder" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'programs' 
  AND (storage.foldername(name))[1] = 'programs'
);

DROP POLICY IF EXISTS "Allow anon updates to program images" ON storage.objects;
CREATE POLICY "Allow anon updates to program images" ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs')
WITH CHECK (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

DROP POLICY IF EXISTS "Allow anon deletes of program images" ON storage.objects;
CREATE POLICY "Allow anon deletes of program images" ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

-- ============================================================
-- SOURCE: 20260706072022_20260706120000_create_tahura_mobility_schema.sql
-- ============================================================
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
DROP POLICY IF EXISTS "drivers_view_own_profile" ON drivers;
CREATE POLICY "drivers_view_own_profile" ON drivers FOR SELECT
  TO authenticated
  USING (
    traveler_user_id = auth.uid() 
    OR portal_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "drivers_update_own_profile" ON drivers;
DROP POLICY IF EXISTS "drivers_update_own_profile" ON drivers;
CREATE POLICY "drivers_update_own_profile" ON drivers FOR UPDATE
  TO authenticated
  USING (
    traveler_user_id = auth.uid() 
    OR portal_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "operations_full_driver_access" ON drivers;
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
DROP POLICY IF EXISTS "drivers_view_own_vehicle_assignments" ON driver_vehicles;
CREATE POLICY "drivers_view_own_vehicle_assignments" ON driver_vehicles FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "operations_full_driver_vehicle_access" ON driver_vehicles;
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
DROP POLICY IF EXISTS "transport_zones_public_read" ON transport_zones;
CREATE POLICY "transport_zones_public_read" ON transport_zones FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "operations_full_zone_access" ON transport_zones;
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
DROP POLICY IF EXISTS "travelers_view_own_transports" ON transports;
CREATE POLICY "travelers_view_own_transports" ON transports FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE traveler_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "drivers_view_assigned_transports" ON transports;
DROP POLICY IF EXISTS "drivers_view_assigned_transports" ON transports;
CREATE POLICY "drivers_view_assigned_transports" ON transports FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "drivers_update_assigned_transports" ON transports;
DROP POLICY IF EXISTS "drivers_update_assigned_transports" ON transports;
CREATE POLICY "drivers_update_assigned_transports" ON transports FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "partners_view_booking_transports" ON transports;
DROP POLICY IF EXISTS "partners_view_booking_transports" ON transports;
CREATE POLICY "partners_view_booking_transports" ON transports FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE partner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "institutions_view_booking_transports" ON transports;
DROP POLICY IF EXISTS "institutions_view_booking_transports" ON transports;
CREATE POLICY "institutions_view_booking_transports" ON transports FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE institution_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "operations_full_transport_access" ON transports;
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
DROP POLICY IF EXISTS "charging_stations_public_read" ON charging_stations;
CREATE POLICY "charging_stations_public_read" ON charging_stations FOR SELECT
  TO anon, authenticated
  USING (status = 'operational');

DROP POLICY IF EXISTS "operations_full_charging_access" ON charging_stations;
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
DROP POLICY IF EXISTS "drivers_manage_own_schedule" ON driver_schedules;
CREATE POLICY "drivers_manage_own_schedule" ON driver_schedules FOR ALL
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "operations_full_schedule_access" ON driver_schedules;
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
DROP POLICY IF EXISTS "travelers_manage_own_transport_reviews" ON transport_rating_reviews;
CREATE POLICY "travelers_manage_own_transport_reviews" ON transport_rating_reviews FOR ALL
  TO authenticated
  USING (traveler_id = auth.uid());

DROP POLICY IF EXISTS "drivers_view_own_transport_reviews" ON transport_rating_reviews;
DROP POLICY IF EXISTS "drivers_view_own_transport_reviews" ON transport_rating_reviews;
CREATE POLICY "drivers_view_own_transport_reviews" ON transport_rating_reviews FOR SELECT
  TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE traveler_user_id = auth.uid() OR portal_user_id = auth.uid()));

DROP POLICY IF EXISTS "operations_full_transport_review_access" ON transport_rating_reviews;
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
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS transport_required boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_included') THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS transport_included boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_mandatory_for') THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS transport_mandatory_for text DEFAULT 'none' CHECK (transport_mandatory_for IN ('none', 'all', 'foreign_travelers', 'first_time_bookers'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_default_pickup') THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS transport_default_pickup jsonb DEFAULT '{"type": "traveler_location"}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_listings' AND column_name = 'transport_zone_id') THEN
    ALTER TABLE partner_listings ADD COLUMN IF NOT EXISTS transport_zone_id uuid REFERENCES transport_zones(id);
  END IF;
END $$;

-- Add transport fields to bookings
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'transport_requested') THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transport_requested boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'transport_id') THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transport_id uuid REFERENCES transports(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'transport_status_snapshot') THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transport_status_snapshot text;
  END IF;
END $$;

-- Add mobility fields to portal_users
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'has_mobility_fleet') THEN
    ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS has_mobility_fleet boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'mobility_agreement_signed') THEN
    ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS mobility_agreement_signed boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'mobility_agreement_date') THEN
    ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS mobility_agreement_date date;
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
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transports_updated_at ON transports;
DROP TRIGGER IF EXISTS update_transports_updated_at ON transports;
CREATE TRIGGER update_transports_updated_at BEFORE UPDATE ON transports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SOURCE: 20260708150434_add_requested_payment_method_to_payments.sql
-- ============================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS requested_payment_method text;


-- ============================================================
-- SOURCE: 20260724120000_harden_portal_users_auth.sql
-- ============================================================
/*
  # Harden portal_users authentication

  ## Why
  Before this migration, the anon key (which ships in the browser bundle and is
  therefore public) could read EVERY column of `portal_users`, including
  `password_hash`, and could freely INSERT/UPDATE/DELETE any row. Anyone with the
  public key could harvest every partner / institution / government / operations
  password hash and take over accounts. See RLS policies in
  20260505095105_restore_core_tables_part1.sql / 20260313043848_consolidate_and_fix_rls_policies.sql.

  ## What this does
  1. Removes the anon/authenticated ability to READ the `password_hash` column
     (column-level GRANTs). Every other column stays readable, so the ~20 places
     in the app that read portal_users (settings, ops management, government
     stats, etc.) keep working. Selecting `*` now transparently omits the hash.
  2. Adds `verify_portal_login()` — a SECURITY DEFINER function that performs the
     credential check inside the database and returns only non-sensitive columns.
     The password hash never crosses the network. The client calls this instead
     of querying the table directly.
  3. Rotates the operations admin password OUT of source control (see the clearly
     marked block at the bottom — you MUST set your own).

  ## What this does NOT do (documented follow-up)
  Portal users still authenticate as the `anon` Postgres role, so RLS cannot yet
  distinguish a legitimate operations admin from an anonymous attacker for WRITES.
  Fully preventing anon INSERT/UPDATE/DELETE requires migrating portal auth to
  real Supabase Auth (each portal user becomes an auth user, RLS rewritten with
  auth.uid()). That is a larger, separate project. This migration closes the most
  severe hole — credential/hash exposure — without breaking the running app.
*/

-- pgcrypto provides digest(); on Supabase it lives in the `extensions` schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. Column-level read protection for password_hash
-- ============================================================
-- Drop the blanket table-level SELECT, then grant SELECT on every column
-- EXCEPT password_hash. PostgREST honours column privileges, so existing
-- reads keep working and `select('*')` simply returns everything but the hash.
REVOKE SELECT ON public.portal_users FROM anon, authenticated;

GRANT SELECT (
  id, portal_type, email, user_id_code, name, phone, contact_person,
  country, province, specific_location, specialty, tags, is_active,
  created_at, created_by, updated_at
) ON public.portal_users TO anon, authenticated;

-- ============================================================
-- 2. Secure login function (hash never leaves the database)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_portal_login(
  p_email text,
  p_password text,
  p_user_id_code text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  portal_type text,
  email text,
  user_id_code text,
  name text,
  phone text,
  contact_person text,
  country text,
  province text,
  specific_location text,
  specialty text,
  tags text[],
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    pu.id, pu.portal_type, pu.email, pu.user_id_code, pu.name, pu.phone,
    pu.contact_person, pu.country, pu.province, pu.specific_location,
    pu.specialty, pu.tags, pu.is_active
  FROM public.portal_users pu
  WHERE lower(pu.email) = lower(trim(p_email))
    AND pu.password_hash = encode(digest(p_password, 'sha256'), 'hex')
    AND pu.is_active = true
    AND (p_user_id_code IS NULL OR pu.user_id_code = p_user_id_code);
$$;

REVOKE ALL ON FUNCTION public.verify_portal_login(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_portal_login(text, text, text) TO anon, authenticated;

-- ============================================================
-- 3. Rotate the operations admin password (REQUIRED)
-- ============================================================
-- The previous password shipped in plaintext in source control and must be
-- considered compromised. Replace 'CHANGE_ME_TO_A_NEW_STRONG_PASSWORD' below
-- with a new strong password before running this migration, then delete this
-- comment. The digest() call hashes it the same way the app does.
UPDATE public.portal_users
SET password_hash = encode(digest('CHANGE_ME_TO_A_NEW_STRONG_PASSWORD', 'sha256'), 'hex'),
    updated_at = now()
WHERE portal_type = 'operations';


-- ============================================================
-- SOURCE: 20260724130000_bookings_confirm_on_payment.sql
-- ============================================================
/*
  # Bookings: confirm only after payment

  ## Why
  Migration 20260315114255_auto_confirm_bookings.sql set the bookings.status
  DEFAULT to 'confirmed' so that every booking appeared confirmed the moment it
  was created — before payment succeeded. That produced "phantom" confirmed
  bookings for orders that were never paid.

  ## What this does
  Restores the DEFAULT for bookings.status to 'pending'. New paid bookings are
  now created as 'pending' and are flipped to 'confirmed' only when the
  pesapal-ipn edge function records a completed payment (it already sets
  status = 'confirmed', payment_status = 'paid'). Free (zero-total) bookings are
  created directly as 'confirmed' by the app since there is nothing to pay.

  Existing rows are left untouched — this only changes the default for future
  inserts. The two booking-creation paths (BookingDrawer, AttractionBookingDrawer)
  set status explicitly, so this default is a safety net for any other insert.
*/

ALTER TABLE bookings
  ALTER COLUMN status SET DEFAULT 'pending';


-- ============================================================
-- SOURCE: 20260724140000_harden_travelers_pii.sql
-- ============================================================
/*
  # Harden travelers table (PII + legacy password_hash exposure)

  ## Why
  The `travelers` table shipped with `USING (true)` policies for anon on SELECT,
  INSERT and UPDATE (see 20260505095105_restore_core_tables_part1.sql /
  20260217112129_create_user_management_system.sql). Because the anon key is
  public, anyone could read every traveler's personal data (name, email, phone,
  date of birth, nationality) and legacy `password_hash`, and could modify or
  insert traveler rows at will.

  ## Safe to lock down fully
  A project-wide search shows the app touches this table in exactly ONE place:
  CreateHostForm looks up a traveler by email (id + full_name) to link them as a
  host. Travelers themselves authenticate via Supabase Auth and their profile
  lives in auth metadata, not this table; Operations counts travelers via
  portal_users, not this table. So anon needs no direct access at all.

  ## What this does
  1. Drops the permissive anon policies. RLS stays enabled, so anon now has no
     policy and is denied by default. Revokes table DML from anon/authenticated
     for defense in depth. (The delete-traveler-account edge function uses the
     service role and is unaffected.)
  2. Adds `lookup_traveler_by_email()` — a SECURITY DEFINER function returning
     only id + full_name — for the CreateHostForm host-linking flow. No PII or
     password hash is ever exposed.
*/

-- ============================================================
-- 1. Remove blanket anon access
-- ============================================================
DROP POLICY IF EXISTS "Anyone can create traveler account" ON public.travelers;
DROP POLICY IF EXISTS "Travelers can view own profile" ON public.travelers;
DROP POLICY IF EXISTS "Travelers can update own profile" ON public.travelers;

REVOKE ALL ON public.travelers FROM anon, authenticated;

-- ============================================================
-- 2. Minimal lookup for host-linking (id + full_name only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.lookup_traveler_by_email(p_email text)
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.full_name
  FROM public.travelers t
  WHERE lower(t.email) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_traveler_by_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_traveler_by_email(text) TO anon, authenticated;


-- ============================================================
-- SOURCE: 20260726120000_add_intouch_mobile_money.sql
-- ============================================================
/*
  # Add InTouch (IntouchPay) mobile-money support to payments

  ## Why
  Pesapal handles card payments only. MTN MoMo and Airtel Money now go through
  InTouch (IntouchPay, https://www.intouchpay.co.rw). InTouch uses an async
  "push to phone" flow: we request a payment, the subscriber approves a prompt on
  their handset, and InTouch calls our callback with the result. This migration
  generalises the `payments` table so it can store InTouch transactions alongside
  the existing Pesapal ones.

  ## Changes
  - `pesapal_merchant_reference` becomes nullable (InTouch rows don't have one).
  - New columns: `provider` ('pesapal' | 'intouch'), `intouch_request_id`
    (our requesttransactionid), `intouch_transaction_id` (InTouch's id),
    `mobile_phone` (the paying MoMo/Airtel number).
  - InTouch charges in RWF, so `currency` may now be 'RWF' on those rows.
*/

ALTER TABLE payments ALTER COLUMN pesapal_merchant_reference DROP NOT NULL;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'pesapal';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS intouch_request_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS intouch_transaction_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mobile_phone text;

CREATE INDEX IF NOT EXISTS payments_intouch_request_idx ON payments(intouch_request_id);
CREATE INDEX IF NOT EXISTS payments_provider_idx ON payments(provider);


