/*
  # Restore Core Tables - Part 5: Guide Tips, Salary Payments, Booking Programs, Additional Indexes

  Creates:
  - guide_tips: tip records for guides from institution bookings
  - guide_salary_payments: salary payment records for guides
  - booking_programs: junction table linking bookings to multiple programs
  - reviews.booking_id column addition
  
  Also adds missing foreign key indexes for performance.
*/

-- Guide tips table
CREATE TABLE IF NOT EXISTS guide_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  tip_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE guide_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view guide tips"
  ON guide_tips FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can create guide tips"
  ON guide_tips FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update guide tips"
  ON guide_tips FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_guide_tips_institution ON guide_tips(institution_id);
CREATE INDEX IF NOT EXISTS idx_guide_tips_guide ON guide_tips(guide_id);

-- Guide salary payments table
CREATE TABLE IF NOT EXISTS guide_salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  description text DEFAULT '',
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  period_start date,
  period_end date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE guide_salary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view guide salary payments"
  ON guide_salary_payments FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can create guide salary payments"
  ON guide_salary_payments FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update guide salary payments"
  ON guide_salary_payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_guide_salary_institution ON guide_salary_payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_guide_salary_guide ON guide_salary_payments(guide_id);

-- Booking programs junction table
CREATE TABLE IF NOT EXISTS booking_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  program_title text NOT NULL DEFAULT '',
  price_snapshot numeric(10,2) NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE booking_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Travelers can insert own booking programs"
  ON booking_programs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_programs.booking_id
      AND bookings.traveler_id = (select auth.uid())
    )
  );

CREATE POLICY "Travelers can view own booking programs"
  ON booking_programs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_programs.booking_id
      AND bookings.traveler_id = (select auth.uid())
    )
  );

CREATE POLICY "Anon can view booking programs"
  ON booking_programs FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert booking programs"
  ON booking_programs FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_booking_programs_booking_id ON booking_programs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_programs_program_id ON booking_programs(program_id);

-- Add booking_id to reviews if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE reviews ADD COLUMN booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Unique index on reviews.booking_id (one review per booking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'reviews_booking_id_unique'
  ) THEN
    CREATE UNIQUE INDEX reviews_booking_id_unique ON reviews (booking_id) WHERE booking_id IS NOT NULL;
  END IF;
END $$;

-- Additional foreign key covering indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_item_id ON bookings(item_id);
CREATE INDEX IF NOT EXISTS idx_bookings_program_id ON bookings(program_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_flagged_by ON content_flags(flagged_by);
CREATE INDEX IF NOT EXISTS idx_traveler_reviews_booking ON traveler_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_traveler_reviews_traveler ON traveler_reviews(traveler_id);
CREATE INDEX IF NOT EXISTS idx_traveler_reviews_reviewer ON traveler_reviews(reviewer_id);
