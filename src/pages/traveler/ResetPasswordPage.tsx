import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { travelerAuth } from '../../lib/auth';
import { Button } from '../../components/Button';
import { Lock, Compass, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const session = await travelerAuth.getCurrentSession();
      if (!session) {
        setError('Invalid or expired reset link. Please request a new password reset.');
      } else {
        setValidToken(true);
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await travelerAuth.updatePassword(password);

      if (updateError) {
        setError(updateError);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        navigate('/traveler/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  if (!validToken && error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Invalid Reset Link</h1>
          <p className="text-sm text-neutral-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/traveler/forgot-password')} className="w-full">
            Request New Reset Link
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Password Reset Successful</h1>
          <p className="text-sm text-neutral-600 mb-6">
            Your password has been updated. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <img
              height={40}
              className="mb-5"
            />
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 via-amber-500 to-green-600 rounded-xl mb-4">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Create New Password</h1>
            <p className="text-sm text-neutral-600">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-shadow"
                  placeholder="Enter new password"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-shadow"
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Updating password...' : 'Reset Password'}
            </Button>
          </form>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://res.cloudinary.com/dbhyrnypc/image/upload/v1773349374/jggrz-pied-flycatcher-9623545_1920_awa7v2.jpg"
            alt="New Beginning"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-green-600/20"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-12 bg-gradient-to-t from-black/60 to-transparent">
          <h2 className="text-3xl font-bold text-white mb-2">
            Start Fresh
          </h2>
          <p className="text-white/90 text-lg">
            Set a new password and continue your journey
          </p>
        </div>
      </div>
    </div>
  );
}
