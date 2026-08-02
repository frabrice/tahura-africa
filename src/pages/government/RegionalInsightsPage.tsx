import { useState, useEffect } from 'react';
import { Download, Map } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';

interface RegionRow {
  region: string;
  attractions: number;
  bookings: number;
}

export function RegionalInsightsPage() {
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('institution_profiles')
      .select('portal_user_id, location')
      .eq('published', true);

    if (!profiles || profiles.length === 0) {
      setRegions([]);
      setLoading(false);
      return;
    }

    const regionMap: Record<string, { attractions: number; portalIds: string[] }> = {};
    profiles.forEach(p => {
      const loc = p.location || 'Unknown';
      if (!regionMap[loc]) regionMap[loc] = { attractions: 0, portalIds: [] };
      regionMap[loc].attractions += 1;
      regionMap[loc].portalIds.push(p.portal_user_id);
    });

    const allPortalIds = profiles.map(p => p.portal_user_id);
    const { data: bookings } = await supabase
      .from('bookings')
      .select('institution_id')
      .in('institution_id', allPortalIds)
      .eq('booking_type', 'attraction');

    const bookingByPortal: Record<string, number> = {};
    (bookings || []).forEach((b: any) => {
      bookingByPortal[b.institution_id] = (bookingByPortal[b.institution_id] || 0) + 1;
    });

    const rows: RegionRow[] = Object.entries(regionMap).map(([region, info]) => ({
      region,
      attractions: info.attractions,
      bookings: info.portalIds.reduce((s, id) => s + (bookingByPortal[id] || 0), 0),
    })).sort((a, b) => b.bookings - a.bookings);

    setRegions(rows);
    setLoading(false);
  }

  const totalBookings = regions.reduce((s, r) => s + r.bookings, 0);
  const totalAttractions = regions.reduce((s, r) => s + r.attractions, 0);

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
        <h1 className="text-lg font-medium text-neutral-900">Regional Insights</h1>
        <Button variant="secondary" size="sm" onClick={() => {}}>
          <Download className="w-4 h-4 mr-1.5" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 bg-blue-50">
          <div className="text-xs text-neutral-500 mb-1">Active Regions</div>
          <div className="text-2xl font-medium text-neutral-900">{regions.length}</div>
        </Card>
        <Card className="p-5 bg-emerald-50">
          <div className="text-xs text-neutral-500 mb-1">Total Attractions</div>
          <div className="text-2xl font-medium text-neutral-900">{totalAttractions}</div>
        </Card>
        <Card className="p-5 bg-amber-50">
          <div className="text-xs text-neutral-500 mb-1">Attraction Bookings</div>
          <div className="text-2xl font-medium text-neutral-900">{totalBookings.toLocaleString()}</div>
        </Card>
      </div>

      <Card className="p-5 mb-8 bg-neutral-50">
        <div className="flex items-center gap-3 mb-4">
          <Map className="w-4 h-4 text-neutral-500" />
          <h3 className="text-sm font-medium text-neutral-900">Regional Distribution</h3>
        </div>
        {regions.length === 0 ? (
          <p className="text-sm text-neutral-500 py-8 text-center">No regional data available</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Region / Location</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Attractions</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Bookings</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {regions.map(region => {
                const pct = totalBookings > 0 ? ((region.bookings / totalBookings) * 100) : 0;
                return (
                  <tr key={region.region} className="hover:bg-neutral-50">
                    <td className="px-3 py-3 text-sm text-neutral-900">{region.region}</td>
                    <td className="px-3 py-3 text-sm text-neutral-600">{region.attractions}</td>
                    <td className="px-3 py-3 text-sm text-neutral-900">{region.bookings.toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-neutral-100 h-1.5">
                          <div className="h-1.5 bg-blue-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm text-neutral-600">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-5 bg-teal-50">
        <h3 className="text-sm font-medium text-neutral-900 mb-3">About Regional Data</h3>
        <div className="text-xs text-neutral-600 leading-relaxed space-y-2">
          <p>
            Regional data is aggregated from published institution profiles and their associated booking activity.
            Regions are determined by the location set by each institution.
          </p>
          <p>
            This data helps identify tourism concentration patterns and opportunities for regional development
            across the Tahura platform.
          </p>
        </div>
      </Card>
    </div>
  );
}
