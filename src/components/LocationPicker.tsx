import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, LocateFixed, Loader2, MapPin } from 'lucide-react';
import { searchPlaces, reverseGeocode, GeocodeResult } from '../lib/geocoding';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const pinIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const RWANDA_CENTER: [number, number] = [-1.94, 30.06];

export interface PickedLocation {
  lat: number;
  lng: number;
  label: string;
}

interface LocationPickerProps {
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
  placeholder?: string;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({ value, onChange, placeholder = 'Search for a place...' }: LocationPickerProps) {
  const [query, setQuery] = useState(value?.label || '');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolvingPin, setResolvingPin] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value?.label || '');
  }, [value?.lat, value?.lng]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3 || query === value?.label) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const found = await searchPlaces(query);
      setResults(found);
      setSearching(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const pick = useCallback((result: GeocodeResult) => {
    setQuery(result.label);
    setResults([]);
    setShowResults(false);
    onChange(result);
  }, [onChange]);

  const pickFromMap = useCallback(async (lat: number, lng: number) => {
    setResolvingPin(true);
    const label = await reverseGeocode(lat, lng);
    setResolvingPin(false);
    setQuery(label);
    onChange({ lat, lng, label });
  }, [onChange]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = await reverseGeocode(latitude, longitude);
        setLocating(false);
        setQuery(label);
        onChange({ lat: latitude, lng: longitude, label });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const center: [number, number] = value ? [value.lat, value.lng] : RWANDA_CENTER;

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex items-center gap-2 px-3.5 py-2.5 border border-neutral-200 rounded-lg bg-white">
          <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder={placeholder}
            className="flex-1 text-sm outline-none placeholder-neutral-400 min-w-0"
          />
          {searching && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin flex-shrink-0" />}
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            title="Use my current location"
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${locating ? 'text-blue-400 animate-pulse' : 'text-blue-600 hover:bg-blue-50'}`}
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>
        {showResults && results.length > 0 && (
          <div className="absolute z-[1000] top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-neutral-200 py-1 max-h-56 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pick(r)}
                className="w-full flex items-start gap-2 px-3 py-2 text-left text-xs hover:bg-neutral-50 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
                <span className="text-neutral-700">{r.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg overflow-hidden border border-neutral-200 relative" style={{ height: 220 }}>
        <MapContainer center={center} zoom={value ? 14 : 8} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains={['a', 'b', 'c', 'd']}
          />
          <ClickHandler onPick={pickFromMap} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const pos = e.target.getLatLng();
                  pickFromMap(pos.lat, pos.lng);
                },
              }}
            />
          )}
        </MapContainer>
        {resolvingPin && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-5 h-5 text-neutral-600 animate-spin" />
          </div>
        )}
      </div>
      <p className="text-[11px] text-neutral-400">Search, tap "use my location", or click/drag the pin to fine-tune.</p>
    </div>
  );
}
