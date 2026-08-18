import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { sendEmail } from '../../lib/sendEmail';
import { logAdminAction } from '../../lib/auditLog';
import { CheckCircle, XCircle, Wallet, Clock } from 'lucide-react';

interface WithdrawalRequest {
  id: string;
  host_id: string | null;
  guide_id: string | null;
  partner_id: string | null;
  amount: number;
  fee: number;
  net_amount: number;
  payout_method: string;
  status: 'pending' | 'paid' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

interface Recipient { id: string; name: string; email: string }

export function WithdrawalsPage() {
  const { user } = useAuth();
  const me = user as PortalUser;
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [hosts, setHosts] = useState<Record<string, Recipient>>({});
  const [guides, setGuides] = useState<Record<string, Recipient>>({});
  const [partners, setPartners] = useState<Record<string, Recipient>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: reqData } = await supabase
      .from('withdrawal_requests')
      .select('id, host_id, guide_id, partner_id, amount, fee, net_amount, payout_method, status, requested_at, reviewed_at, rejection_reason')
      .order('requested_at', { ascending: false });
    const reqs = reqData || [];
    setRequests(reqs);

    const hostIds = [...new Set(reqs.filter(r => r.host_id).map(r => r.host_id as string))];
    const guideIds = [...new Set(reqs.filter(r => r.guide_id).map(r => r.guide_id as string))];
    const partnerIds = [...new Set(reqs.filter(r => r.partner_id).map(r => r.partner_id as string))];

    const [hostsRes, guidesRes, partnersRes] = await Promise.all([
      hostIds.length ? supabase.from('partner_hosts').select('id, name, email').in('id', hostIds) : Promise.resolve({ data: [] as Recipient[] }),
      guideIds.length ? supabase.from('guides').select('id, name, email').in('id', guideIds) : Promise.resolve({ data: [] as Recipient[] }),
      partnerIds.length ? supabase.from('portal_users').select('id, name, email').in('id', partnerIds) : Promise.resolve({ data: [] as Recipient[] }),
    ]);
    setHosts(Object.fromEntries((hostsRes.data || []).map((h: Recipient) => [h.id, h])));
    setGuides(Object.fromEntries((guidesRes.data || []).map((g: Recipient) => [g.id, g])));
    setPartners(Object.fromEntries((partnersRes.data || []).map((p: Recipient) => [p.id, p])));
    setLoading(false);
  }

  const recipientFor = (r: WithdrawalRequest): Recipient | null =>
    r.host_id ? hosts[r.host_id] : r.guide_id ? guides[r.guide_id] : r.partner_id ? partners[r.partner_id] : null;

  async function approve(r: WithdrawalRequest) {
    setBusyId(r.id);
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'paid', reviewed_by: me?.id || null, reviewed_at: new Date().toISOString() })
      .eq('id', r.id);
    if (!error) {
      const recipient = recipientFor(r);
      if (recipient?.email) {
        sendEmail({
          template: 'withdrawal_paid',
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          data: { amount: r.amount, fee: r.fee, net_amount: r.net_amount, payout_method: r.payout_method },
        });
      }
      logAdminAction({
        actor: me, action: 'withdrawal.approve', targetType: r.host_id ? 'host' : r.guide_id ? 'guide' : 'partner', targetId: r.host_id || r.guide_id || r.partner_id || undefined,
        details: { amount: r.amount, net_amount: r.net_amount, recipient: recipient?.name },
      });
      await loadData();
    }
    setBusyId(null);
  }

  async function reject(r: WithdrawalRequest) {
    setBusyId(r.id);
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'rejected',
        reviewed_by: me?.id || null,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectReason.trim() || null,
      })
      .eq('id', r.id);
    if (!error) {
      const recipient = recipientFor(r);
      if (recipient?.email) {
        sendEmail({
          template: 'withdrawal_rejected',
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          data: { amount: r.amount, rejection_reason: rejectReason.trim() || undefined },
        });
      }
      logAdminAction({
        actor: me, action: 'withdrawal.reject', targetType: r.host_id ? 'host' : r.guide_id ? 'guide' : 'partner', targetId: r.host_id || r.guide_id || r.partner_id || undefined,
        details: { amount: r.amount, reason: rejectReason.trim() || undefined, recipient: recipient?.name },
      });
      setRejectingId(null);
      setRejectReason('');
      await loadData();
    }
    setBusyId(null);
  }

  const pending = requests.filter(r => r.status === 'pending');
  const history = requests.filter(r => r.status !== 'pending');
  const shown = tab === 'pending' ? pending : history;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Withdrawals</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Review and approve host, guide, and partner payout requests</p>
      </div>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit">
        <button onClick={() => setTab('pending')} className={`px-5 py-2 text-xs font-medium rounded-lg transition-all ${tab === 'pending' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          Pending ({pending.length})
        </button>
        <button onClick={() => setTab('history')} className={`px-5 py-2 text-xs font-medium rounded-lg transition-all ${tab === 'history' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          History
        </button>
      </div>

      {shown.length === 0 ? (
        <Card className="p-10 text-center">
          <Wallet className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">{tab === 'pending' ? 'No pending withdrawal requests' : 'No reviewed requests yet'}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map(r => {
            const recipient = recipientFor(r);
            const role = r.host_id ? 'Host' : r.guide_id ? 'Guide' : 'Partner';
            return (
              <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-neutral-900">{recipient?.name || 'Unknown'}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">{role}</span>
                    </div>
                    <p className="text-xs text-neutral-400">{recipient?.email}</p>
                    <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Requested {new Date(r.requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-neutral-900">${r.net_amount.toFixed(2)}</p>
                    <p className="text-xs text-neutral-400">${r.amount.toFixed(2)} - ${r.fee.toFixed(2)} fee &bull; {r.payout_method === 'mobile' ? 'Mobile Money' : 'Bank Transfer'}</p>
                  </div>
                </div>

                {r.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    {rejectingId === r.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Reason (optional)"
                          className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50">Cancel</button>
                          <button
                            disabled={busyId === r.id}
                            onClick={() => reject(r)}
                            className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            Confirm Decline
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          disabled={busyId === r.id}
                          onClick={() => approve(r)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve &amp; Pay
                        </button>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => setRejectingId(r.id)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {r.status !== 'pending' && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {r.status === 'paid' ? 'Paid' : 'Declined'}
                    </span>
                    {r.reviewed_at && <span className="text-xs text-neutral-400">{new Date(r.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                  </div>
                )}
                {r.status === 'rejected' && r.rejection_reason && (
                  <p className="text-xs text-neutral-500 mt-1">Reason: {r.rejection_reason}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
