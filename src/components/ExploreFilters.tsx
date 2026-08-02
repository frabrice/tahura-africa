import { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, MapPin, ArrowUpDown, DollarSign, Tag, Check, ChevronDown, Search, Star, Clock, Calendar
} from 'lucide-react';

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
  availabilityDate: string;
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
            : badge && badge > 0
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

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'name_az', label: 'Name: A to Z' },
  { value: 'name_za', label: 'Name: Z to A' },
];

interface InlineFilterBarProps {
  activeTab: ExploreTab;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  experiences: any[];
  homestays: any[];
  attractions: any[];
}

export function InlineFilterBar({
  activeTab,
  filters,
  onChange,
  experiences,
  homestays,
  attractions,
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

  const items = activeTab === 'local' ? [...experiences, ...homestays]
    : activeTab === 'journeys' ? experiences : attractions;

  const locationSuggestions = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item: any) => {
      const name = (item.location?.name || '').trim();
      const region = (item.location?.region || '').trim();
      if (name) map.set(name, (map.get(name) || 0) + 1);
      if (region && region !== name) map.set(region, (map.get(region) || 0) + 1);
    });
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    if (!locationInput) return entries;
    const q = locationInput.toLowerCase();
    return entries.filter(([loc]) => loc.toLowerCase().includes(q));
  }, [items, locationInput]);

  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item: any) => {
      (item.tags || []).forEach((t: string) => {
        map.set(t, (map.get(t) || 0) + 1);
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const dynamicCategories = useMemo(() => {
    const map = new Map<string, number>();
    if (activeTab === 'local' || activeTab === 'journeys') {
      experiences.forEach((e: any) => {
        const cat = (e.category || '').trim();
        if (cat) map.set(cat, (map.get(cat) || 0) + 1);
      });
    } else {
      attractions.forEach((a: any) => {
        const t = (a.type || '').trim();
        if (t) map.set(t, (map.get(t) || 0) + 1);
      });
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [activeTab, experiences, homestays, attractions]);

  const categoryLabel = activeTab === 'attractions' ? 'Type' : 'Category';

  const formatCategoryName = (raw: string) =>
    raw.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const toggleCategory = (value: string) => {
    const next = filters.categories.includes(value)
      ? filters.categories.filter(c => c !== value)
      : [...filters.categories, value];
    onChange({ ...filters, categories: next });
  };

  const toggleTag = (value: string) => {
    const next = filters.tags.includes(value)
      ? filters.tags.filter(t => t !== value)
      : [...filters.tags, value];
    onChange({ ...filters, tags: next });
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
      if (trimmed) {
        onChange({ ...filters, location: trimmed });
      }
      setOpenDropdown(null);
    }
  };

  const sortActiveLabel = SORT_OPTIONS.find(o => o.value === filters.sortBy && o.value !== '')?.label;

  const priceActiveLabel = (() => {
    if (filters.priceMin === '0' && filters.priceMax === '0') return 'Free';
    if (filters.priceMin && filters.priceMax) return `$${filters.priceMin}-$${filters.priceMax}`;
    if (filters.priceMin) return `$${filters.priceMin}+`;
    if (filters.priceMax) return `Up to $${filters.priceMax}`;
    return undefined;
  })();

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2.5">
        <DropdownShell
          label="Location"
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
                placeholder="Type a location..."
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
              {locationSuggestions.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-xs text-neutral-400 mb-2">No matching locations</p>
                  {locationInput.trim() && (
                    <button
                      onClick={() => applyLocation(locationInput.trim())}
                      className="text-xs font-medium text-neutral-700 hover:text-neutral-900 underline"
                    >
                      Search for "{locationInput.trim()}" anyway
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {locationSuggestions.map(([loc, count]) => (
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
                  {locationInput.trim() && !locationSuggestions.some(([loc]) => loc.toLowerCase() === locationInput.trim().toLowerCase()) && (
                    <p className="text-[11px] text-neutral-400 text-center pt-2 pb-1">Press Enter to search "{locationInput.trim()}"</p>
                  )}
                </>
              )}
            </div>
          </div>
        </DropdownShell>

        <DropdownShell
          label={categoryLabel}
          icon={<Tag className="w-3.5 h-3.5" />}
          isOpen={openDropdown === 'category'}
          onToggle={() => toggle('category')}
          onClose={close}
          badge={filters.categories.length}
          wide={dynamicCategories.length > 6}
        >
          <div className={`p-2.5 ${dynamicCategories.length > 8 ? 'max-h-72 overflow-y-auto' : ''}`}>
            {dynamicCategories.length === 0 ? (
              <p className="text-xs text-neutral-400 px-2 py-3 text-center">No categories available</p>
            ) : (
              dynamicCategories.map(([cat, count]) => {
                const isActive = filters.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                      isActive ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <span className="flex-1 font-medium">{formatCategoryName(cat)}</span>
                    <span className={`text-[11px] ${isActive ? 'text-neutral-300' : 'text-neutral-400'}`}>{count}</span>
                    {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </DropdownShell>

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
            <div className="grid grid-cols-2 gap-1.5 mb-1">
              {[
                { label: 'Under $50', min: '0', max: '50' },
                { label: '$50-$100', min: '50', max: '100' },
                { label: '$100-$200', min: '100', max: '200' },
                { label: '$200+', min: '200', max: '' },
              ].map(preset => {
                const isActive = filters.priceMin === preset.min && filters.priceMax === preset.max;
                return (
                  <button
                    key={preset.label}
                    onClick={() => {
                      if (isActive) {
                        onChange({ ...filters, priceMin: '', priceMax: '' });
                      } else {
                        onChange({ ...filters, priceMin: preset.min, priceMax: preset.max });
                      }
                    }}
                    className={`px-2.5 py-2 text-xs font-medium rounded-lg border transition-all ${
                      isActive
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
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
              {allTags.map(([tag, count]) => {
                const isActive = filters.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      isActive ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-white border-white' : 'border-neutral-300'
                    }`}>
                      {isActive && <Check className="w-3 h-3 text-neutral-900" />}
                    </div>
                    <span className="flex-1 font-medium">{tag}</span>
                    <span className={`text-[11px] ${isActive ? 'text-neutral-300' : 'text-neutral-400'}`}>{count}</span>
                  </button>
                );
              })}
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
            {SORT_OPTIONS.map(opt => {
              const isActive = filters.sortBy === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange({ ...filters, sortBy: opt.value });
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                    isActive ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <span className="font-medium">{opt.label}</span>
                  {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </DropdownShell>

        {/* Rating filter */}
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
                  onClick={() => {
                    onChange({ ...filters, minRating: isActive ? '' : rating });
                    setOpenDropdown(null);
                  }}
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

        {/* Duration filter */}
        <DropdownShell
          label="Duration"
          icon={<Clock className="w-3.5 h-3.5" />}
          isOpen={openDropdown === 'duration'}
          onToggle={() => toggle('duration')}
          onClose={close}
          activeLabel={filters.maxDuration ? `Max ${filters.maxDuration}h` : undefined}
        >
          <div className="p-2.5">
            {['2', '4', '8', '24'].map(hours => {
              const isActive = filters.maxDuration === hours;
              return (
                <button
                  key={hours}
                  onClick={() => {
                    onChange({ ...filters, maxDuration: isActive ? '' : hours });
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                    isActive ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <span className="font-medium">Up to {hours} hours</span>
                  {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </DropdownShell>

        {/* Availability date picker */}
        <DropdownShell
          label="Available On"
          icon={<Calendar className="w-3.5 h-3.5" />}
          isOpen={openDropdown === 'availability'}
          onToggle={() => toggle('availability')}
          onClose={close}
          activeLabel={filters.availabilityDate ? new Date(filters.availabilityDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined}
        >
          <div className="p-3">
            <label className="text-[10px] text-neutral-500 font-semibold mb-1.5 block uppercase tracking-wider">Select Date</label>
            <input
              type="date"
              value={filters.availabilityDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                onChange({ ...filters, availabilityDate: e.target.value });
                setOpenDropdown(null);
              }}
              className="w-full px-2.5 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:border-neutral-900 focus:outline-none transition-colors"
            />
            {filters.availabilityDate && (
              <button
                onClick={() => {
                  onChange({ ...filters, availabilityDate: '' });
                  setOpenDropdown(null);
                }}
                className="w-full mt-2 px-2.5 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Clear date
              </button>
            )}
          </div>
        </DropdownShell>
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
  const formatCat = (c: string) => c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const hasAny = filters.categories.length > 0 || filters.regions.length > 0
    || filters.priceMin || filters.priceMax || filters.sortBy
    || filters.location || filters.tags.length > 0
    || filters.minRating || filters.maxDuration || filters.availabilityDate;

  if (!hasAny) return null;

  const removeCategory = (v: string) => {
    onChange({ ...filters, categories: filters.categories.filter(c => c !== v) });
  };
  const removeRegion = (v: string) => {
    onChange({ ...filters, regions: filters.regions.filter(r => r !== v) });
  };
  const removeTag = (v: string) => {
    onChange({ ...filters, tags: filters.tags.filter(t => t !== v) });
  };
  const clearPrice = () => onChange({ ...filters, priceMin: '', priceMax: '' });
  const clearSort = () => onChange({ ...filters, sortBy: '' });
  const clearLocation = () => onChange({ ...filters, location: '' });
  const clearRating = () => onChange({ ...filters, minRating: '' });
  const clearDuration = () => onChange({ ...filters, maxDuration: '' });
  const clearAvailability = () => onChange({ ...filters, availabilityDate: '' });
  const clearAll = () => onChange({ categories: [], regions: [], priceMin: '', priceMax: '', sortBy: '', location: '', tags: [], minRating: '', maxDuration: '', availabilityDate: '' });

  const priceLabel = filters.priceMin === '0' && filters.priceMax === '0'
    ? 'Free Only'
    : filters.priceMin && filters.priceMax
    ? `$${filters.priceMin} - $${filters.priceMax}`
    : filters.priceMin
    ? `$${filters.priceMin}+`
    : filters.priceMax
    ? `Up to $${filters.priceMax}`
    : '';

  const sortLabel = (() => {
    const opt = [
      { value: 'price_low', label: 'Price: Low-High' },
      { value: 'price_high', label: 'Price: High-Low' },
      { value: 'name_az', label: 'A-Z' },
      { value: 'name_za', label: 'Z-A' },
    ].find(o => o.value === filters.sortBy);
    return opt?.label || '';
  })();

  const Pill = ({ label, onRemove, color = 'bg-neutral-900' }: { label: string; onRemove: () => void; color?: string }) => (
    <span className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 ${color} text-white text-xs font-medium rounded-full`}>
      {label}
      <button onClick={onRemove} className="p-0.5 hover:bg-white/20 rounded-full transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );

  return (
    <div className="px-4 md:px-6 py-2.5 bg-neutral-50/80 border-b border-neutral-200">
      <div className="max-w-5xl mx-auto flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mr-1">
          Showing
        </span>

        {filters.location && (
          <Pill label={filters.location} onRemove={clearLocation} color="bg-teal-700" />
        )}

        {filters.categories.map(c => (
          <Pill key={c} label={formatCat(c)} onRemove={() => removeCategory(c)} />
        ))}

        {filters.regions.map(r => (
          <Pill key={r} label={r} onRemove={() => removeRegion(r)} color="bg-teal-700" />
        ))}

        {filters.tags.map(t => (
          <Pill key={t} label={t} onRemove={() => removeTag(t)} color="bg-neutral-700" />
        ))}

        {priceLabel && (
          <Pill label={priceLabel} onRemove={clearPrice} color="bg-amber-700" />
        )}

        {sortLabel && (
          <Pill label={sortLabel} onRemove={clearSort} color="bg-neutral-600" />
        )}

        {filters.minRating && (
          <Pill label={`${filters.minRating}+ stars`} onRemove={clearRating} color="bg-amber-600" />
        )}

        {filters.maxDuration && (
          <Pill label={`Max ${filters.maxDuration} hrs`} onRemove={clearDuration} color="bg-sky-600" />
        )}

        {filters.availabilityDate && (
          <Pill label={`Available ${new Date(filters.availabilityDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`} onRemove={clearAvailability} color="bg-emerald-600" />
        )}

        <span className="text-xs text-neutral-500 ml-auto flex-shrink-0">
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>

        <button
          onClick={clearAll}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-900 underline underline-offset-2 transition-colors flex-shrink-0"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
