/*
  # Create Admin Messaging System

  ## Overview
  This migration creates a direct messaging channel between portal admins (partners and institutions)
  and their staff (hosts and guides). This is separate from the existing traveler booking-based
  conversations system.

  ## 1. New Tables

  ### `admin_conversations`
  Represents a direct message thread between an admin and one of their staff members.
  - `id` (uuid, primary key)
  - `admin_id` (uuid) - The portal_user ID of the partner or institution admin
  - `admin_type` (text) - Either 'partner' or 'institution'
  - `admin_name` (text) - Cached admin/organization name for display
  - `host_id` (uuid, nullable) - References partner_hosts.id for partner-to-host threads
  - `guide_id` (uuid, nullable) - References guides.id for institution-to-guide threads
  - `last_message` (text, nullable) - Cached preview of last message
  - `last_message_at` (timestamptz, nullable) - Timestamp of last message
  - `created_at` / `updated_at` (timestamptz)

  ### `admin_messages`
  Individual messages within an admin conversation.
  - `id` (uuid, primary key)
  - `admin_conversation_id` (uuid) - References admin_conversations.id
  - `sender_type` (text) - 'admin', 'host', or 'guide'
  - `sender_id` (uuid) - ID of the sender
  - `sender_name` (text) - Cached sender name
  - `message_text` (text) - Message content
  - `is_read` (boolean) - Whether the recipient has read it
  - `created_at` / `updated_at` (timestamptz)

  ## 2. Security (RLS Policies)

  ### admin_conversations
  - Admins can view/insert conversations where admin_id matches their portal_users.id
  - Hosts can view conversations where their host_id matches
  - Guides can view conversations where their guide_id matches
  - Participants can update (for last_message cache)

  ### admin_messages
  - Participants can view messages in their conversations
  - Participants can send messages
  - Participants can mark messages as read (update is_read)

  ## 3. Indexes
  - On admin_id, host_id, guide_id for fast filtering
  - On admin_conversation_id for message retrieval
  - On created_at for ordering

  ## 4. Notes
  - Each admin-host pair has exactly one conversation (unique constraint)
  - Each admin-guide pair has exactly one conversation (unique constraint)
  - A trigger auto-updates last_message on new message insert
  - Broadcast is handled at the application layer by inserting into each individual conversation
*/

-- Create admin_conversations table
CREATE TABLE IF NOT EXISTS admin_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  admin_type text NOT NULL CHECK (admin_type IN ('partner', 'institution')),
  admin_name text NOT NULL DEFAULT '',
  host_id uuid REFERENCES partner_hosts(id) ON DELETE CASCADE,
  guide_id uuid REFERENCES guides(id) ON DELETE CASCADE,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_admin_host UNIQUE (admin_id, host_id),
  CONSTRAINT unique_admin_guide UNIQUE (admin_id, guide_id),
  CONSTRAINT host_or_guide_required CHECK (
    (host_id IS NOT NULL AND guide_id IS NULL) OR
    (guide_id IS NOT NULL AND host_id IS NULL)
  )
);

-- Create admin_messages table
CREATE TABLE IF NOT EXISTS admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_conversation_id uuid NOT NULL REFERENCES admin_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('admin', 'host', 'guide')),
  sender_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_conversations_admin ON admin_conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_host ON admin_conversations(host_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_guide ON admin_conversations(guide_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_updated ON admin_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_messages_conversation ON admin_messages(admin_conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created ON admin_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_messages_unread ON admin_messages(admin_conversation_id, is_read);

-- Enable RLS
ALTER TABLE admin_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- RLS: admin_conversations

CREATE POLICY "Admins can view their conversations"
  ON admin_conversations FOR SELECT
  TO authenticated
  USING (admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid()));

CREATE POLICY "Admins can create conversations"
  ON admin_conversations FOR INSERT
  TO authenticated
  WITH CHECK (admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid()));

CREATE POLICY "Admins can update their conversations"
  ON admin_conversations FOR UPDATE
  TO authenticated
  USING (admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid()))
  WITH CHECK (admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid()));

CREATE POLICY "Hosts can view their admin conversations"
  ON admin_conversations FOR SELECT
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update their admin conversations"
  ON admin_conversations FOR UPDATE
  TO authenticated
  USING (
    host_id IN (
      SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid()
    )
  )
  WITH CHECK (
    host_id IN (
      SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Guides can view their admin conversations"
  ON admin_conversations FOR SELECT
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides WHERE portal_user_id = auth.uid()
    )
  );

CREATE POLICY "Guides can update their admin conversations"
  ON admin_conversations FOR UPDATE
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides WHERE portal_user_id = auth.uid()
    )
  )
  WITH CHECK (
    guide_id IN (
      SELECT id FROM guides WHERE portal_user_id = auth.uid()
    )
  );

-- RLS: admin_messages

CREATE POLICY "Participants can view admin messages"
  ON admin_messages FOR SELECT
  TO authenticated
  USING (
    admin_conversation_id IN (
      SELECT id FROM admin_conversations
      WHERE
        admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid())
        OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
        OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send admin messages"
  ON admin_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_conversation_id IN (
      SELECT id FROM admin_conversations
      WHERE
        admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid())
        OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
        OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can update admin messages"
  ON admin_messages FOR UPDATE
  TO authenticated
  USING (
    admin_conversation_id IN (
      SELECT id FROM admin_conversations
      WHERE
        admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid())
        OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
        OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  )
  WITH CHECK (
    admin_conversation_id IN (
      SELECT id FROM admin_conversations
      WHERE
        admin_id IN (SELECT id FROM portal_users WHERE id = auth.uid())
        OR host_id IN (SELECT id FROM partner_hosts WHERE created_by_user_id = auth.uid())
        OR guide_id IN (SELECT id FROM guides WHERE portal_user_id = auth.uid())
    )
  );

-- Trigger to auto-update last_message in admin_conversations
CREATE OR REPLACE FUNCTION update_admin_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE admin_conversations
  SET
    last_message = NEW.message_text,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.admin_conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_admin_conversation_last_message ON admin_messages;
CREATE TRIGGER trigger_update_admin_conversation_last_message
  AFTER INSERT ON admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_conversation_last_message();
