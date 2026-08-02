/*
  # Allow public uploads to listings storage bucket

  ## Problem
  Portal users (partner, institution) authenticate via a custom system
  and do not have a Supabase Auth session. This means they are treated
  as anonymous (anon) users. The existing INSERT policy on the listings
  bucket only allows the "authenticated" role, causing "new row violates
  row level security policy" errors when portal users try to upload
  host profile pictures or listing images.

  ## Changes
  1. Security
    - Add INSERT policy on `storage.objects` for the `listings` bucket
      that allows anon and authenticated roles to upload files
    - This matches the existing pattern used for the `programs` and
      `profiles` buckets which already allow public uploads

  ## Notes
  - The existing SELECT, UPDATE, and DELETE policies on the listings
    bucket already cover both roles
  - Only the INSERT policy was missing anonymous access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public uploads to listings bucket'
  ) THEN
    CREATE POLICY "Allow public uploads to listings bucket"
      ON storage.objects
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id = 'listings');
  END IF;
END $$;
