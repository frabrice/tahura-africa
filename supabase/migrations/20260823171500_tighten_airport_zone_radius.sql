/*
  # Tighten Airport Transfer zone radius

  ## Why
  The initial 8km radius (20260823170000_populate_transport_zone_coverage.sql)
  was too generous - live-tested against a Kimironko pickup (a Kigali city
  neighbourhood, ~4km from the airport) and it matched "Airport Transfer"
  instead of "Kigali City", pricing it against the airport zone's higher
  minimum fare. The airport itself sits ~9km from central Kigali, so an
  8km radius nearly reaches downtown. 3km keeps the zone to the immediate
  airport vicinity (terminal, airport-adjacent hotels) without swallowing
  ordinary Kigali neighbourhoods.
*/

UPDATE transport_zones SET coverage_area = jsonb_set(coverage_area, '{radius_km}', '3')
WHERE region = 'Airport Transfer';
