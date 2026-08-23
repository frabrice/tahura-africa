import { useState, useEffect } from 'react';
import { Inbox, Search, MapPin, ArrowLeft } from 'lucide-react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';

interface Submission {
  id: string;
  host_id: string;
  partner_id: string;
  listing_type: 'experience' | 'homestay' | 'itinerary';
  title: string;
  description: string;
  location: { name: string; region: string };
  pricing: { base_price: number; currency: string };
  media: string[];
  tags: string[];
  status: 'pending_review' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending_review: 'bg-sky-50 text-sky-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-rose-50 text-rose-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [hostNames, setHostNames] = useState<Record<string, string>>({});
  const [partnerNames, setPartnerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('all');
  const [selected, setSelected] = useState<Submission | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('listing_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    const rows = data || [];
    setSubmissions(rows);

    const hostIds = [...new Set(rows.map(r => r.host_id))];
    const partnerIds = [...new Set(rows.map(r => r.partner_id))];
    const [hostsRes, partnersRes] = await Promise.all([
      hostIds.length ? supabase.from('partner_hosts').select('id, name').in('id', hostIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      partnerIds.length ? supabase.from('portal_users').select('id, name').in('id', partnerIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ]);
    setHostNames(Object.fromEntries((hostsRes.data || []).map(h => [h.id, h.name])));
    setPartnerNames(Object.fromEntries((partnersRes.data || []).map(p => [p.id, p.name])));
    setLoading(false);
  }

  const filtered = submissions
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
    .filter(s => {
      const q = filter.toLowerCase();
      return !q || s.title.toLowerCase().includes(q) ||
        (hostNames[s.host_id] || '').toLowerCase().includes(q) ||
        (partnerNames[s.partner_id] || '').toLowerCase().includes(q);
    });

  const pendingCount = submissions.filter(s => s.status === 'pending_review').length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Submissions
        </button>
        <Card className="overflow-hidden max-w-2xl">
          {selected.media[0] && <img src={selected.media[0]} alt="" className="w-full h-52 object-cover" />}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[selected.status]}`}>
                {STATUS_LABELS[selected.status]}
              </span>
              <span className="text-xs text-neutral-400 capitalize">{selected.listing_type}</span>
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-3">{selected.title}</h2>
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div className="p-3 bg-neutral-50 rounded-lg">
                <span className="text-neutral-500">Host</span>
                <div className="text-neutral-900 font-medium">{hostNames[selected.host_id] || 'Unknown'}</div>
              </div>
              <div className="p-3 bg-neutral-50 rounded-lg">
                <span className="text-neutral-500">Partner</span>
                <div className="text-neutral-900 font-medium">{partnerNames[selected.partner_id] || 'Unknown'}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-neutral-500 mb-4">
              <MapPin className="w-3.5 h-3.5" />
              {selected.location?.name}, {selected.location?.region}
            </div>
            <p className="text-sm text-neutral-700 leading-relaxed mb-4">{selected.description}</p>
            <div className="text-xs text-neutral-500 mb-2">
              Submitted {new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {selected.reviewed_at && ` · Reviewed ${new Date(selected.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </div>
            {selected.status === 'rejected' && selected.rejection_reason && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3">
                <strong>Partner's feedback:</strong> {selected.rejection_reason}
              </p>
            )}
            <p className="text-xs text-neutral-400 mt-4 italic">
              This is a read-only view — approving or rejecting happens on the partner's own dashboard.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Submissions</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Listings hosts have proposed to their partners — {pendingCount} awaiting partner review</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by title, host, partner..."
            className="pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 w-64"
          />
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit mb-4">
        {(['all', 'pending_review', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter === s ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Listing</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Host</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Partner</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Type</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-neutral-500">
                    {filter || statusFilter !== 'all' ? 'No submissions match your filter' : 'No submissions yet'}
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id} onClick={() => setSelected(s)} className="hover:bg-neutral-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900">{s.title}</td>
                    <td className="px-4 py-3 text-neutral-600">{hostNames[s.host_id] || '-'}</td>
                    <td className="px-4 py-3 text-neutral-600">{partnerNames[s.partner_id] || '-'}</td>
                    <td className="px-4 py-3 text-neutral-600 capitalize">{s.listing_type}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLES[s.status]}`}>
                        {STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {submissions.length === 0 && (
        <Card className="p-12 text-center mt-4">
          <Inbox className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <div className="text-sm font-medium text-neutral-900 mb-1">No submissions yet</div>
          <div className="text-xs text-neutral-500">Once a host submits a listing for their partner's review, it'll show up here.</div>
        </Card>
      )}
    </div>
  );
}
