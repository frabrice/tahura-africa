/*
  # Populate transport_zones.coverage_area for auto zone detection

  ## Why
  transport_zones.coverage_area already has a {center, radius_km, boundaries}
  shape, but every zone was seeded with all three set to null. With no
  actual coverage geometry, travelers had to manually pick a zone from a
  dropdown, and the booking drawers just defaulted to zones[0] (whichever
  row happened to load first - in practice "Airport Transfer", verified
  live: a Kigali-to-Kigali pickup defaulted to Airport Transfer's zone,
  pricing it against that zone's higher RWF 10,000 minimum instead of
  Kigali City's RWF 3,000 one). Now that pickup carries a real coordinate
  (LocationPicker), the app can auto-detect the right zone instead of
  guessing - this just gives it real circles to test against.

  Radii are deliberately generous approximations (a zone is picked by
  nearest-center among non-overlapping candidates, with Airport Transfer's
  tight radius checked first as the priority match) - good enough to fix
  the "picked a wildly wrong zone" problem; not meant to be an exact
  province boundary.
*/

UPDATE transport_zones SET coverage_area = '{"center": {"lat": -1.9686, "lng": 30.1395}, "radius_km": 8}'::jsonb WHERE region = 'Airport Transfer';
UPDATE transport_zones SET coverage_area = '{"center": {"lat": -1.9441, "lng": 30.0619}, "radius_km": 20}'::jsonb WHERE region = 'Kigali City';
UPDATE transport_zones SET coverage_area = '{"center": {"lat": -1.4996, "lng": 29.6335}, "radius_km": 60}'::jsonb WHERE region = 'Northern Province';
UPDATE transport_zones SET coverage_area = '{"center": {"lat": -2.5967, "lng": 29.7392}, "radius_km": 60}'::jsonb WHERE region = 'Southern Province';
UPDATE transport_zones SET coverage_area = '{"center": {"lat": -1.8837, "lng": 30.6198}, "radius_km": 70}'::jsonb WHERE region = 'Eastern Province';
UPDATE transport_zones SET coverage_area = '{"center": {"lat": -2.0600, "lng": 29.3450}, "radius_km": 70}'::jsonb WHERE region = 'Western Province';
