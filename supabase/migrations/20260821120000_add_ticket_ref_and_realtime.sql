/*
  # Ticket reference numbers + realtime for the support chat widget

  ## Why
  CasesPage.tsx has always rendered `ticket.ticket_ref` on both the list and
  detail views, but no such column ever existed on support_tickets - it's
  been rendering as blank/undefined this whole time. The new floating support
  chat widget needs a real, short, shareable ticket number to show the
  traveler right after they send their first message ("Ticket #TK-123456
  created"), and Ops replies need to arrive in that same open widget live,
  which requires ticket_messages to be in the realtime publication.

  ## What this does
  1. Adds support_tickets.ticket_ref, following the same pattern as
     bookings.booking_id / custom_quotes.quote_ref (a random 6-digit suffix,
     unique, backfilled for existing rows via the column default).
  2. Adds ticket_messages (and support_tickets, for live status changes) to
     the supabase_realtime publication, guarded so this is safe to re-run.
*/

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS ticket_ref text UNIQUE NOT NULL DEFAULT concat('TK-', floor(random() * 900000 + 100000)::text);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ticket_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
  END IF;
END $$;
