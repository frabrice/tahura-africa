import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Heart, MapPin, Search, Clock, Moon, Repeat, Compass } from 'lucide-react';
import { useState } from 'react';

interface SearchResult {
  id: string;
  title?: string;
  name?: string;
  description: string;
  category?: string;
  type?: string;
  stay_type?: string;
  provider_name?: string;
  host_name?: string;
  institution_name?: string;
  location: { name: string; region: string };
  price_range?: { min: number; max: number; currency: string };
  price_per_night?: number;
  entry_fee?: string;
  media: string[];
  matchScore?: number;
  itemType?: string;
  duration_value?: number;
  duration_unit?: string;
  frequency_type?: string;
}

interface SearchResultsPageProps {
  results: SearchResult[];
  query: string;
  searchType: string;
  onNewSearch: (query: string) => void;
  onClearResults: () => void;
  ratingsMap?: Record<string, { avg: number; count: number }>;
  savedItemIds?: Set<string>;
  onToggleSave?: (itemId: string, itemType: 'experience' | 'homestay' | 'attraction' | 'itinerary') => void;
}

export function SearchResultsPage({ results, query, onNewSearch, onClearResults, ratingsMap = {}, savedItemIds = new Set(), onToggleSave }: SearchResultsPageProps) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(query);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onNewSearch(searchInput.trim());
    }
  };

  const getItemRoute = (item: SearchResult) => {
    if ((item as any)._itemKind === 'journey') return `/itinerary/${item.id}`;
    if (item.itemType === 'experience') return `/experience/${item.id}`;
    if (item.itemType === 'homestay') return `/homestay/${item.id}`;
    if (item.itemType === 'attraction') return `/attraction/${item.id}`;
    if (item.title && !item.stay_type) return `/experience/${item.id}`;
    if (item.stay_type) return `/homestay/${item.id}`;
    if (item.institution_name) return `/attraction/${item.id}`;
    return '#';
  };

  const getTypeLabel = (item: SearchResult) => {
    if ((item as any)._itemKind === 'journey') return { label: 'Journey', color: 'bg-white/90 text-amber-700 border-amber-200/60' };
    if (item.itemType === 'experience') return { label: 'Experience', color: 'bg-white/90 text-sky-700 border-sky-200/60' };
    if (item.itemType === 'homestay') return { label: 'Homestay', color: 'bg-white/90 text-green-700 border-green-200/60' };
    if (item.itemType === 'attraction') return { label: 'Attraction', color: 'bg-white/90 text-orange-700 border-orange-200/60' };
    if (item.stay_type) return { label: 'Homestay', color: 'bg-white/90 text-green-700 border-green-200/60' };
    if (item.institution_name) return { label: 'Attraction', color: 'bg-white/90 text-orange-700 border-orange-200/60' };
    return { label: 'Experience', color: 'bg-white/90 text-sky-700 border-sky-200/60' };
  };

  const maxScore = results.length > 0 ? Math.max(...results.map(r => r.matchScore || 0)) : 1;

  const getItemTitle = (item: SearchResult) => item.title || item.name || 'Untitled';

  const getItemPrice = (item: SearchResult) => {
    if (item.price_range) return `$${item.price_range.min}`;
    if (item.price_per_night) return `$${item.price_per_night}`;
    if (item.entry_fee === 'Free') return 'Free';
    if (item.entry_fee === 'varies') return 'Varies';
    if (item.entry_fee) return `$${item.entry_fee}`;
    return 'N/A';
  };

  const getItemPriceUnit = (item: SearchResult) => {
    if (item.price_per_night) return ' / night';
    if (item.price_range) return ' / person';
    return '';
  };

  const getItemProvider = (item: SearchResult) =>
    item.provider_name || item.host_name || item.institution_name || 'Local Provider';

  return (
    <div className="min-h-screen bg-stone-50/40 animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <button
          onClick={() => { onClearResults(); navigate('/'); }}
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Explore
        </button>

        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-stone-900 leading-tight">
            {results.length > 0 ? (
              <>
                {results.length} result{results.length !== 1 ? 's' : ''}{query ? <> for <span className="text-amber-600">"{query}"</span></> : ''}
              </>
            ) : (
              'Search Results'
            )}
          </h1>
          <div className="h-0.5 w-8 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full mt-2" />
        </div>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex items-center gap-3 px-4 py-3 border border-stone-200 rounded-full hover:border-stone-400 focus-within:border-stone-900 focus-within:ring-2 focus-within:ring-stone-900/5 transition-all bg-white shadow-sm">
            <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search experiences, homestays, attractions..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 outline-none text-sm text-stone-900 placeholder-stone-400 bg-transparent"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-full hover:bg-stone-800 active:scale-[0.97] transition-all"
            >
              Search
            </button>
          </div>
        </form>

        {results.length === 0 ? (
          <div className="text-center py-20 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
              <Compass className="w-7 h-7 text-stone-300" />
            </div>
            <h3 className="text-base font-semibold text-stone-800 mb-1.5">No results found</h3>
            <p className="text-sm text-stone-400 mb-6 max-w-xs mx-auto leading-relaxed">
              Try different keywords or explore what's available.
            </p>
            <button
              onClick={() => { onClearResults(); navigate('/'); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 active:scale-[0.98] transition-all"
            >
              <Compass className="w-4 h-4" />
              Browse All
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((item) => {
              const typeInfo = getTypeLabel(item);
              const isSaved = savedItemIds.has(item.id);
              const rating = ratingsMap[item.id];
              const isBestMatch = item.matchScore && maxScore > 0 && item.matchScore / maxScore >= 0.85;

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(getItemRoute(item))}
                  className="bg-white border border-stone-200/80 rounded-xl overflow-hidden shadow-sm transition-all duration-300 card-hover-glow hover:border-stone-300 hover:-translate-y-1.5 cursor-pointer group flex flex-col"
                >
                  <div className="relative aspect-[3/2] bg-stone-100 overflow-hidden flex-shrink-0">
                    {item.media && item.media[0] ? (
                      <img
                        src={item.media[0]}
                        alt={getItemTitle(item)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleSave) {
                          const t = (item as any)._itemKind === 'journey' ? 'itinerary'
                            : item.itemType === 'homestay' || item.stay_type ? 'homestay'
                            : item.itemType === 'attraction' || (!item.title && item.institution_name) ? 'attraction'
                            : 'experience';
                          onToggleSave(item.id, t);
                        }
                      }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-sm"
                    >
                      <Heart className={`w-3.5 h-3.5 transition-colors ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-stone-500'}`} />
                    </button>

                    <div className={`absolute top-2.5 left-2.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm border ${typeInfo.color}`}>
                      {typeInfo.label}
                    </div>

                    {isBestMatch && (
                      <div className="absolute bottom-2.5 left-2.5 px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-semibold rounded-full shadow-sm">
                        Best Match
                      </div>
                    )}

                    {rating && !isBestMatch && (
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-0.5 px-1.5 py-0.5 bg-white/95 backdrop-blur-sm rounded-md shadow-sm">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] font-bold text-stone-800 font-mono">{rating.avg.toFixed(1)}</span>
                      </div>
                    )}

                    {rating && isBestMatch && (
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-0.5 px-1.5 py-0.5 bg-white/95 backdrop-blur-sm rounded-md shadow-sm">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] font-bold text-stone-800 font-mono">{rating.avg.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="text-[13px] font-semibold text-stone-900 line-clamp-2 leading-snug mb-1.5">
                      {getItemTitle(item)}
                    </h3>

                    <div className="flex items-center gap-1 mb-1.5">
                      <MapPin className="w-2.5 h-2.5 text-stone-400 flex-shrink-0" />
                      <span className="text-[11px] text-stone-500 truncate">{item.location.name}, {item.location.region}</span>
                    </div>

                    {item.duration_value && (
                      <div className="flex items-center gap-2 mb-1.5">
                        {item.itemType === 'homestay' || item.stay_type ? (
                          <div className="flex items-center gap-1">
                            <Moon className="w-2.5 h-2.5 text-stone-400" />
                            <span className="text-[11px] text-stone-500">{item.duration_value} {item.duration_value === 1 ? 'night' : 'nights'}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-stone-400" />
                              <span className="text-[11px] text-stone-500">{item.duration_value} {item.duration_unit === 'days' ? (item.duration_value === 1 ? 'day' : 'days') : 'hrs'}</span>
                            </div>
                            {item.frequency_type && item.frequency_type !== 'once_daily' && (
                              <div className="flex items-center gap-1">
                                <Repeat className="w-2.5 h-2.5 text-stone-400" />
                                <span className="text-[11px] text-stone-500">{item.frequency_type === 'three_daily' ? '3x daily' : '2x daily'}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed mb-1.5 flex-1">
                      {item.description}
                    </p>

                    <p className="text-[10px] text-stone-400 truncate mb-2">by {getItemProvider(item)}</p>

                    <div className="flex items-baseline gap-0.5 pt-2 border-t border-stone-100">
                      <span className="text-sm font-bold text-stone-900">{getItemPrice(item)}</span>
                      {getItemPriceUnit(item) && (
                        <span className="text-[11px] text-stone-500">{getItemPriceUnit(item)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
