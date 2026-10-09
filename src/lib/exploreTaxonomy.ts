/**
 * Categorisation, sorting helpers and row-building for the Explore page.
 *
 * Everything here is derived from data the listings already carry (title,
 * tags, location, the free-text duration/difficulty, an attraction's free-text
 * type), so new listings sort themselves and no database change is needed.
 *
 * Two guarantees the page relies on:
 *  - every item gets exactly ONE main category (no catch-all "More" dump);
 *  - a category with fewer than MIN_ROW items is folded into its fallback, so
 *    a browse row is never nearly empty.
 */

export const MIN_ROW = 6;
export const MAX_ROW_SHOWN = 14;

// ─── Provinces ───────────────────────────────────────────────────────────────

export const PROVINCES = ['Northern Province', 'Western Province', 'Southern Province', 'Eastern Province', 'Kigali'] as const;
export const MULTI_PROVINCE = 'Multiple provinces';

const EXPLICIT_PROVINCE: [string, RegExp][] = [
  ['Kigali', /kigali/i],
  ['Northern Province', /northern/i],
  ['Western Province', /western/i],
  ['Southern Province', /southern/i],
  ['Eastern Province', /eastern/i],
];

// For free-text attraction locations, which name districts and towns rather
// than provinces ("Rubavu District", "Near Musanze").
const PLACE_PROVINCE: [string, RegExp][] = [
  ['Kigali', /kigali|gasabo|kicukiro|nyarugenge|kanombe|gisozi|remera|kimironko|nyamirambo/i],
  ['Northern Province', /northern|musanze|burera|gicumbi|rulindo|gakenke|kinigi|ruhengeri|mulindi/i],
  ['Western Province', /western|rubavu|gisenyi|karongi|kibuye|rusizi|rutsiro|nyamasheke|ngororero|nyungwe|kivu|gishwati/i],
  ['Southern Province', /southern|huye|butare|nyanza|muhanga|nyaruguru|nyamagabe|gisagara|kamonyi|ruhango|kibeho/i],
  ['Eastern Province', /eastern|bugesera|kayonza|kirehe|rwamagana|nyagatare|gatsibo|ngoma|akagera|rusumo|muhazi|mugesera/i],
];

function matchProvinces(text: string, table: [string, RegExp][]): { name: string; at: number }[] {
  const out: { name: string; at: number }[] = [];
  for (const [name, rx] of table) {
    const m = rx.exec(text);
    if (m) out.push({ name, at: m.index });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Province of a listing whose `region` is already a province name. */
export function provinceOfRegion(region?: string): string {
  const text = (region || '').replace(/\(.*?\)/g, ' ');
  if (/all (four |five )?provinces/i.test(text)) return MULTI_PROVINCE;
  const hits = matchProvinces(text, EXPLICIT_PROVINCE);
  if (hits.length === 0) return '';
  if (hits.length === 1) return hits[0].name;
  return MULTI_PROVINCE;
}

/** Province of an attraction from its free-text location. */
export function provinceOfPlace(place?: string): string {
  const hits = matchProvinces(place || '', PLACE_PROVINCE);
  return hits.length ? hits[0].name : '';
}

// ─── Duration / difficulty ───────────────────────────────────────────────────

/** "2.5 hours", "3-4 hours", "Overnight (approx. 18 hours)" → hours (upper bound). */
export function parseDurationHours(text?: string): number | null {
  const t = (text || '').toLowerCase();
  const m = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?|days?|nights?)/.exec(t);
  if (!m) return /overnight/.test(t) ? 18 : null;
  const value = parseFloat(m[2] || m[1]);
  const unit = m[3];
  if (/^min/.test(unit)) return value / 60;
  if (/^(day|night)/.test(unit)) return value * 24;
  return value;
}

/** "5 days" / tags like "one-day journey" → number of days. */
export function parseTripDays(text?: string, tags: string[] = []): number | null {
  const t = `${text || ''} ${tags.join(' ')}`.toLowerCase();
  const m = /(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*days?/.exec(t);
  if (m) return parseInt(m[2] || m[1], 10);
  if (/one-day|1-day|full day/.test(t)) return 1;
  if (/two-day/.test(t)) return 2;
  if (/three-day/.test(t)) return 3;
  return null;
}

export type Difficulty = 'Easy' | 'Moderate' | 'Challenging';

export function parseDifficulty(text?: string): Difficulty | null {
  const t = (text || '').toLowerCase();
  if (/challeng|hard|strenuous/.test(t)) return 'Challenging';
  if (/moderate/.test(t)) return 'Moderate';
  if (/easy/.test(t)) return 'Easy';
  return null;
}

export const TRIP_LENGTHS = [
  { value: '1', label: '1 day', test: (d: number) => d === 1 },
  { value: '2', label: '2 days', test: (d: number) => d === 2 },
  { value: '3-4', label: '3–4 days', test: (d: number) => d >= 3 && d <= 4 },
  { value: '5+', label: '5+ days', test: (d: number) => d >= 5 },
] as const;

export const DURATION_BANDS = [
  { value: '2', label: 'Up to 2 hours' },
  { value: '4', label: 'Up to 4 hours (half day)' },
  { value: '8', label: 'Up to 8 hours (full day)' },
  { value: '24', label: 'Overnight or longer' },
] as const;

// ─── Category engine ─────────────────────────────────────────────────────────

export interface CategoryDef {
  label: string;
  subtitle: string;
  /** First definition (in array order) whose test passes wins. */
  test: (text: string, item: any) => boolean;
  /** Where this category's items go if it ends up with fewer than MIN_ROW. */
  fallback?: string;
  /** The last, always-true definition: only used when nothing else matches. */
  catchAll?: boolean;
}

function rx(re: RegExp) {
  return (text: string) => re.test(text);
}

const blob = (item: any) => `${item.title || item.name || ''} ${(item.tags || []).join(' ')}`.toLowerCase();

/**
 * Assigns every item exactly one category label. Unmatched items go to
 * `defaultLabel`; categories under MIN_ROW are folded into their fallback.
 */
export function assignCategories(items: any[], defs: CategoryDef[], defaultLabel: string): Map<string, string> {
  const result = new Map<string, string>();
  const specific = defs.filter((d) => !d.catchAll);
  for (const item of items) {
    // The title is the strongest signal; tags are only consulted if the title
    // alone matches nothing (tags are noisy: a hike can be tagged "twin lakes").
    const title = `${item.title || item.name || ''}`.toLowerCase();
    const full = blob(item);
    const def = specific.find((d) => d.test(title, item)) || specific.find((d) => d.test(full, item));
    result.set(item.id, def ? def.label : defaultLabel);
  }
  // Fold under-filled categories into their fallback until nothing changes.
  for (let pass = 0; pass < defs.length; pass++) {
    const counts = new Map<string, number>();
    result.forEach((label) => counts.set(label, (counts.get(label) || 0) + 1));
    let changed = false;
    for (const def of defs) {
      const n = counts.get(def.label) || 0;
      if (n > 0 && n < MIN_ROW && def.fallback && def.fallback !== def.label) {
        result.forEach((label, id) => { if (label === def.label) result.set(id, def.fallback!); });
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
  return result;
}

// ─── Local (experiences) ─────────────────────────────────────────────────────

export const EXPERIENCE_CATEGORIES: CategoryDef[] = [
  {
    label: 'Kigali & City Life',
    subtitle: 'Markets, studios, streets, and city stories',
    test: (t, i) => i.province === 'Kigali' || /kigali|nyamirambo|nyandungu/.test(t),
    fallback: 'Culture & Heritage',
  },
  {
    label: 'Culture & Heritage',
    subtitle: 'Royal courts, dance, storytelling, and living traditions',
    test: rx(/royal|inyambo|dance|drumming|heritage|kibeho|liberation|cultural village|culture experience|community culture|pilgrimage/),
  },
  {
    label: 'Coffee, Tea & Farm Life',
    subtitle: 'Plantations, harvests, bees, and life on the land',
    test: rx(/coffee|\btea\b|farm|banana|beekeep|cattle|potato|agricultur|urwagwa|honey/),
    fallback: 'Culture & Heritage',
  },
  {
    label: 'Hiking & Adventure',
    subtitle: 'Trails, caves, waterfalls, and a little adrenaline',
    test: rx(/hik|trek|camping|cycling|cave|adventure|waterfall|nature walk|photography walk/),
    fallback: 'Wildlife & Forest',
  },
  {
    label: 'Wildlife & Forest',
    subtitle: 'Primates, birds, canopy walks, and ancient forest',
    test: rx(/nyungwe|chimp|colobus|gishwati|primate|birdwatch|canopy|wildlife|monkey|bat colony|gorilla/),
    fallback: 'Hiking & Adventure',
  },
  {
    label: 'Lakes & Water',
    subtitle: 'Canoes, fishing boats, islands, and lakeside mornings',
    test: rx(/lake|canoe|kayak|fishing|boat|island|cruise|fishermen|hot spring|beach|river/),
    fallback: 'Hiking & Adventure',
  },
  {
    label: 'Crafts & Art',
    subtitle: 'Pottery, weaving, imigongo, and made-in-Rwanda design',
    test: rx(/imigongo|pottery|weaving|basket|fashion|art studio|craft|cow-dung|painting/),
    fallback: 'Culture & Heritage',
  },
  {
    label: 'Food & Cooking',
    subtitle: 'Cook, taste, and eat like a local',
    test: rx(/cooking|food|market|farm to table|milk bar/),
    fallback: 'Culture & Heritage',
  },
  {
    label: 'Culture & Heritage',
    subtitle: 'Royal courts, dance, storytelling, and living traditions',
    test: () => true,
    catchAll: true,
  },
];

// ─── Journeys ────────────────────────────────────────────────────────────────

export const JOURNEY_CATEGORIES: CategoryDef[] = [
  {
    label: 'Wildlife & National Parks',
    subtitle: 'Gorillas, savannahs, rainforest, and big skies',
    test: rx(/akagera|wildlife|primate|gorilla|nyungwe|safari|big five|conservation|chimp|national park/),
    fallback: 'Culture, Royal & Heritage',
  },
  {
    label: 'Lakes & Kivu Shores',
    subtitle: 'Water, islands, and the Congo Nile Trail',
    test: rx(/lake|kivu|island|congo nile|twin lakes|muhazi|karongi/),
    fallback: 'Culture, Royal & Heritage',
  },
  {
    label: 'Coffee, Tea & Food',
    subtitle: 'Follow the harvest from hillside to cup',
    test: rx(/coffee|\btea\b|food|farm/),
    fallback: 'Culture, Royal & Heritage',
  },
  {
    label: 'Culture, Royal & Heritage',
    subtitle: 'Kingdoms, remembrance, craft, and city life',
    test: () => true,
    catchAll: true,
  },
];

// ─── Attractions ─────────────────────────────────────────────────────────────

/** Attractions carry a free-text `type` ("Genocide Memorial", "Natural Hot Springs"). */
export const ATTRACTION_CATEGORIES: CategoryDef[] = [
  {
    label: 'Parks & Wildlife',
    subtitle: 'National parks, forests, and protected land',
    test: rx(/national park|eco-park|sacred forest|urban park|wetland|conservation|gorilla fund/),
    fallback: 'Waterfalls, Caves & Springs',
  },
  {
    label: 'Memorials & Remembrance',
    subtitle: 'Places of memory, honoured with care',
    test: rx(/genocide|memorial|remembrance|peacekeepers/),
  },
  {
    label: 'Museums & Heritage',
    subtitle: 'Palaces, museums, and stories in stone',
    test: rx(/museum|palace|historical|seminary|cathedral|heritage/),
    fallback: 'Culture, Spirit & Landscapes',
  },
  {
    label: 'Waterfalls, Caves & Springs',
    subtitle: 'Falls, lava caves, and natural hot springs',
    test: rx(/hot spring|waterfall|cave|geological|rock/),
    fallback: 'Lakes, Islands & Shores',
  },
  {
    label: 'Lakes, Islands & Shores',
    subtitle: 'Lake Kivu, the twin lakes, and the waterfront',
    test: rx(/lake|island|lakefront|beach|bay|river/),
    fallback: 'Culture, Spirit & Landscapes',
  },
  {
    label: 'Culture, Spirit & Landscapes',
    subtitle: 'Sacred places, art centres, and working landscapes',
    test: () => true,
    catchAll: true,
  },
];

/** Attractions are classified on name + free-text type, not tags. */
export function classifyAttractions(attractions: any[]): Map<string, string> {
  const withBlob = attractions.map((a) => ({ ...a, title: `${a.name} ${a.type || ''}`, tags: [] }));
  return assignCategories(withBlob, ATTRACTION_CATEGORIES, 'Culture, Spirit & Landscapes');
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

type RatingsMap = Record<string, { avg: number; count: number }>;

/** Default order: has a photo → better rated → more reviews → A–Z. */
export function recommendedSort<T extends { id: string; media?: string[]; title?: string; name?: string }>(items: T[], ratings: RatingsMap): T[] {
  return [...items].sort((a, b) => {
    const pa = a.media && a.media.length > 0 ? 1 : 0;
    const pb = b.media && b.media.length > 0 ? 1 : 0;
    if (pa !== pb) return pb - pa;
    const ra = ratings[a.id]?.avg || 0;
    const rb = ratings[b.id]?.avg || 0;
    if (ra !== rb) return rb - ra;
    const ca = ratings[a.id]?.count || 0;
    const cb = ratings[b.id]?.count || 0;
    if (ca !== cb) return cb - ca;
    return (a.title || a.name || '').localeCompare(b.title || b.name || '');
  });
}

export function itemHours(item: any): number | null {
  if (typeof item.duration_hours === 'number') return item.duration_hours;
  if (typeof item.trip_days === 'number') return item.trip_days * 24;
  return null;
}

// ─── Price presets (built from the actual prices on the tab) ─────────────────

export interface PricePreset { label: string; min: string; max: string }

function niceRound(n: number): number {
  if (n <= 10) return Math.max(1, Math.round(n));
  if (n <= 50) return Math.round(n / 5) * 5;
  if (n <= 200) return Math.round(n / 10) * 10;
  return Math.round(n / 50) * 50;
}

/** Three bands that split the real prices roughly into thirds. */
export function buildPricePresets(prices: number[]): PricePreset[] {
  const p = prices.filter((x) => x > 0).sort((a, b) => a - b);
  if (p.length < 6) return [];
  const lo = niceRound(p[Math.floor(p.length / 3)]);
  let hi = niceRound(p[Math.floor((p.length * 2) / 3)]);
  if (hi <= lo) hi = lo + Math.max(5, Math.round(lo * 0.5));
  return [
    { label: `Under $${lo}`, min: '0', max: String(lo) },
    { label: `$${lo}–$${hi}`, min: String(lo), max: String(hi) },
    { label: `$${hi}+`, min: String(hi), max: '' },
  ];
}

// ─── Rows ────────────────────────────────────────────────────────────────────

export interface Row { title: string; subtitle: string; items: any[]; kind: 'collection' | 'theme' | 'province' }

function themeRows(items: any[], defs: CategoryDef[], order: string[] = []): Row[] {
  const seen = new Set<string>();
  const unique = defs.filter((d) => (seen.has(d.label) ? false : (seen.add(d.label), true)));
  const rank = (label: string) => { const i = order.indexOf(label); return i === -1 ? order.length : i; };
  return unique
    .sort((a, b) => rank(a.label) - rank(b.label))
    .map((d) => ({ title: d.label, subtitle: d.subtitle, items: items.filter((i) => i.category === d.label), kind: 'theme' as const }))
    .filter((r) => r.items.length >= MIN_ROW);
}

function provinceRows(items: any[], verb: string): Row[] {
  return PROVINCES
    .map((p) => ({
      title: p === 'Kigali' ? 'In Kigali' : `In the ${p}`,
      subtitle: `${verb} ${p === 'Kigali' ? 'the capital' : `the ${p}`}`,
      items: items.filter((i) => i.province === p),
      kind: 'province' as const,
    }))
    .filter((r) => r.items.length >= MIN_ROW);
}

export function buildExperienceRows(items: any[], sort: (xs: any[]) => any[]): Row[] {
  const quick = items.filter((i) => typeof i.duration_hours === 'number' && i.duration_hours <= 2 && i.difficulty !== 'Challenging' && i.difficulty !== 'Moderate');
  const halfDay = items.filter((i) => typeof i.duration_hours === 'number' && i.duration_hours > 2 && i.duration_hours <= 4);
  const rows: Row[] = [];
  if (quick.length >= MIN_ROW) rows.push({ title: 'Quick & Easy', subtitle: 'Up to 2 hours, no experience needed', items: quick, kind: 'collection' });
  rows.push(...themeRows(items, EXPERIENCE_CATEGORIES, ['Wildlife & Forest', 'Lakes & Water', 'Hiking & Adventure', 'Culture & Heritage', 'Coffee, Tea & Farm Life', 'Crafts & Art', 'Kigali & City Life']));
  if (halfDay.length >= MIN_ROW) rows.push({ title: 'Half-Day Adventures', subtitle: '2 to 4 hours of something memorable', items: halfDay, kind: 'collection' });
  rows.push(...provinceRows(items, 'Everything in'));
  return rows.map((r) => ({ ...r, items: sort(r.items) }));
}

export function buildJourneyRows(items: any[], sort: (xs: any[]) => any[]): Row[] {
  const days = (i: any) => (typeof i.trip_days === 'number' ? i.trip_days : -1);
  const collections: Row[] = [
    { title: 'One-Day Journeys', subtitle: 'A full story, back in time for dinner', items: items.filter((i) => days(i) === 1), kind: 'collection' },
    { title: 'Two-Day Journeys', subtitle: 'One night away, two days of discovery', items: items.filter((i) => days(i) === 2), kind: 'collection' },
    { title: 'Longer Journeys', subtitle: '3 to 8 days across Rwanda', items: items.filter((i) => days(i) >= 3), kind: 'collection' },
  ].filter((r) => r.items.length >= MIN_ROW);
  const rows = [...collections, ...themeRows(items, JOURNEY_CATEGORIES, ['Wildlife & National Parks', 'Lakes & Kivu Shores', 'Culture, Royal & Heritage'])];
  return rows.map((r) => ({ ...r, items: sort(r.items) }));
}

export function buildAttractionRows(items: any[], sort: (xs: any[]) => any[]): Row[] {
  const free = items.filter((i) => i.entry_fee_is_free !== false);
  const rows: Row[] = [];
  if (free.length >= MIN_ROW) rows.push({ title: 'Free to Enter', subtitle: 'No ticket needed', items: free, kind: 'collection' });
  rows.push(...themeRows(items, ATTRACTION_CATEGORIES, ['Parks & Wildlife', 'Lakes, Islands & Shores', 'Waterfalls, Caves & Springs', 'Museums & Heritage', 'Culture, Spirit & Landscapes', 'Memorials & Remembrance']));
  return rows.map((r) => ({ ...r, items: sort(r.items) }));
}

// ─── Enrichment (run once after loading, before caching) ─────────────────────

export function enrichExperiences(items: any[]): any[] {
  const withFacts = items.map((i) => ({
    ...i,
    province: provinceOfRegion(i.location?.region),
    duration_hours: parseDurationHours(i.duration_text),
    difficulty: parseDifficulty(i.difficulty_text),
  }));
  const cats = assignCategories(withFacts, EXPERIENCE_CATEGORIES, 'Culture & Heritage');
  return withFacts.map((i) => ({ ...i, category: cats.get(i.id) }));
}

export function enrichJourneys(items: any[]): any[] {
  const withFacts = items.map((i) => ({
    ...i,
    province: provinceOfRegion(i.location?.region),
    trip_days: parseTripDays(i.duration_text, i.tags),
  }));
  const cats = assignCategories(withFacts, JOURNEY_CATEGORIES, 'Culture, Royal & Heritage');
  return withFacts.map((i) => ({ ...i, category: cats.get(i.id) }));
}

export function enrichAttractions(items: any[]): any[] {
  const cats = classifyAttractions(items);
  return items.map((a) => ({
    ...a,
    province: provinceOfPlace(a.location?.name),
    category: cats.get(a.id),
  }));
}

export function enrichHomestays(items: any[]): any[] {
  return items.map((h) => ({ ...h, province: provinceOfRegion(h.location?.region), category: 'Homestays' }));
}

/** Short label for the little badge on an attraction card. */
const ATTRACTION_BADGES: Record<string, string> = {
  'Parks & Wildlife': 'Park & Wildlife',
  'Memorials & Remembrance': 'Memorial',
  'Museums & Heritage': 'Museum & Heritage',
  'Waterfalls, Caves & Springs': 'Nature',
  'Lakes, Islands & Shores': 'Lake & Shore',
  'Culture, Spirit & Landscapes': 'Culture & Spirit',
};

export function attractionBadge(category?: string): string {
  return (category && ATTRACTION_BADGES[category]) || 'Attraction';
}

/** "2.5 hrs" / "1 day" label for a card, from the parsed duration. */
export function formatDuration(item: any): string | null {
  if (typeof item.trip_days === 'number') return `${item.trip_days} ${item.trip_days === 1 ? 'day' : 'days'}`;
  const h = item.duration_hours;
  if (typeof h !== 'number') return null;
  if (h >= 24) return `${Math.round(h / 24)} ${Math.round(h / 24) === 1 ? 'day' : 'days'}`;
  const rounded = Number.isInteger(h) ? h : Math.round(h * 10) / 10;
  return `${rounded} ${rounded === 1 ? 'hr' : 'hrs'}`;
}
