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
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles');

-- Allow uploads to profile-pictures folder (for traveler profiles)
CREATE POLICY "Authenticated users can upload profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
);

-- Allow uploads to guides folder (for guide profile pictures)
CREATE POLICY "Guides can upload to guides folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'guides'
);

-- Allow updates to profile-pictures folder
CREATE POLICY "Users can update own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow deletes
CREATE POLICY "Users can delete own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- LISTINGS BUCKET POLICIES
-- Anyone can read listing images
CREATE POLICY "Public can view listing images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listings');

-- Allow updates
CREATE POLICY "Users can update own listing images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'listings')
WITH CHECK (bucket_id = 'listings');

-- Allow deletes
CREATE POLICY "Users can delete own listing images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listings');

-- PROGRAMS BUCKET POLICIES
-- Anyone can read program images
CREATE POLICY "Public Access to Program Images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'programs');

-- Allow uploads to programs folder
CREATE POLICY "Allow public uploads to programs folder"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'programs' 
  AND (storage.foldername(name))[1] = 'programs'
);

-- Allow updates
CREATE POLICY "Allow public updates to program images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs')
WITH CHECK (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

-- Allow deletes
CREATE POLICY "Allow public deletes of program images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');