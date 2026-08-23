// Free driving-distance routing via OSRM's public demo server — no API key.
// Replaces the earlier straight-line (haversine) distance estimate with a
// real road route. Same scaling note as geocoding.ts: fine at current
// traffic, self-host OSRM or move to a paid router if that changes.

const OSRM_BASE = 'https://router.project-osrm.org';

export interface DrivingRoute {
  distanceKm: number;
  durationMin: number;
}

export async function getDrivingRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<DrivingRoute | null> {
  const url = `${OSRM_BASE}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch {
    return null;
  }
}
