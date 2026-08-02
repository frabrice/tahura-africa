/*
  # Create Storage Bucket for Listing Images

  1. New Storage Bucket
    - `listings` bucket for storing experience and homestay images
    - Public access for viewing images
    - Authenticated portal users can upload listing images

  2. Security Policies
    - Anyone can read listing images (public access)
    - Only authenticated users can upload listing images
    - Users can update/delete their own listing images
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view listing images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listings'
);

CREATE POLICY "Users can update own listing images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'listings')
WITH CHECK (bucket_id = 'listings');

CREATE POLICY "Users can delete own listing images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listings');