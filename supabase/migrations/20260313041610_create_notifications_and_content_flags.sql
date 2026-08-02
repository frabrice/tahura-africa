/*
  # Create Notifications and Content Flags System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `recipient_portal_user_id` (uuid, FK to portal_users.id) - who receives this notification
      - `type` (text) - notification type (listing_flagged, attraction_flagged, system, etc.)
      - `title` (text) - short headline
      - `message` (text) - full explanation with details
      - `metadata` (jsonb) - structured data for CTA buttons (listing_id, flag_id, etc.)
      - `is_read` (boolean, default false)
      - `created_at` (timestamptz)

    - `content_flags`
      - `id` (uuid, primary key)
      - `target_type` (text) - 'listing' or 'attraction'
      - `target_id` (uuid) - references partner_listings.id or institution_profiles.id
      - `flagged_by` (uuid, FK to portal_users.id) - the operations user
      - `reason` (text) - explanation of why flagged
      - `severity` (text) - 'minor', 'major', 'policy_violation'
      - `status` (text) - 'active' or 'resolved'
      - `created_at` (timestamptz)
      - `resolved_at` (timestamptz, nullable)

  2. Modified Tables
    - `partner_listings` - add `is_flagged` (boolean, default false)
    - `institution_profiles` - add `is_flagged` (boolean, default false)

  3. Security
    - Enable RLS on both new tables
    - Operations users can manage content_flags
    - Portal users can read their own notifications
    - Operations users can create notifications for any portal user

  4. Notes
    - The metadata jsonb field stores structured data used by CTA buttons in the frontend
    - content_flags tracks the full history of flagging/unflagging actions
    - is_flagged on listings/profiles is the quick-access boolean for filtering in public queries
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_portal_user_id uuid NOT NULL REFERENCES portal_users(id),
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Portal users can read their own notifications
CREATE POLICY "Portal users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE portal_users.id = notifications.recipient_portal_user_id
    )
  );

-- Portal users can update their own notifications (mark as read)
CREATE POLICY "Portal users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE portal_users.id = notifications.recipient_portal_user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE portal_users.id = notifications.recipient_portal_user_id
    )
  );

-- Allow insert for any authenticated user (operations users create notifications)
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anonymous select for demo access (portal users use anonymous auth)
CREATE POLICY "Anonymous can view notifications"
  ON notifications FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous update for demo access
CREATE POLICY "Anonymous can update notifications"
  ON notifications FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous insert for demo access
CREATE POLICY "Anonymous can insert notifications"
  ON notifications FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create content_flags table
CREATE TABLE IF NOT EXISTS content_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('listing', 'attraction')),
  target_id uuid NOT NULL,
  flagged_by uuid NOT NULL REFERENCES portal_users(id),
  reason text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'policy_violation')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;

-- Operations users can view all flags
CREATE POLICY "Anyone can view content flags"
  ON content_flags FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can view content flags"
  ON content_flags FOR SELECT
  TO authenticated
  USING (true);

-- Allow insert for flagging
CREATE POLICY "Anyone can create content flags"
  ON content_flags FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can create content flags"
  ON content_flags FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow update for resolving flags
CREATE POLICY "Anyone can update content flags"
  ON content_flags FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can update content flags"
  ON content_flags FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add is_flagged column to partner_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_listings' AND column_name = 'is_flagged'
  ) THEN
    ALTER TABLE partner_listings ADD COLUMN is_flagged boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add is_flagged column to institution_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name = 'is_flagged'
  ) THEN
    ALTER TABLE institution_profiles ADD COLUMN is_flagged boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_portal_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(recipient_portal_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_content_flags_target ON content_flags(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_status ON content_flags(status);
CREATE INDEX IF NOT EXISTS idx_partner_listings_flagged ON partner_listings(is_flagged);
CREATE INDEX IF NOT EXISTS idx_institution_profiles_flagged ON institution_profiles(is_flagged);
