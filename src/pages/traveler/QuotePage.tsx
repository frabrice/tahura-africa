import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Users, Clock, Check, CreditCard, Smartphone, Loader2, ShieldCheck,
  AlertCircle, Compass, Home as HomeIcon, Route,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { TravelerUser } from '../../lib/auth';
import { sendEmail } from '../../lib/sendEmail';
import { ShareButton } from '../../components/ShareButton';
import { QuoteDownloadButton } from '../../components/QuoteDownloadButton';
import { PaymentMethodSelector, type PaymentMethodId } from '../../components/PaymentMethodSelector';
import { Field, TextInput, PhoneInput, isValidEmail } from '../../components/FormControls';
import { CustomQuote, isQuoteExpired } from '../../lib/customQuotes';

const TYPE_META: Record<CustomQuote['quote_type'], { label: string; icon: typeof Compass; color: string }> = {
  experience: { label: 'Custom Experience', icon: Compass, color: 'text-orange-500' },
  homestay: { label: 'Custom Homestay', icon: HomeIcon, color: 'text-[#5E7A45]' },
  itinerary: { label: 'Custom Itinerary', icon: Route, color: 'text-green-600' },
};

type PayStep = 'details' | 'payment' | 'confirmation';

export function QuotePage() {
  const { id } = useParams();
  const { isAuthenticated, isTraveler, user } = useAuth();
  const traveler = (isAuthenticated && isTraveler && user) ? user as TravelerUser : null;

  const [quote, setQuote] = useState<CustomQuote | null>(null);
  const [loading, setLoading] = useState(true);

  const [payStep, setPayStep] = useState<PayStep>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [pesapalUrl, setPesapalUrl] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [momoPhone, setMomoPhone] = useState('');
  const [momoStage, setMomoStage] = useState<'idle' | 'awaiting'>('idle');
  const [momoAmountRwf, setMomoAmountRwf] = useState<number | null>(null);
  const momoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from('custom_quotes').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      setQuote(data as CustomQuote | null);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (traveler) {
      setName(n => n || traveler.full_name || '');
      setEmail(e => e || traveler.email || '');
      setPhone(p => p || traveler.phone || '');
    }
  }, [traveler]);

  useEffect(() => () => { if (momoPollRef.current) clearInterval(momoPollRef.current); }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="max-w-md mx-auto px-4 py-32 text-center">
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-2">Quote not found</h1>
        <p className="text-sm text-neutral-500">This link may be incorrect, or the quote has been removed.</p>
      </div>
    );
  }

  const expired = isQuoteExpired(quote);
  const meta = TYPE_META[quote.quote_type];
  const TypeIcon = meta.icon;
  const duration = quote.duration_value
    ? `${quote.duration_value} ${quote.duration_unit === 'days' ? (quote.duration_value === 1 ? 'day' : 'days') : 'hrs'}`
    : null;
  const quoteUrl = `${window.location.origin}/quote/${quote.id}`;

  if (expired) {
    return (
      <div className="max-w-md mx-auto px-4 py-32 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-6 h-6 text-amber-600" />
        </div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-2">This quote has expired</h1>
        <p className="text-sm text-neutral-500 leading-relaxed">
          The payment window for "{quote.title}" has closed. Please reach out for a new quote.
        </p>
      </div>
    );
  }

  const emailInvalid = !!email && !isValidEmail(email);

  async function proceedToPayment() {
    if (!quote) return;
    if (!name.trim() || !email.trim() || emailInvalid) {
      setError('Enter your full name and a valid email to continue.');
      return;
    }
    setSaving(true);
    setError(null);
    const ref = 'BK-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error: insertError } = await supabase.from('bookings').insert({
      booking_ref: ref,
      traveler_id: traveler?.id || null,
      traveler_name: name.trim(),
      traveler_email: email.trim(),
      traveler_profile_picture: traveler?.profile_picture || '',
      booking_type: quote.quote_type,
      item_id: null,
      item_title: quote.title,
      custom_quote_id: quote.id,
      partner_id: quote.partner_id,
      host_id: quote.host_id,
      guide_id: quote.guide_id,
      booking_date: new Date().toISOString().split('T')[0],
      guests: quote.guests,
      subtotal: quote.client_total,
      service_fee: 0,
      total_amount: quote.client_total,
      special_requests: `Custom quote ${quote.quote_ref}`,
      status: 'pending',
      payment_status: 'pending',
    }).select().single();

    if (insertError || !data) {
      setError('Failed to start checkout. Please try again.');
      setSaving(false);
      return;
    }
    setBookingId(data.id);
    setBookingRef(ref);
    setSaving(false);
    setPayStep('payment');
  }

  async function markQuotePaid() {
    if (!quote) return;
    await supabase.from('custom_quotes').update({ status: 'paid', resulting_booking_id: bookingId }).eq('id', quote.id);
    setQuote({ ...quote, status: 'paid', resulting_booking_id: bookingId });
  }

  function sendQuoteEmails() {
    sendEmail({
      template: 'booking_confirmation_traveler',
      recipient_email: email,
      recipient_name: name,
      data: {
        booking_ref: bookingRef, traveler_name: name, booking_type: quote!.quote_type,
        item_title: quote!.title, guests: quote!.guests, total_amount: quote!.client_total,
      },
    });
  }

  const stopMomoPoll = () => {
    if (momoPollRef.current) { clearInterval(momoPollRef.current); momoPollRef.current = null; }
  };

  async function handleProceedToPesapal() {
    if (!bookingId || !paymentMethod || !quote) return;
    setSaving(true);
    setIframeLoading(true);
    setError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/pesapal-create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({
          booking_id: bookingId, booking_ref: bookingRef, amount: quote.client_total, currency: 'USD',
          description: quote.title, traveler_name: name, traveler_email: email, traveler_phone: phone,
          payment_method: paymentMethod,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to initiate payment');
      }
      const data = await res.json();
      setPesapalUrl(data.redirect_url);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setSaving(false);
      setIframeLoading(false);
    }
  }

  async function handleInTouchPay() {
    if (!bookingId || !quote) return;
    const digits = momoPhone.replace(/\D/g, '');
    if (!/^(250)?0?7[2389]\d{7}$/.test(digits)) {
      setError('Enter a valid MTN (078/079) or Airtel (072/073) number.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/intouch-request-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({
          booking_id: bookingId, booking_ref: bookingRef, amount_usd: quote.client_total,
          mobile_phone: digits, network: paymentMethod === 'airtel_money' ? 'airtel' : 'mtn',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not start the mobile money payment. Please try again.');
      }
      setMomoAmountRwf(data.amount_rwf ?? null);
      setMomoStage('awaiting');
      setSaving(false);

      let elapsed = 0;
      stopMomoPoll();
      momoPollRef.current = setInterval(async () => {
        elapsed += 4;
        const { data: b } = await supabase.from('bookings').select('payment_status').eq('id', bookingId).maybeSingle();
        if (b?.payment_status === 'paid') {
          stopMomoPoll();
          await markQuotePaid();
          sendQuoteEmails();
          setMomoStage('idle');
          setPayStep('confirmation');
        } else if (b?.payment_status === 'failed') {
          stopMomoPoll();
          setMomoStage('idle');
          setError('The payment was declined or cancelled. You can try again.');
        } else if (elapsed >= 150) {
          stopMomoPoll();
          setMomoStage('idle');
          setError("We didn't get a confirmation in time. If you approved the prompt, check back shortly — otherwise try again.");
        }
      }, 4000);
    } catch (err: any) {
      setError(err.message || 'Mobile money payment failed. Please try again.');
      setSaving(false);
    }
  }

  async function handlePaymentConfirmed() {
    if (!bookingId) return;
    setVerifyingPayment(true);
    setError(null);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const { data: bookingData } = await supabase.from('bookings').select('payment_status, pesapal_tracking_id').eq('id', bookingId).maybeSingle();
    if (bookingData?.pesapal_tracking_id) {
      await fetch(`${supabaseUrl}/functions/v1/pesapal-ipn?OrderTrackingId=${bookingData.pesapal_tracking_id}`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${anonKey}` },
      });
    }
    const { data: updated } = await supabase.from('bookings').select('payment_status').eq('id', bookingId).maybeSingle();
    setVerifyingPayment(false);

    if (updated?.payment_status === 'paid') {
      await markQuotePaid();
      sendQuoteEmails();
      setPayStep('confirmation');
    } else if (updated?.payment_status === 'failed') {
      setError('Your payment could not be confirmed. No charge was made — please try again.');
    } else {
      setError("We haven't received confirmation of your payment yet. If you completed it, wait a moment and click the button again.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: '16/7' }}>
        {quote.cover_image ? (
          <img src={quote.cover_image} alt={quote.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0F0D0B 0%, #3a1a0a 50%, #0F0D0B 100%)' }}>
            <TypeIcon className="w-14 h-14 text-white/20" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute top-3.5 right-3.5">
          <ShareButton title={quote.title} path={`/quote/${quote.id}`} variant="overlay" />
        </div>
        <div className="absolute bottom-5 left-5 right-5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/90 bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 mb-2">
            <TypeIcon className="w-3 h-3" /> {meta.label}
          </span>
          <h1 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight">{quote.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
            {duration && (
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-neutral-400" /> {duration}</span>
            )}
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-neutral-400" /> Up to {quote.guests} guests</span>
          </div>

          <div className="pb-5 border-b border-neutral-100">
            <p className="text-sm text-neutral-500">Prepared for <span className="font-semibold text-neutral-800">{quote.client_name}</span></p>
          </div>

          {quote.description && <p className="text-[15px] text-neutral-700 leading-relaxed">{quote.description}</p>}

          {quote.quote_type === 'itinerary' && quote.itinerary_days && quote.itinerary_days.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">Day by Day</h2>
              <div className="space-y-4">
                {quote.itinerary_days.map(d => (
                  <div key={d.day} className="flex gap-4">
                    <div className="flex-shrink-0 w-14 h-7 rounded-full bg-orange-50 text-orange-700 text-xs font-bold flex items-center justify-center">
                      Day {d.day}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{d.title}</p>
                      {d.description && <p className="text-sm text-neutral-500 mt-0.5">{d.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {quote.quote_type !== 'itinerary' && quote.whats_included.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-semibold text-neutral-900 mb-3">
                {quote.quote_type === 'homestay' ? "What's Included in Your Stay" : "What's Included"}
              </h2>
              <ul className="space-y-2">
                {quote.whats_included.map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-neutral-700">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <QuoteDownloadButton
            quote={quote}
            quoteUrl={quoteUrl}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-300 rounded-xl px-4 py-2.5 transition-colors"
          />
        </div>

        {/* Price + payment column */}
        <div className="md:col-span-1">
          <div className="sticky top-20 border border-neutral-200 rounded-2xl p-5 shadow-warm-sm">
            <p className="text-xs text-neutral-500 mb-1">Total Price</p>
            <p className="text-3xl font-bold text-neutral-900 tabular-nums mb-1">
              ${quote.client_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-neutral-400 mb-5">
              Valid until {new Date(quote.valid_until).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>

            {quote.status === 'paid' ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-neutral-900">Already paid</p>
                <p className="text-xs text-neutral-500 mt-1">Thank you — this quote has been confirmed.</p>
              </div>
            ) : payStep === 'confirmation' ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-neutral-900">Payment confirmed!</p>
                <p className="text-xs text-neutral-500 mt-1">Reference: {bookingRef}</p>
              </div>
            ) : payStep === 'details' ? (
              <div className="space-y-3.5">
                <Field label="Full name" required>
                  <TextInput value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                </Field>
                <Field label="Email" required error={emailInvalid ? 'Enter a valid email' : null}>
                  <TextInput type="email" value={email} invalid={emailInvalid} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
                </Field>
                <Field label="Phone">
                  <PhoneInput value={phone} onChange={setPhone} />
                </Field>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                  onClick={proceedToPayment}
                  disabled={saving}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Continue to Payment
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
                  </div>
                )}
                {momoStage === 'awaiting' ? (
                  <div className="flex flex-col items-center text-center py-6 gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-orange-600 animate-pulse" />
                    </div>
                    <p className="text-sm font-semibold text-neutral-900">Check your phone</p>
                    <p className="text-xs text-neutral-500">
                      Approve the {paymentMethod === 'airtel_money' ? 'Airtel Money' : 'MTN MoMo'} prompt
                      {momoAmountRwf ? ` for RWF ${momoAmountRwf.toLocaleString()}` : ''} on {momoPhone}.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for confirmation…
                    </div>
                  </div>
                ) : pesapalUrl ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Secure payment via <strong className="text-neutral-700">Pesapal</strong>.</span>
                    </div>
                    <div className="border border-neutral-200 rounded-xl overflow-hidden">
                      <iframe src={pesapalUrl} className="w-full" style={{ height: '420px' }} title="Secure Payment" allow="payment" onLoad={() => setIframeLoading(false)} />
                    </div>
                    <button
                      onClick={handlePaymentConfirmed}
                      disabled={verifyingPayment}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {verifyingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {verifyingPayment ? 'Verifying…' : "I've Completed Payment"}
                    </button>
                  </>
                ) : iframeLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                    <p className="text-xs text-neutral-500">Loading secure payment form...</p>
                  </div>
                ) : (
                  <>
                    <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
                    {(paymentMethod === 'mtn_momo' || paymentMethod === 'airtel_money') && (
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={momoPhone}
                        onChange={e => setMomoPhone(e.target.value)}
                        placeholder="078 000 0000"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    )}
                    <button
                      onClick={paymentMethod === 'card' ? handleProceedToPesapal : handleInTouchPay}
                      disabled={!paymentMethod || saving || ((paymentMethod === 'mtn_momo' || paymentMethod === 'airtel_money') && !momoPhone.trim())}
                      className="w-full py-3 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 flex items-center justify-center gap-2"
                    >
                      {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</> : <><CreditCard className="w-4 h-4" /> Pay ${quote.client_total.toLocaleString()}</>}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
