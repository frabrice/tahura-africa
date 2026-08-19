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
  const txRef = searchParams.get('tx_ref');
  const merchantRef = searchParams.get('OrderMerchantReference') || searchParams.get('merchant_reference');

  useEffect(() => {
    if (!orderTrackingId && !txRef) {
      setPaymentState('failed');
      return;
    }
    verifyPayment();
  }, [orderTrackingId, txRef]);

  // A "failed" verdict right after redirect can be a false negative: the
  // gateway's redirect sometimes fires a moment before its own backend has
  // finished settling the transaction, so the very first check can race and
  // see a stale/declined state for a payment that actually succeeded. Showing
  // a genuinely-charged customer "Payment Failed" is far worse than a brief
  // extra wait, so retry a few times before trusting a failed result —
  // "pending" carries no such risk and is shown immediately.
  async function checkOnce(): Promise<'success' | 'failed' | 'pending'> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const verifyFn = txRef
      ? `flutterwave-verify?tx_ref=${encodeURIComponent(txRef)}`
      : `pesapal-ipn?OrderTrackingId=${orderTrackingId}`;
    await fetch(
      `${supabaseUrl}/functions/v1/${verifyFn}`,
      { method: 'GET', headers: { 'Authorization': `Bearer ${anonKey}` } }
    );

    const { data: payment } = await supabase
      .from('payments')
      .select('status, booking_ref, amount, booking_id')
      .eq(txRef ? 'flutterwave_tx_ref' : 'pesapal_order_tracking_id', txRef || orderTrackingId!)
      .maybeSingle();

    if (!payment) return 'pending';
    setBookingRef(payment.booking_ref || merchantRef || '');
    setAmount(payment.amount);
    if (payment.status === 'completed') return 'success';
    if (payment.status === 'failed' || payment.status === 'invalid') return 'failed';
    return 'pending';
  }

  async function verifyPayment() {
    setPaymentState('loading');
    try {
      let result = await checkOnce();
      for (let attempt = 0; result === 'failed' && attempt < 3; attempt++) {
        await new Promise(r => setTimeout(r, 2000));
        result = await checkOnce();
      }
      setPaymentState(result);
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
