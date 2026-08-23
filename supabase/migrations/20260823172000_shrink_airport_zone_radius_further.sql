/*
  # Shrink Airport Transfer zone radius further

  ## Why
  3km (20260823171500_tighten_airport_zone_radius.sql) still wasn't tight
  enough - re-tested live against the same Kimironko pickup and it's only
  ~2.9km from the airport's real coordinates (verified via Nominatim:
  airport center -1.9683588,30.1380664; Kimironko -1.942618,30.1382016),
  so it still matched "Airport Transfer". Kigali is small enough that the
  airport sits close to several ordinary neighbourhoods. 1.5km comfortably
  covers the airport itself (its OSM bounding box has roughly a ~1km
  radius) plus immediate airport-adjacent hotels/access roads, while
  excluding Kimironko and similar nearby-but-distinct neighbourhoods,
  which then correctly fall through to "Kigali City" (20km radius,
  nearest-center match).
*/

UPDATE transport_zones SET coverage_area = jsonb_set(coverage_area, '{radius_km}', '1.5')
WHERE region = 'Airport Transfer';
