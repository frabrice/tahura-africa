import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { portalAuth } from '../../lib/auth';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Logo';
import { Activity, AlertCircle, Eye, EyeOff } from 'lucide-react';

export function OperationsLoginPage() {
  const navigate = useNavigate();
  const { login, logout, isPortalUser } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userIdCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isPortalUser('operations')) {
      navigate('/operations');
    } else if (isPortalUser()) {
      logout();
    }
  }, [isPortalUser, logout, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, error: authError } = await portalAuth.login(
        formData.email,
        formData.password,
        formData.userIdCode
      );

      if (authError) {
        setError(authError);
        setLoading(false);
        return;
      }

      if (user && user.portal_type !== 'operations') {
        setError('This login is only for operations users');
        setLoading(false);
        return;
      }

      if (user) {
        login('portal', user);
        navigate('/operations');
      }
    } catch (_err) {
      setError('An error occurred during login');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo
            height={40}
            className="mx-auto mb-5"
          />
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Operations Control Room
          </h1>
          <p className="text-sm text-neutral-600">
            Secure access for platform administrators
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="userIdCode" className="block text-sm font-medium text-neutral-700 mb-2">
                User ID Code
              </label>
              <input
                type="text"
                id="userIdCode"
                value={formData.userIdCode}
                onChange={(e) => setFormData({ ...formData, userIdCode: e.target.value })}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent font-mono"
                placeholder="OP000001"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="ops@tahura.africa"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2.5 pr-10 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Access Control Room'
              )}
            </Button>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-500">
            This is a secure administrative portal. Unauthorized access attempts are logged.
          </p>
        </div>
      </div>
    </div>
  );
}
