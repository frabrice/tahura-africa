import { useState, useEffect } from 'react';
import { Download, TrendingUp, Users, DollarSign, Calendar, Award } from 'lucide-react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { exportToCSV } from '../../lib/csvExport';

interface Booking {
  id: string;
  booking_date: string;
  guests: number;
  total_amount: number;
  package_name: string | null;
  guide_name: string | null;
  status: string;
  created_at: string;
}

interface ProgramStat {
  name: string;
  bookings: number;
  visitors: number;
  revenue: number;
}

interface GuideStat {
  name: string;
  tours: number;
  visitors: number;
}

interface DailyStat {
  date: string;
  visitors: number;
  bookings: number;
}

interface MonthStat {
  label: string;
  visitors: number;
  revenue: number;
  bookings: number;
}

type Period = '30d' | '90d' | 'all';

export function ReportsPage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    if (userId) loadBookings();
  }, [userId]);

  async function loadBookings() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, booking_date, guests, total_amount, package_name, guide_name, status, created_at')
        .eq('institution_id', userId)
        .order('booking_date', { ascending: false });
      if (data) setBookings(data);
    } catch (err) {
      console.error('Error loading bookings:', err);
    }
    setLoading(false);
  }

  const now = new Date();
  const cutoff = period === '30d'
    ? new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
    : period === '90d'
    ? new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0]
    : '2000-01-01';

  const filtered = bookings.filter(b => b.booking_date.split('T')[0] >= cutoff);
  const active = filtered.filter(b => b.status !== 'cancelled');
  const completed = filtered.filter(b => b.status === 'completed');

  const totalVisitors = active.reduce((s, b) => s + b.guests, 0);
  const totalRevenue = completed.reduce((s, b) => s + b.total_amount, 0);
  const avgGroupSize = active.length > 0 ? (totalVisitors / active.length).toFixed(1) : '0';
  const completionRate = active.length > 0 ? Math.round((completed.length / active.length) * 100) : 0;

  const prev30Start = new Date(now.getTime() - 60 * 86400000).toISOString().split('T')[0];
  const prev30End = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
  const prevPeriod = bookings.filter(b => {
    const d = b.booking_date.split('T')[0];
    return d >= prev30Start && d < prev30End && b.status !== 'cancelled';
  });
  const prevVisitors = prevPeriod.reduce((s, b) => s + b.guests, 0);
  const visitorChange = prevVisitors > 0 ? Math.round(((totalVisitors - prevVisitors) / prevVisitors) * 100) : null;

  const dailyMap = new Map<string, DailyStat>();
  active.forEach(b => {
    const day = b.booking_date.split('T')[0];
    const ex = dailyMap.get(day) || { date: day, visitors: 0, bookings: 0 };
    dailyMap.set(day, { date: day, visitors: ex.visitors + b.guests, bookings: ex.bookings + 1 });
  });
  const dailyStats = Array.from(dailyMap.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);
  const maxVisitors = dailyStats.length > 0 ? Math.max(...dailyStats.map(d => d.visitors)) : 1;
  const peakDay = dailyStats.length > 0 ? dailyStats.reduce((m, d) => d.visitors > m.visitors ? d : m) : null;

  const programMap = new Map<string, ProgramStat>();
  active.forEach(b => {
    const name = b.package_name || 'General Visit';
    const ex = programMap.get(name) || { name, bookings: 0, visitors: 0, revenue: 0 };
    programMap.set(name, { name, bookings: ex.bookings + 1, visitors: ex.visitors + b.guests, revenue: ex.revenue + b.total_amount });
  });
  const programStats = Array.from(programMap.values()).sort((a, b) => b.visitors - a.visitors);

  const guideMap = new Map<string, GuideStat>();
  active.filter(b => b.guide_name).forEach(b => {
    const name = b.guide_name!;
    const ex = guideMap.get(name) || { name, tours: 0, visitors: 0 };
    guideMap.set(name, { name, tours: ex.tours + 1, visitors: ex.visitors + b.guests });
  });
  const guideStats = Array.from(guideMap.values()).sort((a, b) => b.tours - a.tours);

  const monthMap = new Map<string, MonthStat>();
  bookings.filter(b => b.status !== 'cancelled').forEach(b => {
    const d = new Date(b.booking_date);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const ex = monthMap.get(label) || { label, visitors: 0, revenue: 0, bookings: 0 };
    monthMap.set(label, { label, visitors: ex.visitors + b.guests, revenue: ex.revenue + b.total_amount, bookings: ex.bookings + 1 });
  });
  const monthlyStats = Array.from(monthMap.values()).slice(-6).reverse();
  const maxMonthVisitors = monthlyStats.length > 0 ? Math.max(...monthlyStats.map(m => m.visitors)) : 1;

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-medium text-neutral-900 mb-6">Reports</h1>
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Reports & Analytics</h1>
          <p className="text-xs text-neutral-500 mt-0.5">{bookings.length} total bookings on record</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-neutral-100 p-1 rounded-lg gap-1">
            {(['30d', '90d', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === p ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                {p === 'all' ? 'All time' : p === '30d' ? 'Last 30d' : 'Last 90d'}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const headers = ['Date', 'Booking Date', 'Guests', 'Amount', 'Program', 'Guide', 'Status'];
              const rows = bookings.map(b => [
                new Date(b.created_at).toLocaleDateString('en-US'),
                b.booking_date,
                b.guests,
                b.total_amount,
                b.package_name || 'General Visit',
                b.guide_name || '-',
                b.status,
              ]);
              exportToCSV('institution-report.csv', headers, rows);
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="p-5 bg-teal-50">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-500">Total Visitors</span>
          </div>
          <div className="text-2xl font-semibold text-neutral-900">{totalVisitors.toLocaleString()}</div>
          {visitorChange !== null && period === '30d' && (
            <div className={`text-xs mt-1 font-medium ${visitorChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {visitorChange >= 0 ? '+' : ''}{visitorChange}% vs prior 30d
            </div>
          )}
          <div className="text-xs text-neutral-500 mt-1">{active.length} bookings</div>
        </Card>
        <Card className="p-5 bg-emerald-50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-500">Revenue</span>
          </div>
          <div className="text-2xl font-semibold text-neutral-900">${totalRevenue.toFixed(0)}</div>
          <div className="text-xs text-neutral-500 mt-1">from completed bookings</div>
        </Card>
        <Card className="p-5 bg-blue-50">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-500">Avg Group Size</span>
          </div>
          <div className="text-2xl font-semibold text-neutral-900">{avgGroupSize}</div>
          <div className="text-xs text-neutral-500 mt-1">visitors per booking</div>
        </Card>
        <Card className="p-5 bg-amber-50">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-500">Completion Rate</span>
          </div>
          <div className="text-2xl font-semibold text-neutral-900">{completionRate}%</div>
          <div className="text-xs text-neutral-500 mt-1">{completed.length} completed</div>
        </Card>
      </div>

      {monthlyStats.length > 0 && (
        <Card className="p-5 mb-6 bg-blue-50">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neutral-400" />
            Monthly Visitor Volume
          </h3>
          <div className="space-y-2">
            {monthlyStats.map(month => {
              const pct = maxMonthVisitors > 0 ? Math.round((month.visitors / maxMonthVisitors) * 100) : 0;
              return (
                <div key={month.label} className="flex items-center gap-4">
                  <div className="w-16 text-xs text-neutral-600 flex-shrink-0">{month.label}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-neutral-600">{month.visitors} visitors · {month.bookings} bookings</span>
                      <span className="text-xs text-neutral-500">${month.revenue.toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-neutral-100 h-2 rounded-full">
                      <div className="h-2 rounded-full bg-teal-500" style={{ width: `${Math.max(pct, 1)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {dailyStats.length > 0 && (
        <Card className="p-5 mb-6 bg-neutral-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-neutral-900">Recent Daily Visitor Volume</h3>
            {peakDay && (
              <span className="text-xs text-neutral-500">
                Peak: {new Date(peakDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {peakDay.visitors} visitors
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {dailyStats.map(day => {
              const pct = maxVisitors > 0 ? Math.round((day.visitors / maxVisitors) * 100) : 0;
              return (
                <div key={day.date} className="flex items-center gap-4">
                  <div className="w-20 text-xs text-neutral-600 flex-shrink-0">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-neutral-600">{day.visitors} visitors</span>
                      <span className="text-xs text-neutral-500">{day.bookings} booking{day.bookings !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full bg-neutral-100 h-2 rounded-full">
                      <div
                        className={`h-2 rounded-full ${pct >= 80 ? 'bg-orange-500' : pct >= 50 ? 'bg-blue-500' : 'bg-teal-500'}`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-8 text-xs text-neutral-400 text-right flex-shrink-0">{pct}%</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card className="p-5 bg-emerald-50">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Program Performance</h3>
          {programStats.length === 0 ? (
            <div className="text-sm text-neutral-500">No program data for this period.</div>
          ) : (
            <div className="space-y-3">
              {programStats.slice(0, 7).map(program => (
                <div key={program.name} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-neutral-900 truncate">{program.name}</div>
                    <div className="text-xs text-neutral-500">{program.bookings} booking{program.bookings !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-medium text-neutral-900">{program.visitors} visitors</div>
                    <div className="text-xs text-neutral-500">${program.revenue.toFixed(0)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5 bg-amber-50">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Booking Status Breakdown</h3>
            <div className="space-y-3">
              {(['confirmed', 'pending', 'completed', 'cancelled'] as const).map(status => {
                const count = filtered.filter(b => b.status === status).length;
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
              <div className="pt-2 border-t border-neutral-200 flex justify-between text-xs text-neutral-500">
                <span>Total (this period)</span>
                <span className="font-medium text-neutral-900">{filtered.length}</span>
              </div>
            </div>
          </Card>

          {guideStats.length > 0 && (
            <Card className="p-5 bg-teal-50">
              <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-neutral-400" />
                Top Guides
              </h3>
              <div className="space-y-3">
                {guideStats.slice(0, 4).map((guide, i) => (
                  <div key={guide.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 w-4">#{i + 1}</span>
                      <span className="text-sm text-neutral-900">{guide.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium text-neutral-900">{guide.tours} tours</span>
                      <span className="text-xs text-neutral-500 ml-2">{guide.visitors} visitors</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {bookings.length === 0 && (
        <Card className="p-12 text-center">
          <TrendingUp className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <div className="text-sm font-medium text-neutral-900 mb-1">No data yet</div>
          <div className="text-xs text-neutral-500">Analytics will appear here once you have bookings.</div>
        </Card>
      )}
    </div>
  );
}
