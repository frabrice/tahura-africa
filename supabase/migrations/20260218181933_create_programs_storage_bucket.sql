/*
  # Create Storage Bucket for Program Images

  1. New Storage Bucket
    - `programs` bucket for storing program/package images
    - Public access for viewing images
    - Public users can upload program images

  2. Security Policies
    - Anyone can read program images (public access)
    - Public users can upload to programs folder
    - Allows institutions to upload images for their programs
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('programs', 'programs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access to Program Images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'programs');

CREATE POLICY "Allow public uploads to programs folder"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'programs' 
  AND (storage.foldername(name))[1] = 'programs'
);

CREATE POLICY "Allow public updates to program images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs')
WITH CHECK (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');

CREATE POLICY "Allow public deletes of program images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'programs' AND (storage.foldername(name))[1] = 'programs');
