import { useState, useEffect } from 'react';
import { Download, Building2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';

interface AttractionRow {
  id: string;
  name: string;
  type: string;
  location: string;
  daily_capacity: number;
  programCount: number;
  bookingCount: number;
}

export function AttractionUsagePage() {
  const [attractions, setAttractions] = useState<AttractionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('institution_profiles')
      .select('id, portal_user_id, name, type, location, daily_capacity')
      .eq('published', true)
      .order('name');

    if (!profiles) { setLoading(false); return; }

    const portalIds = profiles.map(p => p.portal_user_id);

    const [programsRes, bookingsRes] = await Promise.all([
      supabase.from('programs').select('portal_user_id').in('portal_user_id', portalIds).eq('active', true),
      supabase.from('bookings').select('institution_id').in('institution_id', portalIds).eq('booking_type', 'attraction'),
    ]);

    const programCounts: Record<string, number> = {};
    (programsRes.data || []).forEach((p: any) => {
      programCounts[p.portal_user_id] = (programCounts[p.portal_user_id] || 0) + 1;
    });

    const bookingCounts: Record<string, number> = {};
    (bookingsRes.data || []).forEach((b: any) => {
      bookingCounts[b.institution_id] = (bookingCounts[b.institution_id] || 0) + 1;
    });

    setAttractions(profiles.map(p => ({
      id: p.id,
      name: p.name || 'Unnamed',
      type: p.type || 'Attraction',
      location: p.location || 'Unknown',
      daily_capacity: p.daily_capacity || 0,
      programCount: programCounts[p.portal_user_id] || 0,
      bookingCount: bookingCounts[p.portal_user_id] || 0,
    })));
    setLoading(false);
  }

  const totalBookings = attractions.reduce((s, a) => s + a.bookingCount, 0);
  const totalCapacity = attractions.reduce((s, a) => s + a.daily_capacity, 0);
  const totalPrograms = attractions.reduce((s, a) => s + a.programCount, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Attraction Usage</h1>
        <Button variant="secondary" size="sm" onClick={() => {}}>
          <Download className="w-4 h-4 mr-1.5" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 bg-teal-50">
          <div className="text-xs text-neutral-500 mb-1">Published Attractions</div>
          <div className="text-2xl font-medium text-neutral-900">{attractions.length}</div>
        </Card>
        <Card className="p-5 bg-rose-50">
          <div className="text-xs text-neutral-500 mb-1">Total Bookings</div>
          <div className="text-2xl font-medium text-neutral-900">{totalBookings.toLocaleString()}</div>
        </Card>
        <Card className="p-5 bg-amber-50">
          <div className="text-xs text-neutral-500 mb-1">Active Programs</div>
          <div className="text-2xl font-medium text-neutral-900">{totalPrograms}</div>
        </Card>
        <Card className="p-5 bg-sky-50">
          <div className="text-xs text-neutral-500 mb-1">Combined Daily Capacity</div>
          <div className="text-2xl font-medium text-neutral-900">{totalCapacity.toLocaleString()}</div>
        </Card>
      </div>

      <Card className="p-5 mb-8 bg-neutral-50">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-4 h-4 text-neutral-500" />
          <h3 className="text-sm font-medium text-neutral-900">Attraction Performance Overview</h3>
        </div>
        {attractions.length === 0 ? (
          <p className="text-sm text-neutral-500 py-8 text-center">No published attractions found</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Attraction</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Type</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Location</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Bookings</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Daily Cap</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Programs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {attractions.map(a => (
                <tr key={a.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-3 text-sm text-neutral-900">{a.name}</td>
                  <td className="px-3 py-3 text-sm text-neutral-600 capitalize">{a.type}</td>
                  <td className="px-3 py-3 text-sm text-neutral-600">{a.location}</td>
                  <td className="px-3 py-3 text-sm text-neutral-900">{a.bookingCount}</td>
                  <td className="px-3 py-3 text-sm text-neutral-600">{a.daily_capacity > 0 ? a.daily_capacity.toLocaleString() : '-'}</td>
                  <td className="px-3 py-3 text-sm text-neutral-600">{a.programCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
