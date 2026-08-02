import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { travelerAuth } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: setAuthUser, logout, isTraveler, isPortalUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const returnTo: string = (location.state as any)?.returnTo || '/';
  const openBooking: boolean = (location.state as any)?.openBooking || false;

  useEffect(() => {
    if (isTraveler) {
      navigate(returnTo, { state: openBooking ? { openBooking: true } : undefined, replace: true });
    } else if (isPortalUser()) {
      logout();
    }
  }, [isTraveler, isPortalUser, logout, navigate, returnTo, openBooking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, error: loginError, needsVerification } = await travelerAuth.login(email, password);

      if (loginError) {
        if (loginError.includes('Email not confirmed')) {
          navigate(`/traveler/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        setError(loginError);
        setLoading(false);
        return;
      }

      if (!user) {
        setError('Login failed');
        setLoading(false);
        return;
      }

      if (needsVerification) {
        navigate(`/traveler/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      setAuthUser('traveler', user);
      navigate(returnTo, { state: openBooking ? { openBooking: true } : undefined, replace: true });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex animate-fade-in">
      <div className="w-full lg:w-[52%] flex flex-col p-6 md:p-10 lg:p-14 bg-white overflow-y-auto">
        <div className="flex-shrink-0 mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Logo height={32} />
              </div>
              <h1 className="text-2xl font-bold text-stone-900 leading-tight mb-1.5">
                {openBooking ? 'Sign in to book' : 'Welcome back'}
              </h1>
              <p className="text-sm text-stone-500">
                {openBooking ? 'Log in to complete your booking' : 'Continue your journey with us'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white placeholder-stone-400 text-stone-900"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-stone-700">Password</label>
                  <Link to="/traveler/forgot-password" className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white placeholder-stone-400 text-stone-900"
                    placeholder="Your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 px-3 py-2.5 rounded-xl text-xs">
                  <span className="mt-0.5 flex-shrink-0">⚠</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-stone-400">or</span>
              </div>
            </div>

            <button
              onClick={async () => {
                setGoogleLoading(true);
                setError('');
                const { error: googleError } = await travelerAuth.signInWithGoogle();
                if (googleError) {
                  setError(googleError);
                  setGoogleLoading(false);
                }
              }}
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GoogleLogo />
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <p className="mt-6 text-center text-sm text-stone-500">
              No account?{' '}
              <Link to="/traveler/signup" className="text-amber-600 hover:text-amber-700 font-semibold transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:w-[48%] relative overflow-hidden bg-stone-900">
        <img
          src="https://res.cloudinary.com/dbhyrnypc/image/upload/v1773349374/shutterstock_12819594340_1_tevv7n.jpg"
          alt="Travel Experience"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/30 via-stone-900/20 to-stone-900/80" />
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <div className="mb-6">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">Tahura Travel</p>
            <h2 className="text-3xl font-bold text-white leading-tight mb-3">
              Discover Rwanda's living culture
            </h2>
            <p className="text-stone-300 text-sm leading-relaxed">
              From gorilla treks to lakeside homestays — experience Africa as it truly is.
            </p>
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-white text-lg font-bold">500+</p>
              <p className="text-stone-400 text-xs">Experiences</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-white text-lg font-bold">120+</p>
              <p className="text-stone-400 text-xs">Homestays</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-white text-lg font-bold">4.8</p>
              <p className="text-stone-400 text-xs">Avg. Rating</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
