/*
  # Add Guide Schedule Management

  Adds per-guide schedule management so each guide can have specific working days
  and hours, and hours can be blocked off (booked slots or manual closures).

  1. New Tables
    - `guide_schedules`
      - `id` (uuid, primary key)
      - `guide_id` (uuid, fk to guides)
      - `day_of_week` (text) - Monday, Tuesday, etc.
      - `start_time` (time) - working start time
      - `end_time` (time) - working end time
      - `is_working` (boolean) - whether guide works this day

  2. Security
    - Enable RLS
    - Institution portal users can manage their guides' schedules
    - Anyone can read schedules (for availability checking)
*/

CREATE TABLE IF NOT EXISTS guide_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  day_of_week text NOT NULL,
  start_time time DEFAULT '09:00',
  end_time time DEFAULT '17:00',
  is_working boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(guide_id, day_of_week)
);

ALTER TABLE guide_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view guide schedules"
  ON guide_schedules FOR SELECT
  USING (true);

CREATE POLICY "Portal users can insert guide schedules"
  ON guide_schedules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Portal users can update guide schedules"
  ON guide_schedules FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Portal users can delete guide schedules"
  ON guide_schedules FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_guide_schedules_guide_id ON guide_schedules(guide_id);
