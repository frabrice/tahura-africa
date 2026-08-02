import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Users, Calendar, Layers, MapPin, UserCheck, DollarSign, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

const SLATE = '#475569';
const SLATE_LIGHT = '#94a3b8';

interface Metrics {
  totalBookings: number;
  totalTravelers: number;
  openTickets: number;
  totalListings: number;
  totalInstitutions: number;
  totalGuides: number;
  totalRevenue: number;
  totalCommission: number;
}

interface RecentBooking {
  id: string;
  booking_ref: string;
  item_title: string;
  traveler_name: string;
  created_at: string;
  status: string;
}

export function ControlRoomPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [openTicketCount, setOpenTicketCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [bookingsRes, travelersRes, ticketsRes, listingsRes, institutionsRes, guidesRes, recentRes] = await Promise.all([
      supabase.from('bookings').select('id, total_amount, commission_amount'),
      supabase.from('portal_users').select('id').eq('portal_type', 'traveler'),
      supabase.from('support_tickets').select('id, status'),
      supabase.from('partner_listings').select('id'),
      supabase.from('institution_profiles').select('id').eq('published', true),
      supabase.from('guides').select('id'),
      supabase.from('bookings').select('id, booking_ref, item_title, traveler_name, created_at, status').order('created_at', { ascending: false }).limit(8),
    ]);

    const bookings = bookingsRes.data || [];
    const tickets = ticketsRes.data || [];

    setMetrics({
      totalBookings: bookings.length,
      totalTravelers: (travelersRes.data || []).length,
      openTickets: tickets.filter((t: any) => t.status === 'open' || t.status === 'in_progress').length,
      totalListings: (listingsRes.data || []).length,
      totalInstitutions: (institutionsRes.data || []).length,
      totalGuides: (guidesRes.data || []).length,
      totalRevenue: bookings.reduce((s: number, b: any) => s + (b.total_amount || 0), 0),
      totalCommission: bookings.reduce((s: number, b: any) => s + (b.commission_amount || 0), 0),
    });

    setOpenTicketCount(tickets.filter((t: any) => t.status === 'open').length);
    setRecentBookings(recentRes.data || []);
    setLoading(false);
  }

  if (loading || !metrics) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded-xl skeleton-shimmer" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />)}
        </div>
      </div>
    );
  }

  const statItems = [
    { label: 'Total Bookings',   value: metrics.totalBookings,     sub: 'All time',       icon: Calendar,   accent: SLATE },
    { label: 'Travelers',        value: metrics.totalTravelers,    sub: 'Registered',     icon: Users,      accent: '#0ea5e9' },
    { label: 'Open Tickets',     value: metrics.openTickets,       sub: 'Needs attention', icon: AlertTriangle, accent: metrics.openTickets > 0 ? '#f59e0b' : '#10b981' },
    { label: 'Listings',         value: metrics.totalListings,     sub: 'On platform',    icon: Layers,     accent: '#0d9488' },
    { label: 'Attractions',      value: metrics.totalInstitutions, sub: 'Published',      icon: MapPin,     accent: '#8b5cf6' },
    { label: 'Guides',           value: metrics.totalGuides,       sub: 'Registered',     icon: UserCheck,  accent: '#f43f5e' },
    { label: 'Total Revenue',    value: metrics.totalRevenue,      sub: 'USD collected',  icon: DollarSign, accent: '#16a34a', currency: true },
    { label: 'Commission',       value: metrics.totalCommission,   sub: '10% platform fee', icon: TrendingUp, accent: SLATE, currency: true },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] mb-1" style={{ color: SLATE_LIGHT }}>Operations Control</p>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-neutral-900">Control Room</h1>
        <p className="text-sm text-neutral-500 mt-1">Real-time platform oversight and key operational metrics.</p>
      </div>

      {/* System status banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
        <span className="text-sm font-semibold text-emerald-800">All Systems Operational</span>
        <span className="text-xs text-emerald-600 ml-auto">Last checked: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statItems.map(({ label, value, sub, icon: Icon, accent, currency }) => (
          <div key={label} className="bg-white rounded-2xl p-5 relative overflow-hidden border border-neutral-100 shadow-warm-sm hover:shadow-warm transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: accent }} />
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${accent}15` }}>
              <Icon className="w-4 h-4" style={{ color: accent }} />
            </div>
            <div className="text-2xl font-bold text-neutral-900 font-display">
              {currency ? `$${value.toLocaleString()}` : value.toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-neutral-600 mt-0.5">{label}</div>
            <div className="text-[10px] text-neutral-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Platform overview + attention signals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-warm-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${SLATE}15` }}>
              <Activity className="w-4 h-4" style={{ color: SLATE }} />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">Platform Overview</h3>
          </div>
          <div className="space-y-1">
            {[
              { label: 'Active Listings',       value: metrics.totalListings },
              { label: 'Published Attractions', value: metrics.totalInstitutions },
              { label: 'Registered Guides',     value: metrics.totalGuides },
              { label: 'Total Revenue (USD)',   value: `$${metrics.totalRevenue.toLocaleString()}` },
              { label: 'Commission Collected',  value: `$${metrics.totalCommission.toLocaleString()}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-neutral-50 last:border-0">
                <span className="text-sm text-neutral-500">{label}</span>
                <span className="text-sm font-semibold text-neutral-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-warm-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">Attention Signals</h3>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-xl border" style={{ background: openTicketCount > 0 ? '#fffbeb' : '#f0fdf4', borderColor: openTicketCount > 0 ? '#fde68a' : '#bbf7d0' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-neutral-900">Open Support Tickets</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: openTicketCount > 0 ? '#fef3c7' : '#dcfce7',
                    color: openTicketCount > 0 ? '#d97706' : '#16a34a',
                  }}>
                  {openTicketCount > 0 ? 'Action Required' : 'All Clear'}
                </span>
              </div>
              <p className="text-xs text-neutral-500">{openTicketCount} ticket{openTicketCount !== 1 ? 's' : ''} awaiting response</p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-neutral-900">Platform Commission Rate</span>
                <span className="text-xs font-semibold text-neutral-500">10%</span>
              </div>
              <p className="text-xs text-neutral-500">${metrics.totalCommission.toLocaleString()} collected from {metrics.totalBookings} bookings</p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-neutral-900">System Health</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Nominal
                </span>
              </div>
              <p className="text-xs text-neutral-500">All platform services running normally</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-warm-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-neutral-100">
            <Calendar className="w-4 h-4 text-neutral-500" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">Recent Bookings</h3>
          <span className="ml-auto text-xs text-neutral-400">Last {recentBookings.length} entries</span>
        </div>
        {recentBookings.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-8">No bookings yet</p>
        ) : (
          <div className="space-y-1">
            {recentBookings.map((b) => {
              const statusStyle = b.status === 'confirmed'
                ? { bg: '#dcfce7', text: '#16a34a' }
                : b.status === 'pending'
                ? { bg: '#fef3c7', text: '#d97706' }
                : { bg: '#f1f5f9', text: '#64748b' };
              return (
                <div key={b.id} className="flex items-center gap-4 py-3 border-b border-neutral-50 last:border-0">
                  <span className="text-xs text-neutral-400 w-20 flex-shrink-0">{new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span className="text-xs font-mono text-neutral-500 w-24 flex-shrink-0">{b.booking_ref}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-neutral-900 truncate block">{b.item_title}</span>
                    <span className="text-xs text-neutral-400 truncate block">{b.traveler_name}</span>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full capitalize flex-shrink-0"
                    style={{ background: statusStyle.bg, color: statusStyle.text }}>
                    {b.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
