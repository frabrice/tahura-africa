import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../../components/Logo';

const LOGIN_PATH_BY_PORTAL_TYPE: Record<string, string> = {
  partner: '/partner/login',
  operations: '/hq/operations-control-room/login',
};

export function PortalActivatePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking');
  const [portalType, setPortalType] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Implicit-flow invite links resolve into a session automatically on
      // client init (default Supabase Auth behavior). PKCE-flow links carry
      // a ?code= param that needs an explicit exchange — try both so this
      // works regardless of which flow the project is configured for.
      let { data: { session } } = await supabase.auth.getSession();
      if (!session && window.location.search.includes('code=')) {
        const { data } = await supabase.auth.exchangeCodeForSession(window.location.href).catch(() => ({ data: null }));
        session = data?.session ?? null;
      }

      if (!session) {
        setStatus('invalid');
        return;
      }

      setPortalType(session.user.user_metadata?.portal_type || null);
      setEmail(session.user.email || null);
      setStatus('ready');
    })();
  }, []);

  async function handleSetPassword() {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setSaving(true);
    setError(null);

    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message || 'Could not set your password.');
      setSaving(false);
      return;
    }

    // Force the explicit login step afterward rather than trusting this
    // invite-derived session going forward — same single code path every
    // other portal login goes through.
    await supabase.auth.signOut().catch(() => {});
    setSaving(false);
    setStatus('done');
  }

  const loginPath = (portalType && LOGIN_PATH_BY_PORTAL_TYPE[portalType]) || '/';

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F0D0B' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo height={32} />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {status === 'checking' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
              <p className="text-sm text-neutral-500">Verifying your invite…</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h1 className="text-sm font-semibold text-neutral-900">This invite link is invalid or has expired</h1>
              <p className="text-xs text-neutral-500">Ask an Operations admin to send you a new invite.</p>
            </div>
          )}

          {status === 'ready' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <h1 className="text-sm font-semibold text-neutral-900">Set your password</h1>
                {email && <p className="text-xs text-neutral-500 mt-1">{email}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Confirm password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <button
                onClick={handleSetPassword}
                disabled={saving}
                className="w-full py-2.5 text-sm font-semibold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Set password &amp; continue
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-sm font-semibold text-neutral-900">Password set</h1>
              <p className="text-xs text-neutral-500">Log in with your email and new password to continue.</p>
              <button
                onClick={() => navigate(loginPath)}
                className="mt-2 px-5 py-2.5 text-sm font-semibold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Go to login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
