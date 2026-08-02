import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { travelerAuth } from '../../lib/auth';
import { Mail, Lock, User, Phone, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { sendEmail } from '../../lib/sendEmail';

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const countries = [
  { code: '+250', name: 'Rwanda', digits: 9 },
  { code: '+1', name: 'United States', digits: 10 },
  { code: '+44', name: 'United Kingdom', digits: 10 },
  { code: '+254', name: 'Kenya', digits: 9 },
  { code: '+255', name: 'Tanzania', digits: 9 },
  { code: '+256', name: 'Uganda', digits: 9 },
  { code: '+27', name: 'South Africa', digits: 9 },
  { code: '+234', name: 'Nigeria', digits: 10 },
  { code: '+91', name: 'India', digits: 10 },
  { code: '+86', name: 'China', digits: 11 },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+250');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const selectedCountry = countries.find(c => c.code === countryCode);
    if (selectedCountry && phone.length !== selectedCountry.digits) {
      setError(`Phone number must be exactly ${selectedCountry.digits} digits for ${selectedCountry.name}`);
      return;
    }

    if (!phone || phone.length === 0) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);

    try {
      const fullPhone = `${countryCode}${phone}`;
      const { user, error: signupError, needsVerification } = await travelerAuth.signUp(
        email,
        password,
        fullName,
        fullPhone
      );

      if (signupError || !user) {
        setError(signupError || 'Signup failed');
        setLoading(false);
        return;
      }

      sendEmail({
        template: 'welcome_traveler',
        recipient_email: email,
        recipient_name: fullName,
        data: { full_name: fullName },
      });

      setShowSuccessPopup(true);
      setLoading(false);

      setTimeout(() => {
        if (needsVerification) {
          navigate(`/traveler/verify-email?email=${encodeURIComponent(email)}`);
        } else {
          navigate('/traveler/login');
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-9 pr-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white placeholder-stone-400 text-stone-900";
  const labelClass = "block text-xs font-medium text-stone-700 mb-1.5";

  return (
    <div className="min-h-screen flex animate-fade-in">
      <div className="w-full lg:w-[52%] flex flex-col p-6 md:p-10 lg:p-14 bg-white overflow-y-auto">
        <div className="flex-shrink-0 mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </button>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <div className="mb-7">
            <div className="flex items-center gap-3 mb-5">
              <Logo height={32} />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 leading-tight mb-1.5">Create your account</h1>
            <p className="text-sm text-stone-500">Start your journey with Tahura today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className={labelClass}>Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Phone number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="flex-shrink-0 w-[100px] pl-3 pr-2 py-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white text-stone-700 appearance-none"
                  required
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>{country.code}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className={inputClass}
                    placeholder={`${countries.find(c => c.code === countryCode)?.digits || 9} digits`}
                    required
                    maxLength={countries.find(c => c.code === countryCode)?.digits || 10}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white placeholder-stone-400 text-stone-900"
                  placeholder="Min. 6 characters"
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

            <div>
              <label className={labelClass}>Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white placeholder-stone-400 text-stone-900"
                  placeholder="Repeat your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              disabled={loading || showSuccessPopup || googleLoading}
              className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="relative my-4">
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
            disabled={loading || googleLoading || showSuccessPopup}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleLogo />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <p className="mt-5 text-center text-sm text-stone-500">
            Already have an account?{' '}
            <Link to="/traveler/login" className="text-amber-600 hover:text-amber-700 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:w-[48%] relative overflow-hidden bg-stone-900">
        <img
          src="https://res.cloudinary.com/dbhyrnypc/image/upload/v1773349374/chinatour_dhbuhr.jpg"
          alt="Travel Adventure"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/30 via-stone-900/20 to-stone-900/80" />
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <div className="mb-6">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">Join Tahura</p>
            <h2 className="text-3xl font-bold text-white leading-tight mb-3">
              Your adventure starts here
            </h2>
            <p className="text-stone-300 text-sm leading-relaxed">
              Join thousands of travelers discovering authentic experiences across East Africa.
            </p>
          </div>
          <div className="space-y-3">
            {[
              'Book unique local experiences',
              'Stay with local families',
              'Explore iconic attractions',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3 text-amber-400" />
                </div>
                <p className="text-stone-300 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl animate-slide-up">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">Account created!</h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              Check your email to verify your account before signing in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
