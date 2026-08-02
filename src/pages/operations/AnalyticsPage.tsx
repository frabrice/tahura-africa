import { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import {
  Users, CheckCircle, XCircle, BarChart3,
  Compass, Home, Building2, MapPin, CalendarDays,
  ArrowUpRight, ArrowDownRight, TrendingUp, Eye
} from 'lucide-react';

interface Booking {
  id: string;
  booking_type: string;
  item_title: string;
  booking_date: string;
  guests: number;
  total_amount: number;
  status: string;
  partner_id: string | null;
  institution_id: string | null;
}

interface PortalUser {
  id: string;
  name: string | null;
  portal_type: string;
  province: string | null;
}

interface Listing {
  id: string;
  title: string;
  listing_type: string;
  partner_id: string;
}

type Period = '30d' | '90d' | 'all';

export function OperationsAnalyticsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [bookingsRes, usersRes, listingsRes] = await Promise.all([
      supabase.from('bookings')
        .select('id,booking_type,item_title,booking_date,guests,total_amount,status,partner_id,institution_id')
        .order('booking_date', { ascending: false }),
      supabase.from('portal_users')
        .select('id,name,portal_type,province')
        .in('portal_type', ['partner', 'institution']),
      supabase.from('partner_listings')
        .select('id,title,listing_type,partner_id'),
    ]);
    setBookings(bookingsRes.data || []);
    setPortalUsers(usersRes.data || []);
    setListings(listingsRes.data || []);
    setLoading(false);
  }

  const now = new Date();
  const cutoffDate = useMemo(() => {
    if (period === '30d') return new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
    if (period === '90d') return new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0];
    return '2000-01-01';
  }, [period]);

  const prevCutoff = useMemo(() => {
    if (period === '30d') return new Date(now.getTime() - 60 * 86400000).toISOString().split('T')[0];
    if (period === '90d') return new Date(now.getTime() - 180 * 86400000).toISOString().split('T')[0];
    return null;
  }, [period]);

  const filtered = useMemo(() => bookings.filter(b => b.booking_date >= cutoffDate), [bookings, cutoffDate]);
  const prevFiltered = useMemo(() =>
    prevCutoff ? bookings.filter(b => b.booking_date >= prevCutoff && b.booking_date < cutoffDate) : [],
    [bookings, prevCutoff, cutoffDate]
  );

  const active = filtered.filter(b => b.status !== 'cancelled');
  const prevActive = prevFiltered.filter(b => b.status !== 'cancelled');

  const totalGuests = active.reduce((s, b) => s + (b.guests || 1), 0);
  const prevTotalGuests = prevActive.reduce((s, b) => s + (b.guests || 1), 0);
  const completedCount = filtered.filter(b => b.status === 'completed').length;
  const cancelledCount = filtered.filter(b => b.status === 'cancelled').length;
  const totalCount = filtered.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const cancellationRate = totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0;
  const avgGroupSize = active.length > 0 ? totalGuests / active.length : 0;

  const prevCompletedCount = prevFiltered.filter(b => b.status === 'completed').length;
  const prevTotalCount = prevFiltered.length;
  const prevCompletionRate = prevTotalCount > 0 ? (prevCompletedCount / prevTotalCount) * 100 : 0;

  const pctChange = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : null;

  const typeBreakdown = useMemo(() => {
    const types: Record<string, { count: number; revenue: number }> = {
      experience: { count: 0, revenue: 0 },
      homestay: { count: 0, revenue: 0 },
      attraction: { count: 0, revenue: 0 },
    };
    for (const b of active) {
      const t = b.booking_type || 'experience';
      if (!types[t]) types[t] = { count: 0, revenue: 0 };
      types[t].count++;
      types[t].revenue += parseFloat(String(b.total_amount || 0));
    }
    return types;
  }, [active]);

  const totalTypeCount = Object.values(typeBreakdown).reduce((s, v) => s + v.count, 0) || 1;
  const totalTypeRevenue = Object.values(typeBreakdown).reduce((s, v) => s + v.revenue, 0) || 1;

  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = Array(7).fill(0);
    const revenue = Array(7).fill(0);
    for (const b of active) {
      const d = new Date(b.booking_date).getDay();
      counts[d]++;
      revenue[d] += parseFloat(String(b.total_amount || 0));
    }
    return days.map((name, i) => ({ name, count: counts[i], revenue: revenue[i] }));
  }, [active]);

  const weekendBookings = dayOfWeekData[0].count + dayOfWeekData[6].count;
  const weekdayBookings = dayOfWeekData.slice(1, 6).reduce((s, d) => s + d.count, 0);
  const maxDayCount = Math.max(...dayOfWeekData.map(d => d.count), 1);

  const topListings = useMemo(() => {
    const map: Record<string, { title: string; type: string; count: number; revenue: number }> = {};
    for (const b of active) {
      const key = b.item_title || 'Unknown';
      if (!map[key]) map[key] = { title: key, type: b.booking_type, count: 0, revenue: 0 };
      map[key].count++;
      map[key].revenue += parseFloat(String(b.total_amount || 0));
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [active]);

  const regionData = useMemo(() => {
    const userMap = new Map(portalUsers.map(u => [u.id, u]));
    const regionMap: Record<string, { count: number; revenue: number }> = {};
    for (const b of active) {
      const pid = b.partner_id || b.institution_id;
      const user = pid ? userMap.get(pid) : null;
      const region = user?.province || 'Unknown';
      if (!regionMap[region]) regionMap[region] = { count: 0, revenue: 0 };
      regionMap[region].count++;
      regionMap[region].revenue += parseFloat(String(b.total_amount || 0));
    }
    return Object.entries(regionMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [active, portalUsers]);

  const maxRegionRevenue = Math.max(...regionData.map(r => r.revenue), 1);

  const insights = useMemo(() => {
    const list: { type: 'info' | 'warning' | 'success'; text: string }[] = [];

    const expPct = (typeBreakdown.experience.revenue / totalTypeRevenue) * 100;
    if (expPct > 50) {
      list.push({ type: 'info', text: `Experiences account for ${expPct.toFixed(0)}% of all revenue. Strong demand in this sector.` });
    }

    if (weekendBookings > 0 && weekdayBookings > 0) {
      const ratio = weekendBookings / (weekdayBookings / 5) * 100;
      if (ratio > 150) {
        list.push({ type: 'info', text: `Weekend bookings per day are ${((ratio / 100) - 1).toFixed(0)}x higher than weekday average.` });
      }
    }

    if (cancellationRate > 15 && totalCount > 3) {
      list.push({ type: 'warning', text: `Cancellation rate is ${cancellationRate.toFixed(0)}%. Investigate common reasons and consider policies to reduce cancellations.` });
    }

    if (completionRate > 80 && totalCount > 3) {
      list.push({ type: 'success', text: `${completionRate.toFixed(0)}% completion rate across the platform. Service delivery is strong.` });
    }

    if (avgGroupSize > 3) {
      list.push({ type: 'info', text: `Average group size is ${avgGroupSize.toFixed(1)} guests. Consider group-focused promotions.` });
    }

    const topRegion = regionData[0];
    if (topRegion && regionData.length > 1) {
      const topPct = (topRegion.revenue / totalTypeRevenue) * 100;
      if (topPct > 60) {
        list.push({ type: 'warning', text: `${topRegion.name} generates ${topPct.toFixed(0)}% of revenue. High concentration risk -- consider diversifying.` });
      }
    }

    if (totalCount === 0) {
      list.push({ type: 'info', text: 'No bookings in the selected period. Broaden the time range to see platform trends.' });
    }

    return list;
  }, [typeBreakdown, totalTypeRevenue, weekendBookings, weekdayBookings, cancellationRate, completionRate, totalCount, avgGroupSize, regionData]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const typeColors: Record<string, { bar: string; bg: string; text: string }> = {
    experience: { bar: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
    homestay: { bar: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-700' },
    attraction: { bar: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Analytics</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Platform-wide trends, patterns, and behavioral insights</p>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Guests Served"
          value={totalGuests.toLocaleString()}
          change={pctChange(totalGuests, prevTotalGuests)}
          icon={Users}
          accent="blue"
        />
        <MetricCard
          label="Completion Rate"
          value={`${completionRate.toFixed(0)}%`}
          change={pctChange(completionRate, prevCompletionRate)}
          icon={CheckCircle}
          accent="emerald"
        />
        <MetricCard
          label="Cancellation Rate"
          value={`${cancellationRate.toFixed(0)}%`}
          change={null}
          icon={XCircle}
          accent="rose"
        />
        <MetricCard
          label="Avg. Group Size"
          value={avgGroupSize.toFixed(1)}
          change={null}
          icon={TrendingUp}
          accent="slate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 bg-neutral-50">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-neutral-400" />
            Booking Type Breakdown
          </h2>
          <div className="space-y-4">
            {(['experience', 'homestay', 'attraction'] as const).map(type => {
              const data = typeBreakdown[type];
              const countPct = (data.count / totalTypeCount) * 100;
              const revPct = (data.revenue / totalTypeRevenue) * 100;
              const colors = typeColors[type];
              const Icon = type === 'experience' ? Compass : type === 'homestay' ? Home : Building2;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                      <span className="text-xs font-medium text-neutral-900 capitalize">{type}s</span>
                    </div>
                    <div className="text-xs text-neutral-500">
                      {data.count} bookings &bull; ${data.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 w-16">By count</span>
                      <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${countPct}%` }} />
                      </div>
                      <span className="text-xs text-neutral-500 w-8 text-right">{countPct.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 w-16">By revenue</span>
                      <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors.bar} opacity-70`} style={{ width: `${revPct}%` }} />
                      </div>
                      <span className="text-xs text-neutral-500 w-8 text-right">{revPct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 bg-neutral-50">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-neutral-400" />
            Day-of-Week Distribution
          </h2>
          <div className="flex items-end gap-2 h-32 mb-3">
            {dayOfWeekData.map(d => {
              const heightPct = (d.count / maxDayCount) * 100;
              const isWeekend = d.name === 'Sat' || d.name === 'Sun';
              return (
                <div key={d.name} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-neutral-500">{d.count}</div>
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t transition-all ${isWeekend ? 'bg-amber-400' : 'bg-slate-700'}`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                  </div>
                  <div className={`text-xs ${isWeekend ? 'text-amber-600 font-medium' : 'text-neutral-400'}`}>{d.name}</div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 pt-3 border-t border-neutral-100">
            <div className="flex-1 p-2.5 bg-white rounded-lg border border-neutral-100 text-center">
              <div className="text-sm font-semibold text-neutral-900">{weekdayBookings}</div>
              <div className="text-xs text-neutral-500">Weekday</div>
            </div>
            <div className="flex-1 p-2.5 bg-amber-50 rounded-lg border border-amber-100 text-center">
              <div className="text-sm font-semibold text-amber-700">{weekendBookings}</div>
              <div className="text-xs text-amber-600">Weekend</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="p-5 bg-neutral-50 lg:col-span-3">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neutral-400" />
            Top Performing Listings & Programs
          </h2>
          {topListings.length === 0 ? (
            <div className="text-xs text-neutral-400 text-center py-8">No booking data to rank</div>
          ) : (
            <div className="space-y-2">
              {topListings.map((item, i) => {
                const colors = typeColors[item.type] || typeColors.experience;
                return (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0">
                    <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-500 flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-neutral-900 truncate">{item.title}</div>
                      <div className="text-xs text-neutral-400 capitalize">{item.type} &bull; {item.count} booking{item.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-xs font-semibold text-neutral-900">${item.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${colors.bg} ${colors.text}`}>
                        {item.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5 bg-neutral-50 lg:col-span-2">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-neutral-400" />
            Revenue by Region
          </h2>
          {regionData.length === 0 ? (
            <div className="text-xs text-neutral-400 text-center py-8">No regional data</div>
          ) : (
            <div className="space-y-3">
              {regionData.slice(0, 6).map((r, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-neutral-900">{r.name}</span>
                    <span className="text-xs text-neutral-500">${r.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })} &bull; {r.count}</span>
                  </div>
                  <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-600 rounded-full"
                      style={{ width: `${(r.revenue / maxRegionRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {insights.length > 0 && (
        <Card className="p-5 bg-neutral-50">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-neutral-400" />
            Insights & Signals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, i) => {
              const styles: Record<string, string> = {
                info: 'bg-blue-50 border-blue-100 text-blue-800',
                warning: 'bg-amber-50 border-amber-100 text-amber-800',
                success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
              };
              return (
                <div key={i} className={`p-3 border rounded-lg text-xs leading-relaxed ${styles[insight.type]}`}>
                  {insight.text}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value, change, icon: Icon, accent }: {
  label: string;
  value: string;
  change: number | null;
  icon: any;
  accent: 'blue' | 'emerald' | 'rose' | 'slate';
}) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50', emerald: 'bg-emerald-50', rose: 'bg-rose-50', slate: 'bg-slate-50',
  };
  const iconBg: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    rose: 'bg-rose-100 text-rose-500',
    slate: 'bg-slate-200 text-slate-600',
  };
  return (
    <Card className={`p-4 ${bg[accent]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {change !== null && (
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
