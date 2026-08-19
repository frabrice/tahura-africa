import { useState, useEffect } from 'react';
import { Car } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TransportDetails {
  pickup_location: { name: string } | null;
  dropoff_location: { name: string } | null;
  distance_km: number | null;
  total_fare: number | null;
  transport_type: string;
}

// Shared across every booking detail view (Host, Guide, Partner, Ops) so
// whoever owns the booking can see a transport was requested and where from.
// There is no automated dispatch — arranging the actual pickup is a manual
// step the host/partner/Ops handles outside the system for now.
export function TransportRequestCard({ transportId }: { transportId: string }) {
  const [transport, setTransport] = useState<TransportDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('transports')
      .select('pickup_location, dropoff_location, distance_km, total_fare, transport_type')
      .eq('id', transportId)
      .maybeSingle()
      .then(({ data }) => {
        setTransport(data);
        setLoading(false);
      });
  }, [transportId]);

  if (loading) {
    return <div className="text-xs text-neutral-400 px-1">Loading transport details…</div>;
  }
  if (!transport) return null;

  return (
    <div className="p-3.5 bg-teal-50 border border-teal-100 rounded-xl space-y-1">
      <div className="flex items-center gap-2">
        <Car className="w-4 h-4 text-teal-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-teal-800">Transport Requested</span>
      </div>
      <p className="text-xs text-teal-700 pl-6">
        Pickup from <strong>{transport.pickup_location?.name || 'an unspecified location'}</strong>
        {transport.transport_type === 'roundtrip' ? ' · roundtrip' : ''}
      </p>
      {transport.distance_km != null && transport.total_fare != null && (
        <p className="text-xs text-teal-600 pl-6">
          {transport.distance_km} km · {Math.round(transport.total_fare).toLocaleString()} RWF paid
        </p>
      )}
    </div>
  );
}
