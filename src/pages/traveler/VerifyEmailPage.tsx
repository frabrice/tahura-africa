import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { Mail, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const emailFromUrl = searchParams.get('email');
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }

    const type = searchParams.get('type');
    if (type === 'signup') {
      checkEmailConfirmation();
    }
  }, [searchParams]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const checkEmailConfirmation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email_confirmed_at) {
        setVerified(true);
        setTimeout(() => {
          navigate('/traveler/login', { state: { verified: true } });
        }, 2000);
      }
    } catch (error) {
      console.error('Error checking confirmation:', error);
    }
  };

  const handleResendEmail = async () => {
    if (!email) return;

    setResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/traveler/verify-email?type=signup&email=${email}`,
        },
      });

      if (error) throw error;

      setResendSuccess(true);
      setCountdown(60);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error: any) {
      setResendError(error.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center group mb-6"
          >
            <Logo height={40} className="transition-opacity group-hover:opacity-80" />
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 md:p-8">
          {verified ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900">Email Verified!</h1>
              <p className="text-neutral-600">
                Your email has been successfully verified. Redirecting you to login...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-neutral-600" />
                </div>
                <h1 className="text-2xl font-bold text-neutral-900">Verify Your Email</h1>
                <p className="text-neutral-600">
                  We've sent a verification link to:
                </p>
                <p className="text-sm font-medium text-neutral-900 bg-neutral-50 rounded px-3 py-2">
                  {email || 'your email address'}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Click the link in the email to verify your account and continue to login.
                </p>
              </div>

              {resendSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-900">
                    Verification email sent! Please check your inbox.
                  </p>
                </div>
              )}

              {resendError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900">{resendError}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  className="w-full"
                  variant="primary"
                  onClick={handleResendEmail}
                  disabled={resending || countdown > 0}
                >
                  {resending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    `Resend in ${countdown}s`
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>

                <button
                  onClick={() => navigate('/traveler/login')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </button>
              </div>

              <div className="text-center">
                <p className="text-xs text-neutral-500">
                  Didn't receive the email? Check your spam folder or click resend.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
