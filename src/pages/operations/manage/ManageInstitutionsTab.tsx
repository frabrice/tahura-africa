import { useState, useEffect } from 'react';
import { Search, ChevronRight, ArrowLeft, Flag, ShieldOff, Trash2, AlertTriangle, Building2, Users, DollarSign, Calendar, TrendingUp, Star, Award, Plus, Wallet, X, Loader2, Pencil, Check } from 'lucide-react';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { supabase } from '../../../lib/supabase';
import { sendEmail } from '../../../lib/sendEmail';
import { useAuth } from '../../../contexts/AuthContext';
import { PortalUser } from '../../../lib/auth';
import { FlagContentModal } from '../../../components/FlagContentModal';
import { CreateAttractionForm } from '../../../components/CreateAttractionForm';
import { CreateProgramForm } from '../../../components/CreateProgramForm';
import { SideDrawer } from '../../../components/SideDrawer';

interface Props {
  drillInstitutionId: string | null;
  onClearDrill: () => void;
}

type Period = '30d' | '90d' | 'all';

export function ManageInstitutionsTab({ drillInstitutionId, onClearDrill }: Props) {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadInstitutions(); }, []);
  useEffect(() => { if (drillInstitutionId) setSelectedId(drillInstitutionId); }, [drillInstitutionId]);

  async function loadInstitutions() {
    setLoading(true);
    const { data: users } = await supabase
      .from('portal_users')
      .select('id, name, email, is_active, created_at')
      .eq('portal_type', 'institution')
      .order('created_at', { ascending: false });

    if (users) {
      const enriched = await Promise.all(
        users.map(async (u) => {
          const [profileRes, programsRes, guidesRes] = await Promise.all([
            supabase.from('institution_profiles').select('name, type, location, published, is_flagged').eq('portal_user_id', u.id).maybeSingle(),
            supabase.from('programs').select('id').eq('portal_user_id', u.id),
            supabase.from('guides').select('id').eq('portal_user_id', u.id),
          ]);
          return {
            ...u,
            profile: profileRes.data,
            programsCount: programsRes.data?.length || 0,
            guidesCount: guidesRes.data?.length || 0,
          };
        })
      );
      setInstitutions(enriched);
    }
    setLoading(false);
  }

  if (selectedId) {
    return (
      <InstitutionDetailView
        institutionId={selectedId}
        onBack={() => { setSelectedId(null); onClearDrill(); }}
        onRefresh={loadInstitutions}
      />
    );
  }

  const filtered = institutions.filter(i => {
    const q = filter.toLowerCase();
    return !q || (i.profile?.name || i.name || '').toLowerCase().includes(q) || (i.email || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-neutral-500">{institutions.length} attraction{institutions.length !== 1 ? 's' : ''} created</div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter by name..."
              className="pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 w-64"
            />
          </div>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Attraction
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Location</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">Published</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">Programs</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">Guides</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">Flagged</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Joined</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-neutral-500">
                    {filter ? 'No attractions match your filter' : 'No attractions created yet'}
                  </td>
                </tr>
              ) : (
                filtered.map(i => (
                  <tr
                    key={i.id}
                    onClick={() => setSelectedId(i.id)}
                    className="hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-neutral-900">{i.profile?.name || i.name || 'Unnamed'}</td>
                    <td className="px-4 py-3 text-neutral-600 capitalize">{i.profile?.type?.replace('_', ' ') || '-'}</td>
                    <td className="px-4 py-3 text-neutral-600">{i.profile?.location || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        i.profile?.published ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {i.profile?.published ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-neutral-600">{i.programsCount}</td>
                    <td className="px-4 py-3 text-center text-neutral-600">{i.guidesCount}</td>
                    <td className="px-4 py-3 text-center">
                      {i.profile?.is_flagged && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-medium">
                          <Flag className="w-3 h-3" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    <td className="px-3 py-3">
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <SideDrawer isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Attraction">
        <CreateAttractionForm
          onCancel={() => setShowCreate(false)}
          onComplete={() => { setShowCreate(false); loadInstitutions(); }}
        />
      </SideDrawer>
    </div>
  );
}

function InstitutionDetailView({ institutionId, onBack, onRefresh }: { institutionId: string; onBack: () => void; onRefresh: () => void }) {
  const { user } = useAuth();
  const opsUser = user as PortalUser;
  const [profile, setProfile] = useState<any>(null);
  const [portalUser, setPortalUser] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [guides, setGuides] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeFlag, setActiveFlag] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeSection, setActiveSection] = useState<'stats' | 'programs' | 'guides' | 'balance'>('stats');
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [editingGuideFee, setEditingGuideFee] = useState(false);
  const [guideFeeInput, setGuideFeeInput] = useState('');
  const [savingGuideFee, setSavingGuideFee] = useState(false);
  const [balance, setBalance] = useState(0);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [showSettleModal, setShowSettleModal] = useState(false);

  useEffect(() => { loadData(); }, [institutionId]);

  async function loadData() {
    setLoading(true);
    const [profileRes, userRes, programsRes, guidesRes, bookingsRes, flagRes, balanceRes, settlementsRes] = await Promise.all([
      supabase.from('institution_profiles').select('*').eq('portal_user_id', institutionId).maybeSingle(),
      supabase.from('portal_users').select('id, portal_type, email, user_id_code, name, phone, contact_person, country, province, specific_location, specialty, tags, is_active, created_at, created_by, updated_at').eq('id', institutionId).maybeSingle(),
      supabase.from('programs').select('*').eq('portal_user_id', institutionId).order('created_at', { ascending: false }),
      supabase.from('guides').select('*').eq('portal_user_id', institutionId).order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').eq('institution_id', institutionId).order('booking_date', { ascending: false }),
      supabase.from('content_flags').select('*').eq('target_type', 'attraction').eq('status', 'active').maybeSingle(),
      supabase.rpc('fn_institution_available_balance', { p_institution_id: institutionId }),
      supabase.from('institution_settlements').select('*').eq('institution_id', institutionId).order('created_at', { ascending: false }),
    ]);

    setProfile(profileRes.data);
    setPortalUser(userRes.data);
    setPrograms(programsRes.data || []);
    setGuides(guidesRes.data || []);
    setBookings(bookingsRes.data || []);
    setBalance(Number(balanceRes.data) || 0);
    setSettlements(settlementsRes.data || []);
    setGuideFeeInput(profileRes.data?.guide_fee_amount != null ? String(profileRes.data.guide_fee_amount) : '');

    if (flagRes.data && profileRes.data && flagRes.data.target_id === profileRes.data.id) {
      setActiveFlag(flagRes.data);
    } else {
      setActiveFlag(null);
    }
    setLoading(false);
  }

  async function saveGuideFee() {
    const fee = parseFloat(guideFeeInput);
    if (guideFeeInput.trim() === '' || isNaN(fee) || fee < 0 || !profile) return;
    setSavingGuideFee(true);
    await supabase.from('institution_profiles').update({ guide_fee_amount: fee }).eq('id', profile.id);
    setSavingGuideFee(false);
    setEditingGuideFee(false);
    loadData();
  }

  async function deleteProgram(id: string) {
    if (!confirm('Delete this program?')) return;
    await supabase.from('programs').delete().eq('id', id);
    loadData();
  }

  async function handleUnflag() {
    if (!activeFlag || !profile) return;
    await supabase.from('content_flags').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', activeFlag.id);
    await supabase.from('institution_profiles').update({ is_flagged: false }).eq('id', profile.id);
    await supabase.from('notifications').insert({
      recipient_portal_user_id: institutionId,
      type: 'attraction_unflagged',
      title: `Flag removed from "${profile.name}"`,
      message: 'The flag on your attraction profile has been resolved. Your profile is now visible to travelers again.',
      metadata: { target_type: 'attraction', target_id: profile.id, target_title: profile.name },
    });
    if (portalUser?.email || profile?.email) {
      sendEmail({ template: 'content_resolved', recipient_email: portalUser?.email || profile.email, recipient_name: portalUser?.name || profile?.name || '', data: { target_type: 'attraction', target_title: profile.name } });
    }
    loadData();
    onRefresh();
  }

  async function handleDelete() {
    if (!profile) return;
    setDeleting(true);
    await supabase.from('institution_profiles').update({ published: false }).eq('id', profile.id);
    await supabase.from('notifications').insert({
      recipient_portal_user_id: institutionId,
      type: 'attraction_removed',
      title: `Your attraction "${profile.name}" has been unpublished`,
      message: 'Your attraction profile has been unpublished by the operations team. If you believe this was in error, please contact support.',
      metadata: { target_type: 'attraction', target_id: profile.id, target_title: profile.name },
    });
    if (portalUser?.email || profile?.email) {
      sendEmail({ template: 'content_removed', recipient_email: portalUser?.email || profile.email, recipient_name: portalUser?.name || profile?.name || '', data: { target_type: 'attraction', target_title: profile.name } });
    }
    setDeleting(false);
    onBack();
    onRefresh();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const cutoff = period === '30d'
    ? new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
    : period === '90d'
    ? new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0]
    : '2000-01-01';

  const filtered = bookings.filter(b => (b.booking_date || '').split('T')[0] >= cutoff);
  const active = filtered.filter(b => b.status !== 'cancelled');
  const completed = filtered.filter(b => b.status === 'completed');
  const totalVisitors = active.reduce((s, b) => s + (b.guests || 0), 0);
  const totalRevenue = completed.reduce((s, b) => s + (b.total_amount || 0), 0);
  const avgGroupSize = active.length > 0 ? (totalVisitors / active.length).toFixed(1) : '0';
  const completionRate = active.length > 0 ? Math.round((completed.length / active.length) * 100) : 0;

  const monthMap = new Map<string, { label: string; visitors: number; revenue: number; bookings: number }>();
  active.forEach(b => {
    const d = new Date(b.booking_date);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const ex = monthMap.get(label) || { label, visitors: 0, revenue: 0, bookings: 0 };
    monthMap.set(label, { label, visitors: ex.visitors + (b.guests || 0), revenue: ex.revenue + (b.total_amount || 0), bookings: ex.bookings + 1 });
  });
  const monthlyStats = Array.from(monthMap.values()).slice(-6).reverse();
  const maxMonthVisitors = monthlyStats.length > 0 ? Math.max(...monthlyStats.map(m => m.visitors), 1) : 1;

  const programPerfMap = new Map<string, { name: string; bookings: number; visitors: number; revenue: number }>();
  active.forEach(b => {
    const name = b.package_name || 'General Visit';
    const ex = programPerfMap.get(name) || { name, bookings: 0, visitors: 0, revenue: 0 };
    programPerfMap.set(name, { name, bookings: ex.bookings + 1, visitors: ex.visitors + (b.guests || 0), revenue: ex.revenue + (b.total_amount || 0) });
  });
  const programPerf = Array.from(programPerfMap.values()).sort((a, b) => b.visitors - a.visitors).slice(0, 5);

  const guideStatsMap = new Map<string, { name: string; tours: number; visitors: number }>();
  active.filter(b => b.guide_name).forEach(b => {
    const name = b.guide_name!;
    const ex = guideStatsMap.get(name) || { name, tours: 0, visitors: 0 };
    guideStatsMap.set(name, { name, tours: ex.tours + 1, visitors: ex.visitors + (b.guests || 0) });
  });
  const topGuides = Array.from(guideStatsMap.values()).sort((a, b) => b.tours - a.tours).slice(0, 5);

  const sections = [
    { id: 'stats' as const, label: 'Statistics' },
    { id: 'programs' as const, label: `Programs (${programs.length})` },
    { id: 'guides' as const, label: `Guides (${guides.length})` },
    { id: 'balance' as const, label: 'Balance' },
  ];

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Attractions
      </button>

      <Card className="p-5 mb-6 bg-slate-50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-base font-semibold text-neutral-900">{profile?.name || portalUser?.name || 'Unnamed'}</h2>
              {profile?.type && (
                <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-[10px] font-medium capitalize">{profile.type.replace('_', ' ')}</span>
              )}
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                profile?.published ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
              }`}>
                {profile?.published ? 'Published' : 'Unpublished'}
              </span>
              {profile?.is_flagged && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-medium">
                  <Flag className="w-3 h-3" />
                  Flagged
                </span>
              )}
            </div>
            {profile?.tagline && <p className="text-xs text-neutral-500">{profile.tagline}</p>}
          </div>
          <div className="flex items-center gap-2">
            {profile?.is_flagged ? (
              <button onClick={handleUnflag} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                <ShieldOff className="w-3.5 h-3.5" />
                Remove Flag
              </button>
            ) : profile?.id ? (
              <button onClick={() => setShowFlagModal(true)} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                <Flag className="w-3.5 h-3.5" />
                Flag Attraction
              </button>
            ) : null}
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              Unpublish
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-neutral-500">Location</span>
            <div className="text-neutral-900 font-medium mt-0.5">{profile?.location || '-'}</div>
          </div>
          <div>
            <span className="text-neutral-500">Entry Fee</span>
            <div className="text-neutral-900 font-medium mt-0.5">{profile?.entry_fee || 'Free'}</div>
          </div>
          <div>
            <span className="text-neutral-500">Guide Fee</span>
            {editingGuideFee ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={guideFeeInput}
                  onChange={e => setGuideFeeInput(e.target.value)}
                  disabled={savingGuideFee}
                  className="w-20 px-2 py-1 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  autoFocus
                />
                <button onClick={saveGuideFee} disabled={savingGuideFee} className="text-emerald-600 hover:text-emerald-700">
                  {savingGuideFee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <div className="text-neutral-900 font-medium mt-0.5 flex items-center gap-1.5">
                {profile?.guide_fee_amount != null ? `$${profile.guide_fee_amount}` : 'Not set'}
                <button onClick={() => setEditingGuideFee(true)} className="text-neutral-400 hover:text-neutral-700">
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div>
            <span className="text-neutral-500">Hours</span>
            <div className="text-neutral-900 font-medium mt-0.5">{profile?.opening_time} - {profile?.closing_time}</div>
          </div>
          <div>
            <span className="text-neutral-500">Daily Capacity</span>
            <div className="text-neutral-900 font-medium mt-0.5">{profile?.daily_capacity || '-'}</div>
          </div>
          <div>
            <span className="text-neutral-500">Email</span>
            <div className="text-neutral-900 font-medium mt-0.5">{portalUser?.email || profile?.email || '-'}</div>
          </div>
          <div>
            <span className="text-neutral-500">Phone</span>
            <div className="text-neutral-900 font-medium mt-0.5">{profile?.phone || portalUser?.phone || '-'}</div>
          </div>
          {profile?.closed_days?.length > 0 && (
            <div className="col-span-2">
              <span className="text-neutral-500">Closed Days</span>
              <div className="text-neutral-900 font-medium mt-0.5">{profile.closed_days.join(', ')}</div>
            </div>
          )}
        </div>
      </Card>

      {activeFlag && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-red-800 mb-1">Active Flag</div>
              <div className="text-xs text-red-700 mb-1">Severity: <span className="font-medium capitalize">{activeFlag.severity?.replace('_', ' ')}</span></div>
              <div className="text-xs text-red-700">{activeFlag.reason}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex bg-neutral-100 p-1 rounded-lg gap-1 mb-6">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              activeSection === s.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'stats' && (
        <div>
          <div className="flex items-center justify-end mb-4">
            <div className="flex bg-neutral-100 p-1 rounded-lg gap-1">
              {(['30d', '90d', 'all'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === p ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                  {p === 'all' ? 'All time' : p === '30d' ? '30 days' : '90 days'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="p-4 bg-teal-50">
              <div className="flex items-center gap-2 mb-1.5"><Users className="w-3.5 h-3.5 text-neutral-400" /><span className="text-xs text-neutral-500">Total Visitors</span></div>
              <div className="text-xl font-semibold text-neutral-900">{totalVisitors.toLocaleString()}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">{active.length} bookings</div>
            </Card>
            <Card className="p-4 bg-emerald-50">
              <div className="flex items-center gap-2 mb-1.5"><DollarSign className="w-3.5 h-3.5 text-neutral-400" /><span className="text-xs text-neutral-500">Revenue</span></div>
              <div className="text-xl font-semibold text-neutral-900">${totalRevenue.toFixed(0)}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">from completed</div>
            </Card>
            <Card className="p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-1.5"><Users className="w-3.5 h-3.5 text-neutral-400" /><span className="text-xs text-neutral-500">Avg Group Size</span></div>
              <div className="text-xl font-semibold text-neutral-900">{avgGroupSize}</div>
            </Card>
            <Card className="p-4 bg-amber-50">
              <div className="flex items-center gap-2 mb-1.5"><Calendar className="w-3.5 h-3.5 text-neutral-400" /><span className="text-xs text-neutral-500">Completion Rate</span></div>
              <div className="text-xl font-semibold text-neutral-900">{completionRate}%</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">{completed.length} completed</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {monthlyStats.length > 0 && (
              <Card className="p-5 bg-blue-50">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-neutral-400" />Monthly Visitors
                </h3>
                <div className="space-y-2">
                  {monthlyStats.map((month: any) => {
                    const pct = Math.round((month.visitors / maxMonthVisitors) * 100);
                    return (
                      <div key={month.label} className="flex items-center gap-4">
                        <div className="w-16 text-xs text-neutral-600 flex-shrink-0">{month.label}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-neutral-600">{month.visitors} visitors</span>
                            <span className="text-xs text-neutral-500">${month.revenue.toFixed(0)}</span>
                          </div>
                          <div className="w-full bg-neutral-100 h-2 rounded-full">
                            <div className="h-2 rounded-full bg-teal-500" style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <div className="space-y-4">
              <Card className="p-5 bg-amber-50">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4">Booking Status</h3>
                <div className="space-y-3">
                  {(['confirmed', 'pending', 'completed', 'cancelled'] as const).map(status => {
                    const count = filtered.filter(b => b.status === status).length;
                    const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
                    const colors: Record<string, string> = { confirmed: 'bg-emerald-500', pending: 'bg-amber-500', completed: 'bg-blue-500', cancelled: 'bg-neutral-300' };
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
                </div>
              </Card>

              {topGuides.length > 0 && (
                <Card className="p-5 bg-teal-50">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-neutral-400" />Top Guides
                  </h3>
                  <div className="space-y-2">
                    {topGuides.map((g, i) => (
                      <div key={g.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-400 w-4">#{i + 1}</span>
                          <span className="text-xs text-neutral-900">{g.name}</span>
                        </div>
                        <span className="text-xs text-neutral-500">{g.tours} tours, {g.visitors} visitors</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {programPerf.length > 0 && (
            <Card className="p-5 bg-emerald-50 mb-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Program Performance</h3>
              <div className="space-y-3">
                {programPerf.map(p => (
                  <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-neutral-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-neutral-900 truncate">{p.name}</div>
                      <div className="text-[10px] text-neutral-500">{p.bookings} bookings</div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-xs font-medium text-neutral-900">{p.visitors} visitors</div>
                      <div className="text-[10px] text-neutral-500">${p.revenue.toFixed(0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeSection === 'programs' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button variant="primary" onClick={() => setShowAddProgram(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Program
            </Button>
          </div>
          {programs.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
              <div className="text-sm font-medium text-neutral-900 mb-1">No programs</div>
              <div className="text-xs text-neutral-500">This attraction has no programs yet.</div>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="text-left px-4 py-3 font-medium text-neutral-600">Title</th>
                      <th className="text-left px-4 py-3 font-medium text-neutral-600">Duration</th>
                      <th className="text-left px-4 py-3 font-medium text-neutral-600">Price</th>
                      <th className="text-center px-4 py-3 font-medium text-neutral-600">Max Participants</th>
                      <th className="text-center px-4 py-3 font-medium text-neutral-600">Active</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {programs.map(p => (
                      <tr key={p.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 font-medium text-neutral-900">{p.title}</td>
                        <td className="px-4 py-3 text-neutral-600">{p.duration_hours}h</td>
                        <td className="px-4 py-3 text-neutral-600">${p.price_per_person}</td>
                        <td className="px-4 py-3 text-center text-neutral-600">{p.max_participants}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${p.active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                            {p.active ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button onClick={() => deleteProgram(p.id)} className="p-1 text-neutral-400 hover:text-rose-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeSection === 'balance' && (
        <div className="space-y-4">
          <Card className="p-5 bg-emerald-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-emerald-600" /><span className="text-xs text-neutral-600">Owed to this attraction</span></div>
                <div className="text-2xl font-bold text-emerald-700">${balance.toFixed(2)}</div>
                <p className="text-xs text-neutral-500 mt-1">Entry fee + program money collected, minus each booking's guide fee and anything already settled.</p>
              </div>
              <Button variant="primary" onClick={() => setShowSettleModal(true)} disabled={balance <= 0}>
                Record Settlement
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Settlement History</h3>
            </div>
            {settlements.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">No settlements recorded yet.</div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {settlements.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 text-xs">
                    <div>
                      <div className="font-medium text-neutral-900">
                        {s.method === 'paid_to_institution' ? 'Paid directly to institution' : 'Handed to guide'}
                      </div>
                      {s.notes && <div className="text-neutral-500 mt-0.5">{s.notes}</div>}
                      <div className="text-neutral-400 mt-0.5">{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <div className="font-semibold text-neutral-900">${Number(s.amount).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {showAddProgram && (
        <CreateProgramForm
          portalUserId={institutionId}
          onClose={() => setShowAddProgram(false)}
          onSuccess={loadData}
        />
      )}

      {showSettleModal && (
        <RecordSettlementModal
          institutionId={institutionId}
          guides={guides}
          maxAmount={balance}
          opsUserId={opsUser?.id || ''}
          onClose={() => setShowSettleModal(false)}
          onSaved={() => { setShowSettleModal(false); loadData(); }}
        />
      )}

      {activeSection === 'guides' && (
        guides.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
            <div className="text-sm font-medium text-neutral-900 mb-1">No guides</div>
            <div className="text-xs text-neutral-500">This attraction has no guides yet.</div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Specializations</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Languages</th>
                    <th className="text-center px-4 py-3 font-medium text-neutral-600">Experience</th>
                    <th className="text-center px-4 py-3 font-medium text-neutral-600">Rating</th>
                    <th className="text-center px-4 py-3 font-medium text-neutral-600">Tours</th>
                    <th className="text-center px-4 py-3 font-medium text-neutral-600">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {guides.map(g => (
                    <tr key={g.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {g.profile_picture ? (
                            <img src={g.profile_picture} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] text-neutral-500">{(g.name || '?')[0]}</div>
                          )}
                          <span className="font-medium text-neutral-900">{g.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{g.specializations?.join(', ') || '-'}</td>
                      <td className="px-4 py-3 text-neutral-600">{g.languages?.join(', ') || '-'}</td>
                      <td className="px-4 py-3 text-center text-neutral-600">{g.experience_years || 0} yrs</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-neutral-900">{Number(g.rating || 0).toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-neutral-600">{g.total_tours || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${g.available ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                          {g.available ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {showFlagModal && profile?.id && (
        <FlagContentModal
          targetType="attraction"
          targetId={profile.id}
          targetTitle={profile.name}
          ownerPortalUserId={institutionId}
          flaggedBy={opsUser?.id || ''}
          onClose={() => setShowFlagModal(false)}
          onFlagged={() => { setShowFlagModal(false); loadData(); onRefresh(); }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Unpublish Attraction</h3>
                <p className="text-xs text-neutral-500">This will hide the attraction from travelers</p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 mb-6">
              Are you sure you want to unpublish <span className="font-medium">"{profile?.name}"</span>? Existing bookings and reviews will be preserved.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-xs font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {deleting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Unpublish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RecordSettlementModal({ institutionId, guides, maxAmount, opsUserId, bookingId, onClose, onSaved }: {
  institutionId: string; guides: any[]; maxAmount: number; opsUserId: string; bookingId?: string; onClose: () => void; onSaved: () => void;
}) {
  const [method, setMethod] = useState<'paid_to_institution' | 'handed_to_guide'>('paid_to_institution');
  const [amount, setAmount] = useState(maxAmount > 0 ? String(maxAmount) : '');
  const [guideId, setGuideId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = parseFloat(amount) || 0;

  async function handleSave() {
    if (parsed <= 0) { setError('Enter an amount greater than zero.'); return; }
    if (parsed > maxAmount) { setError(`Cannot exceed the ${maxAmount.toFixed(2)} owed balance.`); return; }
    if (method === 'handed_to_guide' && !guideId) { setError('Select which guide received the cash.'); return; }
    setSaving(true);
    setError(null);

    const { error: e } = await supabase.from('institution_settlements').insert({
      institution_id: institutionId,
      booking_id: bookingId || null,
      amount: parsed,
      method,
      guide_id: method === 'handed_to_guide' ? guideId : null,
      notes: notes.trim(),
      recorded_by: opsUserId || null,
    });

    if (e) {
      setError(e.message || 'Failed to record settlement.');
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between p-5 border-b border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-900">Record settlement</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl">
              {([
                { id: 'paid_to_institution' as const, label: 'Paid to institution' },
                { id: 'handed_to_guide' as const, label: 'Handed to guide' },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setMethod(t.id)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${method === t.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {method === 'handed_to_guide' && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Which guide</label>
                <select value={guideId} onChange={e => setGuideId(e.target.value)} className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900">
                  <option value="">Select a guide…</option>
                  {guides.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Amount (USD) — owed: ${maxAmount.toFixed(2)}</label>
              <input
                type="number"
                min="0"
                max={maxAmount}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Note (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. August payout"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <div className="flex gap-3 px-5 pb-5">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors">Cancel</button>
            <button
              disabled={saving || parsed <= 0}
              onClick={handleSave}
              className="flex-1 py-2.5 text-sm font-medium bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Record ${parsed.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
