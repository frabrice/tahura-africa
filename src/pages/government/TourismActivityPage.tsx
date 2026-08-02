import { useState, useEffect } from 'react';
import { Download, Calendar, TrendingUp } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';

interface BookingDay {
  date: string;
  count: number;
  revenue: number;
}

interface CategoryCount {
  type: string;
  count: number;
}

export function TourismActivityPage() {
  const [dailyData, setDailyData] = useState<BookingDay[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: bookings } = await supabase
      .from('bookings')
      .select('booking_date, total_amount, booking_type')
      .order('booking_date', { ascending: true });

    if (bookings) {
      const dayMap: Record<string, { count: number; revenue: number }> = {};
      const catMap: Record<string, number> = {};

      bookings.forEach(b => {
        const d = b.booking_date;
        if (!dayMap[d]) dayMap[d] = { count: 0, revenue: 0 };
        dayMap[d].count += 1;
        dayMap[d].revenue += Number(b.total_amount);

        const t = b.booking_type || 'other';
        catMap[t] = (catMap[t] || 0) + 1;
      });

      setDailyData(Object.entries(dayMap).map(([date, v]) => ({ date, count: v.count, revenue: v.revenue })));
      setCategories(Object.entries(catMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count));
    }
    setLoading(false);
  }

  const totalBookings = dailyData.reduce((s, d) => s + d.count, 0);
  const totalRevenue = dailyData.reduce((s, d) => s + d.revenue, 0);
  const avgDaily = dailyData.length > 0 ? Math.round(totalBookings / dailyData.length) : 0;
  const maxCount = Math.max(...dailyData.map(d => d.count), 1);
  const grandTotal = categories.reduce((s, c) => s + c.count, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Tourism Activity</h1>
        <Button variant="secondary" size="sm" onClick={() => {}}>
          <Download className="w-4 h-4 mr-1.5" />
          Export Data
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 bg-blue-50">
          <div className="text-xs text-neutral-500 mb-1">Total Bookings</div>
          <div className="text-2xl font-medium text-neutral-900">{totalBookings.toLocaleString()}</div>
        </Card>
        <Card className="p-5 bg-emerald-50">
          <div className="text-xs text-neutral-500 mb-1">Daily Average</div>
          <div className="text-2xl font-medium text-neutral-900">{avgDaily.toLocaleString()}</div>
        </Card>
        <Card className="p-5 bg-rose-50">
          <div className="text-xs text-neutral-500 mb-1">Total Revenue</div>
          <div className="text-2xl font-medium text-neutral-900">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
        </Card>
        <Card className="p-5 bg-amber-50">
          <div className="text-xs text-neutral-500 mb-1">Active Days</div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-medium text-neutral-900">{dailyData.length}</div>
            <TrendingUp className="w-4 h-4 text-green-700" />
          </div>
        </Card>
      </div>

      {dailyData.length > 0 && (
        <Card className="p-5 mb-8 bg-sky-50">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <h3 className="text-sm font-medium text-neutral-900">Daily Booking Volume</h3>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {dailyData.slice(-30).map(day => {
              const barWidth = (day.count / maxCount) * 100;
              return (
                <div key={day.date} className="flex items-center gap-4">
                  <div className="w-20 text-xs text-neutral-600">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-neutral-100 h-6 relative">
                      <div className="absolute inset-0 bg-blue-500 transition-all" style={{ width: `${barWidth}%` }} />
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-xs text-neutral-900 font-medium">{day.count}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-xs text-neutral-600 text-right">${day.revenue.toFixed(0)}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {categories.length > 0 && (
        <Card className="p-5 bg-teal-50">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">Bookings by Category</h3>
          <div className="space-y-4">
            {categories.map(cat => {
              const pct = grandTotal > 0 ? ((cat.count / grandTotal) * 100) : 0;
              return (
                <div key={cat.type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-neutral-900 capitalize">{cat.type}</span>
                    <span className="text-sm text-neutral-600">{cat.count.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2">
                    <div className="h-2 bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">{pct.toFixed(1)}% of total</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
