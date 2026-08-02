import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, DollarSign, CheckCircle, X, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { formatCurrency } from '../../lib/csvExport';

const TEAL = '#0d9488';

interface Transaction {
  id: string;
  type: 'earning' | 'payout' | 'bonus';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
}

interface EarningsStats {
  today: number;
  todayTrips: number;
  week: number;
  weekTrips: number;
  month: number;
  monthTrips: number;
  available: number;
  pending: number;
  totalEarned: number;
}

function WithdrawModal({
  available,
  onClose,
  onSubmit,
}: {
  available: number;
  onClose: () => void;
  onSubmit: (amount: number, method: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mobile');
  const fee = 500; // RWF
  const min = 5000; // RWF
  const parsed = parseFloat(amount) || 0;
  const net = parsed - fee;
  const valid = parsed >= min && parsed <= available;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Withdraw Earnings</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="rounded-xl p-4" style={{ background: `${TEAL}10` }}>
              <p className="text-xs mb-1" style={{ color: TEAL }}>Available to withdraw</p>
              <p className="text-2xl font-bold" style={{ color: TEAL }}>{formatCurrency(available)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (RWF)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min ${formatCurrency(min)}`}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {parsed > 0 && parsed < min && (
                <p className="text-xs text-red-600 mt-1">Minimum withdrawal is {formatCurrency(min)}</p>
              )}
              {parsed > available && (
                <p className="text-xs text-red-600 mt-1">Exceeds available balance</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment method</label>
              <div className="space-y-2">
                {[
                  { value: 'mobile', label: 'Mobile Money (MTN/Airtel)', sub: 'Processed within 24 hours' },
                  { value: 'bank', label: 'Bank Transfer', sub: 'Processed in 2-3 business days' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                      method === opt.value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="method"
                      value={opt.value}
                      checked={method === opt.value}
                      onChange={() => setMethod(opt.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {valid && (
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Withdrawal amount</span>
                  <span>{formatCurrency(parsed)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Processing fee</span>
                  <span>-{formatCurrency(fee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>You receive</span>
                  <span style={{ color: TEAL }}>{formatCurrency(net)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 font-medium border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!valid}
              onClick={() => {
                onSubmit(parsed, method);
                onClose();
              }}
              className="flex-1 py-2.5 font-medium text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: TEAL }}
            >
              {valid ? `Withdraw ${formatCurrency(net)}` : 'Withdraw'}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export function DriverWalletPage() {
  const [stats, setStats] = useState<EarningsStats>({
    today: 0,
    todayTrips: 0,
    week: 0,
    weekTrips: 0,
    month: 0,
    monthTrips: 0,
    available: 0,
    pending: 0,
    totalEarned: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Mock data
      setStats({
        today: 25000,
        todayTrips: 4,
        week: 145000,
        weekTrips: 23,
        month: 580000,
        monthTrips: 92,
        available: 425000,
        pending: 155000,
        totalEarned: 2850000,
      });

      setTransactions([
        {
          id: 'txn-1',
          type: 'earning',
          amount: 12000,
          description: 'Trip to Volcanoes National Park',
          status: 'completed',
          created_at: new Date().toISOString(),
        },
        {
          id: 'txn-2',
          type: 'earning',
          amount: 45000,
          description: 'Airport pickup - Round trip',
          status: 'completed',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'txn-3',
          type: 'payout',
          amount: -200000,
          description: 'Withdrawal to MTN Mobile Money',
          status: 'completed',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'txn-4',
          type: 'bonus',
          amount: 15000,
          description: 'Gold driver bonus',
          status: 'completed',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'txn-5',
          type: 'earning',
          amount: 35000,
          description: 'Lake Kivu tour transport',
          status: 'pending',
          created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = (amount: number, method: string) => {
    console.log('Withdraw:', amount, method);
    // In production, call API to create withdrawal
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your earnings and withdrawals</p>
        </div>
        <button
          onClick={() => setShowWithdraw(true)}
          className="px-4 py-2 rounded-lg font-medium text-white transition-colors"
          style={{ background: TEAL }}
        >
          Withdraw
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-white border border-slate-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${TEAL}15` }}>
              <TrendingUp className="w-4 h-4" style={{ color: TEAL }} />
            </div>
            <span className="text-xs font-medium text-slate-500">Today</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.today)}</div>
          <div className="text-xs text-slate-500 mt-1">{stats.todayTrips} trips</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-5 bg-white border border-slate-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-xs font-medium text-slate-500">This Week</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.week)}</div>
          <div className="text-xs text-slate-500 mt-1">{stats.weekTrips} trips</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${TEAL}, #065f46)` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-emerald-200" />
            <span className="text-xs font-medium text-emerald-200">Available</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(stats.available)}</div>
          <div className="text-xs text-emerald-200 mt-1">Ready to withdraw</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-5 bg-white border border-slate-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-xs font-medium text-slate-500">Pending</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.pending)}</div>
          <div className="text-xs text-slate-500 mt-1">Processing</div>
        </motion.div>
      </div>

      {/* Total Earned Banner */}
      <div className="rounded-2xl p-5 bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Total Earned (All Time)</div>
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalEarned)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">This Month</div>
            <div className="text-xl font-semibold" style={{ color: TEAL }}>
              {formatCurrency(stats.month)}
            </div>
            <div className="text-xs text-slate-500">{stats.monthTrips} trips</div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Transactions</h2>
        <div className="space-y-3">
          {transactions.map((txn) => (
            <motion.div
              key={txn.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  txn.type === 'earning'
                    ? 'bg-emerald-50'
                    : txn.type === 'payout'
                    ? 'bg-blue-50'
                    : 'bg-amber-50'
                }`}
              >
                {txn.type === 'earning' && <ArrowDownLeft className="w-5 h-5 text-emerald-500" />}
                {txn.type === 'payout' && <ArrowUpRight className="w-5 h-5 text-blue-500" />}
                {txn.type === 'bonus' && <TrendingUp className="w-5 h-5 text-amber-500" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{txn.description}</div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>{new Date(txn.created_at).toLocaleDateString()}</span>
                  {txn.status === 'completed' && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Completed
                    </span>
                  )}
                  {txn.status === 'pending' && (
                    <span className="text-amber-600">Pending</span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`font-semibold ${
                    txn.amount >= 0 ? 'text-emerald-600' : 'text-slate-900'
                  }`}
                >
                  {txn.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(txn.amount))}
                </div>
                <div className="text-xs text-slate-500 capitalize">{txn.type}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdraw && (
        <WithdrawModal
          available={stats.available}
          onClose={() => setShowWithdraw(false)}
          onSubmit={handleWithdraw}
        />
      )}
    </div>
  );
}
