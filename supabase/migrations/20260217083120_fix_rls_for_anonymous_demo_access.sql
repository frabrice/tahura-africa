/*
  # Fix RLS Policies for Anonymous Demo Access

  ## Overview
  This migration updates Row Level Security policies to allow anonymous users to create and manage
  hosts and listings in the Partner Console for demo purposes.

  ## Changes
  
  ### 1. partner_hosts table
  - Allow anonymous users to view all hosts
  - Allow anonymous users to create hosts
  - Allow anonymous users to update hosts
  - Allow anonymous users to delete hosts

  ### 2. partner_listings table
  - Allow anonymous users to view all listings
  - Allow anonymous users to create listings
  - Allow anonymous users to update listings
  - Allow anonymous users to delete listings

  ## Important Notes
  - This is for demo/development purposes
  - In production, you should require authentication and proper partner_id validation
  - The demo partner_id used is: '00000000-0000-0000-0000-000000000001'
*/

-- Drop existing restrictive policies for partner_hosts
DROP POLICY IF EXISTS "Partners can view own hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Partners can create hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Partners can update own hosts" ON partner_hosts;
DROP POLICY IF EXISTS "Partners can delete own hosts" ON partner_hosts;

-- Create new permissive policies for partner_hosts (demo mode)
CREATE POLICY "Allow anonymous to view all hosts"
  ON partner_hosts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous to create hosts"
  ON partner_hosts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to update hosts"
  ON partner_hosts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to delete hosts"
  ON partner_hosts FOR DELETE
  TO anon
  USING (true);

-- Create authenticated user policies for partner_hosts
CREATE POLICY "Authenticated users can view own hosts"
  ON partner_hosts FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

CREATE POLICY "Authenticated users can create hosts"
  ON partner_hosts FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY "Authenticated users can update own hosts"
  ON partner_hosts FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY "Authenticated users can delete own hosts"
  ON partner_hosts FOR DELETE
  TO authenticated
  USING (partner_id = auth.uid());

-- Drop existing restrictive policies for partner_listings
DROP POLICY IF EXISTS "Partners can view own listings" ON partner_listings;
DROP POLICY IF EXISTS "Partners can create listings" ON partner_listings;
DROP POLICY IF EXISTS "Partners can update own listings" ON partner_listings;
DROP POLICY IF EXISTS "Partners can delete own listings" ON partner_listings;
DROP POLICY IF EXISTS "Anonymous users can view active listings" ON partner_listings;

-- Create new permissive policies for partner_listings (demo mode)
CREATE POLICY "Allow anonymous to view all listings"
  ON partner_listings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous to create listings"
  ON partner_listings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to update listings"
  ON partner_listings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to delete listings"
  ON partner_listings FOR DELETE
  TO anon
  USING (true);

-- Create authenticated user policies for partner_listings
CREATE POLICY "Authenticated users can view own listings"
  ON partner_listings FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

CREATE POLICY "Authenticated users can create listings"
  ON partner_listings FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY "Authenticated users can update own listings"
  ON partner_listings FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY "Authenticated users can delete own listings"
  ON partner_listings FOR DELETE
  TO authenticated
  USING (partner_id = auth.uid());
