const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'can','get','find','show','me','i','want','is','are','was','were','be',
  'been','being','have','has','had','do','does','did','will','would','could',
  'should','may','might','shall','need','there','here','where','what','how',
  'who','which','that','this','these','those','some','any','all','both',
  'am','from','about','like','looking','something','please','give','tell',
  'know','take','go','going','my','your','we','our','us','they','them',
  'near','best','great','good','nice','around','really','very','quite',
  'also','just','now','then','so','up','down','out','into','through',
  'during','over','between','under','again','further','too','more','most',
]);

const SYNONYMS: Record<string, string[]> = {
  'hike': ['hiking', 'trek', 'trekking', 'walk', 'walking', 'trail', 'mountain', 'nature'],
  'hiking': ['hike', 'trek', 'trekking', 'walk', 'trail', 'mountain', 'nature'],
  'trek': ['trekking', 'hike', 'hiking', 'walk', 'trail', 'mountain'],
  'trekking': ['trek', 'hike', 'hiking', 'trail', 'mountain', 'nature'],
  'cook': ['cooking', 'culinary', 'food', 'cuisine', 'kitchen', 'baking', 'meal'],
  'cooking': ['cook', 'culinary', 'food', 'cuisine', 'kitchen', 'meal'],
  'food': ['cook', 'cooking', 'culinary', 'cuisine', 'meal', 'eat', 'eating', 'restaurant', 'dining'],
  'eat': ['eating', 'food', 'cuisine', 'dining', 'restaurant', 'culinary'],
  'art': ['arts', 'craft', 'crafts', 'painting', 'drawing', 'pottery', 'creative', 'creativity'],
  'craft': ['crafts', 'art', 'arts', 'pottery', 'weaving', 'creative'],
  'culture': ['cultural', 'tradition', 'traditional', 'heritage', 'local', 'authentic'],
  'cultural': ['culture', 'tradition', 'traditional', 'heritage', 'local', 'authentic'],
  'history': ['historical', 'heritage', 'historic', 'ancient', 'museum', 'monument'],
  'historical': ['history', 'heritage', 'historic', 'ancient', 'museum'],
  'wildlife': ['animal', 'animals', 'safari', 'nature', 'bird', 'birds', 'gorilla', 'primate'],
  'safari': ['wildlife', 'animal', 'nature', 'park', 'reserve', 'gorilla'],
  'gorilla': ['primate', 'wildlife', 'safari', 'forest', 'nature'],
  'lake': ['lakes', 'water', 'swimming', 'boating', 'lakeside', 'fishing'],
  'beach': ['lake', 'water', 'swimming', 'shore'],
  'family': ['families', 'kids', 'children', 'child', 'family-friendly'],
  'kids': ['children', 'family', 'families', 'child', 'youth', 'young'],
  'romantic': ['romance', 'couples', 'couple', 'honeymoon', 'anniversary', 'love'],
  'couples': ['romantic', 'romance', 'couple', 'honeymoon'],
  'adventure': ['adventurous', 'thrill', 'extreme', 'outdoor', 'outdoors', 'exciting'],
  'outdoor': ['outdoors', 'adventure', 'nature', 'open air', 'wilderness'],
  'music': ['musical', 'song', 'singing', 'dance', 'dancing', 'concert', 'drum', 'drumming'],
  'dance': ['dancing', 'music', 'traditional', 'cultural', 'performance'],
  'cheap': ['affordable', 'budget', 'low cost', 'inexpensive', 'free', 'value'],
  'affordable': ['cheap', 'budget', 'low cost', 'inexpensive', 'value'],
  'luxury': ['luxurious', 'premium', 'exclusive', 'high end', 'upscale', 'posh'],
  'eco': ['ecological', 'sustainable', 'green', 'environment', 'conservation', 'eco-friendly'],
  'sustainable': ['eco', 'ecological', 'green', 'conservation', 'responsible'],
  'farm': ['farming', 'agriculture', 'rural', 'village', 'countryside', 'homestead'],
  'village': ['rural', 'farm', 'countryside', 'community', 'local', 'traditional'],
  'rural': ['village', 'countryside', 'farm', 'remote', 'community'],
  'museum': ['gallery', 'heritage', 'history', 'historical', 'exhibit', 'exhibition'],
  'gallery': ['museum', 'art', 'exhibit', 'exhibition', 'artwork'],
  'park': ['national park', 'nature', 'wildlife', 'reserve', 'conservation'],
  'photo': ['photography', 'photos', 'pictures', 'camera', 'scenic', 'landscape', 'photographer'],
  'photography': ['photo', 'photos', 'pictures', 'camera', 'scenic', 'landscape'],
  'solo': ['alone', 'single', 'independent', 'backpacker', 'individual'],
  'group': ['groups', 'team', 'community', 'social', 'crowd', 'party'],
  'morning': ['sunrise', 'early', 'dawn'],
  'sunset': ['evening', 'dusk', 'golden hour', 'scenic'],
  'spa': ['wellness', 'relax', 'relaxation', 'massage', 'yoga', 'meditation'],
  'relax': ['relaxation', 'leisure', 'rest', 'peaceful', 'tranquil', 'spa', 'wellness'],
  'community': ['local', 'village', 'rural', 'traditional', 'authentic'],
  'authentic': ['local', 'traditional', 'genuine', 'real', 'cultural', 'culture'],
  'learn': ['learning', 'educational', 'education', 'workshop', 'class', 'lesson', 'teach'],
  'workshop': ['class', 'lesson', 'learn', 'learning', 'educational', 'skill'],
  'stay': ['homestay', 'accommodation', 'lodge', 'house', 'home', 'host', 'room'],
  'homestay': ['stay', 'accommodation', 'host', 'house', 'home', 'lodging'],
  'accommodation': ['homestay', 'stay', 'lodge', 'house', 'room', 'lodging'],
  'volcano': ['volcanic', 'eruption', 'lava', 'mountain', 'nyiragongo', 'virunga'],
  'mountain': ['mountains', 'volcano', 'volcanic', 'highland', 'peak', 'summit', 'trek', 'hike'],
  'forest': ['jungle', 'woodland', 'nature', 'trees', 'rainforest', 'canopy'],
  'bird': ['birding', 'birds', 'birdwatching', 'ornithology', 'wildlife', 'nature'],
  'canoe': ['canoeing', 'kayak', 'kayaking', 'water', 'lake', 'boat', 'boating'],
  'cycling': ['bike', 'biking', 'bicycle', 'cycle', 'outdoor'],
  'coffee': ['tea', 'plantation', 'farm', 'harvest', 'crop'],
  'pottery': ['craft', 'clay', 'art', 'traditional', 'handmade'],
  'weaving': ['craft', 'textile', 'fabric', 'traditional', 'handmade', 'art'],
  'kigali': ['rwanda', 'capital', 'city', 'urban'],
  'rwanda': ['kigali', 'african', 'africa', 'east africa'],
};

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function fuzzyMatch(keyword: string, target: string): number {
  if (target.includes(keyword)) return 1.0;
  const words = target.split(/\s+/);
  let best = 0;
  for (const word of words) {
    if (word.length < 3) continue;
    const dist = levenshtein(keyword, word);
    if (dist === 0) { best = Math.max(best, 1.0); continue; }
    if (keyword.length >= 4 && dist === 1) { best = Math.max(best, 0.85); continue; }
    if (keyword.length >= 6 && dist === 2) { best = Math.max(best, 0.65); continue; }
    if (keyword.length >= 8 && dist === 3) { best = Math.max(best, 0.45); continue; }
    if (word.startsWith(keyword.substring(0, Math.max(3, keyword.length - 2)))) {
      best = Math.max(best, 0.6);
    }
    if (keyword.startsWith(word.substring(0, Math.max(3, word.length - 2)))) {
      best = Math.max(best, 0.55);
    }
  }
  return best;
}

function expandWithSynonyms(keywords: string[]): string[] {
  const expanded = new Set<string>(keywords);
  for (const kw of keywords) {
    if (SYNONYMS[kw]) {
      for (const syn of SYNONYMS[kw]) expanded.add(syn);
    }
    for (const [base, syns] of Object.entries(SYNONYMS)) {
      if (syns.includes(kw)) {
        expanded.add(base);
        for (const s of syns) expanded.add(s);
      }
    }
  }
  return Array.from(expanded);
}

export function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^[-']+|[-']+$/g, ''))
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));
}

export interface ScoredItem {
  item: any;
  score: number;
  matchedTerms: string[];
  itemType: 'experience' | 'homestay' | 'attraction';
}

function buildSearchableText(item: any, type: 'experience' | 'homestay' | 'attraction') {
  const nameField = type === 'attraction' ? (item.name || '') : (item.title || '');
  const tags = Array.isArray(item.tags) ? item.tags.join(' ') : '';
  const features = Array.isArray(item.features) ? item.features.join(' ') : '';
  const amenities = Array.isArray(item.amenities) ? item.amenities.join(' ') : '';
  return {
    title: nameField.toLowerCase(),
    tags: tags.toLowerCase(),
    category: (item.category || item.stay_type || item.type || '').toLowerCase(),
    description: (item.description || '').toLowerCase(),
    location: `${item.location?.name || ''} ${item.location?.region || ''}`.toLowerCase(),
    features: `${features} ${amenities}`.toLowerCase(),
    provider: (item.provider_name || item.host_name || item.institution_name || '').toLowerCase(),
  };
}

const FIELD_WEIGHTS = {
  title: 10,
  tags: 7,
  category: 5,
  description: 3,
  location: 4,
  features: 3,
  provider: 2,
};

function scoreItem(
  item: any,
  type: 'experience' | 'homestay' | 'attraction',
  originalKeywords: string[],
  expandedKeywords: string[]
): { score: number; matchedTerms: string[] } {
  const fields = buildSearchableText(item, type);
  let totalScore = 0;
  const matchedTerms: string[] = [];

  for (const keyword of originalKeywords) {
    let bestScore = 0;
    for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
      const text = fields[field as keyof typeof fields];
      const match = fuzzyMatch(keyword, text);
      if (match > 0) {
        const fieldScore = match * weight;
        if (fieldScore > bestScore) bestScore = fieldScore;
      }
    }
    if (bestScore > 0) {
      totalScore += bestScore * 2;
      matchedTerms.push(keyword);
    }
  }

  for (const keyword of expandedKeywords) {
    if (originalKeywords.includes(keyword)) continue;
    let bestScore = 0;
    for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
      const text = fields[field as keyof typeof fields];
      const match = fuzzyMatch(keyword, text);
      if (match > 0) {
        const fieldScore = match * weight * 0.5;
        if (fieldScore > bestScore) bestScore = fieldScore;
      }
    }
    if (bestScore > 0) {
      totalScore += bestScore;
      if (!matchedTerms.includes(keyword)) matchedTerms.push(keyword);
    }
  }

  return { score: totalScore, matchedTerms };
}

const INTENT_PATTERNS: { pattern: RegExp | string[]; type: 'experience' | 'homestay' | 'attraction' | null }[] = [
  { pattern: ['stay', 'sleep', 'accommodation', 'host', 'room', 'night', 'homestay', 'lodge', 'bed', 'house', 'home', 'family home'], type: 'homestay' },
  { pattern: ['museum', 'gallery', 'park', 'monument', 'heritage site', 'visit', 'tourist', 'attraction', 'landmark', 'zoo', 'aquarium', 'botanical', 'science center', 'cultural center'], type: 'attraction' },
  { pattern: ['experience', 'activity', 'tour', 'trip', 'excursion', 'adventure', 'workshop', 'class', 'cooking class', 'guided', 'guide', 'program'], type: 'experience' },
];

export function detectSearchType(query: string): 'experience' | 'homestay' | 'attraction' | 'all' {
  const lower = query.toLowerCase();
  const scores: Record<string, number> = { experience: 0, homestay: 0, attraction: 0 };
  for (const { pattern, type } of INTENT_PATTERNS) {
    if (!type) continue;
    if (Array.isArray(pattern)) {
      for (const p of pattern) {
        if (lower.includes(p)) scores[type] += 2;
      }
    }
  }
  const max = Math.max(...Object.values(scores));
  if (max === 0) return 'all';
  const top = Object.entries(scores).filter(([, v]) => v === max).map(([k]) => k);
  if (top.length === 1) return top[0] as any;
  return 'all';
}

export function smartSearch(
  query: string,
  experiences: any[],
  homestays: any[],
  attractions: any[],
  typeHint: 'experience' | 'homestay' | 'attraction' | 'all' = 'all'
): ScoredItem[] {
  const rawKeywords = extractKeywords(query);
  if (rawKeywords.length === 0) return [];

  const expandedKeywords = expandWithSynonyms(rawKeywords);
  const detectedType = typeHint !== 'all' ? typeHint : detectSearchType(query);

  const searchIn = (items: any[], type: 'experience' | 'homestay' | 'attraction'): ScoredItem[] => {
    return items
      .map(item => {
        const { score, matchedTerms } = scoreItem(item, type, rawKeywords, expandedKeywords);
        return { item, score, matchedTerms, itemType: type };
      })
      .filter(r => r.score > 0);
  };

  let results: ScoredItem[] = [];

  if (detectedType === 'all') {
    results = [
      ...searchIn(experiences, 'experience'),
      ...searchIn(homestays, 'homestay'),
      ...searchIn(attractions, 'attraction'),
    ];
  } else if (detectedType === 'experience') {
    results = searchIn(experiences, 'experience');
    if (results.length === 0) {
      results = [
        ...searchIn(homestays, 'homestay'),
        ...searchIn(attractions, 'attraction'),
      ];
    }
  } else if (detectedType === 'homestay') {
    results = searchIn(homestays, 'homestay');
    if (results.length === 0) {
      results = [
        ...searchIn(experiences, 'experience'),
        ...searchIn(attractions, 'attraction'),
      ];
    }
  } else if (detectedType === 'attraction') {
    results = searchIn(attractions, 'attraction');
    if (results.length === 0) {
      results = [
        ...searchIn(experiences, 'experience'),
        ...searchIn(homestays, 'homestay'),
      ];
    }
  }

  results.sort((a, b) => b.score - a.score);

  const normalized = results.map(r => ({
    ...r.item,
    matchScore: r.score,
    matchedTerms: r.matchedTerms,
    itemType: r.itemType,
  }));

  return normalized as any;
}

export function generateVoiceResponse(results: any[], query: string, type: string): string {
  if (results.length === 0) {
    return `I searched for "${query}" but couldn't find any matches. Try asking about experiences like hiking or cooking, homestays for a local family stay, or attractions like museums and national parks.`;
  }

  const count = results.length;
  const topNames = results.slice(0, 3).map((r: any) => r.title || r.name).filter(Boolean);

  const typeLabel = type === 'experience' ? 'experience' :
    type === 'homestay' ? 'homestay' :
    type === 'attraction' ? 'attraction' : 'result';

  const plural = count === 1 ? typeLabel : typeLabel + 's';

  if (count === 1) {
    return `I found one great match for you. ${topNames[0]}.`;
  }
  if (count <= 3) {
    return `I found ${count} ${plural} for you. ${topNames.join(', ')}.`;
  }
  return `I found ${count} ${plural} for you. The top results are ${topNames.join(', ')}, and ${count - 3} more.`;
}
