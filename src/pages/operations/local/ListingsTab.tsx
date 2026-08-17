import { useState, useEffect } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { Card } from '../../../components/Card';
import { supabase } from '../../../lib/supabase';
import { ListingDetailView } from '../manage/ListingDetailView';

const TYPE_BADGE: Record<string, string> = {
  experience: 'bg-amber-100 text-amber-700',
  homestay: 'bg-rose-100 text-rose-700',
  itinerary: 'bg-violet-100 text-violet-700',
};

export function ListingsTab() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('partner_listings')
      .select('id, title, listing_type, status, host_id, partner:portal_users!partner_listings_partner_id_fkey(name)')
      .order('created_at', { ascending: false });

    if (!data) { setListings([]); setLoading(false); return; }

    const hostIds = [...new Set(data.filter(l => l.host_id).map(l => l.host_id as string))];
    const { data: hosts } = hostIds.length
      ? await supabase.from('partner_hosts').select('id, name').in('id', hostIds)
      : { data: [] as { id: string; name: string }[] };
    const hostNameById = new Map((hosts || []).map(h => [h.id, h.name]));

    setListings(data.map((l: any) => ({ ...l, hostName: l.host_id ? hostNameById.get(l.host_id) || 'Unknown host' : null })));
    setLoading(false);
  }

  if (selectedId) {
    return <ListingDetailView listingId={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
  }

  const filtered = listings.filter(l => {
    const q = filter.toLowerCase();
    return !q || l.title.toLowerCase().includes(q) || (l.partner?.name || '').toLowerCase().includes(q) || (l.hostName || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-neutral-500">{listings.length} listing{listings.length !== 1 ? 's' : ''}</div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by title, partner, or host..."
            className="pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 w-72"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Partner</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Host</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-neutral-500">
                    {filter ? 'No listings match your filter' : 'No listings yet'}
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.id} onClick={() => setSelectedId(l.id)} className="hover:bg-neutral-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900">{l.title}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${TYPE_BADGE[l.listing_type] || 'bg-neutral-100 text-neutral-600'}`}>{l.listing_type}</span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{l.partner?.name || '-'}</td>
                    <td className="px-4 py-3 text-neutral-600">{l.hostName || <span className="text-neutral-400">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        l.status === 'active' ? 'bg-green-50 text-green-700' : l.status === 'paused' ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-3 py-3"><ChevronRight className="w-3.5 h-3.5 text-neutral-400" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
