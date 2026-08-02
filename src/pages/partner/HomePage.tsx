import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { Card } from '../../components/Card';
import {
  Layers, Calendar, DollarSign, TrendingUp, AlertCircle,
  Users, CheckCircle, Star, BarChart3, Activity, Zap,
  Target, Award, ChevronRight, Package, AlertTriangle, BookOpen
} from 'lucide-react';

interface Stats {
  totalListings: number;
  activeListings: number;
  upcomingBookings: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  totalHosts: number;
  completedThisMonth: number;
  totalRevenue: number;
  cancelledCount: number;
  completedCount: number;
  avgRating: number;
  reviewCount: number;
}

interface Booking {
  id: string;
  traveler_name: string;
  traveler_id: string | null;
  item_title: string;
  item_id: string;
  booking_date: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface TopListing {
  id: string;
  title: string;
  bookings: number;
  revenue: number;
  listing_type: string;
}

function calcHealthScore(s: Stats): number {
  let score = 0;
  if (s.activeListings >= 1) score += 20;
  if (s.totalHosts >= 1) score += 15;
  const total = s.completedCount + s.cancelledCount;
  const completionRate = total > 0 ? s.completedCount / total : 0;
  score += Math.round(completionRate * 25);
  const cancellationRate = total > 0 ? s.cancelledCount / total : 0;
  score += cancellationRate < 0.1 ? 20 : cancellationRate < 0.2 ? 10 : 0;
  if (s.upcomingBookings >= 5 || s.completedCount >= 5) score += 10;
  if (s.totalListings >= 3) score += 10;
  return Math.min(score, 100);
}

export function HomePage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const partnerName = (user as PortalUser)?.name || 'Partner';

  const [stats, setStats] = useState<Stats>({
    totalListings: 0, activeListings: 0, upcomingBookings: 0,
    thisMonthRevenue: 0, lastMonthRevenue: 0, totalHosts: 0,
    completedThisMonth: 0, totalRevenue: 0, cancelledCount: 0,
    completedCount: 0, avgRating: 0, reviewCount: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [topListings, setTopListings] = useState<TopListing[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  useEffect(() => {
    if (userId) loadAll();
  }, [userId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [listingsRes, hostsRes, bookingsByPartner, reviewsRes] = await Promise.all([
        supabase.from('partner_listings').select('id,title,status,listing_type,media,description,whats_included,tags,host_id').eq('partner_id', userId),
        supabase.from('partner_hosts').select('id').eq('partner_id', userId),
        supabase.from('bookings')
          .select('id,traveler_name,traveler_id,item_title,item_id,booking_date,total_amount,status,created_at')
          .eq('partner_id', userId)
          .order('created_at', { ascending: false }),
        supabase.from('reviews').select('rating, listing_id'),
      ]);

      const listingData = listingsRes.data || [];
      const hosts = hostsRes.data || [];
      const hostIds = hosts.map(h => h.id);
      setListings(listingData);

      let bookingsByHost: { data: Booking[] | null } = { data: [] };
      if (hostIds.length > 0) {
        bookingsByHost = await supabase.from('bookings')
          .select('id,traveler_name,traveler_id,item_title,item_id,booking_date,total_amount,status,created_at')
          .in('host_id', hostIds)
          .order('created_at', { ascending: false });
      }

      const seen = new Set<string>();
      const combined: Booking[] = [];
      [...(bookingsByPartner.data || []), ...(bookingsByHost.data || [])].forEach(b => {
        if (!seen.has(b.id)) { seen.add(b.id); combined.push(b); }
      });
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const thisMonthBookings = combined.filter(b => b.booking_date >= thisMonthStart);
      const lastMonthBookings = combined.filter(b => b.booking_date >= lastMonthStart && b.booking_date < thisMonthStart);

      const thisMonthRevenue = thisMonthBookings
        .filter(b => b.status === 'completed' || b.status === 'confirmed')
        .reduce((s, b) => s + Number(b.total_amount || 0), 0);
      const lastMonthRevenue = lastMonthBookings
        .filter(b => b.status === 'completed' || b.status === 'confirmed')
        .reduce((s, b) => s + Number(b.total_amount || 0), 0);
      const totalRevenue = combined
        .filter(b => b.status === 'completed' || b.status === 'confirmed')
        .reduce((s, b) => s + Number(b.total_amount || 0), 0);

      const listingIds = listingData.map(l => l.id);
      const relevantReviews = (reviewsRes.data || []).filter(r => listingIds.includes(r.listing_id));
      const avgRating = relevantReviews.length > 0
        ? relevantReviews.reduce((s, r) => s + r.rating, 0) / relevantReviews.length
        : 0;

      const listingMap: Record<string, TopListing> = {};
      for (const l of listingData) {
        listingMap[l.id] = { id: l.id, title: l.title, bookings: 0, revenue: 0, listing_type: l.listing_type };
      }
      for (const b of combined) {
        if (b.item_id && listingMap[b.item_id] && (b.status === 'completed' || b.status === 'confirmed')) {
          listingMap[b.item_id].bookings++;
          listingMap[b.item_id].revenue += Number(b.total_amount || 0);
        }
      }

      const completedCount = combined.filter(b => b.status === 'completed').length;
      const cancelledCount = combined.filter(b => b.status === 'cancelled').length;

      setStats({
        totalListings: listingData.length,
        activeListings: listingData.filter(l => l.status === 'active').length,
        upcomingBookings: combined.filter(b => b.booking_date >= todayStr && b.status === 'confirmed').length,
        thisMonthRevenue,
        lastMonthRevenue,
        totalHosts: hosts.length,
        completedThisMonth: thisMonthBookings.filter(b => b.status === 'completed').length,
        totalRevenue,
        completedCount,
        cancelledCount,
        avgRating,
        reviewCount: relevantReviews.length,
      });
      setRecentBookings(combined.slice(0, 6));
      setTopListings(Object.values(listingMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
      setAllBookings(combined);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const healthScore = calcHealthScore(stats);
  const healthColor = healthScore >= 75 ? '#0d9488' : healthScore >= 50 ? '#C4883A' : '#ef4444';
  const healthLabel = healthScore >= 75 ? 'Strong' : healthScore >= 50 ? 'Developing' : 'Needs Attention';

  // Revenue forecast
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const revenueForecast = dayOfMonth > 0 ? (stats.thisMonthRevenue / dayOfMonth) * daysInMonth : 0;

  // Seasonal insight: find peak month from all bookings
  const monthCounts: Record<number, number> = {};
  allBookings.filter(b => b.status !== 'cancelled').forEach(b => {
    const m = new Date(b.booking_date).getMonth();
    monthCounts[m] = (monthCounts[m] || 0) + 1;
  });
  const peakMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
  const peakMonthName = peakMonth
    ? new Date(2024, Number(peakMonth[0]), 1).toLocaleString('en-US', { month: 'long' })
    : null;

  // This week bookings
  const weekDays: { label: string; short: string; count: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() + i);
    const ds = d.toISOString().split('T')[0];
    weekDays.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      short: ds,
      count: allBookings.filter(b => b.booking_date === ds && b.status !== 'cancelled').length,
    });
  }

  // Priority actions
  const priorityActions: { icon: any; text: string; color: string }[] = [];
  const draftListings = listings.filter(l => l.status === 'draft').length;
  const noPhotoListings = listings.filter(l => !l.media || l.media.length < 3).length;
  if (draftListings > 0) priorityActions.push({ icon: Package, text: `${draftListings} draft listing${draftListings > 1 ? 's' : ''} waiting to be published`, color: 'amber' });
  if (noPhotoListings > 0) priorityActions.push({ icon: AlertTriangle, text: `${noPhotoListings} listing${noPhotoListings > 1 ? 's' : ''} need${noPhotoListings === 1 ? 's' : ''} more photos (under 3)`, color: 'rose' });
  if (stats.totalHosts === 0) priorityActions.push({ icon: Users, text: 'Add your first host to start receiving bookings', color: 'blue' });
  if (stats.activeListings === 0 && stats.totalHosts > 0) priorityActions.push({ icon: Layers, text: 'Activate a listing to start getting discovered', color: 'teal' });
  if (priorityActions.length === 0 && stats.upcomingBookings > 0) priorityActions.push({ icon: CheckCircle, text: `${stats.upcomingBookings} upcoming booking${stats.upcomingBookings > 1 ? 's' : ''} confirmed — you're doing great!`, color: 'emerald' });

  // Avg booking value
  const totalConfirmedCompleted = allBookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
  const avgBookingValue = totalConfirmedCompleted.length > 0 ? stats.totalRevenue / totalConfirmedCompleted.length : 0;

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-600 mb-1">Partner Console</p>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-neutral-900">{greeting}, {partnerName}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Business Intelligence Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Business Health Score */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-warm-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Business Health</span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: healthColor, background: `${healthColor}15` }}>{healthLabel}</span>
          </div>
          <div className="text-4xl font-display font-bold mb-2" style={{ color: healthColor }}>{healthScore}</div>
          <div className="text-xs text-neutral-400 mb-3">out of 100 composite score</div>
          <div className="w-full bg-neutral-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${healthScore}%`, background: healthColor }} />
          </div>
          <div className="grid grid-cols-3 gap-1 mt-3 text-center">
            {[
              { label: 'Listings', val: stats.activeListings > 0 ? '✓' : '○' },
              { label: 'Bookings', val: stats.completedCount > 0 ? '✓' : '○' },
              { label: 'Retention', val: stats.cancelledCount < stats.completedCount ? '✓' : '○' },
            ].map(item => (
              <div key={item.label} className="text-xs text-neutral-500">
                <div className="font-semibold text-neutral-700">{item.val}</div>
                <div>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Forecast */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-warm-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Month Forecast</span>
          </div>
          <div className="text-4xl font-display font-bold text-neutral-900 mb-1">
            ${revenueForecast.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-neutral-400 mb-3">projected by month-end</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-neutral-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-teal-500 transition-all duration-700"
                style={{ width: `${Math.min((dayOfMonth / daysInMonth) * 100, 100)}%` }} />
            </div>
            <span className="text-xs text-neutral-400">Day {dayOfMonth}/{daysInMonth}</span>
          </div>
          <div className="mt-3 flex justify-between text-xs text-neutral-500">
            <span>Earned so far: <span className="font-semibold text-neutral-800">${stats.thisMonthRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></span>
            <span>Avg/day: <span className="font-semibold text-neutral-800">${dayOfMonth > 0 ? (stats.thisMonthRevenue / dayOfMonth).toFixed(0) : 0}</span></span>
          </div>
        </div>

        {/* Traveler Sentiment */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-warm-sm">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Traveler Sentiment</span>
          </div>
          {stats.reviewCount > 0 ? (
            <>
              <div className="text-4xl font-display font-bold text-neutral-900 mb-1">
                {stats.avgRating.toFixed(1)}
              </div>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star key={n} className={`w-4 h-4 ${n <= Math.round(stats.avgRating) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200'}`} />
                ))}
              </div>
              <div className="text-xs text-neutral-400">Based on {stats.reviewCount} review{stats.reviewCount !== 1 ? 's' : ''}</div>
              <div className="mt-3 text-xs font-medium" style={{ color: stats.avgRating >= 4.5 ? '#0d9488' : stats.avgRating >= 3.5 ? '#C4883A' : '#ef4444' }}>
                {stats.avgRating >= 4.5 ? 'Exceptional — keep it up!' : stats.avgRating >= 3.5 ? 'Good — room to grow' : 'Needs improvement'}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <Star className="w-8 h-8 text-neutral-200 mb-2" />
              <div className="text-xs text-neutral-400">No reviews yet. Complete bookings to earn your first review.</div>
            </div>
          )}
        </div>
      </div>

      {/* Priority Actions */}
      {priorityActions.length > 0 && (
        <div className="bg-neutral-950 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-amber-400">Priority Actions</span>
          </div>
          <div className="space-y-2">
            {priorityActions.map((action, i) => {
              const Icon = action.icon;
              const colorMap: Record<string, string> = {
                amber: '#C4883A', rose: '#f43f5e', blue: '#3b82f6', teal: '#0d9488', emerald: '#10b981'
              };
              const c = colorMap[action.color] || '#6b7280';
              return (
                <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: c }} />
                  <span className="text-sm text-neutral-200 flex-1">{action.text}</span>
                  <ChevronRight className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Listings" value={stats.activeListings} sub={`${stats.totalListings} total`} icon={Layers} color="blue" />
        <StatCard label="Upcoming Bookings" value={stats.upcomingBookings} sub="Confirmed ahead" icon={Calendar} color="emerald" />
        <StatCard
          label="This Month"
          value={`$${stats.thisMonthRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          sub={stats.lastMonthRevenue > 0 ? `${((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue * 100).toFixed(0)}% vs last month` : 'First month of data'}
          icon={DollarSign}
          color="green"
          positive={stats.lastMonthRevenue > 0 ? stats.thisMonthRevenue >= stats.lastMonthRevenue : undefined}
        />
        <StatCard
          label="Avg Booking Value"
          value={`$${avgBookingValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          sub={`${totalConfirmedCompleted.length} total bookings`}
          icon={Award}
          color="amber"
        />
      </div>

      {/* This Week + Seasonal Insight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* This Week */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-warm-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-semibold text-neutral-800">This Week</span>
          </div>
          <div className="flex gap-2">
            {weekDays.map((day) => {
              const isToday = day.short === todayStr;
              return (
                <div key={day.short} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className={`text-xs font-medium ${isToday ? 'text-teal-600' : 'text-neutral-400'}`}>{day.label}</span>
                  <div className={`w-full rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    day.count > 0
                      ? 'bg-teal-600 text-white py-3'
                      : isToday
                        ? 'bg-neutral-900 text-white py-3'
                        : 'bg-neutral-100 text-neutral-300 py-3'
                  }`}>
                    {day.count > 0 ? day.count : '—'}
                  </div>
                  {isToday && <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-neutral-400 text-center">
            {weekDays.reduce((s, d) => s + d.count, 0)} booking{weekDays.reduce((s, d) => s + d.count, 0) !== 1 ? 's' : ''} this week
          </div>
        </div>

        {/* Seasonal Insight */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-warm-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-semibold text-neutral-800">Seasonal Demand</span>
          </div>
          {peakMonthName ? (
            <>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-display font-bold text-neutral-900">{peakMonthName}</span>
                <span className="text-sm text-neutral-400 mb-0.5">is your peak month</span>
              </div>
              <div className="text-xs text-neutral-500 mb-4">Based on {allBookings.filter(b => b.status !== 'cancelled').length} historical bookings</div>
              <div className="flex gap-1 items-end h-12">
                {Array.from({ length: 12 }).map((_, m) => {
                  const count = monthCounts[m] || 0;
                  const max = Math.max(...Object.values(monthCounts), 1);
                  const isPeak = m === Number(peakMonth[0]);
                  return (
                    <div key={m} className="flex-1 flex items-end">
                      <div
                        className={`w-full rounded-sm transition-all ${isPeak ? 'bg-teal-600' : 'bg-neutral-200'}`}
                        style={{ height: `${Math.max((count / max) * 48, count > 0 ? 4 : 2)}px` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-neutral-300 mt-1">
                <span>Jan</span><span>Jun</span><span>Dec</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <BookOpen className="w-8 h-8 text-neutral-200 mb-2" />
              <div className="text-xs text-neutral-400">Complete a few bookings to see your seasonal demand patterns.</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Bookings + Top Listings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-neutral-500" />
              Recent Bookings
            </h2>
            <span className="text-xs text-neutral-400">{recentBookings.length} shown</span>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 shadow-warm-sm">
            {recentBookings.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">No bookings yet</div>
            ) : (
              recentBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(b.status)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-neutral-900 truncate">{b.traveler_name}</div>
                    <div className="text-xs text-neutral-500 truncate">{b.item_title}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-medium text-neutral-900">${Number(b.total_amount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                    <div className="text-xs text-neutral-400">{new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Star className="w-4 h-4 text-neutral-500" />
              Top Performing Listings
            </h2>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 shadow-warm-sm">
            {topListings.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">No listing data yet</div>
            ) : (
              topListings.map((listing, i) => (
                <div key={listing.id} className="flex items-center gap-3 p-3.5">
                  <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-500 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-neutral-900 truncate">{listing.title}</div>
                    <div className="text-xs text-neutral-500 capitalize">{listing.listing_type} &bull; {listing.bookings} booking{listing.bookings !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="text-xs font-semibold text-neutral-900 flex-shrink-0">${listing.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-neutral-500" />
          </div>
          <div>
            <div className="text-xl font-semibold text-neutral-900">{stats.totalHosts}</div>
            <div className="text-xs text-neutral-500">Total Hosts</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-neutral-500" />
          </div>
          <div>
            <div className="text-xl font-semibold text-neutral-900">{stats.completedThisMonth}</div>
            <div className="text-xs text-neutral-500">Completed This Month</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-neutral-500" />
          </div>
          <div>
            <div className="text-xl font-semibold text-neutral-900">{stats.cancelledCount}</div>
            <div className="text-xs text-neutral-500">Total Cancellations</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, positive }: {
  label: string; value: string | number; sub: string; icon: any;
  color: 'blue' | 'emerald' | 'green' | 'amber'; positive?: boolean;
}) {
  const accentHex: Record<string, string> = {
    blue: '#3b82f6', emerald: '#10b981', green: '#16a34a', amber: '#C4883A'
  };
  const accent = accentHex[color];
  return (
    <div className="bg-white rounded-2xl p-5 relative overflow-hidden border border-neutral-100 shadow-warm-sm hover:shadow-warm transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: accent }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}15` }}>
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-neutral-900 mb-0.5 font-display">{value}</div>
      <div className="text-xs font-semibold text-neutral-600">{label}</div>
      <div className={`text-xs mt-0.5 ${positive === true ? 'text-emerald-600' : positive === false ? 'text-rose-500' : 'text-neutral-400'}`}>{sub}</div>
    </div>
  );
}

function statusDot(status: string) {
  switch (status) {
    case 'confirmed': return 'bg-emerald-500';
    case 'pending': return 'bg-amber-400';
    case 'completed': return 'bg-blue-400';
    case 'cancelled': return 'bg-rose-400';
    default: return 'bg-neutral-300';
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`px-2 py-0.5 text-xs border rounded-full capitalize flex-shrink-0 ${styles[status] || 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>
      {status}
    </span>
  );
}
