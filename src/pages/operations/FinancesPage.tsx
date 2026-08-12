import { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight,
  Receipt, CreditCard, Building2, Home, Compass,
  ChevronDown, ChevronUp, Download
} from 'lucide-react';
import { exportToCSV } from '../../lib/csvExport';

interface Booking {
  id: string;
  booking_ref: string;
  booking_type: string;
  item_title: string;
  traveler_name: string;
  booking_date: string;
  guests: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  status: string;
  created_at: string;
  partner_id: string | null;
  institution_id: string | null;
}

interface PortalUser {
  id: string;
  name: string | null;
  portal_type: string;
  province: string | null;
}

type Period = '7d' | '30d' | '90d' | 'all';
type Grouping = 'week' | 'month';

export function FinancesPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  // payout_ledger.platform_commission is the real, rate-snapshotted commission
  // per booking. The old `bookings.commission_amount` column this page used
  // to select never existed in any migration, so this query has been
  // silently erroring (and this whole page rendering off an empty array)
  // since it was written.
  const [commissionByBooking, setCommissionByBooking] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [grouping, setGrouping] = useState<Grouping>('month');
  const [showAllPartners, setShowAllPartners] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [bookingsRes, usersRes] = await Promise.all([
      supabase.from('bookings')
        .select('id,booking_ref,booking_type,item_title,traveler_name,booking_date,guests,subtotal,service_fee,total_amount,status,created_at,partner_id,institution_id')
        .order('created_at', { ascending: false }),
      supabase.from('portal_users')
        .select('id,name,portal_type,province')
        .in('portal_type', ['partner', 'institution']),
    ]);
    const loadedBookings = bookingsRes.data || [];
    setBookings(loadedBookings);
    setPortalUsers(usersRes.data || []);

    if (loadedBookings.length > 0) {
      const { data: ledgerRows } = await supabase
        .from('payout_ledger')
        .select('booking_id, platform_commission')
        .in('booking_id', loadedBookings.map(b => b.id));
      const map: Record<string, number> = {};
      (ledgerRows || []).forEach((row: any) => { map[row.booking_id] = Number(row.platform_commission) || 0; });
      setCommissionByBooking(map);
    } else {
      setCommissionByBooking({});
    }

    setLoading(false);
  }

  const commissionFor = (b: Booking) => commissionByBooking[b.id] ?? 0;

  const now = new Date();
  const cutoffDate = useMemo(() => {
    if (period === '7d') return new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    if (period === '30d') return new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
    if (period === '90d') return new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0];
    return '2000-01-01';
  }, [period]);

  const prevCutoff = useMemo(() => {
    if (period === '7d') return new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];
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

  const grossVolume = active.reduce((s, b) => s + parseFloat(String(b.total_amount || 0)), 0);
  const prevGrossVolume = prevActive.reduce((s, b) => s + parseFloat(String(b.total_amount || 0)), 0);

  const platformCommission = active.reduce((s, b) => s + commissionFor(b), 0);
  const prevPlatformCommission = prevActive.reduce((s, b) => s + commissionFor(b), 0);

  const totalBookingsCount = active.length;
  const prevBookingsCount = prevActive.length;
  const avgTransactionValue = totalBookingsCount > 0 ? grossVolume / totalBookingsCount : 0;
  const prevAvgValue = prevBookingsCount > 0 ? prevGrossVolume / prevBookingsCount : 0;

  const pctChange = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : null;

  const sectorBreakdown = useMemo(() => {
    const sectors: Record<string, { count: number; revenue: number; commission: number }> = {
      experience: { count: 0, revenue: 0, commission: 0 },
      homestay: { count: 0, revenue: 0, commission: 0 },
      attraction: { count: 0, revenue: 0, commission: 0 },
    };
    for (const b of active) {
      const type = b.booking_type || 'experience';
      if (!sectors[type]) sectors[type] = { count: 0, revenue: 0, commission: 0 };
      const amt = parseFloat(String(b.total_amount || 0));
      sectors[type].count++;
      sectors[type].revenue += amt;
      sectors[type].commission += commissionFor(b);
    }
    return sectors;
  }, [active, commissionByBooking]);

  const totalCommissionForSectors = Object.values(sectorBreakdown).reduce((s, v) => s + v.commission, 0) || 1;

  const partnerRankings = useMemo(() => {
    const map: Record<string, { name: string; type: string; count: number; gross: number; commission: number }> = {};
    const userMap = new Map(portalUsers.map(u => [u.id, u]));

    for (const b of active) {
      const pid = b.partner_id || b.institution_id;
      if (!pid) continue;
      if (!map[pid]) {
        const user = userMap.get(pid);
        map[pid] = {
          name: user?.name || 'Unknown',
          type: user?.portal_type || 'partner',
          count: 0,
          gross: 0,
          commission: 0,
        };
      }
      const amt = parseFloat(String(b.total_amount || 0));
      map[pid].count++;
      map[pid].gross += amt;
      map[pid].commission += commissionFor(b);
    }
    return Object.values(map).sort((a, b) => b.gross - a.gross);
  }, [active, portalUsers, commissionByBooking]);

  const timelineData = useMemo(() => {
    const buckets: Record<string, { experience: number; homestay: number; attraction: number }> = {};

    for (const b of bookings.filter(bk => bk.status !== 'cancelled')) {
      let key: string;
      if (grouping === 'month') {
        key = b.booking_date.slice(0, 7);
      } else {
        const d = new Date(b.booking_date);
        const jan1 = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      }
      if (!buckets[key]) buckets[key] = { experience: 0, homestay: 0, attraction: 0 };
      const amt = parseFloat(String(b.total_amount || 0));
      const type = b.booking_type as keyof typeof buckets[string] || 'experience';
      if (buckets[key][type] !== undefined) {
        buckets[key][type] += amt;
      }
    }

    const keys = Object.keys(buckets).sort().slice(-8);
    return keys.map(k => ({ key: k, ...buckets[k] }));
  }, [bookings, grouping]);

  const maxTimelineValue = Math.max(...timelineData.map(d => d.experience + d.homestay + d.attraction), 1);

  const recentTransactions = filtered.slice(0, showAllTransactions ? 50 : 10);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const sectorIcon: Record<string, any> = {
    experience: Compass,
    homestay: Home,
    attraction: Building2,
  };

  const sectorColor: Record<string, { bg: string; text: string; bar: string }> = {
    experience: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
    homestay: { bg: 'bg-teal-50', text: 'text-teal-700', bar: 'bg-teal-500' },
    attraction: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Finances</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Platform revenue, commission tracking, and transaction overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const headers = ['Date', 'Reference', 'Type', 'Item', 'Traveler', 'Gross', 'Commission', 'Status'];
              const rows = filtered.map(b => {
                const amt = parseFloat(String(b.total_amount || 0));
                return [
                  new Date(b.booking_date).toLocaleDateString('en-US'),
                  b.booking_ref,
                  b.booking_type,
                  b.item_title,
                  b.traveler_name,
                  amt.toFixed(2),
                  commissionFor(b).toFixed(2),
                  b.status,
                ];
              });
              exportToCSV('tahura-finances.csv', headers, rows);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg">
            {(['7d', '30d', '90d', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === p ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
              >
                {p === '7d' ? '7 days' : p === '30d' ? '30 days' : p === '90d' ? '90 days' : 'All time'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg">
            {(['week', 'month'] as Grouping[]).map(g => (
              <button
                key={g}
                onClick={() => setGrouping(g)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${grouping === g ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
              >
                {g}ly
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Gross Transaction Volume"
          value={`$${grossVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          change={pctChange(grossVolume, prevGrossVolume)}
          icon={DollarSign}
          accent="emerald"
        />
        <SummaryCard
          label="Platform Commission"
          value={`$${platformCommission.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          change={pctChange(platformCommission, prevPlatformCommission)}
          icon={CreditCard}
          accent="blue"
        />
        <SummaryCard
          label="Total Transactions"
          value={totalBookingsCount.toLocaleString()}
          change={pctChange(totalBookingsCount, prevBookingsCount)}
          icon={Receipt}
          accent="slate"
        />
        <SummaryCard
          label="Avg. Transaction Value"
          value={`$${avgTransactionValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          change={pctChange(avgTransactionValue, prevAvgValue)}
          icon={TrendingUp}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(['experience', 'homestay', 'attraction'] as const).map(sector => {
          const data = sectorBreakdown[sector];
          const Icon = sectorIcon[sector];
          const colors = sectorColor[sector];
          const pct = totalCommissionForSectors > 0 ? (data.commission / totalCommissionForSectors) * 100 : 0;
          return (
            <Card key={sector} className={`p-5 ${colors.bg}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-neutral-900 capitalize">{sector}s</div>
                  <div className="text-xs text-neutral-500">{data.count} transaction{data.count !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-600">Gross Volume</span>
                  <span className="font-medium text-neutral-900">${data.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-600">Commission Earned</span>
                  <span className={`font-medium ${colors.text}`}>${data.commission.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Share of total commission</span>
                    <span className="text-neutral-500">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="p-5 bg-neutral-50 lg:col-span-3">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">
            Revenue Timeline ({grouping === 'month' ? 'Monthly' : 'Weekly'})
          </h2>
          {timelineData.length === 0 ? (
            <div className="text-xs text-neutral-400 text-center py-8">No data available</div>
          ) : (
            <div className="flex items-end gap-2 h-44">
              {timelineData.map(d => {
                const total = d.experience + d.homestay + d.attraction;
                const expH = (d.experience / maxTimelineValue) * 100;
                const homeH = (d.homestay / maxTimelineValue) * 100;
                const attrH = (d.attraction / maxTimelineValue) * 100;
                const label = grouping === 'month'
                  ? new Date(d.key + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                  : d.key.split('-')[1];
                return (
                  <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs text-neutral-500">${(total / 1000).toFixed(1)}k</div>
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: '120px' }}>
                      <div className="w-full flex flex-col" style={{ height: `${Math.max(((total / maxTimelineValue) * 100), 3)}%` }}>
                        {attrH > 0 && <div className="w-full bg-amber-400 rounded-t" style={{ flex: attrH }} />}
                        {homeH > 0 && <div className={`w-full bg-teal-400 ${attrH === 0 ? 'rounded-t' : ''}`} style={{ flex: homeH }} />}
                        {expH > 0 && <div className={`w-full bg-blue-500 ${attrH === 0 && homeH === 0 ? 'rounded-t' : ''}`} style={{ flex: expH }} />}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-400">{label}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span className="text-xs text-neutral-500">Experiences</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-teal-400" />
              <span className="text-xs text-neutral-500">Homestays</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              <span className="text-xs text-neutral-500">Attractions</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-neutral-50 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-900">Revenue by Source</h2>
            {partnerRankings.length > 5 && (
              <button
                onClick={() => setShowAllPartners(!showAllPartners)}
                className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-0.5"
              >
                {showAllPartners ? 'Show less' : 'View all'}
                {showAllPartners ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
          {partnerRankings.length === 0 ? (
            <div className="text-xs text-neutral-400 text-center py-8">No transaction data</div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {partnerRankings.slice(0, showAllPartners ? undefined : 5).map((p, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 border-b border-neutral-100 last:border-0">
                  <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-500 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-neutral-900 truncate">{p.name}</div>
                    <div className="text-xs text-neutral-400 capitalize">{p.type} &bull; {p.count} booking{p.count !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-semibold text-neutral-900">${p.gross.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                    <div className="text-xs text-emerald-600">${p.commission.toLocaleString('en-US', { maximumFractionDigits: 0 })} comm.</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5 bg-neutral-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-900">Transaction Ledger</h2>
          {filtered.length > 10 && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-0.5"
            >
              {showAllTransactions ? 'Show less' : `View all (${filtered.length})`}
              {showAllTransactions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
        {recentTransactions.length === 0 ? (
          <div className="text-xs text-neutral-400 text-center py-8">No transactions in this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 pr-3 text-neutral-500 font-medium">Date</th>
                  <th className="text-left py-2 pr-3 text-neutral-500 font-medium">Ref</th>
                  <th className="text-left py-2 pr-3 text-neutral-500 font-medium">Type</th>
                  <th className="text-left py-2 pr-3 text-neutral-500 font-medium">Item</th>
                  <th className="text-left py-2 pr-3 text-neutral-500 font-medium">Traveler</th>
                  <th className="text-right py-2 pr-3 text-neutral-500 font-medium">Gross</th>
                  <th className="text-right py-2 pr-3 text-neutral-500 font-medium">Commission</th>
                  <th className="text-right py-2 text-neutral-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map(b => {
                  const amt = parseFloat(String(b.total_amount || 0));
                  const commDisplay = commissionFor(b);
                  return (
                    <tr key={b.id} className="border-b border-neutral-100 last:border-0 hover:bg-white/60 transition-colors">
                      <td className="py-2.5 pr-3 text-neutral-500 whitespace-nowrap">
                        {new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-2.5 pr-3 font-medium text-neutral-900 whitespace-nowrap">{b.booking_ref}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                          b.booking_type === 'experience' ? 'bg-blue-50 text-blue-700' :
                          b.booking_type === 'homestay' ? 'bg-teal-50 text-teal-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {b.booking_type}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-neutral-700 max-w-[160px] truncate">{b.item_title}</td>
                      <td className="py-2.5 pr-3 text-neutral-600 max-w-[120px] truncate">{b.traveler_name}</td>
                      <td className="py-2.5 pr-3 text-right font-medium text-neutral-900 whitespace-nowrap">
                        ${amt.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-emerald-600 whitespace-nowrap">
                        ${commDisplay.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <span className={`px-2 py-0.5 border rounded text-xs ${
                          b.status === 'confirmed' || b.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                          b.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-neutral-50 text-neutral-500 border-neutral-200'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, change, icon: Icon, accent }: {
  label: string;
  value: string;
  change: number | null;
  icon: any;
  accent: 'emerald' | 'blue' | 'slate' | 'amber';
}) {
  const bg: Record<string, string> = {
    emerald: 'bg-emerald-50', blue: 'bg-blue-50', slate: 'bg-slate-50', amber: 'bg-amber-50',
  };
  const iconBg: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    slate: 'bg-slate-200 text-slate-600',
    amber: 'bg-amber-100 text-amber-600',
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
