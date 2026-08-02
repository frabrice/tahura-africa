/*
  # Restore Core Tables - Part 4: Messaging, Notifications, Reviews, Support Tickets

  Creates:
  - conversations: booking-based traveler-host/guide conversations
  - messages: individual messages within conversations
  - admin_conversations: direct admin-to-staff messaging
  - admin_messages: messages in admin conversations
  - notifications: portal user notifications
  - content_flags: content moderation flags
  - traveler_reviews: hosts/guides reviewing travelers
  - support_tickets: traveler support tickets
  - ticket_messages: replies on support tickets
  - attraction_reviews: reviews for attractions/institutions
  - email_logs: email delivery tracking
*/

-- Conversations table
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

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Travelers can view own conversations"
  ON conversations FOR SELECT TO authenticated
  USING ((select auth.uid()) = traveler_id);

CREATE POLICY "Guides can view their conversations"
  ON conversations FOR SELECT TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Travelers can create conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (
    traveler_id = (select auth.uid()) AND
    booking_id IN (SELECT id FROM bookings WHERE traveler_id = (select auth.uid()))
  );

CREATE POLICY "Hosts can create conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (
    host_id IN (
      SELECT id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Guides can create conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (
    guide_id IN (
      SELECT id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE TO authenticated
  USING (
    (traveler_id = (select auth.uid()))
    OR (host_id IN (SELECT id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())))
    OR (guide_id IN (SELECT id FROM guides WHERE guides.traveler_user_id = (select auth.uid())))
  )
  WITH CHECK (
    (traveler_id = (select auth.uid()))
    OR (host_id IN (SELECT id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())))
    OR (guide_id IN (SELECT id FROM guides WHERE guides.traveler_user_id = (select auth.uid())))
  );

CREATE INDEX IF NOT EXISTS idx_conversations_booking ON conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_conversations_traveler ON conversations(traveler_id);
CREATE INDEX IF NOT EXISTS idx_conversations_host ON conversations(host_id);
CREATE INDEX IF NOT EXISTS idx_conversations_guide ON conversations(guide_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- Messages table
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

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = (select auth.uid()))
        OR (conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid())))
        OR (conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid())))
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = (select auth.uid()))
        OR (conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid())))
        OR (conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid())))
    )
  );

CREATE POLICY "Participants can update messages"
  ON messages FOR UPDATE TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = (select auth.uid()))
        OR (conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid())))
        OR (conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid())))
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE (conversations.traveler_id = (select auth.uid()))
        OR (conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid())))
        OR (conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid())))
    )
  );

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read);

-- Trigger for conversation last_message
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Admin conversations table
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

ALTER TABLE admin_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their conversations"
  ON admin_conversations FOR SELECT TO authenticated
  USING (admin_id IN (SELECT id FROM portal_users WHERE id = (select auth.uid())));

CREATE POLICY "Admins can create conversations"
  ON admin_conversations FOR INSERT TO authenticated
  WITH CHECK (admin_id IN (SELECT id FROM portal_users WHERE id = (select auth.uid())));

CREATE POLICY "Admins can update their conversations"
  ON admin_conversations FOR UPDATE TO authenticated
  USING (admin_id IN (SELECT id FROM portal_users WHERE id = (select auth.uid())))
  WITH CHECK (admin_id IN (SELECT id FROM portal_users WHERE id = (select auth.uid())));

CREATE POLICY "Guides can view their admin conversations"
  ON admin_conversations FOR SELECT TO authenticated
  USING (guide_id IN (SELECT id FROM guides WHERE portal_user_id = (select auth.uid())));

CREATE POLICY "Guides can update their admin conversations"
  ON admin_conversations FOR UPDATE TO authenticated
  USING (guide_id IN (SELECT id FROM guides WHERE portal_user_id = (select auth.uid())))
  WITH CHECK (guide_id IN (SELECT id FROM guides WHERE portal_user_id = (select auth.uid())));

-- Also allow anon access for portal system
CREATE POLICY "Anon can view admin conversations"
  ON admin_conversations FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can create admin conversations"
  ON admin_conversations FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update admin conversations"
  ON admin_conversations FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_conversations_admin ON admin_conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_host ON admin_conversations(host_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_guide ON admin_conversations(guide_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_updated ON admin_conversations(updated_at DESC);

-- Admin messages table
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

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view admin messages"
  ON admin_messages FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can send admin messages"
  ON admin_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update admin messages"
  ON admin_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_messages_conversation ON admin_messages(admin_conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created ON admin_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_messages_unread ON admin_messages(admin_conversation_id, is_read);

-- Trigger for admin_conversation last_message
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

-- Notifications table
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

CREATE POLICY "Anyone can view notifications"
  ON notifications FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can create notifications"
  ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update notifications"
  ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_portal_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(recipient_portal_user_id, is_read);

-- Content flags table
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

CREATE POLICY "Anyone can view content flags"
  ON content_flags FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can create content flags"
  ON content_flags FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update content flags"
  ON content_flags FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_content_flags_target ON content_flags(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_status ON content_flags(status);

-- Traveler reviews table
CREATE TABLE IF NOT EXISTS traveler_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  traveler_id uuid NOT NULL,
  reviewer_type text NOT NULL CHECK (reviewer_type IN ('host', 'guide')),
  reviewer_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  reviewer_profile_picture text DEFAULT '',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL CHECK (char_length(review_text) <= 200),
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_id, reviewer_type)
);

ALTER TABLE traveler_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert their own traveler reviews"
  ON traveler_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = (select auth.uid()));

CREATE POLICY "Anyone can read traveler reviews"
  ON traveler_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon can read traveler reviews"
  ON traveler_reviews FOR SELECT TO anon USING (true);

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_portal_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  created_by_name text NOT NULL DEFAULT '',
  created_by_email text NOT NULL DEFAULT '',
  created_by_type text NOT NULL DEFAULT 'traveler' CHECK (created_by_type IN ('traveler', 'portal')),
  portal_type text NOT NULL DEFAULT 'general' CHECK (portal_type IN ('partner', 'institution', 'general')),
  target_portal_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  resolution_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view support tickets"
  ON support_tickets FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can create support tickets"
  ON support_tickets FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update support tickets"
  ON support_tickets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_target ON support_tickets(target_portal_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_creator_auth ON support_tickets(created_by_auth_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_creator_portal ON support_tickets(created_by_portal_id);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('traveler', 'portal', 'operations')),
  sender_id text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT '',
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ticket messages"
  ON ticket_messages FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can create ticket messages"
  ON ticket_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update ticket messages"
  ON ticket_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);

-- Attraction reviews table
CREATE TABLE IF NOT EXISTS attraction_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES portal_users(id) ON DELETE CASCADE,
  traveler_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  reviewer_name text NOT NULL,
  reviewer_profile_picture text DEFAULT '',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL CHECK (char_length(review_text) <= 200),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attraction_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view attraction reviews"
  ON attraction_reviews FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated users can create attraction reviews"
  ON attraction_reviews FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Anon can create attraction reviews"
  ON attraction_reviews FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_attraction_reviews_institution ON attraction_reviews(institution_id);
CREATE INDEX IF NOT EXISTS idx_attraction_reviews_traveler ON attraction_reviews(traveler_id);
CREATE INDEX IF NOT EXISTS idx_attraction_reviews_guide ON attraction_reviews(guide_id);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_name text DEFAULT '',
  template_type text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view email logs"
  ON email_logs FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can insert email logs"
  ON email_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);
