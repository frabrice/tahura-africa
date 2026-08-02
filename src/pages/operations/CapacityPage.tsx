import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';

interface InstitutionCapacity {
  id: string;
  name: string;
  type: string;
  location: string;
  daily_capacity: number;
  portal_user_id: string;
  bookingCount: number;
  utilizationPercent: number;
  status: 'normal' | 'approaching' | 'exceeded';
}

export function CapacityPage() {
  const [institutions, setInstitutions] = useState<InstitutionCapacity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InstitutionCapacity | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('institution_profiles')
      .select('id, name, type, location, daily_capacity, portal_user_id')
      .eq('published', true)
      .order('name');

    if (!profiles) { setLoading(false); return; }

    const portalIds = profiles.map(p => p.portal_user_id);
    const { data: bookings } = await supabase
      .from('bookings')
      .select('institution_id')
      .in('institution_id', portalIds)
      .eq('booking_type', 'attraction');

    const counts: Record<string, number> = {};
    (bookings || []).forEach((b: any) => {
      counts[b.institution_id] = (counts[b.institution_id] || 0) + 1;
    });

    setInstitutions(profiles.map(p => {
      const cap = p.daily_capacity || 0;
      const count = counts[p.portal_user_id] || 0;
      const pct = cap > 0 ? Math.round((count / cap) * 100) : 0;
      return {
        id: p.id,
        name: p.name || 'Unnamed',
        type: p.type || 'Attraction',
        location: p.location || 'Unknown',
        daily_capacity: cap,
        portal_user_id: p.portal_user_id,
        bookingCount: count,
        utilizationPercent: pct,
        status: (pct >= 100 ? 'exceeded' : pct >= 85 ? 'approaching' : 'normal') as InstitutionCapacity['status'],
      };
    }).sort((a, b) => b.utilizationPercent - a.utilizationPercent));
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-xs text-neutral-600 hover:text-neutral-900 mb-4">
          &larr; Back to Capacity Monitor
        </button>
        <h1 className="text-lg font-medium text-neutral-900 mb-6">{selected.name}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
          <Card className="p-4 bg-amber-50">
            <div className="text-xs text-neutral-500 mb-1">Total Bookings</div>
            <div className="text-xl font-medium text-neutral-900">{selected.bookingCount}</div>
          </Card>
          <Card className="p-4 bg-orange-50">
            <div className="text-xs text-neutral-500 mb-1">Daily Capacity</div>
            <div className="text-xl font-medium text-neutral-900">{selected.daily_capacity || 'Not set'}</div>
          </Card>
          <Card className="p-4 bg-rose-50">
            <div className="text-xs text-neutral-500 mb-1">Utilization</div>
            <div className="text-xl font-medium text-neutral-900">{selected.utilizationPercent}%</div>
          </Card>
        </div>

        <Card className="p-5 bg-sky-50">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">Institution Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-neutral-100">
              <span className="text-neutral-600">Type</span>
              <span className="text-neutral-900 font-medium capitalize">{selected.type}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-100">
              <span className="text-neutral-600">Location</span>
              <span className="text-neutral-900 font-medium">{selected.location}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-neutral-600">Status</span>
              <span className={`font-medium capitalize ${
                selected.status === 'exceeded' ? 'text-red-600' :
                selected.status === 'approaching' ? 'text-orange-600' :
                'text-green-600'
              }`}>{selected.status}</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const exceeded = institutions.filter(i => i.status === 'exceeded').length;
  const approaching = institutions.filter(i => i.status === 'approaching').length;

  return (
    <div>
      <h1 className="text-lg font-medium text-neutral-900 mb-6">Overload & Capacity</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <Card className="p-4 bg-red-50">
          <div className="text-xs text-neutral-500 mb-1">Exceeded Capacity</div>
          <div className="text-xl font-medium text-red-600">{exceeded}</div>
        </Card>
        <Card className="p-4 bg-orange-50">
          <div className="text-xs text-neutral-500 mb-1">Approaching Capacity</div>
          <div className="text-xl font-medium text-orange-600">{approaching}</div>
        </Card>
        <Card className="p-4 bg-green-50">
          <div className="text-xs text-neutral-500 mb-1">Total Monitored</div>
          <div className="text-xl font-medium text-neutral-900">{institutions.length}</div>
        </Card>
      </div>

      {institutions.length === 0 ? (
        <Card className="p-12 text-center bg-neutral-50">
          <p className="text-sm text-neutral-500">No published institutions found</p>
        </Card>
      ) : (
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <Card className="bg-teal-50 min-w-[600px] md:min-w-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Institution</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Bookings</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Capacity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Utilization</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {institutions.map(inst => (
                  <tr key={inst.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm text-neutral-900">{inst.name}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{inst.bookingCount}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{inst.daily_capacity > 0 ? inst.daily_capacity : '-'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-900 font-medium">{inst.utilizationPercent}%</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 text-xs border ${
                        inst.status === 'exceeded' ? 'bg-red-50 text-red-700 border-red-200' :
                        inst.status === 'approaching' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(inst)} className="text-xs text-neutral-900 hover:underline">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
