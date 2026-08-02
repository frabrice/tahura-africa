/*
  # Fix Host & Guide Access to Bookings + Guide Traveler Linking

  1. Schema Changes
    - Add `traveler_user_id` column to `guides` table (links guide to their Supabase auth user)

  2. New Bookings Policies
    - Hosts can SELECT bookings where `host_id` matches their linked `partner_hosts` record
    - Hosts can UPDATE bookings where `host_id` matches their linked `partner_hosts` record
    - Guides can SELECT bookings where `guide_id` matches their linked `guides` record
    - Guides can UPDATE bookings where `guide_id` matches their linked `guides` record

  3. Updated Conversations Policies
    - Fix guide conversations SELECT to use `traveler_user_id` instead of `portal_user_id`
    - Add INSERT policy for hosts to create conversations
    - Add INSERT policy for guides to create conversations
    - Update conversations UPDATE policy for guides to use `traveler_user_id`

  4. Updated Messages Policies
    - Update messages SELECT/INSERT/UPDATE to use guides.traveler_user_id

  5. Notes
    - `partner_hosts.traveler_user_id` = the Supabase auth user ID of the host
    - `guides.traveler_user_id` = the Supabase auth user ID of the guide
    - Both are set when the traveler logs in and is identified as a host/guide via email match
*/

-- 1. Add traveler_user_id to guides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guides' AND column_name = 'traveler_user_id'
  ) THEN
    ALTER TABLE guides ADD COLUMN traveler_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_guides_traveler_user_id ON guides(traveler_user_id);

-- 2. Bookings policies for hosts
CREATE POLICY "Hosts can view bookings for their listings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update booking status"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = auth.uid()
    )
  )
  WITH CHECK (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = auth.uid()
    )
  );

-- 3. Bookings policies for guides
CREATE POLICY "Guides can view their assigned bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    )
  );

CREATE POLICY "Guides can update their booking status"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    )
  )
  WITH CHECK (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    )
  );

-- 4. Fix conversations policies for guides (replace portal_user_id with traveler_user_id)
DROP POLICY IF EXISTS "Guides can view their conversations" ON conversations;

CREATE POLICY "Guides can view their conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    )
  );

-- Add INSERT policies for hosts and guides on conversations
CREATE POLICY "Hosts can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = auth.uid()
    )
  );

CREATE POLICY "Guides can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    )
  );

-- Fix conversations UPDATE policy to use traveler_user_id for guides
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    (traveler_id = auth.uid())
    OR (host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = auth.uid()
    ))
    OR (guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    ))
  )
  WITH CHECK (
    (traveler_id = auth.uid())
    OR (host_id IN (
      SELECT id FROM partner_hosts
      WHERE partner_hosts.traveler_user_id = auth.uid()
    ))
    OR (guide_id IN (
      SELECT id FROM guides
      WHERE guides.traveler_user_id = auth.uid()
    ))
  );

-- 5. Fix messages policies to use guides.traveler_user_id
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Participants can update messages" ON messages;

CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = auth.uid())
        OR (conversations.host_id IN (
          SELECT ph.id FROM partner_hosts ph
          WHERE ph.traveler_user_id = auth.uid()
        ))
        OR (conversations.guide_id IN (
          SELECT g.id FROM guides g
          WHERE g.traveler_user_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = auth.uid())
        OR (conversations.host_id IN (
          SELECT ph.id FROM partner_hosts ph
          WHERE ph.traveler_user_id = auth.uid()
        ))
        OR (conversations.guide_id IN (
          SELECT g.id FROM guides g
          WHERE g.traveler_user_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Participants can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = auth.uid())
        OR (conversations.host_id IN (
          SELECT ph.id FROM partner_hosts ph
          WHERE ph.traveler_user_id = auth.uid()
        ))
        OR (conversations.guide_id IN (
          SELECT g.id FROM guides g
          WHERE g.traveler_user_id = auth.uid()
        ))
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = auth.uid())
        OR (conversations.host_id IN (
          SELECT ph.id FROM partner_hosts ph
          WHERE ph.traveler_user_id = auth.uid()
        ))
        OR (conversations.guide_id IN (
          SELECT g.id FROM guides g
          WHERE g.traveler_user_id = auth.uid()
        ))
    )
  );
