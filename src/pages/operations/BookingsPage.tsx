import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { TransportRequestCard } from '../../components/TransportRequestCard';
import { Calendar, Users, X, Search, Car, Mail, Clock } from 'lucide-react';

interface OpsBooking {
  id: string;
  booking_ref: string;
  traveler_name: string;
  traveler_email: string;
  booking_type: string;
  item_title: string;
  booking_date: string;
  guests: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  status: string;
  payment_status: string;
  special_requests: string | null;
  host_id: string | null;
  guide_id: string | null;
  partner_id: string | null;
  institution_id: string | null;
  session: string | null;
  transport_requested: boolean;
  transport_id: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-sky-50 text-sky-700 border-sky-200',
  cancelled: 'bg-neutral-100 text-neutral-500 border-neutral-200',
};

const TYPE_STYLE: Record<string, string> = {
  experience: 'bg-orange-50 text-orange-700',
  homestay: 'bg-sky-50 text-sky-700',
  attraction: 'bg-teal-50 text-teal-700',
  itinerary: 'bg-amber-50 text-amber-700',
};

function BookingDetailDrawer({ booking, recipientName, recipientLabel, onClose }: {
  booking: OpsBooking; recipientName: string | null; recipientLabel: string; onClose: () => void;
}) {
  const initial = (booking.traveler_name || '?').charAt(0).toUpperCase();

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        <div className="px-8 py-6 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono text-neutral-500 mb-1">{booking.booking_ref}</p>
              <h3 className="text-xl font-semibold text-neutral-900">{booking.item_title}</h3>
            </div>
            <button onClick={onClose} className="p-2 -mt-1 -mr-1 hover:bg-neutral-200 rounded-lg transition-colors">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${STATUS_STYLE[booking.status] || STATUS_STYLE.cancelled}`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_STYLE[booking.booking_type] || 'bg-neutral-100 text-neutral-600'}`}>
              {booking.booking_type.charAt(0).toUpperCase() + booking.booking_type.slice(1)}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              booking.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
              booking.payment_status === 'failed' ? 'bg-red-50 text-red-700' :
              'bg-amber-50 text-amber-700'
            }`}>
              {booking.payment_status === 'paid' ? 'Paid' : booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
            </span>
            {booking.transport_requested && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-teal-50 text-teal-700">
                <Car className="w-3 h-3" /> Transport
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-neutral-200 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Traveler</h4>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{booking.traveler_name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                    <span className="text-xs text-neutral-500 truncate">{booking.traveler_email}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">{recipientLabel}</h4>
              <p className="text-sm font-medium text-neutral-900">{recipientName || 'Unassigned'}</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Booking Info</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 border border-neutral-200 rounded-xl px-4 py-3">
                <Calendar className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500">Date</p>
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 border border-neutral-200 rounded-xl px-4 py-3">
                <Users className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500">Guests</p>
                  <p className="text-sm font-medium text-neutral-900">{booking.guests}</p>
                </div>
              </div>
              {booking.session && (
                <div className="flex items-center gap-2.5 border border-neutral-200 rounded-xl px-4 py-3">
                  <Clock className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">Session</p>
                    <p className="text-sm font-medium text-neutral-900 capitalize">{booking.session}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5 border border-neutral-200 rounded-xl px-4 py-3">
                <Clock className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500">Booked on</p>
                  <p className="text-sm font-medium text-neutral-900">
                    {new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Payment Summary</h4>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Subtotal</span>
                <span className="text-neutral-900">${Number(booking.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Service fee</span>
                <span className="text-neutral-900">${Number(booking.service_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-2.5 border-t border-neutral-200">
                <span className="text-neutral-900">Total</span>
                <span className="text-emerald-600">${Number(booking.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {booking.transport_requested && booking.transport_id && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Transport</h4>
              <TransportRequestCard transportId={booking.transport_id} />
            </div>
          )}

          {booking.special_requests && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Special Requests</h4>
              <p className="text-sm text-neutral-700 bg-amber-50 rounded-xl p-4 border border-amber-100 leading-relaxed">{booking.special_requests}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function BookingsPage() {
  const [bookings, setBookings] = useState<OpsBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [transportOnly, setTransportOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<OpsBooking | null>(null);
  const [hosts, setHosts] = useState<Record<string, string>>({});
  const [guides, setGuides] = useState<Record<string, string>>({});
  const [partners, setPartners] = useState<Record<string, string>>({});
  const [institutions, setInstitutions] = useState<Record<string, string>>({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    // Every booking across the whole platform — Ops is the one place that
    // needs to see all of it at once, unlike Host/Guide/Partner's own scoped
    // views. Capped at 500 most recent for now; worth paginating once volume
    // grows past that.
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_ref, traveler_name, traveler_email, booking_type, item_title, booking_date, guests, subtotal, service_fee, total_amount, status, payment_status, special_requests, host_id, guide_id, partner_id, institution_id, session, transport_requested, transport_id, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    const rows = data || [];
    setBookings(rows);

    const hostIds = [...new Set(rows.filter(r => r.host_id).map(r => r.host_id as string))];
    const guideIds = [...new Set(rows.filter(r => r.guide_id).map(r => r.guide_id as string))];
    const partnerIds = [...new Set(rows.filter(r => r.partner_id).map(r => r.partner_id as string))];
    const institutionIds = [...new Set(rows.filter(r => r.institution_id).map(r => r.institution_id as string))];

    const [hostsRes, guidesRes, partnersRes, institutionsRes] = await Promise.all([
      hostIds.length ? supabase.from('partner_hosts').select('id, name').in('id', hostIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      guideIds.length ? supabase.from('guides').select('id, name').in('id', guideIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      partnerIds.length ? supabase.from('portal_users').select('id, name').in('id', partnerIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      institutionIds.length ? supabase.from('institution_profiles').select('portal_user_id, name').in('portal_user_id', institutionIds) : Promise.resolve({ data: [] as { portal_user_id: string; name: string }[] }),
    ]);
    setHosts(Object.fromEntries((hostsRes.data || []).map((h: any) => [h.id, h.name])));
    setGuides(Object.fromEntries((guidesRes.data || []).map((g: any) => [g.id, g.name])));
    setPartners(Object.fromEntries((partnersRes.data || []).map((p: any) => [p.id, p.name])));
    setInstitutions(Object.fromEntries((institutionsRes.data || []).map((i: any) => [i.portal_user_id, i.name])));
    setLoading(false);
  }

  const recipientFor = (b: OpsBooking): { name: string | null; label: string } => {
    if (b.institution_id) return { name: institutions[b.institution_id] || null, label: 'Attraction' };
    if (b.guide_id) return { name: guides[b.guide_id] || null, label: 'Guide' };
    if (b.host_id) return { name: hosts[b.host_id] || null, label: 'Host' };
    if (b.partner_id) return { name: partners[b.partner_id] || null, label: 'Partner' };
    return { name: null, label: 'Recipient' };
  };

  const searchLower = search.trim().toLowerCase();
  const filtered = bookings
    .filter(b => filterStatus === 'all' || b.status === filterStatus)
    .filter(b => !transportOnly || b.transport_requested)
    .filter(b => !searchLower || [b.booking_ref, b.traveler_name, b.item_title].some(s => s?.toLowerCase().includes(searchLower)));

  const transportCount = bookings.filter(b => b.transport_requested).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Bookings</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Every booking across the platform — experiences, homestays, attractions, and journeys</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reference, traveler, listing…"
            className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:border-neutral-400"
          />
        </div>
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl">
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${filterStatus === status ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              {status}
            </button>
          ))}
        </div>
        <button
          onClick={() => setTransportOnly(!transportOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
            transportOnly ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          Transport Requested ({transportCount})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Calendar className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">No bookings match this filter</p>
        </Card>
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Traveler</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Listing</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map(booking => (
                <tr key={booking.id} onClick={() => setSelected(booking)} className="hover:bg-neutral-50 cursor-pointer">
                  <td className="px-4 py-3 text-xs text-neutral-500 font-mono">{booking.booking_ref}</td>
                  <td className="px-4 py-3 text-sm text-neutral-900">{booking.traveler_name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[180px]">{booking.item_title}</span>
                      {booking.transport_requested && (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-teal-100 text-teal-700">
                          <Car className="w-2.5 h-2.5" /> Transport
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {new Date(booking.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-900">${Number(booking.total_amount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full border ${STATUS_STYLE[booking.status] || STATUS_STYLE.cancelled}`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(booking)}
                      className="text-xs font-medium text-neutral-900 hover:text-neutral-600 transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {selected && (() => {
        const { name, label } = recipientFor(selected);
        return <BookingDetailDrawer booking={selected} recipientName={name} recipientLabel={label} onClose={() => setSelected(null)} />;
      })()}
    </div>
  );
}
