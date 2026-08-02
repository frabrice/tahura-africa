import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/Card';
import { MapPin, Compass, Home, Landmark, X, SlidersHorizontal } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Custom colored icons for different item types
const createColoredIcon = (color: string) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background-color:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const experienceIcon = createColoredIcon('#f97316'); // orange-500
const homestayIcon = createColoredIcon('#22c55e');   // green-500
const attractionIcon = createColoredIcon('#0ea5e9'); // sky-500

interface MapItem {
  id: string;
  title: string;
  type: 'experience' | 'homestay' | 'attraction';
  location: { name: string; region?: string; coordinates?: { lat: number; lng: number } };
  priceInfo: string;
  media?: string[];
  rating?: number;
  reviewCount?: number;
}

// Known Rwanda coordinates for common locations
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  'Kigali': { lat: -1.9441, lng: 30.0619 },
  'Nyungwe Forest': { lat: -2.4833, lng: 29.1667 },
  'Musanze': { lat: -1.4998, lng: 29.6350 },
  'Rubavu (Gisenyi)': { lat: -1.6585, lng: 29.3500 },
  'Huye (Butare)': { lat: -2.5961, lng: 29.7394 },
  'Akagera National Park': { lat: -1.5333, lng: 30.4667 },
  'Lake Kivu': { lat: -2.0000, lng: 29.2000 },
  'Volcanoes National Park': { lat: -1.4833, lng: 29.5333 },
  'Kibuye': { lat: -2.0600, lng: 29.3470 },
  'Nyanza': { lat: -2.3518, lng: 29.7514 },
};

function getCoordinates(locationName: string): { lat: number; lng: number } | null {
  const normalized = locationName?.trim();
  if (!normalized) return null;
  // Direct match
  if (LOCATION_COORDS[normalized]) return LOCATION_COORDS[normalized];
  // Partial match
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (normalized.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(normalized.toLowerCase())) {
      return coords;
    }
  }
  return null;
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

export function MapPage() {
  const [items, setItems] = useState<MapItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'experience' | 'homestay' | 'attraction'>('all');
  const [, setSelectedItem] = useState<MapItem | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [, setRatingsMap] = useState<Record<string, { avg: number; count: number }>>({});
  const navigate = useNavigate();

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
        withTimeout<any>(supabase.from('institution_profiles').select('id, name, type, location, entry_fee_is_free, entry_fee_amount, cover_image, images').eq('published', true).eq('is_flagged', false)),
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
      setRatingsMap(finalMap);

      const allItems: MapItem[] = [
        ...listingsData
          .filter((l: any) => l.listing_type === 'experience' || l.listing_type === 'homestay')
          .map((l: any) => {
            const isHomestay = l.listing_type === 'homestay';
            const coords = l.location?.coordinates || getCoordinates(l.location?.name);
            return {
              id: l.id,
              title: l.title,
              type: isHomestay ? 'homestay' as const : 'experience' as const,
              location: { name: l.location?.name || '', region: l.location?.region, coordinates: coords || undefined },
              priceInfo: isHomestay
                ? `$${l.pricing?.base_price || 0}/night`
                : `From $${l.pricing?.base_price || 0}/person`,
              media: l.media || [],
              rating: finalMap[l.id]?.avg,
              reviewCount: finalMap[l.id]?.count,
            };
          }),
        ...attrData.map((a: any) => {
          const coords = a.location?.coordinates || getCoordinates(a.location);
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

  const filteredItems = filter === 'all' ? items : items.filter(item => item.type === filter);

  function handleItemClick(item: MapItem) {
    if (item.type === 'experience') navigate(`/experience/${item.id}`);
    if (item.type === 'homestay') navigate(`/homestay/${item.id}`);
    if (item.type === 'attraction') navigate(`/attraction/${item.id}`);
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'experience': return experienceIcon;
      case 'homestay': return homestayIcon;
      case 'attraction': return attractionIcon;
      default: return DefaultIcon;
    }
  };

  const rwandaCenter: [number, number] = [-1.94, 30.06];

  return (
    <div className="h-[calc(100vh-4rem)] -mx-4 md:-mx-8 relative">
      {/* Filter bar */}
      <div className="absolute top-3 left-3 z-[400] flex gap-2">
        {(['all', 'experience', 'homestay', 'attraction'] as const).map((f) => {
          const colors = {
            all: 'bg-stone-900 text-white',
            experience: 'bg-orange-500 text-white',
            homestay: 'bg-green-500 text-white',
            attraction: 'bg-sky-500 text-white',
          };
          const labels = { all: 'All', experience: 'Experiences', homestay: 'Homestays', attraction: 'Attractions' };
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full shadow-lg backdrop-blur-sm transition-all ${
                isActive ? colors[f] : 'bg-white/90 text-stone-600 hover:bg-white'
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setShowMobileSidebar(!showMobileSidebar)}
        className="absolute top-3 right-3 z-[400] md:hidden w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center"
      >
        <SlidersHorizontal className="w-4 h-4 text-stone-600" />
      </button>

      {/* Item count badge */}
      <div className="absolute bottom-3 left-3 z-[400] px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg text-xs font-medium text-stone-600">
        {filteredItems.length} location{filteredItems.length !== 1 ? 's' : ''}
      </div>

      {/* Sidebar */}
      {(showMobileSidebar || window.innerWidth >= 768) && (
        <div className={`absolute top-14 md:top-3 right-3 z-[400] w-72 max-h-[calc(100%-5rem)] overflow-y-auto ${showMobileSidebar ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-stone-200/80 p-3 space-y-2">
            {showMobileSidebar && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-500">Locations</span>
                <button onClick={() => setShowMobileSidebar(false)} className="p-1 hover:bg-stone-100 rounded">
                  <X className="w-3.5 h-3.5 text-stone-400" />
                </button>
              </div>
            )}
            {filteredItems.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-4">No locations found</p>
            ) : (
              filteredItems.map((item) => (
                <Card
                  key={item.id}
                  hover
                  onClick={() => handleItemClick(item)}
                  className="p-3 cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="flex gap-3">
                    {item.media && item.media[0] ? (
                      <img src={item.media[0]} alt={item.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                        {item.type === 'experience' && <Compass className="w-5 h-5 text-orange-300" />}
                        {item.type === 'homestay' && <Home className="w-5 h-5 text-green-300" />}
                        {item.type === 'attraction' && <Landmark className="w-5 h-5 text-sky-300" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${
                          item.type === 'experience' ? 'bg-orange-50 text-orange-600' :
                          item.type === 'homestay' ? 'bg-green-50 text-green-600' :
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
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={rwandaCenter}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsSetter items={filteredItems} />
        {filteredItems.map((item) => (
          <Marker
            key={item.id}
            position={[item.location.coordinates!.lat, item.location.coordinates!.lng]}
            icon={getIcon(item.type)}
            eventHandlers={{
              click: () => setSelectedItem(item),
            }}
          >
            <Popup>
              <div className="min-w-[180px]">
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
      </MapContainer>
    </div>
  );
}
