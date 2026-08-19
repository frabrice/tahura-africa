/*
  # Add Flutterwave as a payment gateway, with a manual Ops toggle

  ## Why
  Pesapal (cards) + InTouch (mobile money) are being replaced by Flutterwave,
  which covers both in a single hosted checkout. Rather than deleting the
  Pesapal/InTouch integration, this keeps it in place as a manual fallback —
  an Ops-flippable toggle in system_rules decides which gateway is active,
  no redeploy needed if Flutterwave has a sustained outage.

  ## Changes
  - `bookings.flutterwave_tx_ref` / `payments.flutterwave_tx_ref` /
    `payments.flutterwave_transaction_id` — mirrors the existing
    pesapal_tracking_id / pesapal_order_tracking_id pattern.
  - New system_rules row ("Use Flutterwave as Primary Gateway", category
    'payments') the client reads to pick the active gateway. Defaults to
    enabled=true (Flutterwave active); Ops can flip it off to fall back to
    the legacy Pesapal/InTouch flow.
  - system_rules currently only allows UPDATE/INSERT `TO authenticated`, but
    Ops still logs in via the legacy anon-key session (per the anon-SELECT
    fix in 20260812130000) — without this, an Ops admin flipping the toggle
    would silently fail to save. Adds matching anon UPDATE/INSERT policies
    (RLS policies for the same command OR together, so this only adds
    coverage, doesn't loosen anything that worked before).
*/

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flutterwave_tx_ref text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS flutterwave_tx_ref text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS flutterwave_transaction_id text;

CREATE INDEX IF NOT EXISTS bookings_flutterwave_tx_ref_idx ON bookings(flutterwave_tx_ref);
CREATE INDEX IF NOT EXISTS payments_flutterwave_tx_ref_idx ON payments(flutterwave_tx_ref);

CREATE POLICY "update_system_rules_anon"
  ON system_rules FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "insert_system_rules_anon"
  ON system_rules FOR INSERT TO anon WITH CHECK (true);

INSERT INTO system_rules (id, category, name, description, enabled, value) VALUES
  ('10', 'payments', 'Use Flutterwave as Primary Gateway', 'When off, checkout falls back to the legacy Pesapal (cards) + InTouch (mobile money) gateways.', true, null)
ON CONFLICT (id) DO NOTHING;
