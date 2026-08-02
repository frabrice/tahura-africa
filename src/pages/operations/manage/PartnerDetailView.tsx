import { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, Calendar, Users, TrendingUp, ChevronRight, Flag, Layers } from 'lucide-react';
import { Card } from '../../../components/Card';
import { supabase } from '../../../lib/supabase';

interface Props {
  partnerId: string;
  onBack: () => void;
  onSelectListing: (id: string) => void;
}

interface PartnerData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  contact_person?: string;
  country?: string;
  province?: string;
  specific_location?: string;
  specialty?: string;
  tags?: string[];
  is_active: boolean;
  user_id_code: string;
  created_at: string;
}

interface Booking {
  id: string;
  booking_date: string;
  guests: number;
  total_amount: number;
  commission_amount: number;
  status: string;
  item_title: string;
  booking_type: string;
  booking_ref: string;
  traveler_name: string;
  created_at: string;
}

type Period = '30d' | '90d' | 'all';

export function PartnerDetailView({ partnerId, onBack, onSelectListing }: Props) {
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [hosts, setHosts] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [activeSection, setActiveSection] = useState<'stats' | 'hosts' | 'listings'>('stats');

  useEffect(() => {
    loadData();
  }, [partnerId]);

  async function loadData() {
    setLoading(true);
    const [partnerRes, hostsRes, listingsRes, bookingsRes] = await Promise.all([
      supabase.from('portal_users').select('id, portal_type, email, user_id_code, name, phone, contact_person, country, province, specific_location, specialty, tags, is_active, created_at, created_by, updated_at').eq('id', partnerId).maybeSingle(),
      supabase.from('partner_hosts').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }),
      supabase.from('partner_listings').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').eq('partner_id', partnerId).order('booking_date', { ascending: false }),
    ]);

    if (partnerRes.data) setPartner(partnerRes.data);
    setHosts(hostsRes.data || []);
    setListings(listingsRes.data || []);
    setBookings(bookingsRes.data || []);
    setLoading(false);
  }

  if (loading || !partner) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const cutoff = period === '30d'
    ? new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
    : period === '90d'
    ? new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0]
    : '2000-01-01';

  const filtered = bookings.filter(b => (b.booking_date || '').split('T')[0] >= cutoff);
  const active = filtered.filter(b => b.status !== 'cancelled');
  const completed = filtered.filter(b => b.status === 'completed');

  const totalRevenue = completed.reduce((s, b) => s + (b.total_amount || 0), 0);
  const totalCommission = completed.reduce((s, b) => s + (b.commission_amount || 0), 0);
  const totalGuests = active.reduce((s, b) => s + (b.guests || 0), 0);
  const avgBookingValue = active.length > 0 ? totalRevenue / active.length : 0;
  const completionRate = active.length > 0 ? Math.round((completed.length / active.length) * 100) : 0;
  const cancelledCount = filtered.filter(b => b.status === 'cancelled').length;
  const cancelRate = filtered.length > 0 ? Math.round((cancelledCount / filtered.length) * 100) : 0;

  const experienceBookings = active.filter(b => b.booking_type === 'experience').length;
  const homestayBookings = active.filter(b => b.booking_type === 'homestay').length;
  const expPct = active.length > 0 ? Math.round((experienceBookings / active.length) * 100) : 0;

  const monthMap = new Map<string, { label: string; revenue: number; bookings: number }>();
  active.forEach(b => {
    const d = new Date(b.booking_date);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const ex = monthMap.get(label) || { label, revenue: 0, bookings: 0 };
    monthMap.set(label, { label, revenue: ex.revenue + (b.total_amount || 0), bookings: ex.bookings + 1 });
  });
  const monthlyStats = Array.from(monthMap.values()).slice(-6).reverse();
  const maxMonthRev = monthlyStats.length > 0 ? Math.max(...monthlyStats.map(m => m.revenue), 1) : 1;

  const listingPerfMap = new Map<string, { title: string; revenue: number; bookings: number; id: string }>();
  active.forEach(b => {
    if (!b.item_title) return;
    const ex = listingPerfMap.get(b.item_title) || { title: b.item_title, revenue: 0, bookings: 0, id: '' };
    listingPerfMap.set(b.item_title, { ...ex, revenue: ex.revenue + (b.total_amount || 0), bookings: ex.bookings + 1 });
  });
  const listingPerf = Array.from(listingPerfMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const sections = [
    { id: 'stats' as const, label: 'Statistics' },
    { id: 'hosts' as const, label: `Hosts (${hosts.length})` },
    { id: 'listings' as const, label: `Listings (${listings.length})` },
  ];

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Partners
      </button>

      <Card className="p-5 mb-6 bg-slate-50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">{partner.name || 'Unnamed Partner'}</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{partner.email}</p>
          </div>
          <span className={`px-2.5 py-1 text-[10px] font-medium rounded ${
            partner.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
          }`}>
            {partner.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-neutral-500">Contact Person</span>
            <div className="text-neutral-900 font-medium mt-0.5">{partner.contact_person || '-'}</div>
          </div>
          <div>
            <span className="text-neutral-500">Phone</span>
            <div className="text-neutral-900 font-medium mt-0.5">{partner.phone || '-'}</div>
          </div>
          <div>
            <span className="text-neutral-500">Location</span>
            <div className="text-neutral-900 font-medium mt-0.5">
              {[partner.specific_location, partner.province, partner.country].filter(Boolean).join(', ') || '-'}
            </div>
          </div>
          <div>
            <span className="text-neutral-500">Specialty</span>
            <div className="text-neutral-900 font-medium mt-0.5">{partner.specialty || '-'}</div>
          </div>
          <div>
            <span className="text-neutral-500">User ID</span>
            <div className="text-neutral-900 font-medium mt-0.5 font-mono">{partner.user_id_code}</div>
          </div>
          <div>
            <span className="text-neutral-500">Joined</span>
            <div className="text-neutral-900 font-medium mt-0.5">
              {new Date(partner.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          {partner.tags && partner.tags.length > 0 && (
            <div className="col-span-2">
              <span className="text-neutral-500">Tags</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {partner.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px]">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="flex bg-neutral-100 p-1 rounded-lg gap-1 mb-6">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              activeSection === s.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'stats' && (
        <StatsSection
          period={period}
          onPeriodChange={setPeriod}
          totalRevenue={totalRevenue}
          totalCommission={totalCommission}
          totalGuests={totalGuests}
          avgBookingValue={avgBookingValue}
          activeCount={active.length}
          completionRate={completionRate}
          cancelRate={cancelRate}
          cancelledCount={cancelledCount}
          completedCount={completed.length}
          filtered={filtered}
          expPct={expPct}
          experienceBookings={experienceBookings}
          homestayBookings={homestayBookings}
          monthlyStats={monthlyStats}
          maxMonthRev={maxMonthRev}
          listingPerf={listingPerf}
        />
      )}

      {activeSection === 'hosts' && (
        <HostsSection hosts={hosts} listings={listings} />
      )}

      {activeSection === 'listings' && (
        <ListingsSection listings={listings} hosts={hosts} onSelectListing={onSelectListing} />
      )}
    </div>
  );
}

function StatsSection({
  period, onPeriodChange, totalRevenue, totalCommission, totalGuests, avgBookingValue,
  activeCount, completionRate, cancelRate, cancelledCount, completedCount,
  filtered, expPct, experienceBookings, homestayBookings,
  monthlyStats, maxMonthRev, listingPerf,
}: any) {
  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <div className="flex bg-neutral-100 p-1 rounded-lg gap-1">
          {(['30d', '90d', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {p === 'all' ? 'All time' : p === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 bg-emerald-50">
          <div className="flex items-center gap-2 mb-1.5">
            <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">Total Revenue</span>
          </div>
          <div className="text-xl font-semibold text-neutral-900">${totalRevenue.toLocaleString()}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">${totalCommission.toLocaleString()} commission</div>
        </Card>
        <Card className="p-4 bg-blue-50">
          <div className="flex items-center gap-2 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">Total Bookings</span>
          </div>
          <div className="text-xl font-semibold text-neutral-900">{activeCount}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">{completedCount} completed</div>
        </Card>
        <Card className="p-4 bg-teal-50">
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">Total Guests</span>
          </div>
          <div className="text-xl font-semibold text-neutral-900">{totalGuests.toLocaleString()}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">{activeCount > 0 ? (totalGuests / activeCount).toFixed(1) : 0} avg group</div>
        </Card>
        <Card className="p-4 bg-amber-50">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">Avg Booking Value</span>
          </div>
          <div className="text-xl font-semibold text-neutral-900">${avgBookingValue.toFixed(0)}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">per booking</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {monthlyStats.length > 0 && (
          <Card className="p-5 bg-blue-50">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-400" />
              Monthly Revenue
            </h3>
            <div className="space-y-2">
              {monthlyStats.map((month: any) => {
                const pct = Math.round((month.revenue / maxMonthRev) * 100);
                return (
                  <div key={month.label} className="flex items-center gap-4">
                    <div className="w-16 text-xs text-neutral-600 flex-shrink-0">{month.label}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-neutral-600">{month.bookings} bookings</span>
                        <span className="text-xs text-neutral-500">${month.revenue.toFixed(0)}</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div className="space-y-4">
          <Card className="p-5 bg-amber-50">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Booking Status</h3>
            <div className="space-y-3">
              {(['confirmed', 'pending', 'completed', 'cancelled'] as const).map(status => {
                const count = filtered.filter((b: any) => b.status === status).length;
                const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
                const colors: Record<string, string> = {
                  confirmed: 'bg-emerald-500',
                  pending: 'bg-amber-500',
                  completed: 'bg-blue-500',
                  cancelled: 'bg-neutral-300',
                };
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-neutral-700 capitalize">{status}</span>
                      <span className="text-xs text-neutral-500">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-neutral-100 h-2 rounded-full">
                      <div className={`h-2 rounded-full ${colors[status]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 bg-teal-50">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Booking Type Mix</h3>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-neutral-700">Experiences</span>
                  <span className="text-xs text-neutral-500">{experienceBookings} ({expPct}%)</span>
                </div>
                <div className="w-full bg-neutral-100 h-2 rounded-full">
                  <div className="h-2 rounded-full bg-amber-500" style={{ width: `${expPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-neutral-700">Homestays</span>
                  <span className="text-xs text-neutral-500">{homestayBookings} ({100 - expPct}%)</span>
                </div>
                <div className="w-full bg-neutral-100 h-2 rounded-full">
                  <div className="h-2 rounded-full bg-rose-500" style={{ width: `${100 - expPct}%` }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-5 bg-neutral-50">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">Performance Rates</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-600">Completion Rate</span>
                <span className="text-xs font-medium text-neutral-900">{completionRate}%</span>
              </div>
              <div className="w-full bg-neutral-100 h-3 rounded-full">
                <div className={`h-3 rounded-full ${completionRate >= 70 ? 'bg-emerald-500' : completionRate >= 40 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${completionRate}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-600">Cancellation Rate</span>
                <span className="text-xs font-medium text-neutral-900">{cancelRate}% ({cancelledCount})</span>
              </div>
              <div className="w-full bg-neutral-100 h-3 rounded-full">
                <div className={`h-3 rounded-full ${cancelRate <= 10 ? 'bg-emerald-500' : cancelRate <= 25 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${cancelRate}%` }} />
              </div>
            </div>
          </div>
        </Card>

        {listingPerf.length > 0 && (
          <Card className="p-5 bg-emerald-50">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Top Listings by Revenue</h3>
            <div className="space-y-3">
              {listingPerf.map((lp: any, i: number) => (
                <div key={lp.title} className="flex items-center justify-between py-1.5 border-b border-neutral-100 last:border-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[10px] text-neutral-400 w-4">#{i + 1}</span>
                    <span className="text-xs text-neutral-900 truncate">{lp.title}</span>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-xs font-medium text-neutral-900">${lp.revenue.toFixed(0)}</div>
                    <div className="text-[10px] text-neutral-500">{lp.bookings} bookings</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function HostsSection({ hosts, listings }: { hosts: any[]; listings: any[] }) {
  if (hosts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Users className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
        <div className="text-sm font-medium text-neutral-900 mb-1">No hosts</div>
        <div className="text-xs text-neutral-500">This partner has no registered hosts.</div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left px-4 py-3 font-medium text-neutral-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-600">Languages</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-600">Experience</th>
              <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
              <th className="text-center px-4 py-3 font-medium text-neutral-600">Listings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {hosts.map(h => {
              const assignedListings = listings.filter(l => l.host_id === h.id).length;
              return (
                <tr key={h.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {h.profile_picture ? (
                        <img src={h.profile_picture} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] text-neutral-500">
                          {(h.name || '?')[0]}
                        </div>
                      )}
                      <span className="font-medium text-neutral-900">{h.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{h.email || '-'}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {h.languages?.length > 0 ? h.languages.join(', ') : '-'}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {h.years_experience ? `${h.years_experience} yr${h.years_experience !== 1 ? 's' : ''}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      h.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-neutral-600">{assignedListings}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ListingsSection({ listings, hosts, onSelectListing }: { listings: any[]; hosts: any[]; onSelectListing: (id: string) => void }) {
  if (listings.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Layers className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
        <div className="text-sm font-medium text-neutral-900 mb-1">No listings</div>
        <div className="text-xs text-neutral-500">This partner has no listings yet.</div>
      </Card>
    );
  }

  const getHostName = (hostId: string | null) => {
    if (!hostId) return '-';
    const host = hosts.find(h => h.id === hostId);
    return host?.name || '-';
  };

  const getPrice = (listing: any) => {
    if (!listing.pricing) return '-';
    if (listing.listing_type === 'homestay') return `$${listing.pricing.per_night || 0}/night`;
    return `$${listing.pricing.per_person || listing.pricing.amount || 0}`;
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left px-4 py-3 font-medium text-neutral-600">Title</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-600">Host</th>
              <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-600">Location</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-600">Price</th>
              <th className="text-center px-4 py-3 font-medium text-neutral-600">Flagged</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-600">Created</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {listings.map(l => (
              <tr
                key={l.id}
                onClick={() => onSelectListing(l.id)}
                className="hover:bg-neutral-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-neutral-900 max-w-[200px] truncate">{l.title}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    l.listing_type === 'experience' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {l.listing_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600">{getHostName(l.host_id)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    l.status === 'active' ? 'bg-green-50 text-green-700' :
                    l.status === 'paused' ? 'bg-amber-50 text-amber-700' :
                    'bg-neutral-100 text-neutral-500'
                  }`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600">{l.location?.name || '-'}</td>
                <td className="px-4 py-3 text-neutral-600">{getPrice(l)}</td>
                <td className="px-4 py-3 text-center">
                  {l.is_flagged && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-medium">
                      <Flag className="w-3 h-3" />
                      Flagged
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                </td>
                <td className="px-3 py-3">
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
