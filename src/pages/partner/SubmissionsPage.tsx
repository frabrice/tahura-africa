import { useState, useEffect } from 'react';
import { Inbox, MapPin, Check, X, ArrowLeft, Clock } from 'lucide-react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

interface Submission {
  id: string;
  host_id: string;
  partner_id: string;
  listing_type: 'experience' | 'homestay' | 'itinerary';
  title: string;
  description: string;
  location: { name: string; region: string };
  pricing: { base_price: number; currency: string };
  details: any;
  media: string[];
  whats_included: string[];
  what_to_bring: string[];
  tags: string[];
  itinerary_days: any;
  status: 'pending_review' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending_review: 'bg-sky-100 text-sky-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function SubmissionsPage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [hostNames, setHostNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending_review' | 'approved' | 'rejected' | 'all'>('pending_review');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => { if (userId) load(); }, [userId]);

  async function load() {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('listing_submissions')
      .select('*')
      .eq('partner_id', userId)
      .order('created_at', { ascending: false });
    const rows = data || [];
    setSubmissions(rows);

    const hostIds = [...new Set(rows.map(r => r.host_id))];
    if (hostIds.length > 0) {
      const { data: hosts } = await supabase.from('partner_hosts').select('id, name').in('id', hostIds);
      setHostNames(Object.fromEntries((hosts || []).map(h => [h.id, h.name])));
    }
    setLoading(false);
  }

  async function approve(submission: Submission) {
    setDeciding(true);
    try {
      const { data: newListing, error: insertError } = await supabase.from('partner_listings').insert({
        partner_id: submission.partner_id,
        host_id: submission.host_id,
        listing_type: submission.listing_type,
        title: submission.title,
        description: submission.description,
        location: submission.location,
        pricing: submission.pricing,
        details: submission.details,
        media: submission.media,
        whats_included: submission.whats_included,
        what_to_bring: submission.what_to_bring,
        tags: submission.tags,
        status: 'active',
        ...(submission.listing_type === 'itinerary' && { itinerary_days: submission.itinerary_days }),
      }).select('id').single();

      if (insertError || !newListing) throw insertError;

      await supabase.from('listing_submissions').update({
        status: 'approved',
        resulting_listing_id: newListing.id,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      }).eq('id', submission.id);

      setSelected(null);
      await load();
    } catch (err) {
      console.error(err);
      alert('Failed to approve submission. Please try again.');
    }
    setDeciding(false);
  }

  async function reject(submission: Submission) {
    const reason = window.prompt(`Why are you rejecting "${submission.title}"? This is shown to the host.`);
    if (reason === null) return;
    setDeciding(true);
    try {
      await supabase.from('listing_submissions').update({
        status: 'rejected',
        rejection_reason: reason.trim() || null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      }).eq('id', submission.id);
      setSelected(null);
      await load();
    } catch (err) {
      console.error(err);
    }
    setDeciding(false);
  }

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter);
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
          {selected.media[0] && (
            <img src={selected.media[0]} alt="" className="w-full h-52 object-cover" />
          )}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[selected.status]}`}>
                {STATUS_LABELS[selected.status]}
              </span>
              <span className="text-xs text-neutral-400 capitalize">{selected.listing_type}</span>
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">{selected.title}</h2>
            <p className="text-xs text-neutral-500 mb-1">From host: <span className="font-medium text-neutral-700">{hostNames[selected.host_id] || 'Unknown'}</span></p>
            <div className="flex items-center gap-1 text-xs text-neutral-500 mb-4">
              <MapPin className="w-3.5 h-3.5" />
              {selected.location?.name}, {selected.location?.region}
            </div>

            <p className="text-sm text-neutral-700 leading-relaxed mb-4">{selected.description}</p>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div className="p-3 bg-neutral-50 rounded-lg">
                <span className="text-neutral-500">Price</span>
                <div className="text-neutral-900 font-medium">${selected.pricing?.base_price} {selected.pricing?.currency}</div>
              </div>
              <div className="p-3 bg-neutral-50 rounded-lg">
                <span className="text-neutral-500">Photos</span>
                <div className="text-neutral-900 font-medium">{selected.media.length}</div>
              </div>
            </div>

            {selected.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selected.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded-full">#{t}</span>
                ))}
              </div>
            )}

            {selected.status === 'rejected' && selected.rejection_reason && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3 mb-4">
                <strong>Your feedback:</strong> {selected.rejection_reason}
              </p>
            )}

            {selected.status === 'pending_review' && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => reject(selected)}
                  disabled={deciding}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => approve(selected)}
                  disabled={deciding}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {deciding ? 'Approving...' : 'Approve'}
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Submissions</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Listings your hosts have proposed, waiting on your review</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit mb-6">
        {([
          { id: 'pending_review' as const, label: `Pending (${pendingCount})` },
          { id: 'approved' as const, label: 'Approved' },
          { id: 'rejected' as const, label: 'Rejected' },
          { id: 'all' as const, label: 'All' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${filter === t.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Inbox className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <div className="text-sm font-medium text-neutral-900 mb-1">Nothing here</div>
          <div className="text-xs text-neutral-500">No submissions match this filter.</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(s => (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-warm-sm hover:shadow-warm transition-all duration-300 cursor-pointer"
            >
              <div className="relative h-36 bg-neutral-100">
                {s.media[0] ? (
                  <img src={s.media[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                    <Inbox className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-neutral-900 mb-1 truncate">{s.title}</h3>
                <p className="text-xs text-neutral-500 mb-2">From {hostNames[s.host_id] || 'a host'}</p>
                <div className="flex items-center gap-1 text-xs text-neutral-400 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{s.location?.name}, {s.location?.region}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-800">${s.pricing?.base_price ?? 0}</span>
                  {s.status === 'pending_review' && (
                    <span className="flex items-center gap-1 text-sky-600">
                      <Clock className="w-3 h-3" />
                      Needs review
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
