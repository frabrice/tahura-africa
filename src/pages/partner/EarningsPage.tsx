import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { exportToCSV } from '../../lib/csvExport';

interface Booking {
  id: string;
  booking_ref: string;
  item_title: string;
  booking_type: string;
  booking_date: string;
  total_amount: number;
  status: string;
  created_at: string;
}

type EarningsTab = 'overview' | 'transactions';

export function EarningsPage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const [activeTab, setActiveTab] = useState<EarningsTab>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadBookings();
  }, [userId]);

  const [ledgerByBooking, setLedgerByBooking] = useState<Record<string, number>>({});

  async function loadBookings() {
    if (!userId) return;
    setLoading(true);
    try {
      const bookingCols = 'id, booking_ref, item_title, booking_type, booking_date, total_amount, status, created_at';
      const [hostsRes, bookingsByPartnerRes] = await Promise.all([
        supabase.from('partner_hosts').select('id').eq('partner_id', userId),
        supabase.from('bookings').select(bookingCols).eq('partner_id', userId).order('created_at', { ascending: false }),
      ]);

      const hostIds = (hostsRes.data || []).map(h => h.id);
      let bookingsByHost: { data: Booking[] | null } = { data: [] };
      if (hostIds.length > 0) {
        bookingsByHost = await supabase.from('bookings').select(bookingCols).in('host_id', hostIds).order('created_at', { ascending: false });
      }

      const seen = new Set<string>();
      const combined: Booking[] = [];
      [...(bookingsByPartnerRes.data || []), ...(bookingsByHost.data || [])].forEach((b: Booking) => {
        if (!seen.has(b.id)) { seen.add(b.id); combined.push(b); }
      });
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setBookings(combined);

      // payout_ledger.partner_earning is the real, split-adjusted amount the
      // partner keeps (gross minus platform commission minus any assigned
      // host's revenue share) — replaces the flat, always-wrong "95%" guess.
      if (combined.length > 0) {
        const { data: ledgerRows } = await supabase
          .from('payout_ledger')
          .select('booking_id, partner_earning')
          .in('booking_id', combined.map(b => b.id))
          .eq('status', 'active');
        const map: Record<string, number> = {};
        (ledgerRows || []).forEach((row: any) => { map[row.booking_id] = Number(row.partner_earning) || 0; });
        setLedgerByBooking(map);
      } else {
        setLedgerByBooking({});
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
    setLoading(false);
  }

  const partnerEarning = (b: Booking) => ledgerByBooking[b.id] ?? 0;

  const completedBookings = bookings.filter(b => b.status === 'completed');
  const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed');

  const totalEarnings = completedBookings.reduce((sum, b) => sum + partnerEarning(b), 0);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthEarnings = completedBookings
    .filter(b => b.created_at.startsWith(currentMonth))
    .reduce((sum, b) => sum + partnerEarning(b), 0);

  const pendingEarnings = pendingBookings.reduce((sum, b) => sum + partnerEarning(b), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Earnings</h1>
        <Button variant="secondary" size="sm" onClick={() => {
          const headers = ['Date', 'Reference', 'Listing', 'Type', 'Amount', 'Status'];
          const rows = bookings.map(b => [
            new Date(b.created_at).toLocaleDateString('en-US'),
            b.booking_ref,
            b.item_title,
            b.booking_type,
            partnerEarning(b).toFixed(2),
            b.status,
          ]);
          exportToCSV('earnings-statement.csv', headers, rows);
        }}>
          <Download className="w-4 h-4 mr-1.5" />
          Export Statement
        </Button>
      </div>

      <div className="flex gap-6 border-b border-neutral-200 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'transactions'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Transactions
        </button>
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="p-5 bg-green-50">
              <div className="text-xs text-neutral-500 mb-1">Total Earnings</div>
              <div className="text-2xl font-medium text-neutral-900">
                ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-neutral-400 mt-1">From {completedBookings.length} completed</div>
            </Card>
            <Card className="p-5 bg-cyan-50">
              <div className="text-xs text-neutral-500 mb-1">This Month</div>
              <div className="text-2xl font-medium text-neutral-900">
                ${thisMonthEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </Card>
            <Card className="p-5 bg-amber-50">
              <div className="text-xs text-neutral-500 mb-1">Pending Earnings</div>
              <div className="text-2xl font-medium text-neutral-900">
                ${pendingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-neutral-400 mt-1">From {pendingBookings.length} active</div>
            </Card>
          </div>

          <Card className="p-5 bg-neutral-50">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">Recent Activity</h3>
            {bookings.length === 0 ? (
              <div className="text-center py-8 text-sm text-neutral-500">
                No transactions yet. Bookings will appear here once received.
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.slice(0, 8).map(booking => (
                  <div key={booking.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                    <div className="flex-1">
                      <div className="text-sm text-neutral-900 mb-0.5">{booking.item_title}</div>
                      <div className="text-xs text-neutral-500 capitalize">
                        {booking.booking_type} ·{' '}
                        {new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-neutral-900">
                        ${partnerEarning(booking).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs border ${
                          booking.status === 'completed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : booking.status === 'confirmed'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : booking.status === 'pending'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                        }`}
                      >
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 mt-6 bg-blue-50">
            <h3 className="text-sm font-medium text-neutral-900 mb-3">Earnings Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-neutral-600">Gross Revenue</span>
                <span className="text-neutral-900 font-medium">
                  ${completedBookings.reduce((s, b) => s + b.total_amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-neutral-600">Commission &amp; Host Share</span>
                <span className="text-neutral-900 font-medium">
                  -${Math.max(completedBookings.reduce((s, b) => s + b.total_amount, 0) - totalEarnings, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 font-medium">
                <span className="text-neutral-900">Net Earnings</span>
                <span className="text-green-700">
                  ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div>
          {bookings.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-neutral-500 text-sm">No transactions yet.</div>
            </Card>
          ) : (
            <Card className="bg-sky-50">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Listing</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Earnings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {bookings.map(booking => (
                    <tr key={booking.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500 font-mono">{booking.booking_ref}</td>
                      <td className="px-4 py-3 text-sm text-neutral-900">{booking.item_title}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600 capitalize">{booking.booking_type}</td>
                      <td className="px-4 py-3 text-sm text-neutral-900 font-medium">
                        ${partnerEarning(booking).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs border ${
                            booking.status === 'completed'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : booking.status === 'confirmed'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : booking.status === 'pending'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                          }`}
                        >
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
