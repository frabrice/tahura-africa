/*
  # Create Messaging System

  ## Overview
  This migration creates a complete messaging system for the platform, enabling communication between travelers and hosts/guides after bookings are made.

  ## 1. New Tables
  
  ### `conversations`
  - `id` (uuid, primary key) - Unique conversation identifier
  - `booking_id` (uuid, foreign key) - Links to the booking this conversation is about
  - `traveler_id` (uuid, foreign key) - The traveler in the conversation
  - `traveler_name` (text) - Cached traveler name for display
  - `host_id` (uuid, nullable, foreign key) - The host (for experiences/homestays)
  - `host_name` (text, nullable) - Cached host name for display
  - `guide_id` (uuid, nullable, foreign key) - The guide (for attractions)
  - `guide_name` (text, nullable) - Cached guide name for display
  - `listing_title` (text) - Title of the experience/homestay/attraction
  - `listing_type` (text) - 'experience', 'homestay', or 'attraction'
  - `last_message` (text, nullable) - Last message text for quick display
  - `last_message_at` (timestamptz, nullable) - Timestamp of last message
  - `created_at` (timestamptz) - When conversation was created
  - `updated_at` (timestamptz) - Last update timestamp

  ### `messages`
  - `id` (uuid, primary key) - Unique message identifier
  - `conversation_id` (uuid, foreign key) - Links to conversation
  - `sender_type` (text) - 'traveler', 'host', or 'guide'
  - `sender_id` (uuid) - ID of the sender (from auth.users or guides table)
  - `sender_name` (text) - Name of sender for display
  - `message_text` (text) - The actual message content
  - `is_read` (boolean) - Whether message has been read by recipient
  - `created_at` (timestamptz) - When message was sent
  - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Security (RLS Policies)
  
  ### Conversations RLS
  - Travelers can view their own conversations
  - Hosts can view conversations where they are the host
  - Guides can view conversations where they are the guide
  - Travelers can create conversations for their bookings
  - Participants can update conversations (for last_message tracking)

  ### Messages RLS
  - Participants can view messages in their conversations
  - Participants can send messages in their conversations
  - Participants can mark messages as read

  ## 3. Indexes
  - Index on booking_id for fast conversation lookup
  - Index on traveler_id, host_id, guide_id for filtering
  - Index on conversation_id for message retrieval
  - Index on created_at for chronological ordering

  ## 4. Notes
  - Conversations are created after booking or initiated from trips page
  - Each booking can have one conversation
  - Messages link sender to conversation for threading
  - is_read flag enables unread message counts
  - Cached names avoid excessive joins in message lists
  - Trigger automatically updates conversation's last_message on new message
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  traveler_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  traveler_name text NOT NULL DEFAULT '',
  host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL,
  host_name text,
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  guide_name text,
  listing_title text NOT NULL DEFAULT '',
  listing_type text NOT NULL DEFAULT 'experience',
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(booking_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('traveler', 'host', 'guide')),
  sender_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_booking ON conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_conversations_traveler ON conversations(traveler_id);
CREATE INDEX IF NOT EXISTS idx_conversations_host ON conversations(host_id);
CREATE INDEX IF NOT EXISTS idx_conversations_guide ON conversations(guide_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations

-- Travelers can view their own conversations
CREATE POLICY "Travelers can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (traveler_id = auth.uid());

-- Hosts can view conversations where they are the host (partner_hosts has created_by_user_id)
CREATE POLICY "Hosts can view their conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid()
    )
  );

-- Guides can view conversations where they are the guide (guides has portal_user_id)
CREATE POLICY "Guides can view their conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides WHERE portal_user_id = auth.uid()
    )
  );

-- Travelers can create conversations for their bookings
CREATE POLICY "Travelers can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    traveler_id = auth.uid() AND
    booking_id IN (
      SELECT id FROM bookings WHERE traveler_id = auth.uid()
    )
  );

-- Participants can update conversations (for last_message updates)
CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    traveler_id = auth.uid() OR
    host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid()) OR
    guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
  )
  WITH CHECK (
    traveler_id = auth.uid() OR
    host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid()) OR
    guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
  );

-- RLS Policies for messages

-- Participants can view messages in their conversations
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
         OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
         OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  );

-- Participants can send messages in their conversations
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
         OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
         OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  );

-- Participants can update messages (for marking as read)
CREATE POLICY "Participants can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
         OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
         OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid()
         OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
         OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  );

-- Create function to automatically update conversation's last_message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message = NEW.message_text,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation on new message
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();