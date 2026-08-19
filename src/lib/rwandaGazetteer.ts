// A small hand-curated Rwanda place-name → coordinates lookup. Real
// geocoding (Google/Mapbox) needs an API key, ongoing cost, and reliably
// addressable data most listings and travelers don't have yet — this gazetteer
// is the cheap, dependency-free stand-in: good enough for a base+per-km
// transport fare estimate, upgradable to real geocoding once volume justifies
// the API cost. Shared by the transport fare calculator (BookingDrawer,
// AttractionBookingDrawer) and the explore map.
export const RWANDA_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  // Kigali neighbourhoods — most pickups originate here
  'Kigali': { lat: -1.9441, lng: 30.0619 },
  'Nyarugenge': { lat: -1.9506, lng: 30.0588 },
  'Kimironko': { lat: -1.9436, lng: 30.1044 },
  'Remera': { lat: -1.9578, lng: 30.1086 },
  'Kacyiru': { lat: -1.9367, lng: 30.0908 },
  'Kimihurura': { lat: -1.9500, lng: 30.0928 },
  'Nyarutarama': { lat: -1.9328, lng: 30.1006 },
  'Nyamirambo': { lat: -1.9706, lng: 30.0394 },
  'Gikondo': { lat: -1.9789, lng: 30.0733 },
  'Kicukiro': { lat: -1.9878, lng: 30.1044 },
  'Gisozi': { lat: -1.9086, lng: 30.0669 },
  'Kinyinya': { lat: -1.9089, lng: 30.1064 },
  'Kigali International Airport': { lat: -1.9686, lng: 30.1394 },
  'Kanombe': { lat: -1.9686, lng: 30.1394 },

  // Regions / towns / national parks
  'Nyungwe Forest': { lat: -2.4833, lng: 29.1667 },
  'Musanze': { lat: -1.4998, lng: 29.6350 },
  'Rubavu (Gisenyi)': { lat: -1.6585, lng: 29.3500 },
  'Rubavu': { lat: -1.6585, lng: 29.3500 },
  'Gisenyi': { lat: -1.6585, lng: 29.3500 },
  'Huye (Butare)': { lat: -2.5961, lng: 29.7394 },
  'Huye': { lat: -2.5961, lng: 29.7394 },
  'Butare': { lat: -2.5961, lng: 29.7394 },
  'Akagera National Park': { lat: -1.5333, lng: 30.4667 },
  'Akagera': { lat: -1.5333, lng: 30.4667 },
  'Lake Kivu': { lat: -2.0000, lng: 29.2000 },
  'Volcanoes National Park': { lat: -1.4833, lng: 29.5333 },
  'Kibuye': { lat: -2.0600, lng: 29.3470 },
  'Nyanza': { lat: -2.3518, lng: 29.7514 },
  'Rusizi (Cyangugu)': { lat: -2.4846, lng: 28.9075 },
  'Rusizi': { lat: -2.4846, lng: 28.9075 },
  'Cyangugu': { lat: -2.4846, lng: 28.9075 },
  'Nyamata': { lat: -2.1500, lng: 30.1000 },
  'Lake Burera': { lat: -1.4000, lng: 29.5500 },
};

/** Ordered list of place names, for building a datalist/autocomplete. */
export const RWANDA_LOCATION_NAMES = Object.keys(RWANDA_LOCATIONS);

/**
 * Resolves a free-typed place name to coordinates via direct match, then
 * substring match in either direction (so "Kimironko, Kigali" matches
 * "Kimironko", and "Kigali" matches "Kigali International Airport" only if
 * typed that fully — direct match is checked first to avoid that ambiguity).
 */
export function getCoordinates(locationName: string | undefined | null): { lat: number; lng: number } | null {
  const normalized = locationName?.trim();
  if (!normalized) return null;
  if (RWANDA_LOCATIONS[normalized]) return RWANDA_LOCATIONS[normalized];
  for (const [key, coords] of Object.entries(RWANDA_LOCATIONS)) {
    if (normalized.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(normalized.toLowerCase())) {
      return coords;
    }
  }
  return null;
}
