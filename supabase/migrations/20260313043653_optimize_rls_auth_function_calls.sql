/*
  # Optimize RLS Auth Function Calls

  Wraps `auth.uid()` calls in `(select ...)` to prevent re-evaluation per row.
  This is a performance optimization that caches the auth function result
  for the duration of the query instead of calling it for every row.

  1. Affected Tables
    - `bookings` (6 policies)
    - `saved_items` (3 policies)
    - `conversations` (7 policies)
    - `messages` (3 policies)
    - `support_tickets` (2 policies)
    - `ticket_messages` (2 policies)
    - `attraction_reviews` (1 policy)

  2. Changes
    - All `auth.uid()` calls replaced with `(select auth.uid())`
    - Policy logic remains identical
*/

-- bookings: Travelers can view their own bookings
DROP POLICY IF EXISTS "Travelers can view their own bookings" ON public.bookings;
CREATE POLICY "Travelers can view their own bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (traveler_id = (select auth.uid()));

-- bookings: Travelers can insert bookings
DROP POLICY IF EXISTS "Travelers can insert bookings" ON public.bookings;
CREATE POLICY "Travelers can insert bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (traveler_id = (select auth.uid()));

-- bookings: Guides can view their assigned bookings
DROP POLICY IF EXISTS "Guides can view their assigned bookings" ON public.bookings;
CREATE POLICY "Guides can view their assigned bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (guide_id IN (
    SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
  ));

-- bookings: Guides can update their booking status
DROP POLICY IF EXISTS "Guides can update their booking status" ON public.bookings;
CREATE POLICY "Guides can update their booking status"
  ON public.bookings FOR UPDATE TO authenticated
  USING (guide_id IN (
    SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
  ))
  WITH CHECK (guide_id IN (
    SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
  ));

-- bookings: Hosts can view bookings for their listings
DROP POLICY IF EXISTS "Hosts can view bookings for their listings" ON public.bookings;
CREATE POLICY "Hosts can view bookings for their listings"
  ON public.bookings FOR SELECT TO authenticated
  USING (host_id IN (
    SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
  ));

-- bookings: Hosts can update booking status
DROP POLICY IF EXISTS "Hosts can update booking status" ON public.bookings;
CREATE POLICY "Hosts can update booking status"
  ON public.bookings FOR UPDATE TO authenticated
  USING (host_id IN (
    SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
  ))
  WITH CHECK (host_id IN (
    SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
  ));

-- saved_items: Users can view own saved items
DROP POLICY IF EXISTS "Users can view own saved items" ON public.saved_items;
CREATE POLICY "Users can view own saved items"
  ON public.saved_items FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- saved_items: Users can insert own saved items
DROP POLICY IF EXISTS "Users can insert own saved items" ON public.saved_items;
CREATE POLICY "Users can insert own saved items"
  ON public.saved_items FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- saved_items: Users can delete own saved items
DROP POLICY IF EXISTS "Users can delete own saved items" ON public.saved_items;
CREATE POLICY "Users can delete own saved items"
  ON public.saved_items FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- conversations: Travelers can view own conversations
DROP POLICY IF EXISTS "Travelers can view own conversations" ON public.conversations;
CREATE POLICY "Travelers can view own conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (traveler_id = (select auth.uid()));

-- conversations: Travelers can create conversations
DROP POLICY IF EXISTS "Travelers can create conversations" ON public.conversations;
CREATE POLICY "Travelers can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    traveler_id = (select auth.uid())
    AND booking_id IN (
      SELECT bookings.id FROM bookings WHERE bookings.traveler_id = (select auth.uid())
    )
  );

-- conversations: Hosts can view their conversations
DROP POLICY IF EXISTS "Hosts can view their conversations" ON public.conversations;
CREATE POLICY "Hosts can view their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (host_id IN (
    SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
  ));

-- conversations: Hosts can create conversations
DROP POLICY IF EXISTS "Hosts can create conversations" ON public.conversations;
CREATE POLICY "Hosts can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (host_id IN (
    SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
  ));

-- conversations: Guides can view their conversations
DROP POLICY IF EXISTS "Guides can view their conversations" ON public.conversations;
CREATE POLICY "Guides can view their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (guide_id IN (
    SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
  ));

-- conversations: Guides can create conversations
DROP POLICY IF EXISTS "Guides can create conversations" ON public.conversations;
CREATE POLICY "Guides can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (guide_id IN (
    SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
  ));

-- conversations: Participants can update conversations
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (
    traveler_id = (select auth.uid())
    OR host_id IN (
      SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
    )
    OR guide_id IN (
      SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    traveler_id = (select auth.uid())
    OR host_id IN (
      SELECT partner_hosts.id FROM partner_hosts WHERE partner_hosts.traveler_user_id = (select auth.uid())
    )
    OR guide_id IN (
      SELECT guides.id FROM guides WHERE guides.traveler_user_id = (select auth.uid())
    )
  );

-- messages: Participants can view messages
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.traveler_id = (select auth.uid())
      OR conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid()))
      OR conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid()))
  ));

-- messages: Participants can send messages
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.traveler_id = (select auth.uid())
      OR conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid()))
      OR conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid()))
  ));

-- messages: Participants can update messages
DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;
CREATE POLICY "Participants can update messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.traveler_id = (select auth.uid())
      OR conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid()))
      OR conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid()))
  ))
  WITH CHECK (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.traveler_id = (select auth.uid())
      OR conversations.host_id IN (SELECT ph.id FROM partner_hosts ph WHERE ph.traveler_user_id = (select auth.uid()))
      OR conversations.guide_id IN (SELECT g.id FROM guides g WHERE g.traveler_user_id = (select auth.uid()))
  ));

-- support_tickets: Travelers can create tickets
DROP POLICY IF EXISTS "Travelers can create tickets" ON public.support_tickets;
CREATE POLICY "Travelers can create tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (created_by_auth_id = (select auth.uid()));

-- support_tickets: Travelers can view their own tickets
DROP POLICY IF EXISTS "Travelers can view their own tickets" ON public.support_tickets;
CREATE POLICY "Travelers can view their own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (created_by_auth_id = (select auth.uid()));

-- ticket_messages: Ticket participants can view messages
DROP POLICY IF EXISTS "Ticket participants can view messages" ON public.ticket_messages;
CREATE POLICY "Ticket participants can view messages"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (ticket_id IN (
    SELECT support_tickets.id FROM support_tickets WHERE support_tickets.created_by_auth_id = (select auth.uid())
  ));

-- ticket_messages: Ticket participants can send messages
DROP POLICY IF EXISTS "Ticket participants can send messages" ON public.ticket_messages;
CREATE POLICY "Ticket participants can send messages"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (ticket_id IN (
    SELECT support_tickets.id FROM support_tickets WHERE support_tickets.created_by_auth_id = (select auth.uid())
  ));

-- attraction_reviews: Authenticated users can create attraction reviews
DROP POLICY IF EXISTS "Authenticated users can create attraction reviews" ON public.attraction_reviews;
CREATE POLICY "Authenticated users can create attraction reviews"
  ON public.attraction_reviews FOR INSERT TO authenticated
  WITH CHECK (traveler_id = (select auth.uid()));
