import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { supabase } from '../../lib/supabase';
import { MapPin, Compass, Home, Landmark, Map as MapIcon, X, SlidersHorizontal, Search, LocateFixed, ArrowLeft } from 'lucide-react';
import { getCoordinates, RWANDA_LOCATION_NAMES } from '../../lib/rwandaGazetteer';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Fix Leaflet default icon issue in webpack/vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom colored pin icons for each item type, with a larger "selected" variant
// so hovering a sidebar card can visibly call out its pin on the map.
const createColoredIcon = (color: string, selected = false) => {
  const size = selected ? 36 : 28;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color:${color};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.35);border:2.5px solid white;transition:all 0.15s ease;">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

const meIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="position:relative;width:20px;height:20px;">
    <div style="position:absolute;inset:-8px;background:rgba(37,99,235,0.25);border-radius:50%;animation:pulse-ring 2s ease-out infinite;"></div>
    <div style="width:20px;height:20px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const ICONS = {
  experience: { color: '#f97316', icon: createColoredIcon('#f97316'), selectedIcon: createColoredIcon('#f97316', true) },
  homestay: { color: '#22c55e', icon: createColoredIcon('#22c55e'), selectedIcon: createColoredIcon('#22c55e', true) },
  attraction: { color: '#0ea5e9', icon: createColoredIcon('#0ea5e9'), selectedIcon: createColoredIcon('#0ea5e9', true) },
  itinerary: { color: '#8b5cf6', icon: createColoredIcon('#8b5cf6'), selectedIcon: createColoredIcon('#8b5cf6', true) },
} as const;

type ItemType = keyof typeof ICONS;

interface MapItem {
  id: string;
  title: string;
  type: ItemType;
  location: { name: string; region?: string; coordinates?: { lat: number; lng: number } };
  priceInfo: string;
  media?: string[];
  rating?: number;
  reviewCount?: number;
}

function MapBoundsSetter({ items }: { items: MapItem[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = items
      .map(i => i.location.coordinates)
      .filter((c): c is { lat: number; lng: number } => !!c);
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [map, items]);
  return null;
}

// Bridges imperative map actions (pan/fly/open a popup) out to the sibling
// sidebar list, which lives outside the MapContainer's React-Leaflet context
// and so can't call useMap() itself.
function MapController({ controllerRef }: { controllerRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => { controllerRef.current = map; }, [map]);
  return null;
}

export function MapPage() {
  const [items, setItems] = useState<MapItem[]>([]);
  const [filter, setFilter] = useState<'all' | ItemType>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [locateStatus, setLocateStatus] = useState<'idle' | 'locating' | 'denied'>('idle');
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const handoff = routerLocation.state as { itemIds?: string[]; sectionTitle?: string } | null;
  const [sectionFilter, setSectionFilter] = useState<{ ids: Set<string>; title: string } | null>(
    handoff?.itemIds?.length ? { ids: new Set(handoff.itemIds), title: handoff.sectionTitle || 'Selection' } : null
  );

  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    loadMapData();
  }, []);

  async function loadMapData() {
    try {
      // Each query is bounded by its own client-side timeout. Under cold-load
      // contention a single Supabase query can hang well past the server
      // statement timeout (connection-pool starvation on small compute), and a
      // plain Promise.all would then block the whole map forever. Racing each
      // query against a timeout guarantees the map renders whatever arrived
      // within the budget instead of blanking every marker.
      const withTimeout = async <T,>(query: PromiseLike<{ data: T[] | null; error: unknown }>, ms = 7000): Promise<T[]> => {
        try {
          const result = await Promise.race([
            query,
            new Promise<{ data: null; error: unknown }>((resolve) =>
              setTimeout(() => resolve({ data: null, error: new Error('timeout') }), ms)
            ),
          ]);
          return !result.error && Array.isArray(result.data) ? result.data : [];
        } catch {
          return [];
        }
      };

      const [listingsData, attrData, reviewsData, attrReviewsData] = await Promise.all([
        withTimeout<any>(supabase.from('partner_listings').select('id, title, listing_type, location, pricing, media, tags').eq('status', 'active').eq('is_flagged', false)),
        withTimeout<any>(supabase.from('institution_profiles').select('id, name, type, location, location_lat, location_lng, entry_fee_is_free, entry_fee_amount, cover_image, images').eq('published', true).eq('is_flagged', false)),
        withTimeout<any>(supabase.from('reviews').select('listing_id, rating')),
        withTimeout<any>(supabase.from('attraction_reviews').select('institution_id, rating')),
      ]);

      // Build ratings map
      const rMap: Record<string, { total: number; count: number }> = {};
      reviewsData.forEach((r: any) => {
        if (!r.listing_id) return;
        if (!rMap[r.listing_id]) rMap[r.listing_id] = { total: 0, count: 0 };
        rMap[r.listing_id].total += r.rating;
        rMap[r.listing_id].count += 1;
      });
      attrReviewsData.forEach((r: any) => {
        if (!r.institution_id) return;
        if (!rMap[r.institution_id]) rMap[r.institution_id] = { total: 0, count: 0 };
        rMap[r.institution_id].total += r.rating;
        rMap[r.institution_id].count += 1;
      });
      const finalMap: Record<string, { avg: number; count: number }> = {};
      Object.entries(rMap).forEach(([id, { total, count }]) => { finalMap[id] = { avg: total / count, count }; });

      const allItems: MapItem[] = [
        ...listingsData
          .filter((l: any) => l.listing_type === 'experience' || l.listing_type === 'homestay' || l.listing_type === 'itinerary')
          .map((l: any) => {
            const type: ItemType = l.listing_type === 'homestay' ? 'homestay' : l.listing_type === 'itinerary' ? 'itinerary' : 'experience';
            const coords = l.location?.coordinates || getCoordinates(l.location?.name);
            const priceInfo = type === 'homestay'
              ? `$${l.pricing?.base_price || 0}/night`
              : type === 'itinerary'
              ? `From $${l.pricing?.base_price || 0}`
              : `From $${l.pricing?.base_price || 0}/person`;
            return {
              id: l.id,
              title: l.title,
              type,
              location: { name: l.location?.name || '', region: l.location?.region, coordinates: coords || undefined },
              priceInfo,
              media: l.media || [],
              rating: finalMap[l.id]?.avg,
              reviewCount: finalMap[l.id]?.count,
            };
          }),
        ...attrData.map((a: any) => {
          const coords = (a.location_lat != null && a.location_lng != null)
            ? { lat: a.location_lat, lng: a.location_lng }
            : getCoordinates(a.location);
          return {
            id: a.id,
            title: a.name,
            type: 'attraction' as const,
            location: { name: a.location || '', coordinates: coords || undefined },
            priceInfo: a.entry_fee_is_free !== false ? 'Free entry' : `$${a.entry_fee_amount || 0} entry`,
            media: a.cover_image ? [a.cover_image, ...(a.images || [])] : (a.images || []),
            rating: finalMap[a.id]?.avg,
            reviewCount: finalMap[a.id]?.count,
          };
        }),
      ].filter(item => item.location.coordinates); // Only include items with coordinates

      setItems(allItems);
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  }

  const typeFilteredItems = filter === 'all' ? items : items.filter(item => item.type === filter);
  const filteredItems = sectionFilter ? typeFilteredItems.filter(item => sectionFilter.ids.has(item.id)) : typeFilteredItems;

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return RWANDA_LOCATION_NAMES.filter(name => name.toLowerCase().includes(q)).slice(0, 6);
  }, [searchQuery]);

  function handleItemClick(item: MapItem) {
    if (item.type === 'experience') navigate(`/experience/${item.id}`);
    if (item.type === 'homestay') navigate(`/homestay/${item.id}`);
    if (item.type === 'attraction') navigate(`/attraction/${item.id}`);
    if (item.type === 'itinerary') navigate(`/itinerary/${item.id}`);
  }

  function handleCardHover(item: MapItem) {
    setSelectedId(item.id);
    const coords = item.location.coordinates;
    if (coords && mapRef.current) {
      mapRef.current.panTo([coords.lat, coords.lng], { animate: true, duration: 0.5 });
    }
    markerRefs.current[item.id]?.openPopup();
  }

  function handleMarkerClick(item: MapItem) {
    setSelectedId(item.id);
    cardRefs.current[item.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function flyToPlace(name: string) {
    const coords = getCoordinates(name);
    if (coords && mapRef.current) {
      mapRef.current.flyTo([coords.lat, coords.lng], 12, { animate: true, duration: 1 });
    }
    setSearchQuery(name);
    setShowSearchSuggestions(false);
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setLocateStatus('denied'); return; }
    setLocateStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(coords);
        setLocateStatus('idle');
        mapRef.current?.flyTo([coords.lat, coords.lng], 13, { animate: true, duration: 1 });
      },
      () => setLocateStatus('denied'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const rwandaCenter: [number, number] = [-1.94, 30.06];

  const typeConfig: { key: 'all' | ItemType; label: string; barColor: string }[] = [
    { key: 'all', label: 'All', barColor: 'bg-stone-900 text-white' },
    { key: 'experience', label: 'Experiences', barColor: 'bg-orange-500 text-white' },
    { key: 'homestay', label: 'Homestays', barColor: 'bg-green-500 text-white' },
    { key: 'attraction', label: 'Attractions', barColor: 'bg-sky-500 text-white' },
    { key: 'itinerary', label: 'Journeys', barColor: 'bg-violet-500 text-white' },
  ];

  const sidebarList = (onCardClose?: () => void) => (
    <>
      {onCardClose && (
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <span className="text-xs font-semibold text-stone-500">Locations</span>
          <button onClick={onCardClose} className="p-1 hover:bg-stone-100 rounded">
            <X className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>
      )}
      <div className="p-3 space-y-2">
        {filteredItems.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-4">No locations found</p>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              ref={(el) => { cardRefs.current[item.id] = el; }}
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => handleCardHover(item)}
              className="bg-white border border-neutral-200/80 rounded-2xl p-3 cursor-pointer transition-all hover:shadow-md"
              style={selectedId === item.id ? { borderColor: ICONS[item.type].color, boxShadow: `0 0 0 2px ${ICONS[item.type].color}55` } : undefined}
            >
              <div className="flex gap-3">
                {item.media && item.media[0] ? (
                  <img src={item.media[0]} alt={item.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                    {item.type === 'experience' && <Compass className="w-5 h-5 text-orange-300" />}
                    {item.type === 'homestay' && <Home className="w-5 h-5 text-green-300" />}
                    {item.type === 'attraction' && <Landmark className="w-5 h-5 text-sky-300" />}
                    {item.type === 'itinerary' && <MapIcon className="w-5 h-5 text-violet-300" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${
                      item.type === 'experience' ? 'bg-orange-50 text-orange-600' :
                      item.type === 'homestay' ? 'bg-green-50 text-green-600' :
                      item.type === 'itinerary' ? 'bg-violet-50 text-violet-600' :
                      'bg-sky-50 text-sky-600'
                    }`}>
                      {item.type}
                    </span>
                    {item.rating && (
                      <span className="text-[9px] text-amber-500 font-medium">★ {item.rating.toFixed(1)}</span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold text-stone-900 truncate">{item.title}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 text-stone-400" />
                    <span className="text-[10px] text-stone-500 truncate">{item.location.name}</span>
                  </div>
                  <p className="text-[10px] font-medium text-stone-700 mt-0.5">{item.priceInfo}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  return (
    <div className="h-[calc(100vh-4rem)] -mx-4 md:-mx-8 flex flex-col">
      {/* Top bar: back + search + filters — a real row, not an overlay, so it's
          never fought over with the map for stacking priority. */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-3 md:px-4 py-2.5 border-b border-stone-200 bg-white">
        <button
          onClick={() => navigate(-1)}
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-stone-50 rounded-full border border-stone-200">
            <Search className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearchSuggestions(true); }}
              onFocus={() => setShowSearchSuggestions(true)}
              placeholder="Jump to a place in Rwanda…"
              className="flex-1 outline-none text-xs text-stone-900 placeholder-stone-400 bg-transparent min-w-0"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setShowSearchSuggestions(false); }} className="flex-shrink-0">
                <X className="w-3.5 h-3.5 text-stone-400" />
              </button>
            )}
            <button
              onClick={useMyLocation}
              title="Use my location"
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${locateStatus === 'locating' ? 'text-blue-400 animate-pulse' : 'text-blue-600 hover:bg-blue-50'}`}
            >
              <LocateFixed className="w-4 h-4" />
            </button>
          </div>
          {showSearchSuggestions && searchMatches.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-stone-200/80 py-1.5 max-h-56 overflow-y-auto z-20">
              {searchMatches.map((name) => (
                <button
                  key={name}
                  onClick={() => flyToPlace(name)}
                  className="w-full text-left px-3.5 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                >
                  <MapPin className="w-3 h-3 text-stone-400 flex-shrink-0" />
                  {name}
                </button>
              ))}
            </div>
          )}
          {locateStatus === 'denied' && (
            <p className="absolute top-full left-1 mt-1 text-[10px] text-red-500 bg-white px-2 py-0.5 rounded-full shadow z-20">Couldn't access your location</p>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {typeConfig.map((t) => {
            const isActive = filter === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                  isActive ? t.barColor : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {sectionFilter && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 rounded-full w-fit">
            <MapIcon className="w-3 h-3 text-white flex-shrink-0" />
            <span className="text-xs text-white font-medium truncate">Showing: {sectionFilter.title}</span>
            <button onClick={() => setSectionFilter(null)} className="flex-shrink-0">
              <X className="w-3 h-3 text-white/70 hover:text-white" />
            </button>
          </div>
        )}

        <span className="ml-auto flex-shrink-0 text-xs font-medium text-stone-500">
          {filteredItems.length} location{filteredItems.length !== 1 ? 's' : ''}
        </span>

        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="flex-shrink-0 md:hidden w-9 h-9 bg-stone-100 rounded-full flex items-center justify-center"
        >
          <SlidersHorizontal className="w-4 h-4 text-stone-600" />
        </button>
      </div>

      {/* Body: map + sidebar, real flex siblings — never overlap, so nothing
          can paint over the other regardless of zoom/pan state. */}
      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 relative">
          <MapContainer
            center={rwandaCenter}
            zoom={9}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              subdomains={['a', 'b', 'c', 'd']}
            />
            <MapController controllerRef={mapRef} />
            <MapBoundsSetter items={filteredItems} />

            {myLocation && (
              <Marker position={[myLocation.lat, myLocation.lng]} icon={meIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}

            <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
              {filteredItems.map((item) => (
                <Marker
                  key={item.id}
                  ref={(el) => { if (el) markerRefs.current[item.id] = el; }}
                  position={[item.location.coordinates!.lat, item.location.coordinates!.lng]}
                  icon={selectedId === item.id ? ICONS[item.type].selectedIcon : ICONS[item.type].icon}
                  eventHandlers={{
                    click: () => handleMarkerClick(item),
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      {item.media && item.media[0] && (
                        <img src={item.media[0]} alt={item.title} className="w-full h-24 object-cover rounded-lg mb-2 -mt-1" style={{ width: 'calc(100% + 4px)', marginLeft: '-2px' }} />
                      )}
                      <p className="text-xs font-semibold text-stone-900 mb-1 capitalize">{item.type}</p>
                      <h3 className="text-sm font-bold text-stone-900 mb-1">{item.title}</h3>
                      <p className="text-xs text-stone-500 mb-2">{item.location.name}</p>
                      <p className="text-xs font-medium text-stone-700 mb-2">{item.priceInfo}</p>
                      <button
                        onClick={() => handleItemClick(item)}
                        className="w-full py-1.5 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

        {/* Desktop sidebar: a real column, always visible, never covered by the map */}
        <div className="hidden md:flex md:flex-col w-80 flex-shrink-0 border-l border-stone-200 bg-white overflow-y-auto">
          {sidebarList()}
        </div>

        {/* Mobile sidebar: full-screen toggle, since there's no room for a
            permanent column on small screens */}
        {showMobileSidebar && (
          <div className="md:hidden absolute inset-0 z-20 bg-white overflow-y-auto">
            {sidebarList(() => setShowMobileSidebar(false))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
