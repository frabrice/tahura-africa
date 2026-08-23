import { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingUp, DollarSign, Star, CheckCircle, X, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getGuideContext } from '../../lib/useGuideData';

interface TipRecord {
  id: string;
  tip_amount: number;
  status: string;
  created_at: string;
}

interface SalaryRecord {
  id: string;
  amount: number;
  description: string;
  payment_method: string;
  status: string;
  created_at: string;
}

interface AttractionFeeRecord {
  id: string;
  guide_earning: number;
  created_at: string;
  item_title: string | null;
}

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

export function GuideWalletPage() {
  const ctx = getGuideContext();
  const [tips, setTips] = useState<TipRecord[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [attractionFees, setAttractionFees] = useState<AttractionFeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'statements'>('overview');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const [availableBalance, setAvailableBalance] = useState(0);

  useEffect(() => { if (ctx?.id) loadWalletData(); }, [ctx?.id]);

  async function loadWalletData() {
    if (!ctx?.id) return;
    setLoading(true);
    const [tipsRes, salariesRes, feesRes, balanceRes] = await Promise.all([
      supabase.from('guide_tips').select('id, tip_amount, status, created_at').eq('guide_id', ctx.id).order('created_at', { ascending: false }),
      supabase.from('guide_salary_payments').select('id, amount, description, payment_method, status, created_at').eq('guide_id', ctx.id).order('created_at', { ascending: false }),
      supabase.from('payout_ledger').select('id, guide_earning, created_at, bookings:booking_id(item_title)').eq('guide_id', ctx.id).eq('status', 'active').gt('guide_earning', 0).order('created_at', { ascending: false }),
      supabase.rpc('fn_guide_available_balance', { p_guide_id: ctx.id }),
    ]);
    setTips(tipsRes.data || []);
    setSalaries(salariesRes.data || []);
    setAttractionFees((feesRes.data || []).map((r: any) => ({ id: r.id, guide_earning: Number(r.guide_earning), created_at: r.created_at, item_title: r.bookings?.item_title || null })));
    setAvailableBalance(Number(balanceRes.data) || 0);
    setLoading(false);
  }

  // Status values are 'pending' | 'paid' | 'cancelled' on both tables (a
  // prior version of this page filtered salaries on 'completed', a status
  // the DB CHECK constraint never allows — salary totals always read $0).
  const totalTips = useMemo(() => tips.filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.tip_amount), 0), [tips]);
  const totalSalary = useMemo(() => salaries.filter(s => s.status === 'paid').reduce((s, r) => s + Number(r.amount), 0), [salaries]);
  const totalAttractionFees = useMemo(() => attractionFees.reduce((s, r) => s + r.guide_earning, 0), [attractionFees]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    tips.filter(t => t.status === 'paid').forEach(t => {
      const key = new Date(t.created_at).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      months[key] = (months[key] || 0) + Number(t.tip_amount);
    });
    salaries.filter(s => s.status === 'paid').forEach(s => {
      const key = new Date(s.created_at).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      months[key] = (months[key] || 0) + Number(s.amount);
    });
    attractionFees.forEach(r => {
      const key = new Date(r.created_at).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      months[key] = (months[key] || 0) + r.guide_earning;
    });
    return Object.entries(months).slice(-6).map(([month, amount]) => ({ month, amount }));
  }, [tips, salaries, attractionFees]);

  const maxMonthly = useMemo(() => Math.max(...monthlyData.map(m => m.amount), 1), [monthlyData]);

  const allTransactions = useMemo(() => {
    const items: Array<{ id: string; type: string; amount: number; label: string; date: string }> = [];
    tips.filter(t => t.status === 'paid').forEach(t => items.push({ id: t.id, type: 'tip', amount: Number(t.tip_amount), label: 'Tip Received', date: t.created_at }));
    salaries.filter(s => s.status === 'paid').forEach(s => items.push({ id: s.id, type: 'salary', amount: Number(s.amount), label: s.description || 'Salary Payment', date: s.created_at }));
    attractionFees.forEach(r => items.push({ id: r.id, type: 'guide fee', amount: r.guide_earning, label: r.item_title ? `Guide fee — ${r.item_title}` : 'Guide fee', date: r.created_at }));
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [tips, salaries, attractionFees]);

  const handleWithdraw = async (amount: number, method: string): Promise<string | null> => {
    if (!ctx?.id) return 'Not signed in.';
    const fee = 2.5;
    const { error } = await supabase.from('withdrawal_requests').insert({
      guide_id: ctx.id,
      amount,
      fee,
      net_amount: amount - fee,
      payout_method: method === 'mobile' ? 'mobile' : 'bank',
    });
    if (error) return error.message || 'Could not submit withdrawal request.';
    setWithdrawSuccess(true);
    setTimeout(() => setWithdrawSuccess(false), 5000);
    loadWalletData();
    return null;
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Wallet</h1>
        <p className="text-sm text-neutral-500 mt-1">Tips and salary payments from your institution</p>
      </div>

      {withdrawSuccess && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-6">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-700">Withdrawal request submitted for review. You'll be notified once it's approved and paid out.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          <p className="text-xs text-emerald-500 mt-0.5">Guide fees + Tips + Salary</p>
        </div>
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
          <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center mb-3">
            <Wallet className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-teal-700">${totalAttractionFees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-teal-600 mt-0.5">Attraction Guide Fees</p>
          <p className="text-xs text-teal-500 mt-0.5">From {attractionFees.length} bookings</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
            <Star className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700">${totalTips.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-amber-600 mt-0.5">Total Tips Received</p>
          <p className="text-xs text-amber-500 mt-0.5">From {tips.filter(t => t.status === 'paid').length} tips</p>
        </div>
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5">
          <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-sky-700">${totalSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-sky-600 mt-0.5">Total Salary Received</p>
          <p className="text-xs text-sky-500 mt-0.5">From {salaries.filter(s => s.status === 'paid').length} payments</p>
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
                    <div className="w-full bg-teal-400 rounded-t-lg" style={{ height: `${Math.max((amount / maxMonthly) * 120, 4)}px` }} />
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
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : allTransactions.length === 0 ? (
            <div className="py-16 text-center">
              <Wallet className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs text-neutral-400">No transactions yet</p>
            </div>
          ) : (
            <div>
              <div className="hidden sm:grid grid-cols-4 px-5 py-3 border-b border-neutral-100 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                <span>Type</span>
                <span>Description</span>
                <span>Date</span>
                <span className="text-right">Amount</span>
              </div>
              {allTransactions.map(tx => (
                <div key={tx.id} className="flex sm:grid sm:grid-cols-4 flex-col px-5 py-4 border-b border-neutral-50 hover:bg-neutral-50 transition-colors items-start sm:items-center gap-2 sm:gap-0">
                  <span className={`text-xs px-2 py-0.5 rounded capitalize w-fit ${
                    tx.type === 'tip' ? 'bg-amber-50 text-amber-700' :
                    tx.type === 'guide fee' ? 'bg-teal-50 text-teal-700' :
                    'bg-emerald-50 text-emerald-700'
                  }`}>
                    {tx.type}
                  </span>
                  <span className="text-xs text-neutral-900">{tx.label}</span>
                  <span className="text-xs text-neutral-600 hidden sm:block">
                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 sm:text-right">+${tx.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="px-5 py-4 bg-neutral-50 flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-700">Total Balance</span>
                <span className="text-sm font-bold text-emerald-600">${availableBalance.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {showWithdraw && (
        <WithdrawModal available={availableBalance} onClose={() => setShowWithdraw(false)} onSubmit={handleWithdraw} />
      )}
    </div>
  );
}
