import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type PaymentState = 'loading' | 'success' | 'failed' | 'pending';

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentState, setPaymentState] = useState<PaymentState>('loading');
  const [bookingRef, setBookingRef] = useState('');
  const [amount, setAmount] = useState<number | null>(null);

  const orderTrackingId = searchParams.get('OrderTrackingId') || searchParams.get('order_tracking_id');
  const merchantRef = searchParams.get('OrderMerchantReference') || searchParams.get('merchant_reference');

  useEffect(() => {
    if (!orderTrackingId) {
      setPaymentState('failed');
      return;
    }
    verifyPayment();
  }, [orderTrackingId]);

  async function verifyPayment() {
    setPaymentState('loading');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      await fetch(
        `${supabaseUrl}/functions/v1/pesapal-ipn?OrderTrackingId=${orderTrackingId}`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${anonKey}` } }
      );

      const { data: payment } = await supabase
        .from('payments')
        .select('status, booking_ref, amount, booking_id')
        .eq('pesapal_order_tracking_id', orderTrackingId!)
        .maybeSingle();

      if (payment) {
        setBookingRef(payment.booking_ref || merchantRef || '');
        setAmount(payment.amount);
        if (payment.status === 'completed') {
          setPaymentState('success');
        } else if (payment.status === 'failed' || payment.status === 'invalid') {
          setPaymentState('failed');
        } else {
          setPaymentState('pending');
        }
      } else {
        setPaymentState('pending');
      }
    } catch {
      setPaymentState('pending');
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 w-full max-w-md p-8 text-center">
        {paymentState === 'loading' && (
          <>
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Verifying Payment</h2>
            <p className="text-sm text-neutral-500">Please wait while we confirm your payment...</p>
          </>
        )}

        {paymentState === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-9 h-9 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Payment Successful!</h2>
            <p className="text-sm text-neutral-500 mb-6">Your booking is confirmed and ready.</p>

            {(bookingRef || amount) && (
              <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 text-left mb-6 space-y-2.5">
                {bookingRef && (
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500">Booking Reference</span>
                    <span className="font-bold text-neutral-900">{bookingRef}</span>
                  </div>
                )}
                {amount && (
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500">Amount Paid</span>
                    <span className="font-bold text-emerald-700">${amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-neutral-500">Status</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                    <CheckCircle className="w-3 h-3" />
                    Confirmed
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-neutral-400 mb-6">
              A confirmation email has been sent to your inbox.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/trips')}
                className="w-full px-6 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                View My Bookings
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full px-6 py-3.5 border border-neutral-200 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-colors text-sm"
              >
                Back to Home
              </button>
            </div>
          </>
        )}

        {paymentState === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Payment Failed</h2>
            <p className="text-sm text-neutral-500 mb-6">
              Your payment could not be processed. No charge was made. Please try again.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full px-6 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/help-support')}
                className="w-full px-6 py-3.5 border border-neutral-200 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-colors text-sm"
              >
                Contact Support
              </button>
            </div>
          </>
        )}

        {paymentState === 'pending' && (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Clock className="w-9 h-9 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Payment Pending</h2>
            <p className="text-sm text-neutral-500 mb-6">
              Your payment is being processed. We'll confirm your booking once the payment clears — usually within a few minutes.
            </p>

            {bookingRef && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-6">
                Booking Reference: <strong>{bookingRef}</strong>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={verifyPayment}
                className="w-full px-6 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Loader2 className="w-4 h-4" />
                Check Status Again
              </button>
              <button
                onClick={() => navigate('/trips')}
                className="w-full px-6 py-3.5 border border-neutral-200 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-colors text-sm"
              >
                View My Bookings
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
