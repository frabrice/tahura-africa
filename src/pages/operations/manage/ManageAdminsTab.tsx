import { useState, useEffect } from 'react';
import { Plus, Search, X, Trash2, ShieldCheck, Loader2, Mail, Hash, Key, RefreshCw, UserRound } from 'lucide-react';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { TextInput, PhoneInput, isValidEmail, isValidPhone } from '../../../components/FormControls';
import { supabase } from '../../../lib/supabase';
import { generateUserIdCode } from '../../../lib/auth';
import { sendEmail } from '../../../lib/sendEmail';
import { useAuth } from '../../../contexts/AuthContext';
import { PortalUser } from '../../../lib/auth';

interface Admin {
  id: string;
  name: string | null;
  email: string;
  user_id_code: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export function ManageAdminsTab() {
  const { user } = useAuth();
  const me = user as PortalUser;
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('portal_users')
      .select('id, name, email, user_id_code, phone, is_active, created_at')
      .eq('portal_type', 'operations')
      .order('created_at', { ascending: false });
    setAdmins((data as Admin[]) || []);
    setLoading(false);
  }

  async function toggleActive(a: Admin) {
    setAdmins(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !x.is_active } : x));
    await supabase.from('portal_users').update({ is_active: !a.is_active }).eq('id', a.id);
  }

  async function remove(a: Admin) {
    if (!confirm(`Remove admin ${a.email}? They will lose access immediately.`)) return;
    await supabase.from('portal_users').delete().eq('id', a.id);
    load();
  }

  const filtered = admins.filter(a => {
    const q = filter.toLowerCase();
    return !q || (a.name || '').toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.user_id_code.toLowerCase().includes(q);
  });

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-neutral-500">{admins.length} internal admin{admins.length !== 1 ? 's' : ''}</div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter admins..." className="pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 w-52" />
          </div>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />New Admin
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Name / Email</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">ID Code</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Added</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-neutral-500">{filter ? 'No admins match your filter' : 'No internal admins yet'}</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                        <UserRound className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-neutral-900">{a.name || '—'} {a.id === me?.id && <span className="text-[10px] text-neutral-400 font-normal">(you)</span>}</div>
                        <div className="text-neutral-500">{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-600">{a.user_id_code}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => a.id !== me?.id && toggleActive(a)}
                      disabled={a.id === me?.id}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${a.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'} ${a.id === me?.id ? 'opacity-60 cursor-default' : 'hover:opacity-80'}`}
                    >
                      {a.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</td>
                  <td className="px-3 py-3 text-right">
                    {a.id !== me?.id && (
                      <button onClick={() => remove(a)} className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors" title="Remove admin">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showCreate && <CreateAdminDrawer onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function makePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let p = '';
  for (let i = 0; i < 14; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

function CreateAdminDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateUserIdCode('operations').then(setCode).catch(() => {});
    setPassword(makePassword());
  }, []);

  const emailInvalid = !!email && !isValidEmail(email);
  const phoneInvalid = !!phone && !isValidPhone(phone);

  async function handleCreate() {
    if (!email.trim() || emailInvalid) { setError('Enter a valid email address.'); return; }
    if (phoneInvalid) { setError('Enter a valid phone number.'); return; }
    if (!code || !password) { setError('Generate an ID code and password first.'); return; }
    setSaving(true);
    setError(null);
    try {
      const passwordHash = await hashPassword(password);
      const { error: e } = await supabase.from('portal_users').insert({
        portal_type: 'operations',
        email: email.trim(),
        password_hash: passwordHash,
        user_id_code: code,
        name: name.trim() || null,
        phone: phone.trim() || null,
        is_active: true,
      });
      if (e) throw e;
      sendEmail({
        template: 'account_created',
        recipient_email: email.trim(),
        recipient_name: name.trim() || '',
        data: { portal_type: 'operations', user_id_code: code, email: email.trim(), password, name: name.trim() },
      });
      alert(`Admin created.\n\nID: ${code}\nEmail: ${email}\nPassword: ${password}\n\nSave these — the password won't be shown again.`);
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create admin.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-start justify-between px-8 py-5 border-b border-neutral-200">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0"><ShieldCheck className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 leading-tight">New ops admin</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Give a teammate access to the Operations control room.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-7 space-y-8">
          <section>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">Person</div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="ad-input" placeholder="e.g. Aline Uwase" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                  <TextInput icon={Mail} type="email" value={email} invalid={emailInvalid} onChange={e => setEmail(e.target.value)} placeholder="admin@tahuraafrica.com" />
                  {emailInvalid && <p className="text-[11px] text-red-600 mt-1">Enter a valid email address.</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Phone</label>
                  <PhoneInput value={phone} invalid={phoneInvalid} onChange={setPhone} />
                  {phoneInvalid && <p className="text-[11px] text-red-600 mt-1">Enter a valid phone number.</p>}
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">Credentials</div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">ID code</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input value={code} readOnly className="ad-input pl-9 pr-10 font-mono bg-neutral-50" />
                  <button onClick={() => generateUserIdCode('operations').then(setCode)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700"><RefreshCw className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input value={password} onChange={e => setPassword(e.target.value)} className="ad-input pl-9 pr-10 font-mono" />
                  <button onClick={() => setPassword(makePassword())} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700"><RefreshCw className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">These are shown once on creation and emailed to the admin. Save them somewhere safe.</p>
          </section>

          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>}
        </div>

        <div className="px-8 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} className="px-5">Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving} className="px-6">
            {saving ? <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating…</span> : 'Create admin'}
          </Button>
        </div>
      </div>

      <style>{`.ad-input{width:100%;padding:0.6rem 0.8rem;font-size:0.8125rem;color:#1f2937;border:1px solid #d4d4d4;border-radius:0.6rem;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s}.ad-input::placeholder{color:#9ca3af}.ad-input:focus{border-color:#64748b;box-shadow:0 0 0 3px rgba(100,116,139,.15)}`}</style>
    </div>
  );
}

export default ManageAdminsTab;
