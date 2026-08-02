/*
  # Fix Messages RLS Policies

  1. Changes
    - Update all messages policies to use `traveler_user_id` field for hosts
    - This ensures hosts can send, view, and update messages
    
  2. Reason
    - Hosts are linked to auth users via `traveler_user_id` not `created_by_user_id`
    - Fixes message visibility and sending for hosts
*/

-- Drop old policies
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Participants can update messages" ON messages;
DROP POLICY IF EXISTS "Participants can view messages" ON messages;

-- Create updated policy for viewing messages
CREATE POLICY "Participants can view messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
        OR host_id IN (
          SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid()
        )
        OR guide_id IN (
          SELECT id FROM guides WHERE portal_user_id = auth.uid()
        )
    )
  );

-- Create updated policy for sending messages
CREATE POLICY "Participants can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
        OR host_id IN (
          SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid()
        )
        OR guide_id IN (
          SELECT id FROM guides WHERE portal_user_id = auth.uid()
        )
    )
  );

-- Create updated policy for updating messages
CREATE POLICY "Participants can update messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
        OR host_id IN (
          SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid()
        )
        OR guide_id IN (
          SELECT id FROM guides WHERE portal_user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
        OR host_id IN (
          SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid()
        )
        OR guide_id IN (
          SELECT id FROM guides WHERE portal_user_id = auth.uid()
        )
    )
  );