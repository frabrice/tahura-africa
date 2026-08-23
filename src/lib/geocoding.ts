// Free geocoding via OpenStreetMap's Nominatim — no API key, no billing account.
// Usage policy asks for reasonable traffic (roughly 1 request/second) and an
// identifying request; fine at this app's current scale. If traffic grows a
// lot, the next step is a paid provider or a self-hosted Nominatim instance,
// not a rebuild — searchPlaces/reverseGeocode are the only two call sites.

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = `${NOMINATIM_BASE}/search?format=jsonv2&countrycodes=rw&limit=6&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((r: any) => ({
      label: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const data = await res.json();
    return data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
