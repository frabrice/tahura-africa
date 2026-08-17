import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, Star, Heart, MapPin, Search, SlidersHorizontal, Map, Compass, Landmark, ArrowRight } from 'lucide-react';
import { VoiceAgent } from '../../components/VoiceAgent';
import { SearchResultsPage } from './SearchResultsPage';
import { InlineFilterBar, ActiveFilterBar } from '../../components/ExploreFilters';
import type { FilterState } from '../../components/ExploreFilters';
import { smartSearch, detectSearchType } from '../../lib/searchEngine';
import { useAuth } from '../../contexts/AuthContext';
import { AuthPromptToast } from '../../components/AuthPromptToast';
import { getCached, setCache } from '../../lib/queryCache';
import { CardRowSkeleton } from '../../components/Skeletons';

interface Experience {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  provider_name: string;
  location: { name: string; region: string };
  price_range: { min: number; max: number; currency: string };
  media: string[];
  duration_value?: number;
  duration_unit?: string;
  frequency_type?: string;
  _itemKind?: 'experience' | 'journey' | 'homestay';
}

interface Homestay {
  id: string;
  title: string;
  description: string;
  host_name: string;
  stay_type: string;
  tags: string[];
  location: { name: string; region: string };
  price_per_night: number;
  media: string[];
  duration_value?: number;
  duration_unit?: string;
}

interface Attraction {
  id: string;
  name: string;
  description: string;
  type: string;
  institution_name: string;
  location: { name: string; region: string };
  entry_fee_is_free: boolean;
  entry_fee_amount: number;
  media: string[];
}

type ExploreTab = 'local' | 'journeys' | 'attractions';
type LocalFilter = 'all' | 'experiences' | 'homestays';
type SectionRow = { title: string; subtitle: string; items: any[]; type?: 'experience' | 'homestay' | 'attraction' };

interface ExplorePageProps {
  activeTab: ExploreTab;
  onTabChange: (tab: ExploreTab) => void;
}

interface Itinerary {
  id: string;
  title: string;
  description: string;
  provider_name: string;
  tags: string[];
  location: { name: string; region: string };
  price_range: { min: number; max: number; currency: string };
  media: string[];
  duration_value?: number;
  duration_unit?: string;
}

const EMPTY_FILTERS: FilterState = { categories: [], regions: [], priceMin: '', priceMax: '', sortBy: '', location: '', tags: [], minRating: '', maxDuration: '', availabilityDate: '' };

function getItemPrice(item: any): number {
  if (item.price_range) return item.price_range.min;
  if (item.price_per_night) return item.price_per_night;
  if (item.entry_fee_is_free !== undefined) return item.entry_fee_is_free ? 0 : (item.entry_fee_amount || 0);
  if (item.entry_fee === 'Free') return 0;
  if (item.entry_fee === 'varies') return -1;
  return parseFloat(item.entry_fee) || 0;
}

function getItemName(item: any): string {
  return (item.title || item.name || '').toLowerCase();
}

const ATTRACTION_TYPE_LABELS: Record<string, string> = {
  museum: 'Museum',
  national_park: 'National Park',
  heritage_site: 'Heritage Site',
  gallery: 'Art Gallery',
  zoo: 'Zoo & Wildlife',
  botanical_garden: 'Botanical Garden',
  aquarium: 'Aquarium',
  science_center: 'Science Center',
  cultural_center: 'Cultural Center',
  other: 'Attraction',
};

// Tags in the DB are lowercase (e.g. 'wildlife', 'cultural', 'gorillas').
// Matchers use .toLowerCase() on each tag for case-insensitive comparison.
function tagsMatch(itemTags: string[], keywords: string[]): boolean {
  const lower = keywords.map(k => k.toLowerCase());
  return (itemTags || []).some((t: string) => lower.includes(t.toLowerCase()));
}

const EXPERIENCE_SECTIONS: {
  title: string;
  subtitle: string;
  matchFn: (item: any) => boolean;
  allowJourneys: boolean;
}[] = [
  {
    title: 'Start Today',
    subtitle: 'Short, easy, and open to all',
    allowJourneys: false,
    matchFn: (item) => {
      const dur = item.duration_value;
      const unit = item.duration_unit;
      const isShort = dur && ((unit === 'hours' && dur <= 4) || (unit === 'days' && dur === 1));
      return item._itemKind !== 'journey' && (
        isShort ||
        tagsMatch(item.tags, ['family-friendly', 'popular', 'beginner', 'easy', 'cultural', 'culture', 'kigali', 'city'])
      );
    },
  },
  {
    title: 'Deep Dives',
    subtitle: 'Half-day to multi-day immersions',
    allowJourneys: true,
    matchFn: (item) => {
      const dur = item.duration_value;
      const unit = item.duration_unit;
      const isLong = dur && unit === 'hours' && dur > 4;
      const isMultiDay = dur && unit === 'days' && dur > 1;
      return isLong || isMultiDay || item._itemKind === 'journey' ||
        tagsMatch(item.tags, ['cultural-heritage', 'eco-tourism', 'educational', 'gorilla-trekking', 'gorillas', 'trekking', 'history', 'heritage', 'memorial', 'education']);
    },
  },
  {
    title: 'Into the Wild',
    subtitle: 'Nature, wildlife, and open skies',
    allowJourneys: true,
    matchFn: (item) => {
      return tagsMatch(item.tags, ['wildlife', 'nature', 'eco-friendly', 'hiking', 'trekking', 'gorillas', 'gorilla-trekking', 'primates', 'forest', 'safari', 'big-five', 'savanna', 'birding']);
    },
  },
  {
    title: 'Made by Locals',
    subtitle: 'Culture, food, craft, and ceremony',
    allowJourneys: true,
    matchFn: (item) => {
      return tagsMatch(item.tags, ['cultural', 'culture', 'authentic-local', 'authentic', 'history', 'educational', 'food', 'cooking', 'arts', 'crafts', 'workshop', 'community', 'local', 'art', 'creative', 'market', 'shopping', 'coffee']);
    },
  },
  {
    title: 'For the Bold',
    subtitle: 'High energy, high reward',
    allowJourneys: false,
    matchFn: (item) => {
      return tagsMatch(item.tags, ['adventure', 'water-sports', 'kayaking', 'trekking', 'extreme', 'challenging', 'bucket-list', 'hiking']);
    },
  },
  {
    title: 'Slow Travel',
    subtitle: 'Drift at your own pace',
    allowJourneys: true,
    matchFn: (item) => {
      return item._itemKind === 'journey' || tagsMatch(item.tags, ['relaxed', 'relaxation', 'wellness', 'photography', 'photographers', 'lake', 'sunset', 'water', 'lakeside']);
    },
  },
  {
    title: 'For Families',
    subtitle: 'Shared moments for all ages',
    allowJourneys: false,
    matchFn: (item) => {
      return tagsMatch(item.tags, ['family', 'family-friendly', 'kids', 'rural', 'farm']);
    },
  },
  {
    title: 'Solo Souls',
    subtitle: 'Go your own way',
    allowJourneys: true,
    matchFn: (item) => {
      return tagsMatch(item.tags, ['solo-travelers', 'budget-friendly', 'affordable', 'backpacker', 'off-the-beaten-path', 'student', 'social', 'value', 'off-peak']);
    },
  },
  {
    title: 'Romance & Getaways',
    subtitle: 'Just the two of you',
    allowJourneys: true,
    matchFn: (item) => {
      return tagsMatch(item.tags, ['couples', 'romantic', 'honeymoon', 'luxury', 'premium', 'sunset', 'lake', 'beach']);
    },
  },
];


const ATTRACTION_SECTIONS: { title: string; subtitle: string; types: string[] }[] = [
  { title: 'Living History', subtitle: 'Stories carved in stone and time', types: ['museum', 'heritage_site'] },
  { title: 'Wild Encounters', subtitle: 'Parks, wildlife, and the untamed', types: ['national_park', 'zoo'] },
  { title: 'Art & Culture', subtitle: 'Galleries, performances, and expression', types: ['gallery', 'cultural_center'] },
  { title: 'Gardens & Life', subtitle: 'Botanics, aquatics, and living worlds', types: ['botanical_garden', 'aquarium'] },
  { title: 'Science & Wonder', subtitle: 'Discovery for curious minds', types: ['science_center'] },
  { title: 'More to Explore', subtitle: 'Hidden gems worth finding', types: ['other'] },
];

const HOMESTAY_SECTIONS: { title: string; subtitle: string; tags: string[] }[] = [
  { title: 'Wake Up in the Wild', subtitle: 'Farmsteads, homesteads, and open land', tags: ['rural', 'farm', 'volcanoes', 'mountains', 'nature', 'northern', 'authentic'] },
  { title: 'City Warmth', subtitle: 'Homely comfort in the heart of town', tags: ['urban', 'kigali', 'neighbourhood', 'food', 'community'] },
  { title: 'Table & Hearth', subtitle: 'Food, family, and flavour', tags: ['food', 'cooking', 'local', 'fishing', 'beach', 'authentic'] },
  { title: 'Deep Roots', subtitle: 'Generations of story under one roof', tags: ['history', 'culture', 'museum', 'intellectual', 'border', 'monastery'] },
  { title: 'By the Water', subtitle: 'Lakeside mornings and still evenings', tags: ['lakeside', 'lake-kivu', 'lake', 'western', 'relaxation'] },
  { title: 'Community Spirit', subtitle: 'Conservation, crafts, and togetherness', tags: ['community', 'crafts', 'eastern', 'social', 'student', 'affordable'] },
];

// ─── Shared card callback types ───────────────────────────────────────────────
interface CardCallbacks {
  navigate: (path: string) => void;
  onToggleSave: (id: string, type: 'experience' | 'homestay' | 'attraction' | 'itinerary') => void;
  savedItemIds: Set<string>;
  heartBurst: string | null;
  ratingsMap: Record<string, { avg: number; count: number }>;
}

function CardBadge({ kind, label }: { kind: 'experience' | 'homestay' | 'attraction' | 'journey'; label?: string }) {
  const dot = kind === 'experience' ? 'bg-orange-600'
    : kind === 'homestay' ? 'bg-[#5E7A45]'
    : kind === 'journey' ? 'bg-green-600'
    : 'bg-sky-600';
  const text = label ?? (kind === 'experience' ? 'Experience'
    : kind === 'homestay' ? 'Homestay'
    : kind === 'journey' ? 'Journey'
    : 'Attraction');
  return (
    <span className="absolute top-2 left-2 z-[3] inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-bold tracking-tight text-stone-800 shadow-warm-sm max-w-[85%]">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      <span className="truncate">{text}</span>
    </span>
  );
}

function HeartButton({ itemId, saveType, savedItemIds, heartBurst, onToggleSave }: {
  itemId: string;
  saveType: 'experience' | 'homestay' | 'attraction' | 'itinerary';
  savedItemIds: Set<string>;
  heartBurst: string | null;
  onToggleSave: (id: string, type: 'experience' | 'homestay' | 'attraction' | 'itinerary') => void;
}) {
  const isSaved = savedItemIds.has(itemId);
  const isBursting = heartBurst === itemId;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggleSave(itemId, saveType); }}
      className={`absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all active:scale-95 ${isBursting ? 'animate-heart-burst' : ''}`}
    >
      <Heart className={`w-3.5 h-3.5 transition-colors duration-200 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-stone-500 hover:text-rose-400'}`} />
    </button>
  );
}

function RatingBadge({ itemId, ratingsMap }: { itemId: string; ratingsMap: Record<string, { avg: number; count: number }> }) {
  if (!ratingsMap[itemId]) return null;
  return (
    <div className="absolute bottom-2.5 left-2.5 px-1.5 py-0.5 bg-white/95 backdrop-blur-sm rounded-md flex items-center gap-0.5 shadow-sm">
      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
      <span className="text-[9px] font-bold text-stone-800 font-mono">{ratingsMap[itemId].avg.toFixed(1)}</span>
    </div>
  );
}

function ExperienceCard({ item, callbacks }: { item: any; callbacks: CardCallbacks }) {
  const { navigate, onToggleSave, savedItemIds, heartBurst, ratingsMap } = callbacks;
  const isJourney = item._itemKind === 'journey';
  const isHomestay = item._itemKind === 'homestay';
  const route = isJourney ? `/itinerary/${item.id}` : isHomestay ? `/homestay/${item.id}` : `/experience/${item.id}`;
  const saveType = isJourney ? 'itinerary' : isHomestay ? 'homestay' : 'experience';
  const kind: 'experience' | 'homestay' | 'journey' = isJourney ? 'journey' : isHomestay ? 'homestay' : 'experience';
  const cat = isJourney ? 'Journey' : isHomestay ? 'Homestay'
    : (item.category ? String(item.category).replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Experience');
  const eyebrow = [item.location?.name, cat].filter(Boolean).join(' · ');
  const dur = item.duration_value
    ? `${item.duration_value} ${item.duration_unit === 'days' ? (item.duration_value === 1 ? 'day' : 'days') : 'hrs'}`
    : null;
  const price = item.price_range?.min ?? 0;

  return (
    <div onClick={() => navigate(route)} className="flex-none w-[138px] sm:w-[148px] md:w-[158px] cursor-pointer group">
      <div className="bg-white border border-stone-200/70 rounded-2xl overflow-hidden shadow-warm-sm transition-all duration-300 group-hover:shadow-warm group-hover:border-stone-300 group-hover:-translate-y-1 flex flex-col h-full">
        <div className="relative flex-shrink-0">
          {item.media && item.media[0] ? (
            <div className="aspect-[3/2] bg-stone-100 overflow-hidden">
              <img src={item.media[0]} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500" />
            </div>
          ) : (
            <div className="aspect-[3/2] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
              <MapPin className="w-7 h-7 text-stone-300" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
          <CardBadge kind={kind} />
          <HeartButton itemId={item.id} saveType={saveType} savedItemIds={savedItemIds} heartBurst={heartBurst} onToggleSave={onToggleSave} />
          <RatingBadge itemId={item.id} ratingsMap={ratingsMap} />
        </div>
        <div className="p-2 flex flex-col flex-1">
          <span className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-stone-400 truncate">{eyebrow}</span>
          <h3 className="font-display text-[13px] leading-[1.2] text-stone-900 line-clamp-2 mt-1 min-h-[30px]">{item.title}</h3>
          <div className="flex items-baseline justify-between gap-2 mt-2 pt-2 border-t border-stone-100">
            <span className="whitespace-nowrap">
              <span className="text-[13px] font-bold text-stone-900 tabular-nums">${price}</span>
              <span className="text-[9px] text-stone-400"> {isHomestay ? '/ night' : '/ person'}</span>
            </span>
            {dur && <span className="text-[9px] text-stone-400 whitespace-nowrap">{dur}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function HomestayCard({ item, callbacks }: { item: any; callbacks: CardCallbacks }) {
  const { navigate, onToggleSave, savedItemIds, heartBurst, ratingsMap } = callbacks;
  const eyebrow = [item.location?.name, 'Homestay'].filter(Boolean).join(' · ');
  const nights = item.duration_value ? `${item.duration_value} ${item.duration_value === 1 ? 'night' : 'nights'}` : null;

  return (
    <div onClick={() => navigate(`/homestay/${item.id}`)} className="flex-none w-[138px] sm:w-[148px] md:w-[158px] cursor-pointer group">
      <div className="bg-white border border-stone-200/70 rounded-2xl overflow-hidden shadow-warm-sm transition-all duration-300 group-hover:shadow-warm group-hover:border-stone-300 group-hover:-translate-y-1 flex flex-col h-full">
        <div className="relative flex-shrink-0">
          {item.media && item.media[0] ? (
            <div className="aspect-[3/2] bg-stone-100 overflow-hidden">
              <img src={item.media[0]} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500" />
            </div>
          ) : (
            <div className="aspect-[3/2] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
              <MapPin className="w-7 h-7 text-stone-300" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
          <CardBadge kind="homestay" />
          <HeartButton itemId={item.id} saveType="homestay" savedItemIds={savedItemIds} heartBurst={heartBurst} onToggleSave={onToggleSave} />
          <RatingBadge itemId={item.id} ratingsMap={ratingsMap} />
        </div>
        <div className="p-2 flex flex-col flex-1">
          <span className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-stone-400 truncate">{eyebrow}</span>
          <h3 className="font-display text-[13px] leading-[1.2] text-stone-900 line-clamp-2 mt-1 min-h-[30px]">{item.title}</h3>
          <div className="flex items-baseline justify-between gap-2 mt-2 pt-2 border-t border-stone-100">
            <span className="whitespace-nowrap">
              <span className="text-[13px] font-bold text-stone-900 tabular-nums">${item.price_per_night}</span>
              <span className="text-[9px] text-stone-400"> / night</span>
            </span>
            {nights && <span className="text-[9px] text-stone-400 whitespace-nowrap">{nights}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttractionCard({ item, callbacks }: { item: any; callbacks: CardCallbacks }) {
  const { navigate, onToggleSave, savedItemIds, heartBurst, ratingsMap } = callbacks;
  const typeLabel = ATTRACTION_TYPE_LABELS[item.type] || 'Attraction';
  const isFree = item.entry_fee_is_free !== false;
  const rawFee: number = item.entry_fee_amount || 0;
  const feeAmount = Number.isInteger(rawFee) ? rawFee : parseFloat(rawFee.toFixed(2));

  const eyebrow = [item.location?.name, typeLabel].filter(Boolean).join(' · ');

  return (
    <div onClick={() => navigate(`/attraction/${item.id}`)} className="flex-none w-[138px] sm:w-[148px] md:w-[158px] cursor-pointer group">
      <div className="bg-white border border-stone-200/70 rounded-2xl overflow-hidden shadow-warm-sm transition-all duration-300 group-hover:shadow-warm group-hover:border-stone-300 group-hover:-translate-y-1 flex flex-col h-full">
        <div className="relative flex-shrink-0">
          {item.media && item.media[0] ? (
            <div className="aspect-[3/2] bg-stone-100 overflow-hidden">
              <img src={item.media[0]} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500" />
            </div>
          ) : (
            <div className="aspect-[3/2] bg-gradient-to-br from-sky-50 to-sky-100 flex items-center justify-center">
              <Landmark className="w-7 h-7 text-sky-200" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
          <CardBadge kind="attraction" label={typeLabel} />
          <HeartButton itemId={item.id} saveType="attraction" savedItemIds={savedItemIds} heartBurst={heartBurst} onToggleSave={onToggleSave} />
          <RatingBadge itemId={item.id} ratingsMap={ratingsMap} />
        </div>
        <div className="p-2 flex flex-col flex-1">
          <span className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-stone-400 truncate">{eyebrow}</span>
          <h3 className="font-display text-[13px] leading-[1.2] text-stone-900 line-clamp-2 mt-1 min-h-[30px]">{item.name}</h3>
          <div className="flex items-baseline justify-between gap-2 mt-2 pt-2 border-t border-stone-100">
            {isFree ? (
              <span className="text-[11.5px] font-bold text-[#5E7A45]">Free entry</span>
            ) : (
              <span className="whitespace-nowrap">
                <span className="text-[13px] font-bold text-stone-900 tabular-nums">${feeAmount}</span>
                <span className="text-[9px] text-stone-400"> entry</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScrollSection({
  title,
  subtitle,
  items,
  type,
  callbacks,
  onViewAll,
}: {
  title: string;
  subtitle?: string;
  items: any[];
  type: 'experience' | 'homestay' | 'attraction';
  callbacks: CardCallbacks;
  onViewAll: (section: { title: string; items: any[]; type: 'experience' | 'homestay' | 'attraction' }) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const element = scrollRef.current;
    if (!element) return;
    element.addEventListener('scroll', checkScroll, { passive: true });
    return () => element.removeEventListener('scroll', checkScroll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: scrollRef.current.scrollLeft + (direction === 'right' ? 600 : -600), behavior: 'smooth' });
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-8 md:mb-12">
      <div className="flex items-end justify-between mb-3.5 px-4 md:px-8">
        <div>
          <h2 className="font-display text-base md:text-xl font-semibold text-stone-900 leading-tight tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-[10px] md:text-[12px] text-stone-500 mt-0.5">{subtitle}</p>
          )}
          <div className="h-0.5 w-9 bg-gradient-to-r from-orange-600 to-amber-400 rounded-full mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewAll({ title, items, type })}
            className="text-[10px] font-medium text-stone-500 hover:text-stone-900 transition-colors group flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <div className="hidden sm:flex gap-1.5 ml-1">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`w-7 h-7 flex items-center justify-center rounded-full border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-all ${!canScrollLeft ? 'opacity-25 cursor-not-allowed' : ''}`}
            >
              <ChevronLeft className="w-3.5 h-3.5 text-stone-600" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`w-7 h-7 flex items-center justify-center rounded-full border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-all ${!canScrollRight ? 'opacity-25 cursor-not-allowed' : ''}`}
            >
              <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-2.5 md:gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-4 md:px-8 pb-1">
        {items.map((item) => (
          type === 'experience' ? <ExperienceCard key={item.id} item={item} callbacks={callbacks} />
          : type === 'homestay' ? <HomestayCard key={item.id} item={item} callbacks={callbacks} />
          : <AttractionCard key={item.id} item={item} callbacks={callbacks} />
        ))}
      </div>
    </div>
  );
}

const JOURNEY_SECTIONS: {
  title: string;
  subtitle: string;
  matchFn: (item: any) => boolean;
}[] = [
  {
    title: 'Into the Wild',
    subtitle: 'Gorillas, savannahs, and open skies',
    matchFn: (item) => tagsMatch(item.tags, ['wildlife', 'nature', 'gorillas', 'primates', 'safari', 'big-five', 'serengeti', 'trekking', 'hiking', 'birding', 'conservation', 'bucket-list', 'best-of-rwanda', 'multi-day', 'expert-guided']),
  },
  {
    title: 'Cultural Immersions',
    subtitle: 'History, ceremony, and living traditions',
    matchFn: (item) => tagsMatch(item.tags, ['cultural', 'culture', 'history', 'heritage', 'education', 'memorial', 'arts', 'design', 'fashion', 'creative', 'urban', 'food', 'kigali']),
  },
  {
    title: 'Epic Multi-Country Routes',
    subtitle: 'Cross borders and collect stories',
    matchFn: (item) => tagsMatch(item.tags, ['multi-country', 'zanzibar', 'coast', 'beach', 'premium']),
  },
  {
    title: 'Lakes & Landscapes',
    subtitle: 'Water, volcanoes, and green hills',
    matchFn: (item) => tagsMatch(item.tags, ['lakes', 'water', 'kayaking', 'volcanoes', 'adventure', 'compact', 'community', 'relaxed-pace']),
  },
  {
    title: 'Slow Journeys',
    subtitle: 'No rush — soak it all in',
    matchFn: (item) => tagsMatch(item.tags, ['photography', 'green-season', 'off-peak', 'value', 'relaxed', 'coffee', 'road-trip']),
  },
];

export function ExplorePage({ activeTab, onTabChange }: ExplorePageProps) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  // Sub-filter for the merged "Local" tab (experiences + homestays).
  const [localFilter, setLocalFilter] = useState<LocalFilter>('all');
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchType, setSearchType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [seeAllSection, setSeeAllSection] = useState<{ title: string; items: any[]; type: 'experience' | 'homestay' | 'attraction' } | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [ratingsMap, setRatingsMap] = useState<Record<string, { avg: number; count: number }>>({});
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [heartBurst, setHeartBurst] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isTraveler } = useAuth();

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (isAuthenticated && isTraveler && user) {
      supabase
        .from('saved_items')
        .select('listing_id, institution_id')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) {
            const ids = new Set<string>();
            data.forEach((item: any) => {
              if (item.listing_id) ids.add(item.listing_id);
              if (item.institution_id) ids.add(item.institution_id);
            });
            setSavedItemIds(ids);
          }
        });
    } else {
      setSavedItemIds(new Set());
    }
  }, [isAuthenticated, isTraveler, user]);

  const handleToggleSave = useCallback(async (itemId: string, itemType: 'experience' | 'homestay' | 'attraction' | 'itinerary') => {
    if (!isAuthenticated || !isTraveler || !user) {
      setShowAuthPrompt(true);
      setTimeout(() => {
        navigate('/traveler/login', { state: { returnTo: location.pathname } });
      }, 2200);
      return;
    }

    const isSaved = savedItemIds.has(itemId);
    const isAttraction = itemType === 'attraction';

    if (!isSaved) {
      setHeartBurst(itemId);
      setTimeout(() => setHeartBurst(null), 400);
    }

    try {
      if (isSaved) {
        const query = supabase.from('saved_items').delete().eq('user_id', user.id);
        if (isAttraction) {
          await query.eq('institution_id', itemId);
        } else {
          await query.eq('listing_id', itemId);
        }
        setSavedItemIds(prev => { const next = new Set(prev); next.delete(itemId); return next; });
      } else {
        await supabase.from('saved_items').insert({
          user_id: user.id,
          ...(isAttraction ? { institution_id: itemId } : { listing_id: itemId, listing_type: itemType }),
        });
        setSavedItemIds(prev => new Set(prev).add(itemId));
      }
    } catch (error) {
      console.error('Error toggling saved status:', error);
    }
  }, [isAuthenticated, isTraveler, user, savedItemIds, navigate, location.pathname]);

  useEffect(() => { setFilters(EMPTY_FILTERS); }, [activeTab]);

  async function loadData() {
    const CACHE_KEY = 'explore_data';
    const cached = getCached<any>(CACHE_KEY);

    if (cached) {
      setExperiences(cached.experiences);
      setHomestays(cached.homestays);
      setAttractions(cached.attractions);
      setItineraries(cached.itineraries || []);
      setRatingsMap(cached.ratingsMap);
      setLoading(false);
      return;
    }

    try {
      // Each query is bounded by its own client-side timeout. On a cold load the
      // app fires many Supabase queries at once and, under connection-pool
      // contention on small compute, a single query can hang past the server
      // statement timeout. A plain Promise.all would then leave the whole page
      // blank. Racing each query against a timeout renders whatever arrived.
      const withTimeout = async <T,>(
        query: PromiseLike<{ data: T[] | null; error: any }>,
        ms = 7000,
      ): Promise<{ data: T[] | null; error: any }> => {
        try {
          return await Promise.race([
            query,
            new Promise<{ data: null; error: any }>((resolve) =>
              setTimeout(() => resolve({ data: null, error: new Error('timeout') }), ms),
            ),
          ]);
        } catch (e) {
          return { data: null, error: e };
        }
      };

      // Phase 1 — the fast core content (experiences, homestays, journeys).
      // Separate queries — no joins — to avoid Supabase REST relationship issues.
      const [listingsRes, hostsRes, reviewsRes] = await Promise.all([
        withTimeout(supabase.from('partner_listings').select('*').eq('status', 'active').eq('is_flagged', false)),
        withTimeout(supabase.from('partner_hosts').select('id, name')),
        withTimeout(supabase.from('reviews').select('listing_id, rating')),
      ]);

      if (listingsRes.error) console.error('listings error:', listingsRes.error);
      if (hostsRes.error) console.error('hosts error:', hostsRes.error);

      const hostMap: Record<string, string> = {};
      (hostsRes.data || []).forEach((h: any) => { hostMap[h.id] = h.name; });

      const listings = (listingsRes.data || []).map((l: any) => ({
        ...l,
        _hostName: hostMap[l.host_id] || null,
      }));

      const allExperiences = listings
        .filter((l: any) => l.listing_type === 'experience')
        .map((l: any) => {
          const isHomestay = l.listing_type === 'homestay';
          return {
            id: l.id,
            title: l.title,
            description: l.description,
            category: isHomestay ? 'homestay' : (l.details?.category || ''),
            tags: l.tags || [],
            provider_name: l._hostName || (isHomestay ? 'Local Host' : 'Local Partner'),
            location: l.location,
            price_range: {
              min: l.pricing?.base_price || 0,
              max: l.pricing?.base_price || 0,
              currency: l.pricing?.currency || 'USD',
            },
            media: l.media || [],
            duration_value: l.details?.duration_value,
            duration_unit: l.details?.duration_unit,
            frequency_type: l.details?.frequency_type,
            _itemKind: (isHomestay ? 'homestay' : 'experience') as 'experience' | 'homestay',
          };
        });

      const allHomestays = listings
        .filter((l: any) => l.listing_type === 'homestay')
        .map((l: any) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          host_name: l._hostName || 'Local Host',
          stay_type: 'entire_home',
          tags: l.tags || [],
          location: l.location,
          price_per_night: l.pricing?.base_price || 0,
          media: l.media || [],
          duration_value: l.details?.duration_value,
          duration_unit: l.details?.duration_unit,
        }));

      const partnerItineraries = listings
        .filter((l: any) => l.listing_type === 'itinerary')
        .map((l: any) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          provider_name: l._hostName || 'Local Partner',
          tags: l.tags || [],
          location: l.location,
          price_range: {
            min: l.pricing?.base_price || 0,
            max: l.pricing?.base_price || 0,
            currency: l.pricing?.currency || 'USD',
          },
          media: l.media || [],
          duration_value: l.details?.duration_value,
          duration_unit: l.details?.duration_unit,
          _itemKind: 'journey' as const,
        }));

      const rMap: Record<string, { total: number; count: number }> = {};
      (reviewsRes.data || []).forEach((r: any) => {
        if (!r.listing_id) return;
        if (!rMap[r.listing_id]) rMap[r.listing_id] = { total: 0, count: 0 };
        rMap[r.listing_id].total += r.rating; rMap[r.listing_id].count += 1;
      });

      const finalMap: Record<string, { avg: number; count: number }> = {};
      Object.entries(rMap).forEach(([id, { total, count }]) => { finalMap[id] = { avg: total / count, count }; });

      // Core content is ready — render it immediately, don't wait on attractions.
      setExperiences(allExperiences);
      setHomestays(allHomestays);
      setItineraries(partnerItineraries);
      setRatingsMap(finalMap);
      setLoading(false);

      // Phase 2 — attractions backfill. institution_profiles is chronically slow
      // on free-tier cold start (a 1-row query can spike past 10s in the boot
      // burst), so it loads on its own longer budget and updates state when it
      // lands. This keeps the core page fast while attractions still populate.
      const [attrRes, attrReviewsRes] = await Promise.all([
        withTimeout(supabase.from('institution_profiles').select('*').eq('published', true).eq('is_flagged', false), 20000),
        withTimeout(supabase.from('attraction_reviews').select('institution_id, rating'), 20000),
      ]);
      if (attrRes.error) console.error('attractions error:', attrRes.error);

      const mappedAttractions = (attrRes.data || []).map((ip: any) => ({
        id: ip.id, name: ip.name, description: ip.description, type: ip.type,
        institution_name: ip.name,
        location: { name: ip.location || '', region: ip.location || '' },
        entry_fee_is_free: ip.entry_fee_is_free !== false,
        entry_fee_amount: ip.entry_fee_amount || 0,
        media: ip.cover_image ? [ip.cover_image, ...(ip.images || [])] : (ip.images || []),
      }));
      setAttractions(mappedAttractions);

      const aMap: Record<string, { total: number; count: number }> = {};
      (attrReviewsRes.data || []).forEach((r: any) => {
        if (!r.institution_id) return;
        if (!aMap[r.institution_id]) aMap[r.institution_id] = { total: 0, count: 0 };
        aMap[r.institution_id].total += r.rating; aMap[r.institution_id].count += 1;
      });
      const attractionRatings: Record<string, { avg: number; count: number }> = {};
      Object.entries(aMap).forEach(([id, { total, count }]) => { attractionRatings[id] = { avg: total / count, count }; });
      if (Object.keys(attractionRatings).length > 0) {
        setRatingsMap((prev) => ({ ...prev, ...attractionRatings }));
      }

      // Cache the full set only when nothing failed, so a partial (timed-out)
      // load isn't served from cache for the whole TTL.
      const anyFailed = [listingsRes, hostsRes, reviewsRes, attrRes, attrReviewsRes].some((r) => r.error);
      if (!anyFailed) {
        setCache(CACHE_KEY, { experiences: allExperiences, homestays: allHomestays, attractions: mappedAttractions, itineraries: partnerItineraries, ratingsMap: { ...finalMap, ...attractionRatings } }, 120_000);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const activeFilterCount = filters.categories.length + filters.regions.length
    + (filters.priceMin ? 1 : 0) + (filters.priceMax ? 1 : 0) + (filters.sortBy ? 1 : 0)
    + (filters.location ? 1 : 0) + filters.tags.length
    + (filters.minRating ? 1 : 0) + (filters.maxDuration ? 1 : 0) + (filters.availabilityDate ? 1 : 0);

  const applyFiltersAndSort = (items: any[], categoryField: string): any[] => {
    let result = [...items];

    if (filters.location) {
      const q = filters.location.toLowerCase();
      result = result.filter(item => (item.location?.name || '').toLowerCase().includes(q) || (item.location?.region || '').toLowerCase().includes(q));
    }
    if (filters.categories.length > 0) result = result.filter(item => filters.categories.includes(item[categoryField]));
    if (filters.regions.length > 0) result = result.filter(item => filters.regions.includes(item.location?.region));
    if (filters.tags.length > 0) result = result.filter(item => item.tags && item.tags.some((t: string) => filters.tags.includes(t)));

    const min = filters.priceMin ? parseFloat(filters.priceMin) : null;
    const max = filters.priceMax ? parseFloat(filters.priceMax) : null;
    if (min !== null || max !== null) {
      result = result.filter(item => {
        const price = getItemPrice(item);
        if (price === -1) return true;
        if (min !== null && price < min) return false;
        if (max !== null && max > 0 && price > max) return false;
        return true;
      });
    }

    if (filters.minRating) {
      const minRating = parseFloat(filters.minRating);
      result = result.filter(item => {
        const rating = ratingsMap[item.id]?.avg || 0;
        return rating >= minRating;
      });
    }

    if (filters.maxDuration) {
      const maxDur = parseFloat(filters.maxDuration);
      result = result.filter(item => {
        const durValue = item.duration_value || 0;
        const durUnit = item.duration_unit || 'hours';
        let hours = durValue;
        if (durUnit === 'days') hours = durValue * 24;
        if (durUnit === 'minutes') hours = durValue / 60;
        return hours <= maxDur;
      });
    }

    if (filters.sortBy === 'price_low') result.sort((a, b) => getItemPrice(a) - getItemPrice(b));
    else if (filters.sortBy === 'price_high') result.sort((a, b) => getItemPrice(b) - getItemPrice(a));
    else if (filters.sortBy === 'name_az') result.sort((a, b) => getItemName(a).localeCompare(getItemName(b)));
    else if (filters.sortBy === 'name_za') result.sort((a, b) => getItemName(b).localeCompare(getItemName(a)));
    else if (filters.sortBy === 'rating') result.sort((a, b) => (ratingsMap[b.id]?.avg || 0) - (ratingsMap[a.id]?.avg || 0));

    return result;
  };

  const filteredExperiences = useMemo(() => applyFiltersAndSort(experiences, 'category'), [experiences, filters]);
  const filteredHomestays = useMemo(() => applyFiltersAndSort(homestays, 'stay_type'), [homestays, filters]);
  const filteredAttractions = useMemo(() => applyFiltersAndSort(attractions, 'type'), [attractions, filters]);
  const filteredItineraries = useMemo(() => applyFiltersAndSort(itineraries, 'category'), [itineraries, filters]);

  const allExperiencesAndJourneys = useMemo(() => filteredExperiences, [filteredExperiences]);
  const allJourneys = useMemo(() => filteredItineraries, [filteredItineraries]);

  const experienceSections = useMemo(() => {
    const pool = allExperiencesAndJourneys;
    const seenIds = new Set<string>();
    const sections: { title: string; subtitle: string; items: any[] }[] = [];

    for (const { title, subtitle, matchFn } of EXPERIENCE_SECTIONS) {
      const items = pool.filter(matchFn);
      if (items.length === 0) continue;
      items.forEach(i => seenIds.add(i.id));
      sections.push({ title, subtitle, items });
    }

    const untagged = pool.filter(item => !seenIds.has(item.id));
    if (untagged.length > 0) sections.push({ title: 'More Experiences', subtitle: 'Even more to discover', items: untagged });
    return sections;
  }, [allExperiencesAndJourneys]);

  const journeySections = useMemo(() => {
    const pool = allJourneys;
    const seenIds = new Set<string>();
    const sections: { title: string; subtitle: string; items: any[] }[] = [];

    for (const { title, subtitle, matchFn } of JOURNEY_SECTIONS) {
      const items = pool.filter(matchFn);
      if (items.length === 0) continue;
      items.forEach(i => seenIds.add(i.id));
      sections.push({ title, subtitle, items });
    }

    const untagged = pool.filter(item => !seenIds.has(item.id));
    if (untagged.length > 0) sections.push({ title: 'All Journeys', subtitle: 'Every route, every story', items: untagged });
    return sections;
  }, [allJourneys]);

  const attractionSections = useMemo(() => {
    const sections = ATTRACTION_SECTIONS
      .map(({ title, subtitle, types }) => ({
        title, subtitle,
        items: filteredAttractions.filter(item => types.includes(item.type)),
      }))
      .filter(s => s.items.length > 0);
    const taggedIds = new Set(sections.flatMap(s => s.items.map((i: any) => i.id)));
    const untagged = filteredAttractions.filter(item => !taggedIds.has(item.id));
    if (untagged.length > 0) sections.push({ title: 'More Attractions', subtitle: 'Even more to discover', items: untagged });
    return sections;
  }, [filteredAttractions]);

  const homestaySections = useMemo(() => {
    const sections = HOMESTAY_SECTIONS
      .map(({ title, subtitle, tags }) => ({
        title, subtitle,
        items: filteredHomestays.filter(item => tagsMatch(item.tags, tags)),
      }))
      .filter(s => s.items.length > 0);
    const taggedIds = new Set(sections.flatMap(s => s.items.map((i: any) => i.id)));
    const untagged = filteredHomestays.filter(item => !taggedIds.has(item.id));
    if (untagged.length > 0) sections.push({ title: 'More Homestays', subtitle: 'Even more homes to explore', items: untagged });
    return sections;
  }, [filteredHomestays]);

  const performSearch = (query: string) => {
    const detectedType = detectSearchType(query);
    const journeysAsExperiences = itineraries.map(it => ({ ...it, _itemKind: 'journey', itemType: 'experience' }));
    const allExp = [...experiences, ...journeysAsExperiences];
    const results = smartSearch(query, allExp, homestays, attractions, detectedType);
    setSearchResults(results);
    setSearchType(detectedType === 'all' ? 'all' : detectedType);
    setSearchTerm(query);
    setShowSearchResults(true);
  };

  const handleVoiceSearchResults = (results: any[], type: string, query: string) => {
    setSearchResults(results); setSearchType(type); setSearchTerm(query); setShowSearchResults(true);
  };

  const handleTextSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) performSearch(searchQuery.trim());
  };

  const handleClearResults = () => {
    setSearchResults([]); setSearchType(''); setSearchTerm('');
    setShowSearchResults(false); setSearchQuery('');
  };

  const cardCallbacks: CardCallbacks = useMemo(() => ({
    navigate,
    onToggleSave: handleToggleSave,
    savedItemIds,
    heartBurst,
    ratingsMap,
  }), [navigate, handleToggleSave, savedItemIds, heartBurst, ratingsMap]);

  const handleViewAll = useCallback((section: { title: string; items: any[]; type: 'experience' | 'homestay' | 'attraction' }) => {
    setSeeAllSection(section);
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="border-b border-stone-200 bg-white">
          <div className="px-4 md:px-8 py-3">
            <div className="max-w-3xl mx-auto flex items-center gap-2.5">
              <div className="flex-1 h-10 bg-stone-100 rounded-full skeleton-shimmer" />
              <div className="w-24 h-10 bg-stone-100 rounded-full skeleton-shimmer" />
            </div>
          </div>
        </div>
        <div className="pt-8 pb-16">
          <CardRowSkeleton /><CardRowSkeleton count={5} /><CardRowSkeleton count={4} />
        </div>
      </div>
    );
  }

  if (seeAllSection) {
    const sectionResults = seeAllSection.items.map(item => ({ ...item, itemType: seeAllSection.type, matchScore: 1 }));
    return (
      <>
        <AuthPromptToast visible={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} message="Please log in to save items to your wishlist. Redirecting..." />
        <SearchResultsPage
          results={sectionResults}
          query={seeAllSection.title}
          searchType={seeAllSection.type}
          onNewSearch={performSearch}
          onClearResults={() => setSeeAllSection(null)}
          ratingsMap={ratingsMap}
          savedItemIds={savedItemIds}
          onToggleSave={handleToggleSave}
        />
      </>
    );
  }

  if (showSearchResults) {
    return (
      <>
        <AuthPromptToast visible={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} message="Please log in to save items to your wishlist. Redirecting..." />
        <SearchResultsPage
          results={searchResults}
          query={searchTerm}
          searchType={searchType}
          onNewSearch={performSearch}
          onClearResults={handleClearResults}
          ratingsMap={ratingsMap}
          savedItemIds={savedItemIds}
          onToggleSave={handleToggleSave}
        />
      </>
    );
  }

  // "Local" merges experiences + homestays behind one tab, narrowed by the
  // localFilter sub-toggle. Each section carries its own card `type` so the
  // "All" view can interleave experience rows and homestay rows correctly.
  const localExperienceItems = localFilter === 'homestays' ? [] : filteredExperiences;
  const localHomestayItems = localFilter === 'experiences' ? [] : filteredHomestays;

  const localSections: SectionRow[] = [
    ...(localFilter === 'homestays' ? [] : experienceSections.map((s) => ({ ...s, type: 'experience' as const }))),
    ...(localFilter === 'experiences' ? [] : homestaySections.map((s) => ({ ...s, type: 'homestay' as const }))),
  ];

  const currentItems = activeTab === 'local' ? [...localExperienceItems, ...localHomestayItems]
    : activeTab === 'journeys' ? allJourneys
    : filteredAttractions;

  const activeSections: SectionRow[] = activeTab === 'local' ? localSections
    : activeTab === 'journeys' ? journeySections
    : attractionSections;

  const activeType: 'experience' | 'homestay' | 'attraction' = activeTab === 'attractions' ? 'attraction' : 'experience';

  const tabConfig = [
    { key: 'local' as const, label: 'Local', icon: Compass, color: 'text-orange-500', count: filteredExperiences.length + filteredHomestays.length },
    { key: 'journeys' as const, label: 'Journeys', icon: Map, color: 'text-green-600', count: filteredItineraries.length },
    { key: 'attractions' as const, label: 'Attractions', icon: Landmark, color: 'text-sky-500', count: filteredAttractions.length },
  ];

  return (
    <div className="animate-fade-in">
      <AuthPromptToast visible={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} message="Please log in to save items to your wishlist. Redirecting..." />

      {/* Mobile tab bar — sticky, sits just below the fixed header */}
      <div className="lg:hidden sticky top-16 z-30 bg-white border-b border-stone-100">
        <div className="px-4 pt-1.5 pb-1.5">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-1.5">
            {tabConfig.map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              const ring = { local: 'from-orange-500 to-amber-400', journeys: 'from-green-500 to-emerald-400', attractions: 'from-sky-500 to-cyan-400' }[key];
              const text = { local: 'text-orange-700', journeys: 'text-green-700', attractions: 'text-sky-700' }[key];
              const iconColor = { local: 'text-orange-500', journeys: 'text-green-600', attractions: 'text-sky-500' }[key];
              return (
                <button
                  key={key}
                  onClick={() => onTabChange(key)}
                  className={`group p-[1.5px] rounded-full transition-all duration-200 ${isActive ? `bg-gradient-to-br ${ring}` : ''}`}
                >
                  <span
                    className={`flex items-center justify-center gap-1.5 px-4 py-[7px] text-xs rounded-full transition-colors duration-200 ${
                      isActive ? `bg-white font-semibold ${text}` : 'text-stone-500 font-medium group-hover:text-orange-600'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? iconColor : 'text-stone-400 group-hover:text-orange-500'}`} />
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search + filter bar — scrolls with the page */}
      <div className="bg-white border-b border-stone-100">
        <div className="px-4 md:px-8 pt-2 pb-2">
          <div className="max-w-3xl mx-auto flex items-center gap-2 md:gap-2.5">
            <div className="flex-1 p-[1.5px] rounded-full bg-gradient-to-br from-orange-400 via-amber-400 to-green-500 focus-within:p-[2px] transition-all duration-150">
              <div className="flex items-center gap-2 px-3.5 py-[7px] rounded-full bg-white">
                <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab === 'local' ? 'experiences & homestays' : activeTab === 'journeys' ? 'multi-day journeys' : activeTab}…`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleTextSearch}
                  className="flex-1 outline-none text-sm text-stone-900 placeholder-stone-400 bg-transparent"
                />
                <VoiceAgent experiences={experiences} homestays={homestays} attractions={attractions} onResultsFound={handleVoiceSearchResults} />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center gap-1.5 px-3.5 py-[9px] rounded-full border transition-all duration-200 text-sm font-medium shadow-sm ${
                showFilters
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900 bg-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center px-1 ${showFilters ? 'bg-white text-stone-900' : 'bg-orange-500 text-white'}`}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="border-t border-stone-100">
            <InlineFilterBar activeTab={activeTab} filters={filters} onChange={setFilters} experiences={experiences} homestays={homestays} attractions={attractions} />
          </div>
        )}
      </div>

      <ActiveFilterBar filters={filters} onChange={setFilters} resultCount={currentItems.length} activeTab={activeTab} />

      {activeTab === 'local' && (
        <div className="px-4 md:px-8 pt-4">
          <div className="inline-flex items-center gap-1 p-1 bg-stone-100 rounded-full">
            {([['all', 'All'], ['experiences', 'Experiences'], ['homestays', 'Homestays']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setLocalFilter(key)}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${localFilter === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pt-6 md:pt-8 pb-16 md:pb-24">
        {currentItems.length === 0 ? (
          <div className="text-center py-24 px-4 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-stone-300" />
            </div>
            <p className="text-stone-500 text-sm mb-1">No {activeTab === 'local' ? 'results' : activeTab === 'journeys' ? 'journeys' : activeTab} match your filters.</p>
            {activeFilterCount > 0 && (
              <button onClick={() => setFilters(EMPTY_FILTERS)} className="mt-3 text-xs text-stone-900 border border-stone-300 px-4 py-1.5 rounded-full hover:bg-stone-50 transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        ) : activeSections.length > 0 ? (
          activeSections.map((section) => (
            <ScrollSection key={(section.type || '') + section.title} title={section.title} subtitle={section.subtitle} items={section.items} type={section.type ?? activeType} callbacks={cardCallbacks} onViewAll={handleViewAll} />
          ))
        ) : (
          <ScrollSection
            title={activeTab === 'local' ? 'Explore Local' : activeTab === 'journeys' ? 'All Journeys' : 'All Attractions'}
            items={currentItems}
            type={activeType}
            callbacks={cardCallbacks}
            onViewAll={handleViewAll}
          />
        )}
      </div>
    </div>
  );
}
