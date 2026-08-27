import { useState } from 'react';
import { X, Mail, Loader2, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './Button';
import { TextInput, PhoneInput, isValidEmail, isValidPhone } from './FormControls';
import { useAuth } from '../contexts/AuthContext';
import { PortalUser } from '../lib/auth';
import { logAdminAction } from '../lib/auditLog';
import { getFunctionErrorMessage } from '../lib/functionsError';

interface Props {
  onClose: () => void;
  onInvited: () => void;
}

export function InvitePartnerDrawer({ onClose, onInvited }: Props) {
  const { user } = useAuth();
  const me = user as PortalUser;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);

  const emailInvalid = !!email && !isValidEmail(email);
  const phoneInvalid = !!phone && !isValidPhone(phone);

  async function handleInvite() {
    if (!email.trim() || emailInvalid) { setError('Enter a valid email address.'); return; }
    if (phoneInvalid) { setError('Enter a valid phone number.'); return; }
    setSaving(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError('Your session isn\'t linked to Supabase Auth yet, so invites can\'t be authorized. Use the detailed "New Partner" form instead until an admin has been migrated.');
      setSaving(false);
      return;
    }

    const { data, error: fnError } = await supabase.functions.invoke('invite-portal-user', {
      body: { email: email.trim(), portal_type: 'partner', name: name.trim(), phone: phone.trim() },
    });
    setSaving(false);
    if (fnError) { setError(await getFunctionErrorMessage(fnError, 'Failed to send invite.')); return; }
    if (data?.error) { setError(data.message || data.error); return; }
    logAdminAction({ actor: me, action: 'partner.invite', targetType: 'portal_user', details: { email: email.trim(), name: name.trim() } });
    setInvited(true);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-start justify-between px-8 py-5 border-b border-neutral-200">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 leading-tight">Invite a partner</h2>
              <p className="text-xs text-neutral-500 mt-0.5">They'll set their own password via a secure invite link, then fill in their business profile.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {invited ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center"><Mail className="w-6 h-6 text-emerald-600" /></div>
            <h3 className="text-sm font-semibold text-neutral-900">Invite sent to {email}</h3>
            <p className="text-xs text-neutral-500 max-w-sm">They'll receive an email with a link to verify their address and set their own password.</p>
            <Button variant="primary" onClick={onInvited} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-8 py-7 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Business / contact name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="ip-input" placeholder="e.g. Rwanda Adventure Tours" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <TextInput icon={Mail} type="email" value={email} invalid={emailInvalid} onChange={e => setEmail(e.target.value)} placeholder="partner@business.com" />
                {emailInvalid && <p className="text-[11px] text-red-600 mt-1">Enter a valid email address.</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Phone</label>
                <PhoneInput value={phone} invalid={phoneInvalid} onChange={setPhone} />
                {phoneInvalid && <p className="text-[11px] text-red-600 mt-1">Enter a valid phone number.</p>}
              </div>
              {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>}
            </div>
            <div className="px-8 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={onClose} className="px-5">Cancel</Button>
              <Button variant="primary" onClick={handleInvite} disabled={saving} className="px-6">
                {saving ? <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</span> : 'Send invite'}
              </Button>
            </div>
          </>
        )}
      </div>

      <style>{`.ip-input{width:100%;padding:0.6rem 0.8rem;font-size:0.8125rem;color:#1f2937;border:1px solid #d4d4d4;border-radius:0.6rem;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s}.ip-input::placeholder{color:#9ca3af}.ip-input:focus{border-color:#64748b;box-shadow:0 0 0 3px rgba(100,116,139,.15)}`}</style>
    </div>
  );
}
