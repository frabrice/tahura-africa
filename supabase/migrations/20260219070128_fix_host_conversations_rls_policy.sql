/*
  # Fix Host Conversations RLS Policy

  1. Changes
    - Update "Hosts can view their conversations" policy to use `traveler_user_id` field
    - Update "Participants can update conversations" policy to use `traveler_user_id` field
    
  2. Reason
    - Hosts are created from the partner console and are linked to auth users via `traveler_user_id`
    - The old policy used `created_by_user_id` which is not populated
    - This allows hosts to see conversations when they log in as travelers and switch to host mode
*/

-- Drop old policies
DROP POLICY IF EXISTS "Hosts can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;

-- Create updated policy for hosts to view their conversations
CREATE POLICY "Hosts can view their conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    host_id IN (
      SELECT id 
      FROM partner_hosts 
      WHERE traveler_user_id = auth.uid()
    )
  );

-- Create updated policy for participants to update conversations
CREATE POLICY "Participants can update conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (
    traveler_id = auth.uid() 
    OR host_id IN (
      SELECT id 
      FROM partner_hosts 
      WHERE traveler_user_id = auth.uid()
    )
    OR guide_id IN (
      SELECT id 
      FROM guides 
      WHERE portal_user_id = auth.uid()
    )
  )
  WITH CHECK (
    traveler_id = auth.uid() 
    OR host_id IN (
      SELECT id 
      FROM partner_hosts 
      WHERE traveler_user_id = auth.uid()
    )
    OR guide_id IN (
      SELECT id 
      FROM guides 
      WHERE portal_user_id = auth.uid()
    )
  );