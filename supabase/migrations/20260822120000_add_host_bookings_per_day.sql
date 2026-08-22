/*
  # Host bookings-per-day limit

  ## Why
  A host with multiple experience/itinerary listings could be booked
  simultaneously across all of them on the same date - nothing enforced
  that one person can only run one activity at a time. This is the
  Ops-configurable ceiling for that rule (defaults to 1, per-host, so
  Ops can raise a specific host to 2 or 3 later without a schema change).
  Mirrors guides.max_engagements_per_day, which already exists.
*/

ALTER TABLE partner_hosts
  ADD COLUMN IF NOT EXISTS bookings_per_day integer NOT NULL DEFAULT 1;
