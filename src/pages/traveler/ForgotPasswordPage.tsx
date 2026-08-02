import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { travelerAuth } from '../../lib/auth';
import { Button } from '../../components/Button';
import { Mail, Compass, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const { error: resetError } = await travelerAuth.resetPassword(email);

      if (resetError) {
        setError(resetError);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          <button
            onClick={() => navigate('/traveler/login')}
            className="inline-flex items-center text-sm text-neutral-600 hover:text-neutral-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </button>

          <div className="mb-8">
            <img
              height={40}
              className="mb-5"
            />
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 via-amber-500 to-green-600 rounded-xl mb-4">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Reset Password</h1>
            <p className="text-sm text-neutral-600">
              Enter your email and we'll send you a link to reset your password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-shadow"
                  placeholder="Enter your email"
                  required
                  disabled={success}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2.5 rounded-lg text-xs">
                Password reset link sent! Please check your email for instructions.
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading || success}
              className="w-full"
            >
              {loading ? 'Sending...' : success ? 'Email sent' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              Remember your password?{' '}
              <Link to="/traveler/login" className="text-amber-600 hover:text-amber-700 font-medium transition-colors">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://res.cloudinary.com/dbhyrnypc/image/upload/v1773349374/shutterstock_12819594340_1_tevv7n.jpg"
            alt="Reset Password"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-green-600/20"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-12 bg-gradient-to-t from-black/60 to-transparent">
          <h2 className="text-3xl font-bold text-white mb-2">
            We've Got You Covered
          </h2>
          <p className="text-white/90 text-lg">
            Reset your password and get back to exploring
          </p>
        </div>
      </div>
    </div>
  );
}
