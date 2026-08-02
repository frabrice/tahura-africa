import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';

interface ListingRow {
  id: string;
  title: string;
  type: string;
  provider_name: string;
  price_per_night: number;
  created_at: string;
}

export function QualityPage() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ListingRow | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from('partner_listings')
      .select('id, title, type, provider_name, price_per_night, created_at')
      .order('created_at', { ascending: false });
    setListings(data || []);
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
          &larr; Back to Quality & Moderation
        </button>
        <h1 className="text-lg font-medium text-neutral-900 mb-6">{selected.title}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Card className="p-5 bg-blue-50">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">Listing Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Partner</div>
                <div className="text-neutral-900">{selected.provider_name}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Type</div>
                <div className="text-neutral-900 capitalize">{selected.type}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Price</div>
                <div className="text-neutral-900">${selected.price_per_night}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Created</div>
                <div className="text-neutral-900">{new Date(selected.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-amber-50">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">Moderation Actions</h3>
            <p className="text-xs text-neutral-600 mb-4">
              Review and manage this listing. All actions are logged in the audit trail.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors">
                Approve Listing
              </button>
              <button className="px-4 py-2 text-xs font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors">
                Request Changes
              </button>
              <button className="px-4 py-2 text-xs font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors text-red-600">
                Remove Listing
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const experienceCount = listings.filter(l => l.type === 'experience').length;
  const homestayCount = listings.filter(l => l.type === 'homestay').length;

  return (
    <div>
      <h1 className="text-lg font-medium text-neutral-900 mb-6">Quality & Moderation</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <Card className="p-4 bg-blue-50">
          <div className="text-xs text-neutral-500 mb-1">Total Listings</div>
          <div className="text-xl font-medium text-neutral-900">{listings.length}</div>
        </Card>
        <Card className="p-4 bg-cyan-50">
          <div className="text-xs text-neutral-500 mb-1">Experiences</div>
          <div className="text-xl font-medium text-neutral-900">{experienceCount}</div>
        </Card>
        <Card className="p-4 bg-lime-50">
          <div className="text-xs text-neutral-500 mb-1">Homestays</div>
          <div className="text-xl font-medium text-neutral-900">{homestayCount}</div>
        </Card>
      </div>

      {listings.length === 0 ? (
        <Card className="p-12 text-center bg-neutral-50">
          <p className="text-sm text-neutral-500">No listings to review</p>
        </Card>
      ) : (
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <Card className="bg-pink-50 min-w-[600px] md:min-w-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Listing</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Partner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {listings.map(listing => (
                  <tr key={listing.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm text-neutral-900">{listing.title}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{listing.provider_name}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600 capitalize">{listing.type}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">${listing.price_per_night}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{new Date(listing.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(listing)} className="text-xs text-neutral-900 hover:underline">
                        Review
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
