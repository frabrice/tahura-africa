import { supabase } from './supabase';

export interface AnalyticsSummary {
  totalRevenue: number;
  totalBookings: number;
  totalGuests: number;
  avgBookingValue: number;
  completionRate: number;
  cancellationRate: number;
  repeatRate: number;
  avgLeadTime: number;
  revenueChange: number | null;
  bookingsChange: number | null;
}

export interface ListingPerformance {
  id: string;
  title: string;
  type: string;
  bookings: number;
  revenue: number;
  guests: number;
  avgRating: number;
  reviewCount: number;
  conversionRate: number;
}

export interface TimeSeriesPoint {
  label: string;
  revenue: number;
  bookings: number;
  guests: number;
}

export interface RegionalData {
  name: string;
  bookings: number;
  revenue: number;
  attractions: number;
  guides: number;
}

export interface EngagementMetrics {
  totalViews: number;
  totalSaves: number;
  totalMessages: number;
  avgSessionDuration: number;
  searchCount: number;
}

function getCutoff(period: '7d' | '30d' | '90d' | 'all'): string {
  if (period === 'all') return '2000-01-01';
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
}

function getPrevCutoff(period: '7d' | '30d' | '90d' | 'all'): string | null {
  if (period === 'all') return null;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 2 * 86400000).toISOString().split('T')[0];
}

export async function fetchPartnerAnalytics(
  partnerId: string,
  period: '7d' | '30d' | '90d' | 'all'
): Promise<{
  summary: AnalyticsSummary;
  listings: ListingPerformance[];
  timeSeries: TimeSeriesPoint[];
  typeBreakdown: Record<string, { count: number; revenue: number }>;
}> {
  const cutoff = getCutoff(period);
  const prevCutoff = getPrevCutoff(period);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id,item_id,item_title,booking_date,total_amount,status,booking_type,guests,created_at,traveler_id')
    .eq('partner_id', partnerId)
    .gte('booking_date', cutoff)
    .order('booking_date', { ascending: false });

  const { data: prevBookings } = prevCutoff
    ? await supabase
        .from('bookings')
        .select('total_amount,status,booking_date')
        .eq('partner_id', partnerId)
        .gte('booking_date', prevCutoff)
        .lt('booking_date', cutoff)
    : { data: [] };

  const { data: listings } = await supabase
    .from('partner_listings')
    .select('id,title,listing_type,status')
    .eq('partner_id', partnerId);

  const { data: reviews } = await supabase
    .from('reviews')
    .select('listing_id,rating');

  const b = bookings || [];
  const pb = prevBookings || [];

  const active = b.filter((x: any) => x.status !== 'cancelled');
  const prevActive = pb.filter((x: any) => x.status !== 'cancelled');

  const revenue = active.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
  const prevRevenue = prevActive.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);

  const totalGuests = active.reduce((s: number, x: any) => s + (x.guests || 1), 0);
  const completedCount = b.filter((x: any) => x.status === 'completed').length;
  const cancelledCount = b.filter((x: any) => x.status === 'cancelled').length;
  const totalCount = b.length;

  const travelerCounts: Record<string, number> = {};
  for (const x of active) {
    if (x.traveler_id) travelerCounts[x.traveler_id] = (travelerCounts[x.traveler_id] || 0) + 1;
  }
  const uniqueTravelers = Object.keys(travelerCounts).length;
  const repeatTravelers = Object.values(travelerCounts).filter((c: number) => c > 1).length;

  const leadTimes = active
    .filter((x: any) => x.created_at)
    .map((x: any) => {
      const created = new Date(x.created_at).getTime();
      const bookingDay = new Date(x.booking_date).getTime();
      return Math.max(0, Math.round((bookingDay - created) / 86400000));
    });

  const reviewMap: Record<string, { total: number; count: number }> = {};
  (reviews || []).forEach((r: any) => {
    if (!r.listing_id) return;
    if (!reviewMap[r.listing_id]) reviewMap[r.listing_id] = { total: 0, count: 0 };
    reviewMap[r.listing_id].total += r.rating;
    reviewMap[r.listing_id].count += 1;
  });

  const listingPerf: ListingPerformance[] = (listings || []).map((l: any) => {
    const lb = active.filter((x: any) => x.item_id === l.id);
    const rev = lb.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
    const guests = lb.reduce((s: number, x: any) => s + (x.guests || 1), 0);
    const rm = reviewMap[l.id];
    return {
      id: l.id,
      title: l.title,
      type: l.listing_type,
      bookings: lb.length,
      revenue: rev,
      guests,
      avgRating: rm ? rm.total / rm.count : 0,
      reviewCount: rm ? rm.count : 0,
      conversionRate: 0,
    };
  }).sort((a: any, b: any) => b.revenue - a.revenue);

  // Time series (daily for 7d, weekly for 30d/90d)
  const ts: TimeSeriesPoint[] = [];
  const isDaily = period === '7d';
  const grouping: Record<string, { revenue: number; bookings: number; guests: number }> = {};
  for (const x of active) {
    const key = isDaily ? x.booking_date : x.booking_date.slice(0, 7);
    if (!grouping[key]) grouping[key] = { revenue: 0, bookings: 0, guests: 0 };
    grouping[key].revenue += Number(x.total_amount || 0);
    grouping[key].bookings += 1;
    grouping[key].guests += x.guests || 1;
  }
  const sortedKeys = Object.keys(grouping).sort();
  for (const k of sortedKeys) {
    ts.push({
      label: isDaily ? new Date(k).toLocaleDateString('en-US', { weekday: 'short' }) : new Date(k + '-01').toLocaleDateString('en-US', { month: 'short' }),
      revenue: grouping[k].revenue,
      bookings: grouping[k].bookings,
      guests: grouping[k].guests,
    });
  }

  const typeBreakdown: Record<string, { count: number; revenue: number }> = {};
  for (const x of active) {
    const t = x.booking_type || 'experience';
    if (!typeBreakdown[t]) typeBreakdown[t] = { count: 0, revenue: 0 };
    typeBreakdown[t].count += 1;
    typeBreakdown[t].revenue += Number(x.total_amount || 0);
  }

  return {
    summary: {
      totalRevenue: revenue,
      totalBookings: totalCount,
      totalGuests,
      avgBookingValue: active.length > 0 ? revenue / active.length : 0,
      completionRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
      cancellationRate: totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0,
      repeatRate: uniqueTravelers > 0 ? (repeatTravelers / uniqueTravelers) * 100 : 0,
      avgLeadTime: leadTimes.length > 0 ? Math.round(leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length) : 0,
      revenueChange: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
      bookingsChange: pb.length > 0 ? ((totalCount - pb.length) / pb.length) * 100 : null,
    },
    listings: listingPerf,
    timeSeries: ts,
    typeBreakdown,
  };
}

export async function fetchInstitutionAnalytics(
  institutionId: string,
  period: '7d' | '30d' | '90d' | 'all'
): Promise<{
  summary: AnalyticsSummary;
  programs: Array<{ id: string; title: string; bookings: number; revenue: number; guests: number }>;
  timeSeries: TimeSeriesPoint[];
  guideStats: Array<{ id: string; name: string; tours: number; rating: number }>;
}> {
  const cutoff = getCutoff(period);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id,package_name,total_amount,status,booking_date,guests,created_at,traveler_id,guide_id,guide_name')
    .eq('institution_id', institutionId)
    .gte('booking_date', cutoff);

  const { data: programs } = await supabase
    .from('programs')
    .select('id,title')
    .eq('portal_user_id', institutionId);

  const { data: guides } = await supabase
    .from('guides')
    .select('id,name,rating,total_tours')
    .eq('portal_user_id', institutionId);

  const b = bookings || [];
  const active = b.filter((x: any) => x.status !== 'cancelled');

  const revenue = active.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
  const totalGuests = active.reduce((s: number, x: any) => s + (x.guests || 1), 0);
  const completedCount = b.filter((x: any) => x.status === 'completed').length;
  const cancelledCount = b.filter((x: any) => x.status === 'cancelled').length;
  const totalCount = b.length;

  const programStats = (programs || []).map((p: any) => {
    const pb = active.filter((x: any) => x.package_name === p.title);
    return {
      id: p.id,
      title: p.title,
      bookings: pb.length,
      revenue: pb.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0),
      guests: pb.reduce((s: number, x: any) => s + (x.guests || 1), 0),
    };
  }).sort((a: any, b: any) => b.revenue - a.revenue);

  const guideStats = (guides || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    tours: g.total_tours || 0,
    rating: g.rating || 0,
  }));

  const ts: TimeSeriesPoint[] = [];
  const grouping: Record<string, { revenue: number; bookings: number; guests: number }> = {};
  for (const x of active) {
    const key = x.booking_date.slice(0, 7);
    if (!grouping[key]) grouping[key] = { revenue: 0, bookings: 0, guests: 0 };
    grouping[key].revenue += Number(x.total_amount || 0);
    grouping[key].bookings += 1;
    grouping[key].guests += x.guests || 1;
  }
  for (const k of Object.keys(grouping).sort()) {
    ts.push({
      label: new Date(k + '-01').toLocaleDateString('en-US', { month: 'short' }),
      revenue: grouping[k].revenue,
      bookings: grouping[k].bookings,
      guests: grouping[k].guests,
    });
  }

  return {
    summary: {
      totalRevenue: revenue,
      totalBookings: totalCount,
      totalGuests,
      avgBookingValue: active.length > 0 ? revenue / active.length : 0,
      completionRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
      cancellationRate: totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0,
      repeatRate: 0,
      avgLeadTime: 0,
      revenueChange: null,
      bookingsChange: null,
    },
    programs: programStats,
    timeSeries: ts,
    guideStats,
  };
}

export async function fetchOperationsAnalytics(
  period: '7d' | '30d' | '90d' | 'all'
): Promise<{
  summary: AnalyticsSummary;
  regionalData: RegionalData[];
  partnerPerformance: Array<{ id: string; name: string; bookings: number; revenue: number; type: string }>;
  timeSeries: TimeSeriesPoint[];
  engagement: EngagementMetrics;
}> {
  const cutoff = getCutoff(period);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id,total_amount,status,booking_date,guests,partner_id,institution_id,booking_type')
    .gte('booking_date', cutoff);

  const { data: portalUsers } = await supabase
    .from('portal_users')
    .select('id,name,portal_type,province')
    .in('portal_type', ['partner', 'institution']);

  const { data: institutions } = await supabase
    .from('institution_profiles')
    .select('portal_user_id,location');

  const b = bookings || [];
  const active = b.filter((x: any) => x.status !== 'cancelled');

  const revenue = active.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
  const totalGuests = active.reduce((s: number, x: any) => s + (x.guests || 1), 0);
  const totalCount = b.length;

  // Regional data
  const regionMap: Record<string, { bookings: number; revenue: number; attractions: number }> = {};
  for (const x of active) {
    const pid = x.partner_id || x.institution_id;
    const user = (portalUsers || []).find((u: any) => u.id === pid);
    const region = user?.province || user?.name || 'Unknown';
    if (!regionMap[region]) regionMap[region] = { bookings: 0, revenue: 0, attractions: 0 };
    regionMap[region].bookings += 1;
    regionMap[region].revenue += Number(x.total_amount || 0);
  }
  (institutions || []).forEach((ip: any) => {
    const loc = ip.location || 'Unknown';
    if (!regionMap[loc]) regionMap[loc] = { bookings: 0, revenue: 0, attractions: 0 };
    regionMap[loc].attractions += 1;
  });

  const regionalData = Object.entries(regionMap)
    .map(([name, data]) => ({ name, ...data, guides: 0 }))
    .sort((a: any, b: any) => b.revenue - a.revenue);

  // Partner performance
  const partnerMap: Record<string, { name: string; bookings: number; revenue: number; type: string }> = {};
  for (const x of active) {
    const pid = x.partner_id || x.institution_id;
    if (!pid) continue;
    const user = (portalUsers || []).find((u: any) => u.id === pid);
    if (!user) continue;
    if (!partnerMap[pid]) partnerMap[pid] = { name: user.name || 'Unknown', bookings: 0, revenue: 0, type: user.portal_type };
    partnerMap[pid].bookings += 1;
    partnerMap[pid].revenue += Number(x.total_amount || 0);
  }
  const partnerPerformance = Object.entries(partnerMap)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a: any, b: any) => b.revenue - a.revenue);

  const ts: TimeSeriesPoint[] = [];
  const grouping: Record<string, { revenue: number; bookings: number; guests: number }> = {};
  for (const x of active) {
    const key = x.booking_date.slice(0, 7);
    if (!grouping[key]) grouping[key] = { revenue: 0, bookings: 0, guests: 0 };
    grouping[key].revenue += Number(x.total_amount || 0);
    grouping[key].bookings += 1;
    grouping[key].guests += x.guests || 1;
  }
  for (const k of Object.keys(grouping).sort()) {
    ts.push({
      label: new Date(k + '-01').toLocaleDateString('en-US', { month: 'short' }),
      revenue: grouping[k].revenue,
      bookings: grouping[k].bookings,
      guests: grouping[k].guests,
    });
  }

  return {
    summary: {
      totalRevenue: revenue,
      totalBookings: totalCount,
      totalGuests,
      avgBookingValue: active.length > 0 ? revenue / active.length : 0,
      completionRate: 0,
      cancellationRate: 0,
      repeatRate: 0,
      avgLeadTime: 0,
      revenueChange: null,
      bookingsChange: null,
    },
    regionalData,
    partnerPerformance,
    timeSeries: ts,
    engagement: {
      totalViews: 0,
      totalSaves: 0,
      totalMessages: 0,
      avgSessionDuration: 0,
      searchCount: 0,
    },
  };
}
