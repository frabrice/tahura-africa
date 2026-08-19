/*
  # Fix: the Flutterwave gateway toggle never got seeded

  ## Why
  20260819130000 tried to seed the "Use Flutterwave as Primary Gateway" rule
  with id '9', not realising 20260812120000 had already claimed id '9' for
  an unrelated rule ("Host Revenue Share"). The `ON CONFLICT (id) DO NOTHING`
  silently skipped the insert, so the toggle never existed — RulesPage and
  getActiveGateway() would see no row at all.

  ## What this does
  Inserts the same rule under a free id ('10') instead.
*/

INSERT INTO system_rules (id, category, name, description, enabled, value) VALUES
  ('10', 'payments', 'Use Flutterwave as Primary Gateway', 'When off, checkout falls back to the legacy Pesapal (cards) + InTouch (mobile money) gateways.', true, null)
ON CONFLICT (id) DO NOTHING;
