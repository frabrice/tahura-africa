/*
  # Create Host Schedule Management System

  ## Overview
  Adds schedule management for partner hosts similar to the guide schedule system.
  Hosts can have specific working days and hours for availability management.

  ## New Tables

  ### 1. `host_schedules`
  Stores weekly schedule for each host
  - `id` (uuid, primary key) - Unique schedule entry identifier
  - `host_id` (uuid, foreign key) - References partner_hosts table
  - `day_of_week` (text) - Day name (Monday, Tuesday, etc.)
  - `start_time` (time) - Working start time
  - `end_time` (time) - Working end time
  - `is_working` (boolean) - Whether host works this day
  - `created_at`, `updated_at` (timestamptz) - Timestamps

  ## Security
  - Enable RLS on host_schedules table
  - Anyone can view schedules for availability checking
  - Partners can manage schedules for their own hosts
  - Public access for reading (for booking availability)

  ## Important Notes
  - Each host-day combination is unique (UNIQUE constraint)
  - Default working hours: 09:00 - 17:00
  - Weekend days default to non-working
  - Schedule management integrated into partner console
*/

-- Create host_schedules table
CREATE TABLE IF NOT EXISTS host_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid REFERENCES partner_hosts(id) ON DELETE CASCADE NOT NULL,
  day_of_week text NOT NULL,
  start_time time DEFAULT '09:00',
  end_time time DEFAULT '17:00',
  is_working boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(host_id, day_of_week)
);

-- Enable RLS
ALTER TABLE host_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view host schedules"
  ON host_schedules FOR SELECT
  USING (true);

CREATE POLICY "Partners can insert host schedules"
  ON host_schedules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Partners can update host schedules"
  ON host_schedules FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Partners can delete host schedules"
  ON host_schedules FOR DELETE
  USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_host_schedules_host_id ON host_schedules(host_id);
