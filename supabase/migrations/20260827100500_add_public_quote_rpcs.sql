/*
  # custom_quotes: close the anon-read exposure without breaking the
  genuinely public /quote/:id payment link

  ## Why
  `custom_quotes` had a fully open `TO anon, authenticated USING (true)`
  SELECT policy — anyone could dump the entire table via PostgREST with
  no `id` filter, including `net_amount` and `commission_rate_locked`
  (Tahura's internal commission split with each partner/host/guide) and
  every client's contact details, for every quote ever created.

  Unlike the tables in the previous migration, this one has a genuine,
  intentional anonymous use case: `QuotePage.tsx` (route `/quote/:id`)
  is explicitly designed to work with no login at all — a traveler pays
  a custom quote from a link shared by email/WhatsApp, by design (see
  the comment in `QuotePage.tsx` itself: "This page doesn't require
  being signed in at all"). RLS can restrict rows, but it can't express
  "only if the caller already knows this UUID" as a column-level
  restriction — so a plain narrowed policy can't both allow that flow
  and hide the commission columns from it.

  ## Fix
  Two SECURITY DEFINER RPCs, following the same pattern as
  `lookup_traveler_by_email`/`get_traveler_count`/`verify_portal_login`:
  - `get_public_quote(uuid)` returns only the columns the public quote
    page actually renders or needs to attribute a resulting booking to
    (confirmed by reading `QuotePage.tsx`, `QuotePDF.tsx`, and
    `QuoteDownloadButton.tsx` line by line) — never `net_amount` or
    `commission_rate_locked`.
  - `mark_quote_paid(quote_id, booking_id)` replaces the client's direct
    `UPDATE custom_quotes SET status='paid'` call. It independently
    verifies the given booking is real, actually linked to this exact
    quote via `custom_quote_id`, and already has `payment_status='paid'`
    before touching anything — a caller can't mark a quote paid just by
    supplying an arbitrary booking id, only by pointing at a booking
    that a real payment-verification edge function (service role) has
    already confirmed.

  The direct-table SELECT is then dropped entirely for anon; the
  authenticated policy is narrowed from "any authenticated user" to
  "ops, or the quote's own partner/host/guide" — matching the ownership
  filters `CustomQuoteList.tsx` already applies client-side (defense in
  depth: the UI already filtered this way, the database now enforces it
  too). `ops_partner_update_custom_quotes` (the existing UPDATE policy)
  is untouched — it was already correctly scoped.
*/

CREATE OR REPLACE FUNCTION public.get_public_quote(p_id uuid)
RETURNS TABLE (
  id uuid,
  quote_ref text,
  quote_type text,
  title text,
  description text,
  cover_image text,
  duration_value integer,
  duration_unit text,
  guests integer,
  whats_included text[],
  itinerary_days jsonb,
  client_total numeric,
  valid_until timestamptz,
  client_name text,
  status text,
  resulting_booking_id uuid,
  partner_id uuid,
  host_id uuid,
  guide_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    id, quote_ref, quote_type, title, description, cover_image,
    duration_value, duration_unit, guests, whats_included, itinerary_days,
    client_total, valid_until, client_name, status, resulting_booking_id,
    partner_id, host_id, guide_id
  FROM custom_quotes
  WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_quote(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_quote_paid(p_quote_id uuid, p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE id = p_booking_id
      AND custom_quote_id = p_quote_id
      AND payment_status = 'paid'
  ) THEN
    RAISE EXCEPTION 'Booking not found, not linked to this quote, or not confirmed as paid';
  END IF;

  UPDATE custom_quotes
  SET status = 'paid', resulting_booking_id = p_booking_id, updated_at = now()
  WHERE id = p_quote_id AND status <> 'paid';
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_quote_paid(uuid, uuid) TO anon, authenticated;

-- Direct table access: drop the open anon/authenticated SELECT, replace
-- with ops-or-own-attribution for authenticated portal users. Anon has
-- no direct table SELECT at all now — only the RPC above.
DROP POLICY IF EXISTS "Anyone can view custom quotes" ON custom_quotes;

CREATE POLICY "own_or_ops_select_custom_quotes" ON custom_quotes FOR SELECT TO authenticated
  USING (
    public.is_active_ops_admin()
    OR partner_id IN (SELECT id FROM portal_users WHERE auth_user_id = auth.uid())
    OR host_id IN (SELECT id FROM partner_hosts WHERE traveler_user_id = auth.uid())
    OR guide_id IN (SELECT id FROM guides WHERE traveler_user_id = auth.uid())
  );

-- INSERT stays open (anon, authenticated) — creating a quote is a
-- portal-only action in practice (CustomQuoteForm.tsx, always rendered
-- inside an authenticated ops/partner/host/guide dashboard), but the
-- anon grant was already present before this migration and no exploit
-- path was found for it (an anon-created quote still can't grant itself
-- a favorable net_amount/commission split through anything a client
-- reads back, since get_public_quote never returns those columns) —
-- left untouched to keep this migration scoped to the confirmed read
-- exposure rather than re-auditing writes that were out of scope here.
