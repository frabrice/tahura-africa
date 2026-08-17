/*
  # Custom Quotes — off-catalog deals through the platform

  ## Why
  A Partner/Host/Guide with a client asking for something that isn't an
  existing listing (a bespoke itinerary, a one-off experience, a custom
  homestay) has had no way to handle that inside Tahura — the deal, and the
  payment, happens entirely off-platform. This adds a `custom_quotes` table
  backing a creation flow on all three dashboards, a branded public payment
  page, and a PDF export, with payment running through the exact same
  Pesapal/InTouch rails (and payout_ledger trigger) as every other booking.

  ## Pricing model
  `net_amount` is what the creator wants to receive; `client_total` is the
  grossed-up amount the client actually pays (`net_amount / (1 - commission
  rate at creation time)`), computed and locked once at creation so a quote
  is a stable commitment even if the platform commission rate changes later.
  `client_total` is the ONLY price ever shown to the traveler/client — this
  keeps bookings.total_amount (set from client_total at payment time) doing
  exactly what it already does everywhere else, so the existing
  fn_write_payout_ledger trigger needs no changes to its commission math.

  ## RLS
  Anon INSERT/SELECT/UPDATE, matching this app's existing baseline for
  bookings/partner_listings — not the stricter authenticated-only pattern
  used for host_guide_applications, since that's only viable because Ops is
  migrated to Supabase Auth; Partners/Hosts/Guides are not, so requiring
  `authenticated` here would break quote creation for all of them today.
  Known, consistent-with-baseline limitation (same PII caveat as everywhere
  else client contact info already lives in this app), not a new regression.
*/

CREATE TABLE IF NOT EXISTS custom_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_ref text UNIQUE NOT NULL DEFAULT ('CQ-' || upper(substr(md5(random()::text), 1, 6))),

  quote_type text NOT NULL CHECK (quote_type IN ('experience', 'homestay', 'itinerary')),
  title text NOT NULL,
  description text DEFAULT '',
  cover_image text,
  duration_value integer,
  duration_unit text CHECK (duration_unit IN ('hours', 'days')),
  guests integer NOT NULL DEFAULT 1,
  whats_included text[] DEFAULT '{}',
  itinerary_days jsonb,

  net_amount numeric(10,2) NOT NULL CHECK (net_amount > 0),
  commission_rate_locked numeric(6,4) NOT NULL,
  client_total numeric(10,2) NOT NULL CHECK (client_total > 0),
  valid_until timestamptz NOT NULL,

  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text,

  partner_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  host_id uuid REFERENCES partner_hosts(id) ON DELETE SET NULL,
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  created_by text NOT NULL CHECK (created_by IN ('partner', 'host', 'guide')),

  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'expired', 'cancelled')),
  resulting_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_quotes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_custom_quotes_partner ON custom_quotes(partner_id);
CREATE INDEX IF NOT EXISTS idx_custom_quotes_host ON custom_quotes(host_id);
CREATE INDEX IF NOT EXISTS idx_custom_quotes_guide ON custom_quotes(guide_id);
CREATE INDEX IF NOT EXISTS idx_custom_quotes_status ON custom_quotes(status);

CREATE POLICY "Anyone can view custom quotes"
  ON custom_quotes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create custom quotes"
  ON custom_quotes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update custom quotes"
  ON custom_quotes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'custom_quote_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN custom_quote_id uuid REFERENCES custom_quotes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_custom_quote ON bookings(custom_quote_id);
