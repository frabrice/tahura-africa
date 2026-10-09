import { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, MapPin, ArrowUpDown, DollarSign, Tag, Check, ChevronDown, Search, Star, Clock, CalendarDays, Gauge, Map as MapIcon
} from 'lucide-react';
import { PROVINCES, MULTI_PROVINCE, TRIP_LENGTHS, buildPricePresets } from '../lib/exploreTaxonomy';

type ExploreTab = 'local' | 'journeys' | 'attractions';

export interface FilterState {
  categories: string[];
  regions: string[];
  priceMin: string;
  priceMax: string;
  sortBy: string;
  location: string;
  tags: string[];
  minRating: string;
  maxDuration: string;
  tripLength: string;
  difficulty: string[];
}

export const EMPTY_FILTERS: FilterState = {
  categories: [], regions: [], priceMin: '', priceMax: '', sortBy: '', location: '',
  tags: [], minRating: '', maxDuration: '', tripLength: '', difficulty: [],
};

/** How many separate filters are active (a price range counts once). */
export function countActiveFilters(f: FilterState): number {
  return f.categories.length + f.regions.length + (f.priceMin || f.priceMax ? 1 : 0)
    + (f.sortBy ? 1 : 0) + (f.location ? 1 : 0) + f.tags.length + (f.minRating ? 1 : 0)
    + (f.maxDuration ? 1 : 0) + (f.tripLength ? 1 : 0) + f.difficulty.length;
}

interface DropdownShellProps {
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  badge?: number;
  activeLabel?: string;
  children: React.ReactNode;
  wide?: boolean;
}

function DropdownShell({ label, icon, isOpen, onToggle, onClose, badge, activeLabel, children, wide }: DropdownShellProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = wide ? 288 : 224;
    let left = rect.left;
    if (left + panelWidth > window.innerWidth - 12) {
      left = window.innerWidth - panelWidth - 12;
    }
    if (left < 12) left = 12;
    setPos({ top: rect.bottom + 8, left });
  }, [isOpen, wide]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <div className="flex-shrink-0">
      <button
        ref={triggerRef}
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all whitespace-nowrap ${
          isOpen
            ? 'bg-neutral-900 text-white border-neutral-900 shadow-md'
            : (badge && badge > 0) || activeLabel
            ? 'bg-neutral-900 text-white border-neutral-900'
            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-900 hover:bg-neutral-50'
        }`}
      >
        {icon}
        <span>{activeLabel || label}</span>
        {badge !== undefined && badge > 0 && !activeLabel && (
          <span className={`ml-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
            isOpen ? 'bg-white text-neutral-900' : 'bg-white/20 text-white'
          }`}>
            {badge}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && pos && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className={`bg-white rounded-xl border border-neutral-200 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 ${wide ? 'w-72' : 'w-56'}`}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}

// A single selectable row used by every list-style dropdown.
function OptionRow({ label, count, active, onClick, multi }: { label: string; count?: number; active: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
        active ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50 text-neutral-700'
      }`}
    >
      {multi && (
        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${active ? 'bg-white border-white' : 'border-neutral-300'}`}>
          {active && <Check className="w-3 h-3 text-neutral-900" />}
        </div>
      )}
      <span className="flex-1 font-medium">{label}</span>
      {count !== undefined && <span className={`text-[11px] ${active ? 'text-neutral-300' : 'text-neutral-400'}`}>{count}</span>}
      {!multi && active && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
    </button>
  );
}

const SORTS: Record<ExploreTab, { value: string; label: string }[]> = {
  local: [
    { value: '', label: 'Recommended' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'duration_short', label: 'Shortest first' },
    { value: 'duration_long', label: 'Longest first' },
    { value: 'rating', label: 'Top rated' },
    { value: 'name_az', label: 'Name: A to Z' },
  ],
  journeys: [
    { value: '', label: 'Recommended' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'duration_short', label: 'Shortest first' },
    { value: 'duration_long', label: 'Longest first' },
    { value: 'rating', label: 'Top rated' },
    { value: 'name_az', label: 'Name: A to Z' },
  ],
  attractions: [
    { value: '', label: 'Recommended' },
    { value: 'price_low', label: 'Entry fee: Low to High' },
    { value: 'price_high', label: 'Entry fee: High to Low' },
    { value: 'rating', label: 'Top rated' },
    { value: 'name_az', label: 'Name: A to Z' },
  ],
};

const ALL_SORT_LABELS: Record<string, string> = {
  price_low: 'Price: Low-High', price_high: 'Price: High-Low', duration_short: 'Shortest first',
  duration_long: 'Longest first', rating: 'Top rated', name_az: 'A-Z', name_za: 'Z-A',
};

const DURATION_OPTIONS = [
  { value: '2', label: 'Up to 2 hours' },
  { value: '4', label: 'Up to 4 hours (half day)' },
  { value: '8', label: 'Up to 8 hours (full day)' },
];

const DIFFICULTIES = ['Easy', 'Moderate', 'Challenging'];

function priceOf(item: any): number {
  if (item.price_range) return item.price_range.min || 0;
  if (item.price_per_night) return item.price_per_night;
  if (item.entry_fee_is_free === false) return item.entry_fee_amount || 0;
  return 0;
}

interface InlineFilterBarProps {
  activeTab: ExploreTab;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  experiences: any[];
  homestays: any[];
  attractions: any[];
  itineraries: any[];
}

export function InlineFilterBar({
  activeTab,
  filters,
  onChange,
  experiences,
  homestays,
  attractions,
  itineraries,
}: InlineFilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [locationInput, setLocationInput] = useState(filters.location);

  useEffect(() => {
    setLocationInput(filters.location);
  }, [filters.location]);

  const toggle = useCallback((name: string) => {
    setOpenDropdown(prev => prev === name ? null : name);
  }, []);

  const close = useCallback(() => {
    setOpenDropdown(null);
  }, []);

  const items = useMemo(
    () => activeTab === 'local' ? [...experiences, ...homestays] : activeTab === 'journeys' ? itineraries : attractions,
    [activeTab, experiences, homestays, itineraries, attractions],
  );

  const countBy = useCallback((pick: (i: any) => string | undefined | null) => {
    const map = new Map<string, number>();
    items.forEach((i: any) => { const v = pick(i); if (v) map.set(v, (map.get(v) || 0) + 1); });
    return map;
  }, [items]);

  const categoryOptions = useMemo(() => Array.from(countBy(i => i.category).entries()).sort((a, b) => b[1] - a[1]), [countBy]);

  const provinceOptions = useMemo(() => {
    const counts = countBy(i => i.province);
    return [...PROVINCES, MULTI_PROVINCE].filter(p => counts.has(p)).map(p => [p, counts.get(p)!] as [string, number]);
  }, [countBy]);

  const difficultyCounts = useMemo(() => countBy(i => i.difficulty), [countBy]);

  const pricePresets = useMemo(
    () => buildPricePresets(items.map(priceOf).filter(p => p > 0)),
    [items],
  );

  // Tags are noisy (province names, one-offs): keep the ones that appear at least twice.
  const allTags = useMemo(() => {
    const provinceish = /province$|^kigali$/i;
    const map = new Map<string, number>();
    items.forEach((item: any) => {
      (item.tags || []).forEach((t: string) => { if (!provinceish.test(t)) map.set(t, (map.get(t) || 0) + 1); });
    });
    return Array.from(map.entries()).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 40);
  }, [items]);

  const categoryLabel = activeTab === 'attractions' ? 'Type' : activeTab === 'journeys' ? 'Theme' : 'Category';

  const toggleIn = (key: 'categories' | 'regions' | 'tags' | 'difficulty', value: string) => {
    const list = filters[key];
    onChange({ ...filters, [key]: list.includes(value) ? list.filter(v => v !== value) : [...list, value] });
  };

  const applyLocation = (loc: string) => {
    onChange({ ...filters, location: loc });
    setLocationInput(loc);
    setOpenDropdown(null);
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = locationInput.trim();
      if (trimmed) onChange({ ...filters, location: trimmed });
      setOpenDropdown(null);
    }
  };

  const sorts = SORTS[activeTab];
  const sortActiveLabel = sorts.find(o => o.value === filters.sortBy && o.value !== '')?.label;

  const priceActiveLabel = (() => {
    if (filters.priceMin === '0' && filters.priceMax === '0') return 'Free';
    if (filters.priceMin && filters.priceMax) return `$${filters.priceMin}-$${filters.priceMax}`;
    if (filters.priceMin) return `$${filters.priceMin}+`;
    if (filters.priceMax) return `Up to $${filters.priceMax}`;
    return undefined;
  })();

  const locationMatches = provinceOptions.filter(([p]) => !locationInput || p.toLowerCase().includes(locationInput.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2.5">
        {categoryOptions.length > 0 && (
          <DropdownShell
            label={categoryLabel}
            icon={<Tag className="w-3.5 h-3.5" />}
            isOpen={openDropdown === 'category'}
            onToggle={() => toggle('category')}
            onClose={close}
            badge={filters.categories.length}
            wide
          >
            <div className="p-2.5 max-h-72 overflow-y-auto">
              {categoryOptions.map(([cat, count]) => (
                <OptionRow key={cat} label={cat} count={count} active={filters.categories.includes(cat)} onClick={() => toggleIn('categories', cat)} multi />
              ))}
            </div>
          </DropdownShell>
        )}

        {provinceOptions.length > 0 && (
          <DropdownShell
            label="Province"
            icon={<MapIcon className="w-3.5 h-3.5" />}
            isOpen={openDropdown === 'province'}
            onToggle={() => toggle('province')}
            onClose={close}
            badge={filters.regions.length}
          >
            <div className="p-2.5">
              {provinceOptions.map(([p, count]) => (
                <OptionRow key={p} label={p} count={count} active={filters.regions.includes(p)} onClick={() => toggleIn('regions', p)} multi />
              ))}
            </div>
          </DropdownShell>
        )}

        {activeTab === 'journeys' && (
          <DropdownShell
            label="Trip length"
            icon={<CalendarDays className="w-3.5 h-3.5" />}
            isOpen={openDropdown === 'trip'}
            onToggle={() => toggle('trip')}
            onClose={close}
            activeLabel={TRIP_LENGTHS.find(t => t.value === filters.tripLength)?.label}
          >
            <div className="p-2.5">
              {TRIP_LENGTHS.map(t => {
                const n = itineraries.filter((i: any) => typeof i.trip_days === 'number' && t.test(i.trip_days)).length;
                if (n === 0) return null;
                return (
                  <OptionRow
                    key={t.value}
                    label={t.label}
                    count={n}
                    active={filters.tripLength === t.value}
                    onClick={() => { onChange({ ...filters, tripLength: filters.tripLength === t.value ? '' : t.value }); setOpenDropdown(null); }}
                  />
                );
              })}
            </div>
          </DropdownShell>
        )}

        {activeTab === 'local' && (
          <DropdownShell
            label="Duration"
            icon={<Clock className="w-3.5 h-3.5" />}
            isOpen={openDropdown === 'duration'}
            onToggle={() => toggle('duration')}
            onClose={close}
            activeLabel={DURATION_OPTIONS.find(o => o.value === filters.maxDuration)?.label}
            wide
          >
            <div className="p-2.5">
              {DURATION_OPTIONS.map(o => (
                <OptionRow
                  key={o.value}
                  label={o.label}
                  active={filters.maxDuration === o.value}
                  onClick={() => { onChange({ ...filters, maxDuration: filters.maxDuration === o.value ? '' : o.value }); setOpenDropdown(null); }}
                />
              ))}
            </div>
          </DropdownShell>
        )}

        {activeTab === 'local' && difficultyCounts.size > 0 && (
          <DropdownShell
            label="Difficulty"
            icon={<Gauge className="w-3.5 h-3.5" />}
            isOpen={openDropdown === 'difficulty'}
            onToggle={() => toggle('difficulty')}
            onClose={close}
            badge={filters.difficulty.length}
          >
            <div className="p-2.5">
              {DIFFICULTIES.filter(d => difficultyCounts.has(d)).map(d => (
                <OptionRow key={d} label={d} count={difficultyCounts.get(d)} active={filters.difficulty.includes(d)} onClick={() => toggleIn('difficulty', d)} multi />
              ))}
            </div>
          </DropdownShell>
        )}

        <DropdownShell
          label="Price"
          icon={<DollarSign className="w-3.5 h-3.5" />}
          isOpen={openDropdown === 'price'}
          onToggle={() => toggle('price')}
          onClose={close}
          activeLabel={priceActiveLabel}
          wide
        >
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1">
                <label className="text-[10px] text-neutral-500 font-semibold mb-1 block uppercase tracking-wider">Min ($)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.priceMin}
                  onChange={(e) => onChange({ ...filters, priceMin: e.target.value })}
                  className="w-full px-2.5 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:border-neutral-900 focus:outline-none transition-colors"
                />
              </div>
              <div className="text-neutral-300 mt-5">--</div>
              <div className="flex-1">
                <label className="text-[10px] text-neutral-500 font-semibold mb-1 block uppercase tracking-wider">Max ($)</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={filters.priceMax}
                  onChange={(e) => onChange({ ...filters, priceMax: e.target.value })}
                  className="w-full px-2.5 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:border-neutral-900 focus:outline-none transition-colors"
                />
              </div>
            </div>
            {pricePresets.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 mb-1">
                {pricePresets.map(preset => {
                  const isActive = filters.priceMin === preset.min && filters.priceMax === preset.max;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => onChange({ ...filters, priceMin: isActive ? '' : preset.min, priceMax: isActive ? '' : preset.max })}
                      className={`px-1.5 py-2 text-xs font-medium rounded-lg border transition-all ${
                        isActive ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            )}
            {activeTab === 'attractions' && (
              <button
                onClick={() => onChange({ ...filters, priceMin: '0', priceMax: '0' })}
                className={`w-full mt-1.5 px-2.5 py-2 text-xs font-medium rounded-lg border transition-all ${
                  filters.priceMin === '0' && filters.priceMax === '0'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400'
                }`}
              >
                Free Admission Only
              </button>
            )}
          </div>
        </DropdownShell>

        {allTags.length > 0 && (
          <DropdownShell
            label="Tags"
            icon={<Tag className="w-3.5 h-3.5" />}
            isOpen={openDropdown === 'tags'}
            onToggle={() => toggle('tags')}
            onClose={close}
            badge={filters.tags.length}
            wide
          >
            <div className="p-2.5 max-h-64 overflow-y-auto">
              {allTags.map(([tag, count]) => (
                <OptionRow key={tag} label={tag} count={count} active={filters.tags.includes(tag)} onClick={() => toggleIn('tags', tag)} multi />
              ))}
            </div>
          </DropdownShell>
        )}

        <DropdownShell
          label="Sort"
          icon={<ArrowUpDown className="w-3.5 h-3.5" />}
          isOpen={openDropdown === 'sort'}
          onToggle={() => toggle('sort')}
          onClose={close}
          activeLabel={sortActiveLabel}
        >
          <div className="p-2.5">
            {sorts.map(opt => (
              <OptionRow
                key={opt.value}
                label={opt.label}
                active={filters.sortBy === opt.value}
                onClick={() => { onChange({ ...filters, sortBy: opt.value }); setOpenDropdown(null); }}
              />
            ))}
          </div>
        </DropdownShell>

        <DropdownShell
          label="Rating"
          icon={<Star className="w-3.5 h-3.5" />}
          isOpen={openDropdown === 'rating'}
          onToggle={() => toggle('rating')}
          onClose={close}
          activeLabel={filters.minRating ? `${filters.minRating}+` : undefined}
        >
          <div className="p-2.5">
            {['4.5', '4.0', '3.5', '3.0'].map(rating => {
              const isActive = filters.minRating === rating;
              return (
                <button
                  key={rating}
                  onClick={() => { onChange({ ...filters, minRating: isActive ? '' : rating }); setOpenDropdown(null); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                    isActive ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <span className="font-medium flex items-center gap-1">{rating}+ <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
                  {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </DropdownShell>

        <DropdownShell
          label="Place"
          icon={<MapPin className="w-3.5 h-3.5" />}
          isOpen={openDropdown === 'location'}
          onToggle={() => toggle('location')}
          onClose={close}
          activeLabel={filters.location || undefined}
          wide
        >
          <div className="p-3">
            <div className="flex items-center gap-2 px-2.5 py-2 border border-neutral-200 rounded-lg bg-neutral-50 mb-2">
              <Search className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Type a town, lake or park..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={handleLocationKeyDown}
                className="flex-1 bg-transparent outline-none text-sm text-neutral-900 placeholder-neutral-400"
                autoFocus
              />
              {locationInput && (
                <button onClick={() => { setLocationInput(''); onChange({ ...filters, location: '' }); }} className="p-0.5 hover:bg-neutral-200 rounded transition-colors">
                  <X className="w-3 h-3 text-neutral-500" />
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {locationMatches.map(([loc, count]) => (
                <button
                  key={loc}
                  onClick={() => applyLocation(loc)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${
                    filters.location === loc ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 flex-shrink-0 opacity-50" />
                    <span className="font-medium">{loc}</span>
                  </div>
                  <span className={`text-[11px] ${filters.location === loc ? 'text-neutral-300' : 'text-neutral-400'}`}>{count}</span>
                </button>
              ))}
              {locationInput.trim() && (
                <button
                  onClick={() => applyLocation(locationInput.trim())}
                  className="w-full text-center text-xs font-medium text-neutral-700 hover:text-neutral-900 underline py-2"
                >
                  Search for "{locationInput.trim()}"
                </button>
              )}
            </div>
          </div>
        </DropdownShell>
      </div>
    </div>
  );
}

/** One-tap category pills shown under the search bar. */
export function CategoryChips({
  options,
  selected,
  onSelect,
  accent,
}: {
  options: [string, number][];
  selected: string[];
  onSelect: (categories: string[]) => void;
  accent: 'orange' | 'green' | 'sky';
}) {
  if (options.length < 2) return null;
  const on = { orange: 'bg-orange-600 border-orange-600', green: 'bg-green-600 border-green-600', sky: 'bg-sky-600 border-sky-600' }[accent];
  const chip = (active: boolean) =>
    `flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors ${
      active ? `${on} text-white` : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900'
    }`;
  return (
    <div className="bg-white border-b border-stone-100">
      <div className="px-4 md:px-8 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Categories">
          <button className={chip(selected.length === 0)} onClick={() => onSelect([])}>All</button>
          {options.map(([label, count]) => {
            const active = selected.length === 1 && selected[0] === label;
            return (
              <button key={label} className={chip(active)} onClick={() => onSelect(active ? [] : [label])}>
                {label}
                <span className={`text-[10px] tabular-nums ${active ? 'text-white/80' : 'text-stone-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ActiveFilterBar({
  filters,
  onChange,
  resultCount,
}: {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  resultCount: number;
  activeTab: ExploreTab;
}) {
  if (countActiveFilters(filters) === 0) return null;

  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  const priceLabel = filters.priceMin === '0' && filters.priceMax === '0'
    ? 'Free Only'
    : filters.priceMin && filters.priceMax
    ? `$${filters.priceMin} - $${filters.priceMax}`
    : filters.priceMin
    ? `$${filters.priceMin}+`
    : filters.priceMax
    ? `Up to $${filters.priceMax}`
    : '';

  const Pill = ({ label, onRemove, color = 'bg-neutral-900' }: { label: string; onRemove: () => void; color?: string }) => (
    <span className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 ${color} text-white text-xs font-medium rounded-full`}>
      {label}
      <button onClick={onRemove} className="p-0.5 hover:bg-white/20 rounded-full transition-colors" aria-label={`Remove ${label}`}>
        <X className="w-3 h-3" />
      </button>
    </span>
  );

  return (
    <div className="px-4 md:px-6 py-2.5 bg-neutral-50/80 border-b border-neutral-200">
      <div className="max-w-5xl mx-auto flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mr-1">Showing</span>

        {filters.location && <Pill label={filters.location} onRemove={() => set({ location: '' })} color="bg-teal-700" />}
        {filters.categories.map(c => <Pill key={c} label={c} onRemove={() => set({ categories: filters.categories.filter(x => x !== c) })} />)}
        {filters.regions.map(r => <Pill key={r} label={r} onRemove={() => set({ regions: filters.regions.filter(x => x !== r) })} color="bg-teal-700" />)}
        {filters.tripLength && <Pill label={TRIP_LENGTHS.find(t => t.value === filters.tripLength)?.label || filters.tripLength} onRemove={() => set({ tripLength: '' })} color="bg-sky-600" />}
        {filters.maxDuration && <Pill label={`Up to ${filters.maxDuration} hrs`} onRemove={() => set({ maxDuration: '' })} color="bg-sky-600" />}
        {filters.difficulty.map(d => <Pill key={d} label={d} onRemove={() => set({ difficulty: filters.difficulty.filter(x => x !== d) })} color="bg-emerald-700" />)}
        {filters.tags.map(t => <Pill key={t} label={t} onRemove={() => set({ tags: filters.tags.filter(x => x !== t) })} color="bg-neutral-700" />)}
        {priceLabel && <Pill label={priceLabel} onRemove={() => set({ priceMin: '', priceMax: '' })} color="bg-amber-700" />}
        {filters.sortBy && ALL_SORT_LABELS[filters.sortBy] && <Pill label={ALL_SORT_LABELS[filters.sortBy]} onRemove={() => set({ sortBy: '' })} color="bg-neutral-600" />}
        {filters.minRating && <Pill label={`${filters.minRating}+ stars`} onRemove={() => set({ minRating: '' })} color="bg-amber-600" />}

        <span className="text-xs text-neutral-500 ml-auto flex-shrink-0">
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>

        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-900 underline underline-offset-2 transition-colors flex-shrink-0"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
