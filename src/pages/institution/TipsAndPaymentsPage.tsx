import { useState, useEffect } from 'react';
import { ArrowLeft, Star, DollarSign, Users, TrendingUp } from 'lucide-react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

interface Guide {
  id: string;
  name: string;
  profile_picture: string | null;
  totalTips: number;
  totalSalary: number;
  reviewCount: number;
  avgRating: number;
}

interface TipRecord {
  id: string;
  tip_amount: number;
  status: string;
  created_at: string;
  guide_name?: string;
}

interface SalaryRecord {
  id: string;
  amount: number;
  description: string;
  payment_method: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  guide_name?: string;
}

export function TipsAndPaymentsPage() {
  const { user } = useAuth();
  const portalUser = user as PortalUser | null;
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [activeTab, setActiveTab] = useState<'tips' | 'salaries'>('tips');
  const [tips, setTips] = useState<TipRecord[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{ type: string; amount: number; guide: string; date: string }>>([]);

  const [tipAmount, setTipAmount] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryDesc, setSalaryDesc] = useState('');
  const [salaryMethod, setSalaryMethod] = useState('bank_transfer');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (portalUser?.id) loadOverview(); }, [portalUser?.id]);

  async function loadOverview() {
    if (!portalUser?.id) return;
    setLoading(true);

    const { data: guideRows } = await supabase
      .from('guides')
      .select('id, name, profile_picture')
      .eq('portal_user_id', portalUser.id)
      .eq('available', true);

    if (!guideRows || guideRows.length === 0) {
      setGuides([]);
      setLoading(false);
      return;
    }

    const guideIds = guideRows.map(g => g.id);
    const [tipsRes, salariesRes, reviewsRes] = await Promise.all([
      supabase.from('guide_tips').select('guide_id, tip_amount, created_at').eq('institution_id', portalUser.id),
      supabase.from('guide_salary_payments').select('guide_id, amount, created_at').eq('institution_id', portalUser.id),
      supabase.from('attraction_reviews').select('guide_id, rating').eq('institution_id', portalUser.id).in('guide_id', guideIds),
    ]);

    const tipsByGuide: Record<string, number> = {};
    const salaryByGuide: Record<string, number> = {};
    const reviewsByGuide: Record<string, { count: number; total: number }> = {};

    (tipsRes.data || []).forEach((t: any) => {
      tipsByGuide[t.guide_id] = (tipsByGuide[t.guide_id] || 0) + Number(t.tip_amount);
    });
    (salariesRes.data || []).forEach((s: any) => {
      salaryByGuide[s.guide_id] = (salaryByGuide[s.guide_id] || 0) + Number(s.amount);
    });
    (reviewsRes.data || []).forEach((r: any) => {
      if (!reviewsByGuide[r.guide_id]) reviewsByGuide[r.guide_id] = { count: 0, total: 0 };
      reviewsByGuide[r.guide_id].count += 1;
      reviewsByGuide[r.guide_id].total += r.rating;
    });

    setGuides(guideRows.map(g => ({
      id: g.id,
      name: g.name,
      profile_picture: g.profile_picture,
      totalTips: tipsByGuide[g.id] || 0,
      totalSalary: salaryByGuide[g.id] || 0,
      reviewCount: reviewsByGuide[g.id]?.count || 0,
      avgRating: reviewsByGuide[g.id] ? reviewsByGuide[g.id].total / reviewsByGuide[g.id].count : 0,
    })));

    const activity: Array<{ type: string; amount: number; guide: string; date: string }> = [];
    const guideMap = Object.fromEntries(guideRows.map(g => [g.id, g.name]));
    (tipsRes.data || []).forEach((t: any) => {
      activity.push({ type: 'tip', amount: Number(t.tip_amount), guide: guideMap[t.guide_id] || 'Guide', date: t.created_at });
    });
    (salariesRes.data || []).forEach((s: any) => {
      activity.push({ type: 'salary', amount: Number(s.amount), guide: guideMap[s.guide_id] || 'Guide', date: s.created_at });
    });
    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecentActivity(activity.slice(0, 10));

    setLoading(false);
  }

  async function loadGuideDetail(guide: Guide) {
    if (!portalUser?.id) return;
    setSelectedGuide(guide);
    setActiveTab('tips');

    const [tipsRes, salariesRes] = await Promise.all([
      supabase.from('guide_tips').select('*').eq('institution_id', portalUser.id).eq('guide_id', guide.id).order('created_at', { ascending: false }),
      supabase.from('guide_salary_payments').select('*').eq('institution_id', portalUser.id).eq('guide_id', guide.id).order('created_at', { ascending: false }),
    ]);
    setTips(tipsRes.data || []);
    setSalaries(salariesRes.data || []);
  }

  async function handleCreateTip() {
    if (!selectedGuide || !portalUser?.id || !tipAmount) return;
    setSubmitting(true);
    await supabase.from('guide_tips').insert({
      institution_id: portalUser.id,
      guide_id: selectedGuide.id,
      tip_amount: parseFloat(tipAmount),
      status: 'paid',
      created_by: portalUser.id,
      paid_at: new Date().toISOString(),
    });
    setTipAmount('');
    setSubmitting(false);
    loadGuideDetail(selectedGuide);
  }

  async function handleCreateSalary() {
    if (!selectedGuide || !portalUser?.id || !salaryAmount) return;
    setSubmitting(true);
    await supabase.from('guide_salary_payments').insert({
      institution_id: portalUser.id,
      guide_id: selectedGuide.id,
      amount: parseFloat(salaryAmount),
      description: salaryDesc || 'Monthly salary',
      payment_method: salaryMethod,
      status: 'completed',
      processed_at: new Date().toISOString(),
    });
    setSalaryAmount('');
    setSalaryDesc('');
    setSubmitting(false);
    loadGuideDetail(selectedGuide);
  }

  const totalTipsDisbursed = guides.reduce((s, g) => s + g.totalTips, 0);
  const totalSalariesPaid = guides.reduce((s, g) => s + g.totalSalary, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedGuide) {
    return (
      <div>
        <button onClick={() => { setSelectedGuide(null); loadOverview(); }} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Overview
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
            {selectedGuide.profile_picture ? (
              <img src={selectedGuide.profile_picture} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-neutral-600">{selectedGuide.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-medium text-neutral-900">{selectedGuide.name}</h1>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span>Tips: ${selectedGuide.totalTips.toFixed(2)}</span>
              <span>Salary: ${selectedGuide.totalSalary.toFixed(2)}</span>
              {selectedGuide.reviewCount > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  {selectedGuide.avgRating.toFixed(1)} ({selectedGuide.reviewCount})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-6 w-fit">
          {(['tips', 'salaries'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 text-xs font-medium rounded-lg transition-all capitalize ${activeTab === tab ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'tips' && (
          <div className="space-y-6">
            <Card className="p-5 bg-amber-50">
              <h3 className="text-sm font-medium text-neutral-900 mb-4">Create Tip</h3>
              <div className="flex gap-3">
                <input type="number" value={tipAmount} onChange={e => setTipAmount(e.target.value)} placeholder="Amount" className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                <button onClick={handleCreateTip} disabled={submitting || !tipAmount} className="px-6 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40">
                  {submitting ? '...' : 'Send Tip'}
                </button>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-medium text-neutral-900 mb-4">Tip History</h3>
              {tips.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">No tips recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {tips.map(tip => (
                    <div key={tip.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                      <div>
                        <span className="text-sm text-neutral-900">${Number(tip.tip_amount).toFixed(2)}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded border capitalize ${tip.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {tip.status}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400">{new Date(tip.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'salaries' && (
          <div className="space-y-6">
            <Card className="p-5 bg-emerald-50">
              <h3 className="text-sm font-medium text-neutral-900 mb-4">Process Salary Payment</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)} placeholder="Amount" className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                  <select value={salaryMethod} onChange={e => setSalaryMethod(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400">
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
                <input value={salaryDesc} onChange={e => setSalaryDesc(e.target.value)} placeholder="Description (e.g., Monthly salary - Feb 2026)" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                <button onClick={handleCreateSalary} disabled={submitting || !salaryAmount} className="w-full py-2.5 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40">
                  {submitting ? 'Processing...' : 'Process Payment'}
                </button>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-medium text-neutral-900 mb-4">Salary History</h3>
              {salaries.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">No salary payments recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {salaries.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                      <div>
                        <span className="text-sm text-neutral-900">${Number(s.amount).toFixed(2)}</span>
                        <span className="text-xs text-neutral-500 ml-2">{s.description}</span>
                        <span className="text-xs text-neutral-400 ml-2 capitalize">{s.payment_method.replace('_', ' ')}</span>
                      </div>
                      <span className="text-xs text-neutral-400">{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-medium text-neutral-900 mb-6">Tips & Payments</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 bg-amber-50">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-neutral-500">Tips Disbursed</span>
          </div>
          <div className="text-2xl font-medium text-neutral-900">${totalTipsDisbursed.toFixed(2)}</div>
        </Card>
        <Card className="p-5 bg-emerald-50">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-neutral-500">Salaries Paid</span>
          </div>
          <div className="text-2xl font-medium text-neutral-900">${totalSalariesPaid.toFixed(2)}</div>
        </Card>
        <Card className="p-5 bg-sky-50">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-4 h-4 text-sky-600" />
            <span className="text-xs text-neutral-500">Active Guides</span>
          </div>
          <div className="text-2xl font-medium text-neutral-900">{guides.length}</div>
        </Card>
      </div>

      {guides.length === 0 ? (
        <Card className="p-12 text-center bg-neutral-50">
          <Users className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No active guides found. Add guides first.</p>
        </Card>
      ) : (
        <Card className="p-5 mb-8">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">Guide Overview</h3>
          <div className="space-y-3">
            {guides.map(guide => (
              <div key={guide.id} onClick={() => loadGuideDetail(guide)} className="flex items-center justify-between p-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
                    {guide.profile_picture ? (
                      <img src={guide.profile_picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-neutral-600">{guide.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-900">{guide.name}</div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      {guide.reviewCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          {guide.avgRating.toFixed(1)}
                        </span>
                      )}
                      <span>{guide.reviewCount} reviews</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-neutral-500">Total Paid</div>
                  <div className="text-sm font-medium text-neutral-900">${(guide.totalTips + guide.totalSalary).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {recentActivity.length > 0 && (
        <Card className="p-5 bg-neutral-50">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${item.type === 'tip' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {item.type}
                  </span>
                  <span className="text-sm text-neutral-900">{item.guide}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-neutral-900">${item.amount.toFixed(2)}</span>
                  <span className="text-xs text-neutral-400">{new Date(item.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
