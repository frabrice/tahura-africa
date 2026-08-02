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
CREATE POLICY "Allow uploads to profile-pictures folder"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
);

-- PROFILES: Allow anon + authenticated uploads to guides folder  
CREATE POLICY "Allow uploads to guides folder"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'guides'
);

-- LISTINGS: Allow anon + authenticated uploads
CREATE POLICY "Allow uploads to listings bucket"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'listings');

-- Allow anon update/delete on listings
DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;

CREATE POLICY "Allow updates to listings bucket"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'listings')
WITH CHECK (bucket_id = 'listings');

CREATE POLICY "Allow deletes from listings bucket"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'listings');

-- PROGRAMS: Allow anon uploads to programs folder
DROP POLICY IF EXISTS "Allow public updates to program images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes of program images" ON storage.objects;

CREATE POLICY "Allow anon uploads to programs folder"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'programs' 
  AND (storage.foldername(name))[1] = 'programs'
);

CREATE POLICY "Allow anon updates to program images"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs')
WITH CHECK (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

CREATE POLICY "Allow anon deletes of program images"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');