import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { Card } from '../../components/Card';
import {
  TrendingUp, Users, DollarSign, Calendar, Eye, BarChart3,
  Layers, ArrowUpRight, ArrowDownRight, CheckCircle, XCircle, Clock,
  Repeat, Timer, Zap
} from 'lucide-react';

interface Booking {
  id: string;
  item_id: string;
  item_title: string;
  booking_date: string;
  total_amount: number;
  status: string;
  booking_type: string;
  guests: number;
  created_at: string;
  traveler_id: string;
}

interface Listing {
  id: string;
  title: string;
  status: string;
  listing_type: string;
}

type Period = '30d' | '90d' | 'all';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AnalyticsPage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalHosts, setTotalHosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  async function loadData() {
    setLoading(true);
    try {
      const [bookingsRes, listingsRes, hostsRes] = await Promise.all([
        supabase.from('bookings').select('id,item_id,item_title,booking_date,total_amount,status,booking_type,guests,created_at,traveler_id')
          .eq('partner_id', userId).order('booking_date', { ascending: false }),
        supabase.from('partner_listings').select('id,title,status,listing_type').eq('partner_id', userId),
        supabase.from('partner_hosts').select('id').eq('partner_id', userId),
      ]);
      setBookings(bookingsRes.data || []);
      setListings(listingsRes.data || []);
      setTotalHosts((hostsRes.data || []).length);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const now = new Date();
  const cutoff = period === '30d'
    ? new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
    : period === '90d'
    ? new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0]
    : '2000-01-01';

  const filtered = bookings.filter(b => b.booking_date >= cutoff);
  const prevCutoff = period === '30d'
    ? new Date(now.getTime() - 60 * 86400000).toISOString().split('T')[0]
    : period === '90d'
    ? new Date(now.getTime() - 180 * 86400000).toISOString().split('T')[0]
    : null;

  const prev = prevCutoff ? bookings.filter(b => b.booking_date >= prevCutoff && b.booking_date < cutoff) : [];

  const activeBookingsForRevenue = filtered.filter(b => b.status === 'completed' || b.status === 'confirmed');

  const revenue = activeBookingsForRevenue.reduce((s, b) => s + parseFloat(String(b.total_amount || 0)), 0);
  const prevRevenue = prev.filter(b => b.status === 'completed' || b.status === 'confirmed')
    .reduce((s, b) => s + parseFloat(String(b.total_amount || 0)), 0);

  const totalGuests = activeBookingsForRevenue.reduce((s, b) => s + (b.guests || 1), 0);
  const revenuePerGuest = totalGuests > 0 ? revenue / totalGuests : 0;

  const completedCount = filtered.filter(b => b.status === 'completed').length;
  const cancelledCount = filtered.filter(b => b.status === 'cancelled').length;
  const totalCount = filtered.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const cancellationRate = totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0;

  const avgBookingValue = activeBookingsForRevenue.length > 0 ? revenue / activeBookingsForRevenue.length : 0;

  const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;
  const prevCount = prev.length;
  const bookingsChange = prevCount > 0 ? ((totalCount - prevCount) / prevCount) * 100 : null;

  // Lead time: avg days between created_at and booking_date
  const leadTimes = filtered
    .filter(b => b.status !== 'cancelled' && b.created_at)
    .map(b => {
      const created = new Date(b.created_at).getTime();
      const bookingDay = new Date(b.booking_date).getTime();
      return Math.max(0, Math.round((bookingDay - created) / 86400000));
    });
  const avgLeadTime = leadTimes.length > 0
    ? Math.round(leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length)
    : 0;

  // Repeat rate: travelers with >1 booking / unique travelers
  const travelerCounts: Record<string, number> = {};
  for (const b of filtered) {
    if (b.traveler_id && b.status !== 'cancelled') {
      travelerCounts[b.traveler_id] = (travelerCounts[b.traveler_id] || 0) + 1;
    }
  }
  const uniqueTravelers = Object.keys(travelerCounts).length;
  const repeatTravelers = Object.values(travelerCounts).filter(c => c > 1).length;
  const repeatRate = uniqueTravelers > 0 ? (repeatTravelers / uniqueTravelers) * 100 : 0;

  // Day of week demand
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const b of filtered) {
    if (b.status !== 'cancelled') {
      const dow = new Date(b.booking_date).getDay();
      dowCounts[dow]++;
    }
  }
  const maxDow = Math.max(...dowCounts, 1);
  const peakDowIndex = dowCounts.indexOf(Math.max(...dowCounts));

  // Listing performance
  const listingPerformance = listings.map(listing => {
    const lBookings = filtered.filter(b => b.item_id === listing.id && (b.status === 'completed' || b.status === 'confirmed'));
    const lRevenue = lBookings.reduce((s, b) => s + parseFloat(String(b.total_amount || 0)), 0);
    return { ...listing, bookings: lBookings.length, revenue: lRevenue };
  }).sort((a, b) => b.revenue - a.revenue);

  // Monthly revenue (last 6 months)
  const monthlyMap: Record<string, number> = {};
  for (const b of bookings) {
    if (b.status !== 'cancelled') {
      const month = b.booking_date.slice(0, 7);
      monthlyMap[month] = (monthlyMap[month] || 0) + parseFloat(String(b.total_amount || 0));
    }
  }
  const months = Object.keys(monthlyMap).sort().slice(-6);
  const maxMonthly = Math.max(...months.map(m => monthlyMap[m] || 0), 1);

  const typeBreakdown = {
    experience: filtered.filter(b => b.booking_type === 'experience' && b.status !== 'cancelled').length,
    homestay: filtered.filter(b => b.booking_type === 'homestay' && b.status !== 'cancelled').length,
    attraction: filtered.filter(b => b.booking_type === 'attraction' && b.status !== 'cancelled').length,
    itinerary: filtered.filter(b => b.booking_type === 'itinerary' && b.status !== 'cancelled').length,
  };
  const typeTotal = Object.values(typeBreakdown).reduce((a, b) => a + b, 0) || 1;

  // Data-driven recommendations
  const recommendations: Array<{ type: 'info' | 'warning' | 'success'; text: string }> = [];

  if (listings.filter(l => l.status === 'active').length === 0) {
    recommendations.push({ type: 'warning', text: 'You have no active listings. Publish a listing to start receiving bookings.' });
  }
  if (totalHosts === 0) {
    recommendations.push({ type: 'info', text: 'Add host profiles to build traveler trust and bring a personal touch to your listings.' });
  }
  if (cancellationRate > 15) {
    recommendations.push({ type: 'warning', text: `Your cancellation rate is ${cancellationRate.toFixed(0)}% — above the 15% threshold. Review listing policies and manage availability carefully.` });
  }
  if (completionRate > 80 && totalCount > 0) {
    recommendations.push({ type: 'success', text: `Excellent completion rate of ${completionRate.toFixed(0)}%. Travelers are having great experiences with your listings.` });
  }
  if (peakDowIndex >= 0 && dowCounts[peakDowIndex] > 0) {
    const peakDay = DAY_NAMES[peakDowIndex];
    const peakShare = ((dowCounts[peakDowIndex] / (filtered.filter(b => b.status !== 'cancelled').length || 1)) * 100).toFixed(0);
    recommendations.push({ type: 'info', text: `${peakDay}days are your busiest day (${peakShare}% of bookings). Consider offering a ${peakDay}-exclusive package or early-bird discount to maximise peak demand.` });
  }
  if (avgLeadTime > 0 && avgLeadTime <= 3) {
    recommendations.push({ type: 'info', text: `Travelers book just ${avgLeadTime} day${avgLeadTime !== 1 ? 's' : ''} ahead on average — ensure your availability calendar is always up to date to avoid last-minute conflicts.` });
  }
  if (avgLeadTime > 14) {
    recommendations.push({ type: 'success', text: `Travelers plan ${avgLeadTime} days in advance — you have great advance notice. Use this window to send preparation tips and build excitement.` });
  }
  if (repeatRate > 20) {
    recommendations.push({ type: 'success', text: `${repeatRate.toFixed(0)}% of your travelers book again — strong loyalty signal. Consider a returning-guest discount to accelerate repeat visits.` });
  }
  if (revenuePerGuest > 0 && avgBookingValue > 0 && revenuePerGuest < avgBookingValue * 0.6) {
    recommendations.push({ type: 'info', text: `Revenue per guest ($${revenuePerGuest.toFixed(0)}) is below average booking value — your group bookings may be under-priced. Review per-head pricing.` });
  }
  if (revenueChange !== null && revenueChange > 20) {
    recommendations.push({ type: 'success', text: `Revenue grew ${revenueChange.toFixed(0)}% compared to the previous period. Great momentum — now is a good time to add a new listing type.` });
  }
  if (revenueChange !== null && revenueChange < -10) {
    recommendations.push({ type: 'warning', text: `Revenue dropped ${Math.abs(revenueChange).toFixed(0)}% vs. prior period. Review pricing, refresh listing photos, and check for seasonal patterns.` });
  }
  if (totalCount === 0) {
    recommendations.push({ type: 'info', text: 'No bookings in the selected period. Try updating listing descriptions, adding photos, or promoting on social channels.' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Analytics</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Track performance across your portfolio</p>
        </div>
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg">
          {(['30d', '90d', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === p ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              {p === '30d' ? 'Last 30 days' : p === '90d' ? 'Last 90 days' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Revenue" value={`$${revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} change={revenueChange} icon={DollarSign} color="green" />
        <MetricCard label="Bookings" value={totalCount} change={bookingsChange} icon={Calendar} color="blue" />
        <MetricCard label="Guests Served" value={totalGuests} icon={Users} color="emerald" />
        <MetricCard label="Avg. Booking Value" value={`$${avgBookingValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} icon={TrendingUp} color="amber" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SecondaryMetric label="Revenue per Guest" value={`$${revenuePerGuest.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} icon={DollarSign} note="per person served" />
        <SecondaryMetric label="Avg. Lead Time" value={`${avgLeadTime}d`} icon={Timer} note="days booked ahead" />
        <SecondaryMetric label="Guest Repeat Rate" value={`${repeatRate.toFixed(0)}%`} icon={Repeat} note={`${repeatTravelers} of ${uniqueTravelers} guests returned`} />
        <SecondaryMetric label="Completion Rate" value={`${completionRate.toFixed(0)}%`} icon={CheckCircle} note={`${completedCount} completed`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-neutral-50 col-span-2">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-neutral-400" />
            Monthly Revenue (last 6 months)
          </h2>
          {months.length === 0 ? (
            <div className="text-xs text-neutral-400 text-center py-8">No revenue data yet</div>
          ) : (
            <div className="flex items-end gap-2 h-36">
              {months.map(month => {
                const val = monthlyMap[month] || 0;
                const heightPct = (val / maxMonthly) * 100;
                const label = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs text-neutral-500">${(val / 1000).toFixed(1)}k</div>
                    <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                      <div
                        className="w-full bg-neutral-900 rounded-t transition-all"
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                    </div>
                    <div className="text-xs text-neutral-400">{label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4 bg-neutral-50">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Booking Status</h2>
          <div className="space-y-3">
            <StatusRow label="Completed" count={completedCount} total={totalCount} color="bg-emerald-500" icon={CheckCircle} iconClass="text-emerald-600" />
            <StatusRow label="Confirmed" count={filtered.filter(b => b.status === 'confirmed').length} total={totalCount} color="bg-blue-500" icon={Calendar} iconClass="text-blue-600" />
            <StatusRow label="Pending" count={filtered.filter(b => b.status === 'pending').length} total={totalCount} color="bg-amber-400" icon={Clock} iconClass="text-amber-600" />
            <StatusRow label="Cancelled" count={cancelledCount} total={totalCount} color="bg-rose-400" icon={XCircle} iconClass="text-rose-500" />
          </div>
        </Card>
      </div>

      {/* Day of Week Demand */}
      <Card className="p-5 bg-neutral-50">
        <h2 className="text-sm font-semibold text-neutral-900 mb-1 flex items-center gap-2">
          <Zap className="w-4 h-4 text-neutral-400" />
          Day of Week Demand
        </h2>
        <p className="text-xs text-neutral-400 mb-4">Bookings by day of the week (non-cancelled)</p>
        {dowCounts.every(c => c === 0) ? (
          <div className="text-xs text-neutral-400 text-center py-6">No bookings data yet</div>
        ) : (
          <div className="flex items-end gap-2 h-28">
            {dowCounts.map((count, i) => {
              const heightPct = (count / maxDow) * 100;
              const isPeak = i === peakDowIndex && count > 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-neutral-500">{count > 0 ? count : ''}</div>
                  <div className="w-full flex items-end justify-center" style={{ height: '64px' }}>
                    <div
                      className={`w-full rounded-t transition-all ${isPeak ? 'bg-teal-600' : 'bg-neutral-300'}`}
                      style={{ height: `${Math.max(heightPct, count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <div className={`text-xs font-medium ${isPeak ? 'text-teal-700' : 'text-neutral-400'}`}>{DAY_NAMES[i]}</div>
                </div>
              );
            })}
          </div>
        )}
        {dowCounts.some(c => c > 0) && (
          <p className="text-xs text-teal-700 mt-2 font-medium">
            Peak day: {DAY_NAMES[peakDowIndex]} ({dowCounts[peakDowIndex]} booking{dowCounts[peakDowIndex] !== 1 ? 's' : ''})
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5 bg-neutral-50">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-neutral-400" />
            Listing Performance
          </h2>
          {listingPerformance.length === 0 ? (
            <div className="text-xs text-neutral-400 text-center py-6">No listings yet</div>
          ) : (
            <div className="space-y-2">
              {listingPerformance.slice(0, 6).map((l, i) => (
                <div key={l.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0">
                  <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-500 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-neutral-900 truncate">{l.title}</div>
                    <div className="text-xs text-neutral-400 capitalize">{l.listing_type} &bull; {l.bookings} booking{l.bookings !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-xs font-semibold text-neutral-900">${l.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                    <span className={`px-1.5 py-0.5 text-xs rounded ${l.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                      {l.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3">Booking Type Mix</h2>
            <div className="space-y-2.5">
              {Object.entries(typeBreakdown).filter(([, count]) => count > 0 || true).map(([type, count]) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-600 capitalize">{type}s</span>
                    <span className="text-xs font-medium text-neutral-900">
                      {count} ({((count / typeTotal) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${type === 'experience' ? 'bg-blue-500' : type === 'homestay' ? 'bg-emerald-500' : type === 'attraction' ? 'bg-amber-500' : 'bg-teal-500'}`}
                      style={{ width: `${(count / typeTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3">Portfolio Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-lg border border-neutral-100">
                <div className="text-lg font-semibold text-neutral-900">{listings.filter(l => l.status === 'active').length}</div>
                <div className="text-xs text-neutral-500">Active listings</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-neutral-100">
                <div className="text-lg font-semibold text-neutral-900">{totalHosts}</div>
                <div className="text-xs text-neutral-500">Total hosts</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-neutral-100">
                <div className="text-lg font-semibold text-emerald-600">{completionRate.toFixed(0)}%</div>
                <div className="text-xs text-neutral-500">Completion rate</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-neutral-100">
                <div className="text-lg font-semibold text-rose-500">{cancellationRate.toFixed(0)}%</div>
                <div className="text-xs text-neutral-500">Cancellation rate</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-5 bg-neutral-50">
        <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-neutral-400" />
          Insights & Recommendations
        </h2>
        {recommendations.length === 0 ? (
          <div className="text-xs text-neutral-400 text-center py-4">No recommendations at this time — keep up the great work!</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recommendations.map((r, i) => (
              <InsightCard key={i} type={r.type} text={r.text} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricCard({ label, value, change, icon: Icon, color }: {
  label: string; value: string | number; change?: number | null; icon: any;
  color: 'blue' | 'emerald' | 'green' | 'amber';
}) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50', emerald: 'bg-emerald-50', green: 'bg-green-50', amber: 'bg-amber-50',
  };
  const iconBg: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600', emerald: 'bg-emerald-100 text-emerald-600',
    green: 'bg-green-100 text-green-600', amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <Card className={`p-4 ${bg[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {change !== null && change !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(change).toFixed(0)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold text-neutral-900 mb-0.5">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </Card>
  );
}

function SecondaryMetric({ label, value, icon: Icon, note }: {
  label: string; value: string; icon: any; note: string;
}) {
  return (
    <div className="p-4 bg-white rounded-xl border border-neutral-100 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-neutral-500" />
      </div>
      <div className="min-w-0">
        <div className="text-base font-semibold text-neutral-900">{value}</div>
        <div className="text-xs text-neutral-500 truncate">{label}</div>
        <div className="text-xs text-neutral-400 truncate">{note}</div>
      </div>
    </div>
  );
}

function StatusRow({ label, count, total, color, icon: Icon, iconClass }: {
  label: string; count: number; total: number; color: string; icon: any; iconClass: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
          <span className="text-xs text-neutral-600">{label}</span>
        </div>
        <span className="text-xs font-medium text-neutral-900">{count}</span>
      </div>
      <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InsightCard({ type, text }: { type: 'info' | 'warning' | 'success'; text: string }) {
  const styles: Record<string, string> = {
    info: 'bg-blue-50 border-blue-100 text-blue-800',
    warning: 'bg-amber-50 border-amber-100 text-amber-800',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
  };
  return (
    <div className={`p-3 border rounded-lg text-xs leading-relaxed ${styles[type]}`}>
      {text}
    </div>
  );
}
