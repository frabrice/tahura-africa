import { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { useNavigate } from 'react-router-dom';
import { portalAuth } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Hash, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface PortalLoginProps {
  portalType: 'partner' | 'government' | 'institution' | 'operations';
  onSuccess: () => void;
}

export default function PortalLogin({ portalType, onSuccess }: PortalLoginProps) {
  const navigate = useNavigate();
  const { login: setAuthUser, logout, isPortalUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isPortalUser(portalType)) {
      onSuccess();
    } else if (isPortalUser()) {
      logout();
    }
  }, [isPortalUser, portalType, logout, onSuccess]);

  const portalConfig = {
    partner: {
      title: 'Partner Console',
      subtitle: 'Manage your partnership and listings',
      userIdLabel: 'Partner ID',
      userIdPlaceholder: 'e.g., PA000001',
      accent: '#0d9488',
      image: 'https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg?auto=compress&cs=tinysrgb&w=1200',
    },
    government: {
      title: 'Government Portal',
      subtitle: 'Access tourism analytics and regional insights',
      userIdLabel: 'Government ID',
      userIdPlaceholder: 'e.g., GO000001',
      accent: '#1d4ed8',
      image: 'https://images.pexels.com/photos/1770775/pexels-photo-1770775.jpeg?auto=compress&cs=tinysrgb&w=1200',
    },
    institution: {
      title: 'Institution Platform',
      subtitle: 'Manage programs and visitor experiences',
      userIdLabel: 'Institution ID',
      userIdPlaceholder: 'e.g., IN000001',
      accent: '#b45309',
      image: 'https://images.pexels.com/photos/3380805/pexels-photo-3380805.jpeg?auto=compress&cs=tinysrgb&w=1200',
    },
    operations: {
      title: 'Operations Control',
      subtitle: 'Central platform administration',
      userIdLabel: 'Operations ID',
      userIdPlaceholder: 'e.g., OP000001',
      accent: '#475569',
      image: 'https://images.pexels.com/photos/3943882/pexels-photo-3943882.jpeg?auto=compress&cs=tinysrgb&w=1200',
    },
  };

  const config = portalConfig[portalType];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, error: loginError } = await portalAuth.login(email, password, userId || undefined);

      if (loginError || !user) {
        setError(loginError || 'Login failed');
        setLoading(false);
        return;
      }

      if (user.portal_type !== portalType) {
        setError('Invalid portal type for this account');
        setLoading(false);
        return;
      }

      setAuthUser('portal', user);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const inputClass = `w-full pr-4 py-3 text-sm bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200`;

  return (
    <div className="min-h-screen flex bg-white">
      {/* Form side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-14">
        <div className="w-full max-w-md">
          <button
            onClick={() => navigate('/gateway')}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-700 mb-10 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Gateway
          </button>

          <div className="mb-10">
            <Logo height={32} className="mb-8" />

            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.1em] mb-5"
              style={{ background: `${config.accent}12`, color: config.accent, border: `1px solid ${config.accent}25` }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: config.accent }} />
              {config.title}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-2 leading-tight">
              Welcome back
            </h1>
            <p className="text-sm text-neutral-500">{config.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">
                {config.userIdLabel}
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className={`${inputClass} pl-10`}
                  style={{ '--tw-ring-color': config.accent } as React.CSSProperties}
                  placeholder={config.userIdPlaceholder}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputClass} pl-10`}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pl-10 pr-12`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm bg-red-50 border border-red-200 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ background: config.accent }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Image side */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-neutral-100">
        <img
          src={config.image}
          alt={config.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 100%)' }} />

        <div className="absolute bottom-0 left-0 right-0 p-12">
          <Logo height={28} className="mb-5 opacity-80" />
          <h2 className="text-3xl font-bold text-white mb-2">{config.title}</h2>
          <p className="text-white/60 text-sm">{config.subtitle}</p>
          <div className="mt-6 h-px w-16" style={{ background: config.accent }} />
        </div>
      </div>
    </div>
  );
}
