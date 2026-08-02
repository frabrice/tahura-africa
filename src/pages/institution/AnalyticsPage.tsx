import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import {
  TrendingUp, Users, DollarSign, Calendar, Star,
  CheckCircle, XCircle, BarChart3, Award, Target
} from 'lucide-react';

interface Booking {
  id: string;
  package_name: string;
  booking_date: string;
  total_amount: number;
  status: string;
  guests: number;
  guide_name: string;
  created_at: string;
}

interface ProgramStat {
  id: string;
  title: string;
  bookings: number;
  revenue: number;
  guests: number;
}

interface GuideStat {
  id: string;
  name: string;
  tours: number;
  rating: number;
}

type Period = '30d' | '90d' | 'all';

export function InstitutionAnalyticsPage() {
  const { user } = useAuth();
  const portalUser = user as PortalUser | null;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [programs, setPrograms] = useState<ProgramStat[]>([]);
  const [guides, setGuides] = useState<GuideStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    if (portalUser?.id) loadData();
  }, [portalUser?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [bookingsRes, programsRes, guidesRes] = await Promise.all([
        supabase.from('bookings').select('*').eq('institution_id', portalUser!.id).order('booking_date', { ascending: false }),
        supabase.from('programs').select('id,title').eq('portal_user_id', portalUser!.id),
        supabase.from('guides').select('id,name,rating,total_tours').eq('portal_user_id', portalUser!.id),
      ]);

      setBookings(bookingsRes.data || []);

      const programStats = (programsRes.data || []).map((p: any) => {
        const pb = (bookingsRes.data || []).filter((b: any) => b.package_name === p.title && b.status !== 'cancelled');
        return {
          id: p.id,
          title: p.title,
          bookings: pb.length,
          revenue: pb.reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0),
          guests: pb.reduce((s: number, b: any) => s + (b.guests || 1), 0),
        };
      }).sort((a: any, b: any) => b.revenue - a.revenue);
      setPrograms(programStats);

      setGuides((guidesRes.data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        tours: g.total_tours || 0,
        rating: g.rating || 0,
      })));
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
  const active = filtered.filter(b => b.status !== 'cancelled');

  const revenue = active.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const totalGuests = active.reduce((s, b) => s + (b.guests || 1), 0);
  const completedCount = filtered.filter(b => b.status === 'completed').length;
  const cancelledCount = filtered.filter(b => b.status === 'cancelled').length;
  const totalCount = filtered.length;
  const avgBookingValue = active.length > 0 ? revenue / active.length : 0;

  const monthlyMap: Record<string, number> = {};
  for (const b of bookings) {
    if (b.status !== 'cancelled') {
      const month = b.booking_date.slice(0, 7);
      monthlyMap[month] = (monthlyMap[month] || 0) + Number(b.total_amount || 0);
    }
  }
  const months = Object.keys(monthlyMap).sort().slice(-6);
  const maxMonthly = Math.max(...months.map(m => monthlyMap[m] || 0), 1);

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
          <p className="text-xs text-neutral-500 mt-0.5">Track performance across your institution</p>
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
        <MetricCard label="Revenue" value={`$${revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} icon={DollarSign} color="green" />
        <MetricCard label="Bookings" value={totalCount} icon={Calendar} color="blue" />
        <MetricCard label="Guests Served" value={totalGuests} icon={Users} color="emerald" />
        <MetricCard label="Avg. Booking Value" value={`$${avgBookingValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} icon={TrendingUp} color="amber" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SecondaryMetric label="Completion Rate" value={`${totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(0) : 0}%`} icon={CheckCircle} note={`${completedCount} completed`} />
        <SecondaryMetric label="Cancellation Rate" value={`${totalCount > 0 ? ((cancelledCount / totalCount) * 100).toFixed(0) : 0}%`} icon={XCircle} note={`${cancelledCount} cancelled`} />
        <SecondaryMetric label="Revenue per Guest" value={`$${totalGuests > 0 ? (revenue / totalGuests).toFixed(0) : 0}`} icon={DollarSign} note="per person served" />
        <SecondaryMetric label="Programs Active" value={programs.length} icon={Target} note="on platform" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 bg-neutral-50">
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
                      <div className="w-full bg-neutral-900 rounded-t transition-all" style={{ height: `${Math.max(heightPct, 4)}%` }} />
                    </div>
                    <div className="text-xs text-neutral-400">{label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4 bg-neutral-50">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-neutral-400" />
            Top Programs
          </h2>
          {programs.length === 0 ? (
            <div className="text-xs text-neutral-400 text-center py-8">No program data yet</div>
          ) : (
            <div className="space-y-2">
              {programs.slice(0, 6).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0">
                  <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-500 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-neutral-900 truncate">{p.title}</div>
                    <div className="text-xs text-neutral-400">{p.bookings} bookings &bull; {p.guests} guests</div>
                  </div>
                  <div className="text-xs font-semibold text-neutral-900">${p.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Guide Performance */}
      <Card className="p-4 bg-neutral-50">
        <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-neutral-400" />
          Guide Performance
        </h2>
        {guides.length === 0 ? (
          <div className="text-xs text-neutral-400 text-center py-8">No guides yet</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {guides.map(g => (
              <div key={g.id} className="p-3 bg-white rounded-lg border border-neutral-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-900">{g.name}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium text-neutral-700">{g.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="text-xs text-neutral-500 mt-1">{g.tours} tours led</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-teal-50 text-teal-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <Card className="p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]?.split(' ')[0]}`}>
        <Icon className={`w-4 h-4 ${colorMap[color]?.split(' ')[1]}`} />
      </div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      <div className="text-xs text-neutral-500 mt-0.5">{label}</div>
    </Card>
  );
}

function SecondaryMetric({ label, value, icon: Icon, note }: { label: string; value: string | number; icon: any; note: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-[11px] text-neutral-500">{label}</span>
      </div>
      <div className="text-lg font-bold text-neutral-900">{value}</div>
      <div className="text-[10px] text-neutral-400">{note}</div>
    </Card>
  );
}
