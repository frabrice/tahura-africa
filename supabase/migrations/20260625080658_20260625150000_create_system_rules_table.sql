CREATE TABLE IF NOT EXISTS system_rules (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_system_rules" ON system_rules FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "update_system_rules_ops" ON system_rules FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "insert_system_rules_ops" ON system_rules FOR INSERT
  TO authenticated WITH CHECK (true);

-- Seed default rules
INSERT INTO system_rules (id, category, name, description, enabled, value) VALUES
  ('1', 'capacity', 'Institution Daily Capacity Threshold', 'Alert when institution reaches 85% of daily capacity', true, '85'),
  ('2', 'capacity', 'Automatic Booking Pause', 'Pause new bookings when capacity reaches 100%', true, '100'),
  ('3', 'booking', 'Maximum Group Size', 'Limit group bookings to institution-defined maximums', true, null),
  ('4', 'booking', 'Advance Booking Window', 'Require bookings to be made at least 24 hours in advance', false, '24'),
  ('5', 'quality', 'New Listing Review Required', 'All new listings require approval before going live', true, null),
  ('6', 'quality', 'Automatic Flag Threshold', 'Listings with 3+ flags automatically enter review', true, '3'),
  ('7', 'financial', 'Commission Rate', 'Platform commission charged on every transaction', true, '7'),
  ('8', 'financial', 'Partner Booking Limit', 'Prevent partners from over-booking beyond capacity', true, null)
ON CONFLICT (id) DO NOTHING;
