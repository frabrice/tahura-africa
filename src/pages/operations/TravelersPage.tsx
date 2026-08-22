import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Users, Calendar, Star, LifeBuoy } from 'lucide-react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { ReviewsList, type NormalizedReview } from '../../components/ReviewsList';

interface TravelerSummary {
  traveler_id: string;
  traveler_name: string;
  traveler_email: string;
  booking_count: number;
}

interface TravelerBooking {
  id: string;
  booking_ref: string;
  item_title: string;
  booking_type: string;
  booking_date: string;
  total_amount: number;
  status: string;
  payment_status: string;
}

interface TravelerTicket {
  id: string;
  ticket_ref: string;
  subject: string;
  status: string;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  completed: 'bg-sky-50 text-sky-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
};

export function TravelersPage() {
  const [travelers, setTravelers] = useState<TravelerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<TravelerSummary | null>(null);
  const [bookings, setBookings] = useState<TravelerBooking[]>([]);
  const [reviews, setReviews] = useState<NormalizedReview[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<NormalizedReview[]>([]);
  const [tickets, setTickets] = useState<TravelerTicket[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'bookings' | 'reviews' | 'tickets'>('bookings');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    // No public travelers table exists (they're Supabase Auth identities
    // only) - the roster here is "travelers who've actually booked
    // something", built from what's already denormalized on bookings,
    // rather than a raw Auth-user dump that would also include every
    // host/guide's own linked traveler account.
    const { data } = await supabase
      .from('bookings')
      .select('traveler_id, traveler_name, traveler_email')
      .not('traveler_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(2000);

    const byId = new Map<string, TravelerSummary>();
    (data || []).forEach((b: any) => {
      const existing = byId.get(b.traveler_id);
      if (existing) existing.booking_count += 1;
      else byId.set(b.traveler_id, { traveler_id: b.traveler_id, traveler_name: b.traveler_name, traveler_email: b.traveler_email, booking_count: 1 });
    });
    setTravelers(Array.from(byId.values()).sort((a, b) => b.booking_count - a.booking_count));
    setLoading(false);
  }

  async function openTraveler(t: TravelerSummary) {
    setSelected(t);
    setDetailTab('bookings');
    setDetailLoading(true);

    const { data: travelerBookings } = await supabase
      .from('bookings')
      .select('id, booking_ref, item_title, booking_type, booking_date, total_amount, status, payment_status')
      .eq('traveler_id', t.traveler_id)
      .order('booking_date', { ascending: false });
    setBookings(travelerBookings || []);

    const bookingIds = (travelerBookings || []).map(b => b.id);

    const [reviewsRes, attractionReviewsRes, receivedRes, ticketsRes] = await Promise.all([
      bookingIds.length ? supabase.from('reviews').select('id, reviewer_name, reviewer_profile_picture, rating, review_text, created_at').in('booking_id', bookingIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      supabase.from('attraction_reviews').select('id, reviewer_name, reviewer_profile_picture, rating, review_text, created_at').eq('traveler_id', t.traveler_id).order('created_at', { ascending: false }),
      supabase.from('traveler_reviews').select('id, reviewer_name, reviewer_profile_picture, rating, review_text, created_at, reviewer_type').eq('traveler_id', t.traveler_id).order('created_at', { ascending: false }),
      supabase.from('support_tickets').select('id, ticket_ref, subject, status, created_at').eq('created_by_auth_id', t.traveler_id).order('created_at', { ascending: false }),
    ]);

    setReviews([
      ...(reviewsRes.data || []).map((r: any) => ({ ...r, badge: 'Wrote about a listing' })),
      ...(attractionReviewsRes.data || []).map((r: any) => ({ ...r, badge: 'Wrote about an attraction' })),
    ]);
    setReceivedReviews((receivedRes.data || []).map((r: any) => ({
      ...r, badge: r.reviewer_type === 'host' ? 'From a Host' : 'From a Guide',
    })));
    setTickets(ticketsRes.data || []);
    setDetailLoading(false);
  }

  const filtered = travelers.filter(t => {
    const q = filter.toLowerCase();
    return !q || t.traveler_name?.toLowerCase().includes(q) || t.traveler_email?.toLowerCase().includes(q);
  });

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
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Travelers
        </button>

        <Card className="p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center text-lg font-semibold flex-shrink-0">
              {(selected.traveler_name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">{selected.traveler_name}</h2>
              <p className="text-xs text-neutral-500">{selected.traveler_email}</p>
            </div>
          </div>
        </Card>

        <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit mb-6">
          <button onClick={() => setDetailTab('bookings')} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all ${detailTab === 'bookings' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            <Calendar className="w-3.5 h-3.5" /> Bookings ({bookings.length})
          </button>
          <button onClick={() => setDetailTab('reviews')} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all ${detailTab === 'reviews' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            <Star className="w-3.5 h-3.5" /> Reviews ({reviews.length + receivedReviews.length})
          </button>
          <button onClick={() => setDetailTab('tickets')} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all ${detailTab === 'tickets' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            <LifeBuoy className="w-3.5 h-3.5" /> Tickets ({tickets.length})
          </button>
        </div>

        {detailLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
          </div>
        ) : detailTab === 'bookings' ? (
          bookings.length === 0 ? (
            <Card className="p-10 text-center bg-neutral-50"><p className="text-sm text-neutral-400">No bookings yet</p></Card>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Reference</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Listing</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Amount</th>
                    <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {bookings.map(b => (
                    <tr key={b.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-mono text-neutral-500">{b.booking_ref}</td>
                      <td className="px-4 py-3 text-neutral-900">{b.item_title}</td>
                      <td className="px-4 py-3 text-neutral-600">{new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-4 py-3 text-neutral-900">${Number(b.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[b.status] || STATUS_STYLE.cancelled}`}>{b.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )
        ) : detailTab === 'reviews' ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Written by this traveler</h3>
              <ReviewsList reviews={reviews} emptyText="Hasn't written any reviews yet" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">About this traveler</h3>
              <ReviewsList reviews={receivedReviews} emptyText="No reviews about this traveler yet" />
            </div>
          </div>
        ) : (
          tickets.length === 0 ? (
            <Card className="p-10 text-center bg-neutral-50"><p className="text-sm text-neutral-400">No support tickets</p></Card>
          ) : (
            <div className="space-y-2">
              {tickets.map(t => (
                <Card key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{t.subject}</p>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">{t.ticket_ref}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${STATUS_STYLE[t.status] || 'bg-neutral-100 text-neutral-500'}`}>{t.status.replace('_', ' ')}</span>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <Users className="w-4 h-4" /> Travelers
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">Everyone who's booked on the platform — their bookings, reviews, and support history</p>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search name or email..."
          className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200"
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left px-4 py-3 font-medium text-neutral-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-600">Email</th>
              <th className="text-center px-4 py-3 font-medium text-neutral-600">Bookings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-10 text-neutral-500">No travelers match this filter</td></tr>
            ) : (
              filtered.map(t => (
                <tr key={t.traveler_id} onClick={() => openTraveler(t)} className="hover:bg-neutral-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-neutral-900">{t.traveler_name}</td>
                  <td className="px-4 py-3 text-neutral-600">{t.traveler_email}</td>
                  <td className="px-4 py-3 text-center text-neutral-900">{t.booking_count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
