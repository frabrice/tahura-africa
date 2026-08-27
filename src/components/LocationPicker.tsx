import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, LocateFixed, Loader2, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';
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
  const [locateError, setLocateError] = useState<string | null>(null);
  const [lowAccuracyMeters, setLowAccuracyMeters] = useState<number | null>(null);
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
    setLowAccuracyMeters(null);
    onChange(result);
  }, [onChange]);

  const pickFromMap = useCallback(async (lat: number, lng: number) => {
    setResolvingPin(true);
    const label = await reverseGeocode(lat, lng);
    setResolvingPin(false);
    setQuery(label);
    setLowAccuracyMeters(null);
    onChange({ lat, lng, label });
  }, [onChange]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocateError("Your browser doesn't support location access.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    setLowAccuracyMeters(null);

    // A single getCurrentPosition() call often returns whatever fix is
    // fastest to produce — frequently a coarse WiFi/IP-based estimate that
    // can be tens of kilometers off (this is what put a North Province
    // pin in Kigali) — rather than waiting for GPS to lock on. Watching
    // for a few seconds and keeping the most accurate reading seen gives
    // real GPS hardware a chance to narrow in before we commit to one.
    let best: GeolocationPosition | null = null;
    let settled = false;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        if (pos.coords.accuracy <= 75) finish();
      },
      (err) => {
        if (settled) return;
        settled = true;
        navigator.geolocation.clearWatch(watchId);
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. Allow it in your browser settings and try again.'
            : "Couldn't get your location. Please try again or place the pin manually."
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );

    const finish = async () => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      if (!best) {
        setLocating(false);
        setLocateError("Couldn't get an accurate fix. Please try again or place the pin manually.");
        return;
      }
      const { latitude, longitude, accuracy } = best.coords;
      const label = await reverseGeocode(latitude, longitude);
      setLocating(false);
      setQuery(label);
      onChange({ lat: latitude, lng: longitude, label });
      // Beyond a few km, the fix is almost certainly IP-based rather than
      // GPS/WiFi — exactly the failure mode that needs a visible warning
      // rather than silently trusting a possibly-wrong pin.
      setLowAccuracyMeters(accuracy > 3000 ? accuracy : null);
    };

    setTimeout(finish, 7000);
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

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60 ${
          locating
            ? 'text-blue-400 border-blue-100 bg-blue-50'
            : 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100'
        }`}
      >
        {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        {locating ? 'Finding your location…' : 'Use my current location'}
      </button>

      {locateError && (
        <div className="flex items-start gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{locateError}</p>
        </div>
      )}

      {lowAccuracyMeters && (
        <div className="flex items-start gap-2 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            This fix is only accurate to about {(lowAccuracyMeters / 1000).toFixed(0)} km (likely from your network rather than GPS) — please check the pin on the map below and drag it to the right spot if needed.
          </p>
        </div>
      )}

      {value && (
        <div className="flex items-start gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-800">Location selected</p>
            <p className="text-xs text-emerald-700 truncate">{value.label}</p>
          </div>
        </div>
      )}

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
      <p className="text-[11px] text-neutral-400">Search for a place, use the button above, or click/drag the pin on the map to fine-tune.</p>
    </div>
  );
}
