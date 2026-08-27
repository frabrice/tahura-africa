import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { sendEmail } from '../../lib/sendEmail';
import { logAdminAction } from '../../lib/auditLog';
import { CheckCircle, XCircle, UserPlus, Clock, Home, Compass } from 'lucide-react';

interface Application {
  id: string;
  applicant_type: 'host' | 'guide';
  full_name: string;
  email: string;
  phone: string;
  bio: string;
  profile_picture: string | null;
  languages: string[];
  years_experience: number;
  motivation: string;
  host_expertise: string[];
  guide_specializations: string[];
  operating_region: string;
  preferred_partner_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface Partner { id: string; name: string }

export function ApplicationsPage() {
  const { user } = useAuth();
  const me = user as PortalUser;
  const [applications, setApplications] = useState<Application[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [selected, setSelected] = useState<Application | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [noAuthSession, setNoAuthSession] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    // Applications hold applicant PII, so unlike the rest of this app's
    // anon-everywhere convention, RLS only grants SELECT to a real Supabase
    // Auth session tied to an active operations portal_users row (see
    // 20260812140000_create_host_guide_applications.sql). An Ops account
    // still on the legacy anon-key login looks logged in and gets zero rows
    // back with no error - indistinguishable from "no applications" unless
    // we check for a real session here.
    const { data: { session } } = await supabase.auth.getSession();
    setNoAuthSession(!session);

    const [appsRes, partnersRes] = await Promise.all([
      supabase.from('host_guide_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('portal_users').select('id, name').eq('portal_type', 'partner').eq('is_active', true).order('name'),
    ]);
    setApplications((appsRes.data as Application[]) || []);
    setPartners((partnersRes.data as Partner[]) || []);
    setLoading(false);
  }

  function openReview(app: Application) {
    setSelected(app);
    setSelectedPartnerId(app.preferred_partner_id && partners.some(p => p.id === app.preferred_partner_id) ? app.preferred_partner_id : '');
    setRejecting(false);
    setRejectReason('');
  }

  async function approve(app: Application) {
    if (app.applicant_type === 'host' && !selectedPartnerId) return;
    setBusy(true);

    let resultingId: string | null = null;

    if (app.applicant_type === 'guide') {
      const { data, error } = await supabase.from('guides').insert({
        portal_user_id: me?.id,
        name: app.full_name,
        bio: app.bio,
        specializations: app.guide_specializations,
        languages: app.languages,
        operating_region: app.operating_region || null,
        experience_years: app.years_experience,
        profile_picture: app.profile_picture,
        email: app.email,
        phone: app.phone,
        available: true,
        max_engagements_per_day: 1,
      }).select('id').single();
      if (error) { setBusy(false); return; }
      resultingId = data.id;
    } else {
      const { data, error } = await supabase.from('partner_hosts').insert({
        partner_id: selectedPartnerId,
        name: app.full_name,
        bio: app.bio,
        profile_picture: app.profile_picture,
        languages: app.languages,
        email: app.email,
        phone: app.phone,
        expertise: app.host_expertise,
        years_experience: app.years_experience,
        status: 'active',
      }).select('id').single();
      if (error) { setBusy(false); return; }
      resultingId = data.id;
      supabase.functions.invoke('notify-host-created', { body: { host_id: resultingId } }).catch(() => {});
    }

    await supabase.from('host_guide_applications').update({
      status: 'approved',
      reviewed_by: me?.id || null,
      reviewed_at: new Date().toISOString(),
      resulting_host_id: app.applicant_type === 'host' ? resultingId : null,
      resulting_guide_id: app.applicant_type === 'guide' ? resultingId : null,
    }).eq('id', app.id);

    sendEmail({
      template: 'application_approved',
      recipient_email: app.email,
      recipient_name: app.full_name,
      data: { applicant_type: app.applicant_type, full_name: app.full_name },
    });

    logAdminAction({
      actor: me, action: 'application.approve', targetType: app.applicant_type, targetId: resultingId || undefined,
      details: { applicant_name: app.full_name, partner_id: app.applicant_type === 'host' ? selectedPartnerId : undefined },
    });

    setBusy(false);
    setSelected(null);
    await loadData();
  }

  async function reject(app: Application) {
    setBusy(true);
    await supabase.from('host_guide_applications').update({
      status: 'rejected',
      reviewed_by: me?.id || null,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectReason.trim() || null,
    }).eq('id', app.id);

    sendEmail({
      template: 'application_rejected',
      recipient_email: app.email,
      recipient_name: app.full_name,
      data: { applicant_type: app.applicant_type, full_name: app.full_name, rejection_reason: rejectReason.trim() || undefined },
    });

    logAdminAction({
      actor: me, action: 'application.reject', targetType: app.applicant_type,
      details: { applicant_name: app.full_name, reason: rejectReason.trim() || undefined },
    });

    setBusy(false);
    setSelected(null);
    await loadData();
  }

  const pending = applications.filter(a => a.status === 'pending');
  const history = applications.filter(a => a.status !== 'pending');
  const shown = tab === 'pending' ? pending : history;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (selected) {
    const a = selected;
    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-xs text-neutral-600 hover:text-neutral-900 mb-4">
          &larr; Back to Applications
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              {a.profile_picture ? (
                <img src={a.profile_picture} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-sm">{a.full_name[0]}</div>
              )}
              <div>
                <h1 className="text-base font-semibold text-neutral-900">{a.full_name}</h1>
                <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 capitalize">{a.applicant_type}</span>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div><div className="text-xs text-neutral-500 mb-1">Email</div><div className="text-neutral-900">{a.email}</div></div>
              <div><div className="text-xs text-neutral-500 mb-1">Phone</div><div className="text-neutral-900">{a.phone}</div></div>
              <div><div className="text-xs text-neutral-500 mb-1">Experience</div><div className="text-neutral-900">{a.years_experience} yrs</div></div>
              {a.languages.length > 0 && <div><div className="text-xs text-neutral-500 mb-1">Languages</div><div className="text-neutral-900">{a.languages.join(', ')}</div></div>}
              {a.applicant_type === 'host' && a.host_expertise.length > 0 && (
                <div><div className="text-xs text-neutral-500 mb-1">Type of stays</div><div className="text-neutral-900">{a.host_expertise.join(', ')}</div></div>
              )}
              {a.applicant_type === 'guide' && (
                <>
                  {a.guide_specializations.length > 0 && <div><div className="text-xs text-neutral-500 mb-1">Specializations</div><div className="text-neutral-900">{a.guide_specializations.join(', ')}</div></div>}
                  {a.operating_region && <div><div className="text-xs text-neutral-500 mb-1">Region</div><div className="text-neutral-900">{a.operating_region}</div></div>}
                </>
              )}
              {a.bio && <div><div className="text-xs text-neutral-500 mb-1">About</div><div className="text-neutral-900">{a.bio}</div></div>}
              {a.motivation && <div><div className="text-xs text-neutral-500 mb-1">Why they want to join</div><div className="text-neutral-900">{a.motivation}</div></div>}
            </div>
          </Card>

          <Card className="p-5 bg-amber-50">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">Review</h3>

            {a.status !== 'pending' ? (
              <div className="text-sm">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {a.status === 'approved' ? 'Approved' : 'Declined'}
                </span>
                {a.rejection_reason && <p className="text-xs text-neutral-500 mt-2">Reason: {a.rejection_reason}</p>}
              </div>
            ) : rejecting ? (
              <div className="space-y-3">
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Reason (optional, shown to applicant)"
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none bg-white"
                />
                <div className="flex gap-2">
                  <button onClick={() => setRejecting(false)} className="px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-white">Cancel</button>
                  <button disabled={busy} onClick={() => reject(a)} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Confirm Decline</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {a.applicant_type === 'host' && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">Assign to partner <span className="text-red-500">*</span></label>
                    <select
                      value={selectedPartnerId}
                      onChange={e => setSelectedPartnerId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    >
                      <option value="">Select a partner…</option>
                      {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <p className="text-[11px] text-neutral-500 mt-1">This host will be created under the selected partner.</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    disabled={busy || (a.applicant_type === 'host' && !selectedPartnerId)}
                    onClick={() => approve(a)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => setRejecting(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-white disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Applications</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Review Host and Guide applications from "Become a Local"</p>
      </div>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit">
        <button onClick={() => setTab('pending')} className={`px-5 py-2 text-xs font-medium rounded-lg transition-all ${tab === 'pending' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          Pending ({pending.length})
        </button>
        <button onClick={() => setTab('history')} className={`px-5 py-2 text-xs font-medium rounded-lg transition-all ${tab === 'history' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          History
        </button>
      </div>

      {noAuthSession && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>This list may be incomplete.</strong> Applications are only visible to a fully-migrated Operations
          login. Log out and back in with your Operations email and password (not a legacy code-only login) to see
          every application.
        </div>
      )}

      {shown.length === 0 ? (
        <Card className="p-10 text-center">
          <UserPlus className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">{tab === 'pending' ? 'No pending applications' : 'No reviewed applications yet'}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shown.map(a => (
            <Card key={a.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openReview(a)}>
              <div className="flex items-start gap-3">
                {a.profile_picture ? (
                  <img src={a.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-sm flex-shrink-0">{a.full_name[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-900 truncate">{a.full_name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 flex items-center gap-1 flex-shrink-0">
                      {a.applicant_type === 'host' ? <Home className="w-3 h-3" /> : <Compass className="w-3 h-3" />}
                      {a.applicant_type}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">{a.email}</p>
                  <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                {a.status !== 'pending' && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${a.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {a.status}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
