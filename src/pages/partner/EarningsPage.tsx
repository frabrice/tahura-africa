import { useState, useEffect } from 'react';
import { Download, X, AlertCircle, Loader2, CheckCircle, DollarSign } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { exportToCSV } from '../../lib/csvExport';

function WithdrawModal({ available, onClose, onSubmit }: {
  available: number; onClose: () => void; onSubmit: (amount: number, method: string) => Promise<string | null>;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fee = 2.5;
  const min = 50;
  const parsed = parseFloat(amount) || 0;
  const net = parsed - fee;
  const valid = parsed >= min && parsed <= available;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const err = await onSubmit(parsed, method);
    setSubmitting(false);
    if (err) { setError(err); return; }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-900">Withdraw Funds</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-xs text-emerald-700 mb-1">Available to withdraw</p>
              <p className="text-2xl font-bold text-emerald-700">${available.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Amount (USD)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`Min $${min}`}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              {parsed > 0 && parsed < min && <p className="text-xs text-red-600 mt-1">Minimum withdrawal is ${min}</p>}
              {parsed > available && <p className="text-xs text-red-600 mt-1">Exceeds available balance</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Payment method</label>
              <div className="space-y-2">
                {[
                  { value: 'bank', label: 'Bank Transfer', sub: 'Processed in 2-3 business days' },
                  { value: 'mobile', label: 'Mobile Money (MTN/Airtel)', sub: 'Processed within 24 hours' },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${method === opt.value ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                    <input type="radio" name="method" value={opt.value} checked={method === opt.value} onChange={() => setMethod(opt.value)} className="mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-neutral-900">{opt.label}</p>
                      <p className="text-xs text-neutral-400">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {valid && (
              <div className="bg-neutral-50 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-600"><span>Withdrawal amount</span><span>${parsed.toFixed(2)}</span></div>
                <div className="flex justify-between text-neutral-600"><span>Processing fee</span><span>-${fee.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold text-neutral-900 pt-1.5 border-t border-neutral-200"><span>You receive</span><span className="text-emerald-600">${net.toFixed(2)}</span></div>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
          <div className="flex gap-3 px-6 pb-6">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors">Cancel</button>
            <button
              disabled={!valid || submitting}
              onClick={handleSubmit}
              className="flex-1 py-2.5 text-sm font-medium bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {valid ? `Withdraw $${net.toFixed(2)}` : 'Withdraw'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

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
  const [availableBalance, setAvailableBalance] = useState(0);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    if (userId) {
      loadBookings();
      loadBalance();
    }
  }, [userId]);

  const [ledgerByBooking, setLedgerByBooking] = useState<Record<string, number>>({});

  async function loadBalance() {
    if (!userId) return;
    const { data } = await supabase.rpc('fn_partner_available_balance', { p_partner_id: userId });
    setAvailableBalance(Number(data) || 0);
  }

  async function handleWithdraw(amount: number, method: string): Promise<string | null> {
    if (!userId) return 'Not signed in.';
    const fee = 2.5;
    const { error } = await supabase.from('withdrawal_requests').insert({
      partner_id: userId,
      amount,
      fee,
      net_amount: amount - fee,
      payout_method: method === 'mobile' ? 'mobile' : 'bank',
    });
    if (error) return error.message || 'Could not submit withdrawal request.';
    setWithdrawSuccess(true);
    setTimeout(() => setWithdrawSuccess(false), 5000);
    loadBalance();
    return null;
  }

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

      {withdrawSuccess && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-6">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-700">Withdrawal request submitted for review. You'll be notified once it's approved and paid out.</p>
        </div>
      )}

      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <button
            onClick={() => setShowWithdraw(true)}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-200 px-3 py-1 rounded-lg transition-colors"
          >
            Withdraw
          </button>
        </div>
        <p className="text-2xl font-bold text-emerald-700">${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-xs text-emerald-600 mt-0.5">Available Balance</p>
        <p className="text-xs text-emerald-500 mt-0.5">After platform commission</p>
      </div>

      {showWithdraw && (
        <WithdrawModal
          available={availableBalance}
          onClose={() => setShowWithdraw(false)}
          onSubmit={handleWithdraw}
        />
      )}

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
