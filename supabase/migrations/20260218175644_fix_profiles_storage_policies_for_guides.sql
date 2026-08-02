/*
  # Fix Profile Storage Policies for Guide Uploads

  1. Changes
    - Drop restrictive authenticated-only INSERT policy
    - Add new policy allowing public (anon) users to upload to guides folder
    - This enables institution portal users to upload guide profile pictures

  2. Security
    - Still maintains folder structure for organization
    - Allows uploads to guides/ folder specifically
    - Public bucket allows viewing uploaded images
*/

-- Drop the old restrictive insert policy
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;

-- Create new policy allowing public uploads to guides folder
CREATE POLICY "Allow public uploads to guides folder"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'guides'
);

-- Also allow public uploads to profile-pictures folder (for backward compatibility)
CREATE POLICY "Allow public uploads to profile-pictures folder"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
);
