import { useState, useMemo, useEffect } from 'react';
import { Wallet, TrendingUp, ArrowDownRight, DollarSign, Clock, CheckCircle, X, Timer, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { useHostBookings, useHostListings, getHostContext } from '../../lib/useHostData';
import { supabase } from '../../lib/supabase';

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

export function HostWalletPage() {
  const ctx = getHostContext();
  const { bookings, loading } = useHostBookings(ctx?.id);
  const { listings } = useHostListings(ctx?.id);
  const [activeTab, setActiveTab] = useState<'overview' | 'statements'>('overview');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  // Ledger amounts are the single source of truth for what a host actually
  // earns per booking (commission + any partner/host revenue split already
  // applied server-side) — see payout_ledger / fn_host_available_balance.
  const [ledgerByBooking, setLedgerByBooking] = useState<Record<string, number>>({});
  const [availableBalance, setAvailableBalance] = useState(0);

  const loadLedgerAndBalance = async (hostId: string) => {
    const [{ data: balanceData }, { data: ledgerRows }] = await Promise.all([
      supabase.rpc('fn_host_available_balance', { p_host_id: hostId }),
      supabase.from('payout_ledger').select('booking_id, host_earning').eq('host_id', hostId).eq('status', 'active'),
    ]);
    setAvailableBalance(Number(balanceData) || 0);
    const map: Record<string, number> = {};
    (ledgerRows || []).forEach((row: any) => { map[row.booking_id] = Number(row.host_earning) || 0; });
    setLedgerByBooking(map);
  };

  useEffect(() => {
    if (ctx?.id) loadLedgerAndBalance(ctx.id);
  }, [ctx?.id]);

  const hostEarning = (b: { id: string }) => ledgerByBooking[b.id] ?? 0;

  const releasedBookings = useMemo(() =>
    bookings.filter(b =>
      (b.status === 'confirmed' || b.status === 'completed') &&
      new Date(b.booking_date) <= today
    ), [bookings, today]);

  const upcomingBookings = useMemo(() =>
    bookings.filter(b =>
      (b.status === 'confirmed' || b.status === 'pending') &&
      new Date(b.booking_date) > today
    ), [bookings, today]);

  const totalEarnings = useMemo(() => releasedBookings.reduce((s, b) => s + hostEarning(b), 0), [releasedBookings, ledgerByBooking]);
  const upcomingEarnings = useMemo(() => upcomingBookings.reduce((s, b) => s + hostEarning(b), 0), [upcomingBookings, ledgerByBooking]);

  // Next payout: soonest upcoming confirmed booking
  const nextPayout = useMemo(() => {
    const todayStr = today.toISOString().split('T')[0];
    return upcomingBookings
      .filter(b => b.booking_date >= todayStr)
      .sort((a, b) => a.booking_date.localeCompare(b.booking_date))[0] ?? null;
  }, [upcomingBookings, today]);

  // Earnings per hour: net earnings / (completed bookings * avg duration from listing)
  const earningsPerHour = useMemo(() => {
    const completed = bookings.filter(b => b.status === 'completed');
    if (completed.length === 0) return null;
    const netEarnings = completed.reduce((s, b) => s + hostEarning(b), 0);
    // Try to get avg duration from listing data (duration_hours or estimate 2h per experience)
    const listingDurationMap: Record<string, number> = {};
    for (const l of listings) {
      const hours = (l as any).duration_hours || (l as any).duration_days ? ((l as any).duration_days * 8) : 2;
      listingDurationMap[l.id] = hours;
    }
    const totalHours = completed.reduce((s, b) => {
      const dur = (b.item_id ? listingDurationMap[b.item_id] : undefined) || 2;
      return s + dur;
    }, 0);
    return totalHours > 0 ? netEarnings / totalHours : null;
  }, [bookings, listings, ledgerByBooking]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    releasedBookings.forEach(b => {
      const key = new Date(b.booking_date).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      months[key] = (months[key] || 0) + hostEarning(b);
    });
    return Object.entries(months).slice(-6).map(([month, amount]) => ({ month, amount }));
  }, [releasedBookings, ledgerByBooking]);

  const maxMonthly = useMemo(() => Math.max(...monthlyData.map(m => m.amount), 1), [monthlyData]);

  const handleWithdraw = async (amount: number, method: string): Promise<string | null> => {
    if (!ctx?.id) return 'Not signed in.';
    const fee = 2.5;
    const { error } = await supabase.from('withdrawal_requests').insert({
      host_id: ctx.id,
      amount,
      fee,
      net_amount: amount - fee,
      payout_method: method === 'mobile' ? 'mobile' : 'bank',
    });
    if (error) return error.message || 'Could not submit withdrawal request.';
    setWithdrawSuccess(true);
    setTimeout(() => setWithdrawSuccess(false), 5000);
    loadLedgerAndBalance(ctx.id);
    return null;
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Wallet</h1>
        <p className="text-sm text-neutral-500 mt-1">Your earnings overview and withdrawal history</p>
      </div>

      {withdrawSuccess && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-6">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-700">Withdrawal request submitted for review. You'll be notified once it's approved and paid out.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
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
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700">${upcomingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-amber-600 mt-0.5">Upcoming Payments</p>
          <p className="text-xs text-amber-500 mt-0.5">Released on experience day</p>
        </div>
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5">
          <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-sky-700">${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-sky-600 mt-0.5">Lifetime Earnings</p>
          <p className="text-xs text-sky-500 mt-0.5">From past experiences</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-6 w-fit">
        {(['overview', 'statements'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Next Payout + Earnings per Hour */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {nextPayout ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center">
                    <Zap className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">Next Payout</p>
                    <p className="text-xs text-neutral-400">Estimated release</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-teal-700">${hostEarning(nextPayout).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <div className="mt-2 text-xs text-neutral-500 space-y-0.5">
                  <p className="truncate font-medium text-neutral-700">{nextPayout.item_title}</p>
                  <p>{new Date(nextPayout.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="text-neutral-400">Released on experience day</p>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-5 flex items-center justify-center">
                <div className="text-center">
                  <Zap className="w-6 h-6 text-neutral-300 mx-auto mb-1" />
                  <p className="text-xs text-neutral-400">No upcoming payouts</p>
                </div>
              </div>
            )}
            {earningsPerHour !== null ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Timer className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">Earnings per Hour</p>
                    <p className="text-xs text-neutral-400">Net, completed bookings</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-amber-700">${earningsPerHour.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="text-sm font-normal text-amber-500">/hr</span></p>
                <p className="text-xs text-neutral-400 mt-2">Based on {bookings.filter(b => b.status === 'completed').length} completed booking{bookings.filter(b => b.status === 'completed').length !== 1 ? 's' : ''}</p>
              </div>
            ) : (
              <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-5 flex items-center justify-center">
                <div className="text-center">
                  <Timer className="w-6 h-6 text-neutral-300 mx-auto mb-1" />
                  <p className="text-xs text-neutral-400">Complete bookings to see hourly rate</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-5">Earnings by Month</h3>
            {monthlyData.length === 0 ? (
              <div className="py-10 text-center">
                <TrendingUp className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs text-neutral-400">No earnings data yet</p>
              </div>
            ) : (
              <div className="flex items-end gap-3 h-40">
                {monthlyData.map(({ month, amount }) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs text-neutral-600 font-medium">${amount > 999 ? `${(amount / 1000).toFixed(1)}k` : amount.toFixed(0)}</span>
                    <div className="w-full bg-emerald-400 rounded-t-lg" style={{ height: `${Math.max((amount / maxMonthly) * 120, 4)}px` }} />
                    <span className="text-xs text-neutral-400">{month}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Withdrawal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {[
                { label: 'Processing time', value: '2-3 business days' },
                { label: 'Minimum withdrawal', value: '$50.00' },
                { label: 'Processing fee', value: '$2.50 per request' },
              ].map(item => (
                <div key={item.label} className="p-3 bg-neutral-50 rounded-xl">
                  <p className="text-neutral-500 mb-1">{item.label}</p>
                  <p className="font-medium text-neutral-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'statements' && (
        <div className="space-y-6">
          {upcomingBookings.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-neutral-700">Upcoming Payments</span>
              </div>
              <div className="hidden sm:grid grid-cols-5 px-5 py-2.5 border-b border-neutral-100 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                <span>Booking</span>
                <span>Experience Date</span>
                <span>Guest</span>
                <span>Status</span>
                <span className="text-right">Amount</span>
              </div>
              {upcomingBookings
                .sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
                .map(b => (
                  <div key={b.id} className="flex sm:grid sm:grid-cols-5 flex-col sm:flex-row px-5 py-4 border-b border-neutral-50 hover:bg-neutral-50 transition-colors items-start sm:items-center gap-2 sm:gap-0">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-900 truncate">{b.item_title}</p>
                        <p className="text-xs text-neutral-400">{b.booking_ref}</p>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-600 hidden sm:block">
                      {new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-neutral-600 hidden sm:block truncate">{b.traveler_name}</span>
                    <span className="hidden sm:block">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        Held until {new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-amber-600 sm:text-right self-end sm:self-auto">${hostEarning(b).toFixed(2)}</span>
                  </div>
                ))}
              <div className="px-5 py-3 bg-amber-50 flex justify-between items-center">
                <span className="text-xs font-semibold text-amber-700">Total Upcoming</span>
                <span className="text-sm font-bold text-amber-600">${upcomingEarnings.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-neutral-700">Released Payments</span>
            </div>
            {loading ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mx-auto" />
              </div>
            ) : releasedBookings.length === 0 ? (
              <div className="py-16 text-center">
                <Wallet className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs text-neutral-400">No released payments yet</p>
              </div>
            ) : (
              <div>
                <div className="hidden sm:grid grid-cols-4 px-5 py-2.5 border-b border-neutral-100 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  <span>Booking</span>
                  <span>Experience Date</span>
                  <span>Guest</span>
                  <span className="text-right">Amount</span>
                </div>
                {releasedBookings
                  .sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())
                  .map(b => (
                    <div key={b.id} className="flex sm:grid sm:grid-cols-4 flex-col sm:flex-row px-5 py-4 border-b border-neutral-50 hover:bg-neutral-50 transition-colors items-start sm:items-center gap-2 sm:gap-0">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <ArrowDownRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-neutral-900 truncate">{b.item_title}</p>
                          <p className="text-xs text-neutral-400">{b.booking_ref}</p>
                        </div>
                      </div>
                      <span className="text-xs text-neutral-600 hidden sm:block">
                        {new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-xs text-neutral-600 hidden sm:block truncate">{b.traveler_name}</span>
                      <span className="text-xs font-semibold text-emerald-600 sm:text-right self-end sm:self-auto">+${hostEarning(b).toFixed(2)}</span>
                    </div>
                  ))}
                <div className="px-5 py-3 bg-neutral-50 flex justify-between items-center">
                  <span className="text-xs font-semibold text-neutral-700">Total Released</span>
                  <span className="text-sm font-bold text-emerald-600">${totalEarnings.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showWithdraw && (
        <WithdrawModal available={availableBalance} onClose={() => setShowWithdraw(false)} onSubmit={handleWithdraw} />
      )}
    </div>
  );
}
