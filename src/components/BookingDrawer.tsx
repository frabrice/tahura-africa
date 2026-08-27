import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, Users, CreditCard, Check, ArrowLeft, MessageSquare, Sun, Sunset, Clock, AlertCircle, Loader2, ShieldCheck, MapPin, Car, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TravelerUser } from '../lib/auth';
import { sendEmail } from '../lib/sendEmail';
import { getTransportZones, getTransportZoneForLocation, calculateTransportFare } from '../lib/mobilityService';
import type { TransportZone, TransportFareCalculation } from '../lib/types';
import { getCoordinates } from '../lib/rwandaGazetteer';
import { LocationPicker, PickedLocation } from './LocationPicker';
import { RWF_TO_USD_RATE } from '../lib/transportPricing';
import { PaymentMethodSelector, type PaymentMethodId } from './PaymentMethodSelector';
import {
  getHostActivityBookedRanges, getHostHomestayBookedRanges, getManualClosures,
  isRangeAvailable, parseDateStr, addDays,
} from '../lib/availability';
import { BookingReceiptDownloadButton } from './BookingReceiptDownloadButton';
import { getActiveGateway, type ActiveGateway } from '../lib/paymentGateway';

interface ListingDetails {
  frequency_type?: string;
  group_size?: number;
  max_guests?: number;
  duration_value?: number;
  duration_unit?: string;
  [key: string]: any;
}

interface BookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  itemType: 'experience' | 'homestay' | 'itinerary';
  locationName?: string;
  locationCoordinates?: { lat: number; lng: number };
  itemId?: string;
  hostId?: string;
  priceMin: number;
  priceMax?: number;
  listingDetails?: ListingDetails;
  onComplete: () => void;
}

type BookingStep = 'details' | 'payment' | 'confirmation';
type SessionSlot = 'morning' | 'midday' | 'evening';

const SESSION_LABELS: Record<SessionSlot, { label: string; time: string; icon: typeof Sun }> = {
  morning: { label: 'Morning', time: '8:00 AM - 12:00 PM', icon: Sun },
  midday: { label: 'Midday', time: '12:00 PM - 4:00 PM', icon: Clock },
  evening: { label: 'Evening', time: '4:00 PM - 8:00 PM', icon: Sunset },
};

function getAvailableSessions(frequencyType?: string): SessionSlot[] {
  if (frequencyType === 'three_daily') return ['morning', 'midday', 'evening'];
  if (frequencyType === 'twice_daily') return ['morning', 'evening'];
  return [];
}

function formatBookingDateLabel(dateStr: string, durationDays?: number): string {
  const start = new Date(dateStr + 'T00:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (durationDays && durationDays > 1) {
    const end = new Date(start);
    end.setDate(end.getDate() + durationDays - 1);
    return `${fmt(start)} → ${fmt(end)}`;
  }
  return fmt(start);
}

function BookingCalendar({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const initial = value ? new Date(value + 'T00:00:00') : today;
  const [view, setView] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const year = view.getFullYear();
  const month = view.getMonth();
  const monthName = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const canGoPrev = new Date(year, month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => canGoPrev && setView(new Date(year, month - 1, 1))} disabled={!canGoPrev}
          className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-display text-[15px] font-semibold text-stone-900">{monthName}</span>
        <button type="button" onClick={() => setView(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => (
          <span key={i} className="text-center text-[10px] font-bold text-stone-400 py-1">{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
          const isPast = new Date(year, month, d) < today;
          const isSelected = value === dateStr;
          return (
            <button key={i} type="button" disabled={isPast} onClick={() => onChange(dateStr)}
              className={`aspect-square rounded-lg text-[13px] tabular-nums transition-colors ${
                isSelected ? 'bg-orange-600 text-white font-bold'
                  : isPast ? 'text-stone-300 cursor-not-allowed'
                    : 'text-stone-700 hover:bg-orange-50'
              }`}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BookingDrawer({
  isOpen,
  onClose,
  itemTitle,
  itemType,
  locationName,
  locationCoordinates,
  itemId,
  hostId,
  priceMin,
  priceMax,
  listingDetails,
  onComplete,
}: BookingDrawerProps) {
  const { user } = useAuth();
  const traveler = user as TravelerUser | null;

  const [step, setStep] = useState<BookingStep>('details');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSession, setSelectedSession] = useState<SessionSlot | null>(null);
  const [guests, setGuests] = useState(1);
  const [addTransport, setAddTransport] = useState(false);
  const [transportZone, setTransportZone] = useState<TransportZone | null>(null);
  const [transportZones, setTransportZones] = useState<TransportZone[]>([]);
  const [transportFare, setTransportFare] = useState<TransportFareCalculation | null>(null);
  const [pickupPoint, setPickupPoint] = useState<PickedLocation | null>(null);
  const [zoneAutoDetected, setZoneAutoDetected] = useState(true);
  const [transportLoading, setTransportLoading] = useState(false);
  const [transportLocationError, setTransportLocationError] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pesapalUrl, setPesapalUrl] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [gateway, setGateway] = useState<ActiveGateway>('flutterwave');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [momoPhone, setMomoPhone] = useState('');
  const [momoStage, setMomoStage] = useState<'idle' | 'awaiting'>('idle');
  const [momoAmountRwf, setMomoAmountRwf] = useState<number | null>(null);
  const momoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [visible, setVisible] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [sessionAvailability, setSessionAvailability] = useState<Record<string, boolean>>({});
  const [checkingCapacity, setCheckingCapacity] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => () => { if (momoPollRef.current) clearInterval(momoPollRef.current); }, []);

  useEffect(() => {
    if (isOpen) getActiveGateway().then(setGateway);
  }, [isOpen]);

  const frequencyType = listingDetails?.frequency_type;
  const availableSessions = getAvailableSessions(frequencyType);
  const maxCapacity = itemType === 'homestay'
    ? (listingDetails?.max_guests || 20)
    : (listingDetails?.group_size || 20);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const t = setTimeout(() => setVisible(false), 350);
      document.body.style.overflow = '';
      return () => clearTimeout(t);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);

  useEffect(() => {
    if (selectedDate && itemId) {
      checkCapacity();
    }
  }, [selectedDate, itemId]);

  useEffect(() => {
    loadTransportZones();
  }, []);

  const loadTransportZones = async () => {
    try {
      const zones = await getTransportZones();
      setTransportZones(zones);
      if (zones.length > 0) {
        setTransportZone(zones[0]);
      }
    } catch (error) {
      console.error('Error loading transport zones:', error);
    }
  };

  useEffect(() => {
    if (addTransport && transportZone) {
      calculateTransport();
    } else {
      setTransportFare(null);
      setTransportLocationError(null);
    }
  }, [addTransport, transportZone, guests, pickupPoint?.lat, pickupPoint?.lng]);

  useEffect(() => {
    if (!pickupPoint || !zoneAutoDetected) return;
    getTransportZoneForLocation(pickupPoint.lat, pickupPoint.lng).then((zone) => {
      if (zone) setTransportZone(zone);
    });
  }, [pickupPoint?.lat, pickupPoint?.lng, zoneAutoDetected]);

  // Availability is keyed on the HOST, not the listing: one person can only
  // run one activity (or host one homestay stay) at a time, regardless of
  // how many listings that spans. Homestays and activities (experience +
  // itinerary) are deliberately separate calendars — see src/lib/availability.ts.
  async function checkCapacity() {
    if (!selectedDate || !itemId) return;
    setCheckingCapacity(true);
    setCapacityError(null);
    setSelectedSession(null);

    try {
      if (!hostId) { setCheckingCapacity(false); return; }

      const requestStart = parseDateStr(selectedDate);
      const durationDays = itemType === 'homestay' || itemType === 'itinerary' ? (listingDetails?.duration_value || 1) : 1;
      const requestEnd = addDays(requestStart, durationDays - 1);

      if (itemType === 'homestay') {
        const [bookedRanges, closures] = await Promise.all([
          getHostHomestayBookedRanges(hostId),
          getManualClosures('host', hostId),
        ]);
        const available = isRangeAvailable(bookedRanges, closures, requestStart, requestEnd, 1);
        if (!available) {
          const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          setCapacityError(`This host's homestay is already booked or closed for these dates. Try a different start date, or check ${fmt(addDays(requestEnd, 1))} onward.`);
        }
      } else {
        const [bookedRanges, closures, hostRow] = await Promise.all([
          getHostActivityBookedRanges(hostId),
          getManualClosures('host', hostId),
          supabase.from('partner_hosts').select('bookings_per_day').eq('id', hostId).maybeSingle(),
        ]);
        const dailyLimit = hostRow.data?.bookings_per_day || 1;
        const available = isRangeAvailable(bookedRanges, closures, requestStart, requestEnd, dailyLimit);
        if (!available) {
          setCapacityError(
            itemType === 'itinerary'
              ? "This host isn't available for the full length of this journey starting on this date. Please choose another start date."
              : "This host is already booked or unavailable on this date. Please choose another date."
          );
        }
      }
    } catch (err) {
      console.error('Error checking capacity:', err);
    }
    setCheckingCapacity(false);
  }

  if (!visible) return null;

  const transportTotal = transportFare?.total_fare || 0;
  const totalPrice = priceMin * guests;
  const serviceFee = Math.round(totalPrice * 0.1);
  const grandTotal = totalPrice + serviceFee + (addTransport ? Math.round(transportTotal / RWF_TO_USD_RATE) : 0);

  const sessionLabel = selectedSession ? SESSION_LABELS[selectedSession].label : null;

  // Neither side of this trip has real coordinates on file: the listing only
  // ever stores a free-text location name, and the pickup field is plain
  // text too. Resolving both against the shared Rwanda gazetteer (see
  // rwandaGazetteer.ts) is what actually makes the distance-based fare below
  // real instead of always computing 0km. If the listing's own location
  // isn't in the gazetteer that's a data gap the traveler can't fix, so it
  // falls back to Kigali rather than blocking the booking; an unrecognized
  // pickup, which the traveler *can* fix, surfaces as an inline hint instead.
  const calculateTransport = async () => {
    if (!transportZone) return;
    if (!pickupPoint) {
      setTransportFare(null);
      setTransportLocationError(null);
      return;
    }
    setTransportLocationError(null);
    setTransportLoading(true);
    try {
      const dropoffCoords = locationCoordinates || getCoordinates(locationName || itemTitle) || getCoordinates('Kigali')!;
      const fare = await calculateTransportFare(
        { name: pickupPoint.label, address: '', coordinates: { lat: pickupPoint.lat, lng: pickupPoint.lng } },
        { name: locationName || itemTitle, address: '', coordinates: dropoffCoords },
        transportZone.id,
        true // Roundtrip for experiences
      );
      setTransportFare(fare);
    } catch (error) {
      console.error('Error calculating transport:', error);
    } finally {
      setTransportLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (step === 'details') {
      if (availableSessions.length > 0 && !selectedSession) {
        setError('Please select a session time.');
        return;
      }
      if (guests > maxCapacity) {
        setError(`Maximum ${maxCapacity} ${itemType === 'homestay' ? 'guests' : 'participants'} allowed.`);
        return;
      }
      setError(null);
      setSaving(true);
      try {
        const durationDays = itemType === 'homestay' || itemType === 'itinerary' ? (listingDetails?.duration_value || 1) : 1;

        if (itemId && selectedDate && hostId) {
          const requestStart = parseDateStr(selectedDate);
          const requestEnd = addDays(requestStart, durationDays - 1);

          if (itemType === 'homestay') {
            const [bookedRanges, closures] = await Promise.all([
              getHostHomestayBookedRanges(hostId),
              getManualClosures('host', hostId),
            ]);
            if (!isRangeAvailable(bookedRanges, closures, requestStart, requestEnd, 1)) {
              setError('These dates are no longer available for this host. Please choose a different start date.');
              setSaving(false);
              return;
            }
          } else {
            const [bookedRanges, closures, hostRow] = await Promise.all([
              getHostActivityBookedRanges(hostId),
              getManualClosures('host', hostId),
              supabase.from('partner_hosts').select('bookings_per_day').eq('id', hostId).maybeSingle(),
            ]);
            const dailyLimit = hostRow.data?.bookings_per_day || 1;
            if (!isRangeAvailable(bookedRanges, closures, requestStart, requestEnd, dailyLimit)) {
              setError(
                itemType === 'itinerary'
                  ? "This host is no longer available for the full length of this journey. Please choose a different start date."
                  : 'This host is no longer available on this date. Please choose another date.'
              );
              setSaving(false);
              return;
            }
          }
        }

        const dropoffCoords = locationCoordinates || getCoordinates(locationName || itemTitle) || getCoordinates('Kigali')!;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const { data: { session } } = await supabase.auth.getSession();

        // The real price is computed server-side from the listing's actual
        // pricing.base_price, never trusted from this client — everything
        // computed above (totalPrice/serviceFee/grandTotal) is only ever
        // used for the pre-checkout display estimate.
        const res = await fetch(`${supabaseUrl}/functions/v1/create-booking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || anonKey}` },
          body: JSON.stringify({
            booking_type: itemType,
            item_id: itemId || null,
            host_id: hostId || null,
            booking_date: selectedDate,
            duration_days: itemType === 'homestay' || itemType === 'itinerary' ? durationDays : null,
            guests,
            session: selectedSession || null,
            special_requests: specialRequests,
            traveler_name: traveler?.full_name || 'Guest',
            traveler_email: traveler?.email || 'guest@example.com',
            traveler_profile_picture: traveler?.profile_picture || '',
            transport: addTransport && transportFare && pickupPoint ? {
              zone_id: transportZone?.id,
              pickup: { label: pickupPoint.label, lat: pickupPoint.lat, lng: pickupPoint.lng },
              dropoff: { label: locationName || itemTitle, lat: dropoffCoords.lat, lng: dropoffCoords.lng },
              is_roundtrip: true,
              client_total_fare: transportFare.total_fare,
              client_distance_km: transportFare.distance_km,
            } : null,
          }),
        });
        const bookingResult = await res.json();
        if (!res.ok) throw new Error(bookingResult.error || 'Failed to create booking');

        setBookingRef(bookingResult.booking_ref);
        setBookingId(bookingResult.booking_id);

        // Reset the loading flag before moving on — otherwise the payment step's
        // button stays stuck on "Preparing Payment…" and disabled.
        setSaving(false);
        setStep('payment');
      } catch (err: any) {
        setError(err.message || 'Failed to create booking. Please try again.');
        setSaving(false);
      }
    }
  };

  const handleProceedToPesapal = async () => {
    if (!bookingId || !bookingRef || !paymentMethod) return;
    setSaving(true);
    setIframeLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const orderRes = await fetch(`${supabaseUrl}/functions/v1/pesapal-create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          booking_ref: bookingRef,
          amount: grandTotal,
          currency: 'USD',
          description: `${itemTitle} - ${itemType}`,
          traveler_name: traveler?.full_name || 'Guest',
          traveler_email: traveler?.email || 'guest@example.com',
          traveler_phone: (traveler as any)?.phone || '',
          payment_method: paymentMethod,
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to initiate payment');
      }

      const orderData = await orderRes.json();
      setPesapalUrl(orderData.redirect_url);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setSaving(false);
      setIframeLoading(false);
    }
  };

  // Flutterwave's hosted checkout auto-redirects the whole browser to
  // redirect_url once payment completes — it doesn't need (and shouldn't
  // get) the iframe-embed + manual "I've Completed Payment" pattern Pesapal
  // requires. Navigating the full page away here lets that redirect land
  // squarely on the real, full-page /payment/callback screen instead of
  // rendering itself cramped inside a small drawer iframe.
  const handleProceedToFlutterwave = async () => {
    if (!bookingId || !bookingRef) return;
    setSaving(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/flutterwave-create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({
          booking_id: bookingId,
          booking_ref: bookingRef,
          amount: grandTotal,
          currency: 'USD',
          description: `${itemTitle} - ${itemType}`,
          traveler_name: traveler?.full_name || 'Guest',
          traveler_email: traveler?.email || 'guest@example.com',
          traveler_phone: (traveler as any)?.phone || '',
          payment_option: paymentMethod === 'flutterwave_momo' ? 'mobilemoneyrwanda' : 'card',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to initiate payment');
      }

      const data = await res.json();
      window.location.href = data.link;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment. Please try again.');
      setSaving(false);
    }
  };

  const sendBookingEmails = () => {
    const emailData = {
      booking_ref: bookingRef,
      traveler_name: traveler?.full_name || 'Guest',
      traveler_email: traveler?.email || '',
      booking_type: itemType,
      item_title: itemTitle,
      booking_date: selectedDate,
      session: selectedSession || '',
      guests,
      subtotal: totalPrice,
      service_fee: serviceFee,
      total_amount: grandTotal,
      special_requests: specialRequests,
    };
    sendEmail({
      template: 'booking_confirmation_traveler',
      recipient_email: traveler?.email || '',
      recipient_name: traveler?.full_name || '',
      data: emailData,
    });
    if (hostId) {
      supabase.from('partner_hosts').select('email, name').eq('id', hostId).maybeSingle().then(({ data: hostData }) => {
        if (hostData?.email) {
          sendEmail({ template: 'new_booking_host', recipient_email: hostData.email, recipient_name: hostData.name || '', data: emailData });
        }
      });
    }
  };

  const stopMomoPoll = () => {
    if (momoPollRef.current) { clearInterval(momoPollRef.current); momoPollRef.current = null; }
  };

  const handleInTouchPay = async () => {
    if (!bookingId || !bookingRef) return;
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
          booking_id: bookingId,
          booking_ref: bookingRef,
          amount_usd: grandTotal,
          mobile_phone: digits,
          network: paymentMethod === 'airtel_money' ? 'airtel' : 'mtn',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not start the mobile money payment. Please try again.');
      }
      setMomoAmountRwf(data.amount_rwf ?? null);
      setMomoStage('awaiting');
      setSaving(false);

      // Poll the booking's payment status; the InTouch callback flips it to
      // 'paid' once the subscriber approves the prompt on their phone.
      let elapsed = 0;
      stopMomoPoll();
      momoPollRef.current = setInterval(async () => {
        elapsed += 4;
        const { data: b } = await supabase.from('bookings').select('payment_status').eq('id', bookingId).maybeSingle();
        if (b?.payment_status === 'paid') {
          stopMomoPoll();
          sendBookingEmails();
          setMomoStage('idle');
          setStep('confirmation');
        } else if (b?.payment_status === 'failed') {
          stopMomoPoll();
          setMomoStage('idle');
          setError('The payment was declined or cancelled. You can try again.');
        } else if (elapsed >= 150) {
          stopMomoPoll();
          setMomoStage('idle');
          setError("We didn't get a confirmation in time. If you approved the prompt, check My Trips shortly — otherwise try again.");
        }
      }, 4000);
    } catch (err: any) {
      setError(err.message || 'Mobile money payment failed. Please try again.');
      setSaving(false);
    }
  };

  // A "failed" read right after checkout can be a false negative — the
  // gateway can report a stale status for a moment before its backend fully
  // settles. Showing a genuinely-charged traveler "payment failed" is far
  // worse than a brief extra wait, so retry before trusting that verdict.
  // Pesapal-only: Flutterwave never reaches this manual-confirm path — its
  // checkout is a full top-level redirect that lands on the standalone
  // /payment/callback page instead (see handleProceedToFlutterwave above).
  const checkPaymentOnce = async (): Promise<'paid' | 'failed' | 'pending'> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const { data: bookingData } = await supabase
      .from('bookings')
      .select('payment_status, pesapal_tracking_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingData?.pesapal_tracking_id) {
      await fetch(
        `${supabaseUrl}/functions/v1/pesapal-ipn?OrderTrackingId=${bookingData.pesapal_tracking_id}`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${anonKey}` } }
      );
    }

    const { data: updated } = await supabase
      .from('bookings')
      .select('payment_status')
      .eq('id', bookingId)
      .maybeSingle();

    if (updated?.payment_status === 'paid') return 'paid';
    if (updated?.payment_status === 'failed') return 'failed';
    return 'pending';
  };

  const handlePaymentConfirmed = async () => {
    if (!bookingId) return;
    setVerifyingPayment(true);
    setError(null);

    let result = await checkPaymentOnce();
    for (let attempt = 0; result === 'failed' && attempt < 3; attempt++) {
      await new Promise(r => setTimeout(r, 2000));
      result = await checkPaymentOnce();
    }

    setVerifyingPayment(false);

    if (result === 'paid') {
      sendBookingEmails();
      setStep('confirmation');
    } else if (result === 'failed') {
      setError('Your payment could not be confirmed. No charge was made — please try again.');
    } else {
      setError("We haven't received confirmation of your payment yet. If you completed it, wait a moment and click the button again.");
    }
  };

  const handleComplete = () => {
    onComplete();
    setStep('details');
    setSelectedDate('');
    setSelectedSession(null);
    setGuests(1);
    setSpecialRequests('');
    setBookingRef('');
    setBookingId('');
    setCapacityError(null);
    setSessionAvailability({});
    setPesapalUrl(null);
    setIframeLoading(false);
    stopMomoPoll();
    setMomoStage('idle');
    setMomoPhone('');
    setMomoAmountRwf(null);
    setAddTransport(false);
    setPickupPoint(null);
    setTransportFare(null);
    setTransportLocationError(null);
  };

  const handleMessageHost = async () => {
    if (!bookingId || !traveler?.id) return;

    try {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('host_id')
        .eq('id', bookingId)
        .maybeSingle();

      if (bookingError) throw bookingError;
      if (!booking?.host_id) return;

      const { data: host, error: hostError } = await supabase
        .from('partner_hosts')
        .select('name')
        .eq('id', booking.host_id)
        .maybeSingle();

      if (hostError) throw hostError;

      const hostName = host?.name || 'Host';
      const greeting = `Hey ${hostName.split(' ')[0]}, `;

      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (existingConv) {
        navigate(`/messages?conversation=${existingConv.id}&greeting=${encodeURIComponent(greeting)}`);
        onClose();
        return;
      }

      const { data: newConv } = await supabase.from('conversations').insert({
        booking_id: bookingId,
        traveler_id: traveler.id,
        traveler_name: traveler.full_name || 'Traveler',
        host_id: booking.host_id,
        host_name: hostName,
        listing_title: itemTitle,
        listing_type: itemType,
      }).select('id').single();

      navigate(newConv ? `/messages?conversation=${newConv.id}&greeting=${encodeURIComponent(greeting)}` : '/messages');
      onClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const steps: BookingStep[] = ['details', 'payment', 'confirmation'];
  const stepLabels: Record<BookingStep, string> = {
    details: 'Details',
    payment: 'Payment',
    confirmation: 'Confirmed',
  };
  const currentIdx = steps.indexOf(step);

  const canProceedFromDetails = selectedDate && !capacityError && !checkingCapacity && !saving
    && (availableSessions.length === 0 || selectedSession !== null);

  const drawerTranslate = isOpen ? 'translate-x-0' : 'translate-x-full';
  const overlayOpacity = isOpen ? 'opacity-100' : 'opacity-0';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className={`absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity duration-350 ${overlayOpacity}`}
        onClick={onClose}
      />

      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[92%] md:w-4/5 lg:w-3/4 bg-white shadow-2xl flex flex-col transition-transform duration-350 ease-in-out ${drawerTranslate}`}
      >
        <div className="flex-shrink-0 border-b border-neutral-100 px-4 sm:px-6 md:px-10 py-4 sm:py-5 bg-white">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-3">
              {step !== 'details' && step !== 'confirmation' && (
                <button
                  onClick={() => setStep(step === 'payment' ? 'details' : 'payment')}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500 hover:text-neutral-900 flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg sm:text-xl md:text-2xl font-semibold text-neutral-900 leading-tight">
                  {step === 'details' && 'Booking Details'}
                  {step === 'payment' && 'Payment'}
                  {step === 'confirmation' && 'Booking Confirmed'}
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5 truncate">{itemTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500 hover:text-neutral-700 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {step !== 'confirmation' && (
            <div className="flex items-center">
              {steps.filter(s => s !== 'confirmation').map((s, i) => {
                const isDone = steps.indexOf(s) < currentIdx;
                const isActive = s === step;
                return (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    {i > 0 && <div className={`h-px flex-1 transition-colors ${isDone ? 'bg-orange-600' : 'bg-neutral-200'}`} />}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isDone || isActive ? 'bg-orange-600 text-white' :
                        'bg-neutral-100 text-neutral-400'
                      }`}>
                        {isDone ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      <span className={`text-xs font-medium ${isActive ? 'text-neutral-900' : isDone ? 'text-neutral-600' : 'text-neutral-400'}`}>
                        {stepLabels[s]}
                      </span>
                    </div>
                    {i < 1 && <div className={`h-px flex-1 transition-colors ${isDone ? 'bg-orange-600' : 'bg-neutral-200'}`} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 md:px-10 py-5 sm:py-8 w-full max-w-2xl">
            {step === 'details' && (
              <div className="space-y-5 sm:space-y-6">
                <div className="bg-orange-50/60 p-4 sm:p-5 border-l-4 border-orange-500 rounded-r-lg">
                  <h3 className="font-display text-base sm:text-lg font-semibold text-neutral-900 mb-1">{itemTitle}</h3>
                  <p className="text-sm text-neutral-500">
                    {priceMax && priceMax !== priceMin ? `$${priceMin} – $${priceMax}` : `$${priceMin}`} per person
                    {itemType === 'homestay' && listingDetails?.duration_value
                      ? ` · ${listingDetails.duration_value}-day experience`
                      : ''}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {itemType === 'homestay' ? 'Choose your start date' : 'Select Date'}
                  </label>
                  <BookingCalendar value={selectedDate} onChange={(d) => setSelectedDate(d)} />
                  {itemType === 'homestay' && selectedDate && listingDetails?.duration_value && (() => {
                    const start = new Date(selectedDate + 'T00:00:00');
                    const end = new Date(start);
                    end.setDate(end.getDate() + listingDetails.duration_value - 1);
                    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <p className="text-xs text-emerald-800 font-medium">
                          {fmt(start)} → {fmt(end)} ({listingDetails.duration_value} {listingDetails.duration_value === 1 ? 'day' : 'days'})
                        </p>
                      </div>
                    );
                  })()}
                  {checkingCapacity && (
                    <p className="text-xs text-neutral-400 mt-1.5 flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin inline-block"></span>
                      Checking availability...
                    </p>
                  )}
                  {capacityError && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{capacityError}</p>
                    </div>
                  )}
                </div>

                {selectedDate && !capacityError && availableSessions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Select Session
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {availableSessions.map((session) => {
                        const info = SESSION_LABELS[session];
                        const Icon = info.icon;
                        const isAvailable = sessionAvailability[session] !== false;
                        const isSelected = selectedSession === session;
                        return (
                          <button
                            key={session}
                            disabled={!isAvailable}
                            onClick={() => {
                              setSelectedSession(session);
                              setError(null);
                            }}
                            className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                              !isAvailable
                                ? 'border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed'
                                : isSelected
                                  ? 'border-orange-600 bg-orange-600 text-white shadow-lg'
                                  : 'border-neutral-200 bg-white hover:border-orange-300'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                            <div className={`text-sm font-semibold mb-0.5 ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                              {info.label}
                            </div>
                            <div className={`text-xs ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                              {isAvailable ? info.time : 'Full'}
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Number of {itemType === 'homestay' ? 'Guests' : 'Participants'}
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-2.5">
                    <span className="text-sm text-stone-500">Max {maxCapacity} {itemType === 'homestay' ? 'guests' : 'per session'}</span>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setGuests(Math.max(1, guests - 1))}
                        disabled={guests <= 1}
                        className="w-9 h-9 rounded-full border border-stone-200 text-stone-700 grid place-items-center hover:border-orange-500 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg"
                        aria-label="Fewer"
                      >−</button>
                      <span className="text-base font-bold text-stone-900 tabular-nums w-6 text-center">{guests}</span>
                      <button
                        type="button"
                        onClick={() => setGuests(Math.min(maxCapacity, guests + 1))}
                        disabled={guests >= maxCapacity}
                        className="w-9 h-9 rounded-full border border-stone-200 text-stone-700 grid place-items-center hover:border-orange-500 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg"
                        aria-label="More"
                      >+</button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2">Special Requests (Optional)</label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={3}
                    placeholder="Any special requirements or questions for the provider..."
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                  />
                </div>

                {/* Transport Option */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setAddTransport(!addTransport)}
                      className={`w-full p-4 flex items-center justify-between transition-colors ${addTransport ? 'bg-teal-50' : 'bg-white hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${addTransport ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <Car className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-slate-900">Add Transport</div>
                          <div className="text-xs text-slate-500">Include pickup & drop-off service</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {addTransport && transportFare && (
                          <span className="text-sm font-semibold text-teal-700">
                            {(transportFare.total_fare / 1000).toFixed(1)}k RWF
                          </span>
                        )}
                        {addTransport ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {addTransport && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Pickup Location
                          </label>
                          <LocationPicker
                            value={pickupPoint}
                            onChange={setPickupPoint}
                            placeholder="Search your pickup address..."
                          />
                          {transportLocationError && (
                            <p className="text-xs text-amber-600 mt-1.5">{transportLocationError}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Transport Zone</label>
                          <select
                            value={transportZone?.id || ''}
                            onChange={(e) => {
                              const zone = transportZones.find(z => z.id === e.target.value);
                              setTransportZone(zone || null);
                              setZoneAutoDetected(false);
                            }}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                          >
                            {transportZones.map((zone) => (
                              <option key={zone.id} value={zone.id}>
                                {zone.region}
                              </option>
                            ))}
                          </select>
                          {zoneAutoDetected && pickupPoint && (
                            <p className="text-xs text-slate-400 mt-1">Detected from your pickup location</p>
                          )}
                        </div>

                        {transportLoading ? (
                          <div className="flex items-center justify-center py-3">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                          </div>
                        ) : transportFare ? (
                          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Base fare</span>
                              <span className="font-medium text-slate-700">
                                {(transportFare.base_fare / 1000).toFixed(1)}k RWF
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Distance ({transportFare.distance_km} km)</span>
                              <span className="font-medium text-slate-700">
                                {(transportFare.distance_fare / 1000).toFixed(1)}k RWF
                              </span>
                            </div>
                            {transportFare.surge_multiplier > 1 && (
                              <div className="flex justify-between text-amber-600">
                                <span>Surge ({((transportFare.surge_multiplier - 1) * 100).toFixed(0)}%)</span>
                                <span>{transportFare.surge_reason}</span>
                              </div>
                            )}
                            <div className="pt-2 border-t border-slate-200 flex justify-between">
                              <span className="font-medium text-slate-900">
                                {transportFare.is_roundtrip ? 'Round trip total' : 'Transport fare'}
                              </span>
                              <span className="font-bold text-teal-700">
                                {(transportFare.total_fare / 1000).toFixed(1)}k RWF
                              </span>
                            </div>
                          </div>
                        ) : null}

                        <p className="text-xs text-slate-500 flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          Professional drivers, verified vehicles. Includes pickup and drop-off at your destination.
                        </p>
                      </div>
                    )}
                  </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
                )}

                <div className="bg-neutral-50 p-4 sm:p-5 rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Subtotal</span>
                    <span className="font-medium text-neutral-900">${totalPrice}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Service Fee (10%)</span>
                    <span className="font-medium text-neutral-900">${serviceFee}</span>
                  </div>
                  {addTransport && transportFare && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500 flex items-center gap-1">
                        <Car className="w-3.5 h-3.5" />
                        Transport (Roundtrip)
                      </span>
                      <span className="font-medium text-neutral-900">{(transportFare.total_fare / 1000).toFixed(1)}k RWF</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">Total</span>
                    <span className="text-xl font-bold text-neutral-900">${grandTotal}</span>
                  </div>
                </div>

                <button
                  onClick={handleNextStep}
                  disabled={!canProceedFromDetails}
                  className="w-full px-6 py-4 sm:py-3.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Preparing Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Continue to Payment
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-4">
                <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-neutral-500">Total Amount</span>
                    <span className="text-xl font-bold text-neutral-900">${grandTotal}</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {(() => {
                      const start = new Date(selectedDate + 'T00:00:00');
                      const fmt = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                      if (itemType === 'homestay' && listingDetails?.duration_value && listingDetails.duration_value > 1) {
                        const end = new Date(start);
                        end.setDate(end.getDate() + listingDetails.duration_value - 1);
                        return `${fmt(start)} → ${fmt(end)}`;
                      }
                      return fmt(start);
                    })()}
                    {sessionLabel && ` · ${sessionLabel} Session`}
                    {' · '}{guests} {itemType === 'homestay' ? 'guest' : 'participant'}{guests !== 1 ? 's' : ''}
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                {momoStage === 'awaiting' ? (
                  <div className="flex flex-col items-center text-center py-10 gap-4">
                    <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                      <Smartphone className="w-7 h-7 text-orange-600 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Check your phone</p>
                      <p className="text-sm text-neutral-500 mt-1 max-w-xs">
                        Approve the {paymentMethod === 'airtel_money' ? 'Airtel Money' : 'MTN MoMo'} prompt
                        {momoAmountRwf ? ` for RWF ${momoAmountRwf.toLocaleString()}` : ''} on {momoPhone} to confirm your booking.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Loader2 className="w-4 h-4 animate-spin" /> Waiting for confirmation…
                    </div>
                    <button
                      onClick={() => { stopMomoPoll(); setMomoStage('idle'); }}
                      className="text-xs text-neutral-500 underline hover:text-neutral-800"
                    >
                      Cancel and choose another method
                    </button>
                  </div>
                ) : pesapalUrl ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Secure payment powered by <strong className="text-neutral-700">Pesapal</strong>.</span>
                    </div>
                    <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                      <iframe
                        src={pesapalUrl}
                        className="w-full"
                        style={{ height: '480px', minHeight: '420px' }}
                        title="Pesapal Secure Payment"
                        allow="payment"
                        onLoad={() => setIframeLoading(false)}
                      />
                    </div>
                    <button
                      onClick={handlePaymentConfirmed}
                      disabled={verifyingPayment}
                      className="w-full px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                    >
                      {verifyingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {verifyingPayment ? 'Verifying…' : "I've Completed Payment"}
                    </button>
                    <p className="text-xs text-neutral-400 text-center">
                      After completing payment above, click the button to confirm your booking.
                    </p>
                  </>
                ) : iframeLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                    <p className="text-sm text-neutral-500">Loading secure payment form...</p>
                  </div>
                ) : (
                  <>
                    <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} gateway={gateway} />
                    {(paymentMethod === 'mtn_momo' || paymentMethod === 'airtel_money') && (
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
                          {paymentMethod === 'airtel_money' ? 'Airtel' : 'MTN'} number
                        </label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={momoPhone}
                          onChange={(e) => setMomoPhone(e.target.value)}
                          placeholder="078 000 0000"
                          className="w-full px-4 py-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                        <p className="text-xs text-neutral-400 mt-1.5">A prompt will be sent to this phone to approve the payment.</p>
                      </div>
                    )}
                    <button
                      onClick={(paymentMethod === 'flutterwave_card' || paymentMethod === 'flutterwave_momo') ? handleProceedToFlutterwave : paymentMethod === 'card' ? handleProceedToPesapal : handleInTouchPay}
                      disabled={!paymentMethod || saving || ((paymentMethod === 'mtn_momo' || paymentMethod === 'airtel_money') && !momoPhone.trim())}
                      className="w-full px-6 py-4 sm:py-3.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
                      ) : paymentMethod === 'flutterwave_card' || paymentMethod === 'card' ? (
                        <><CreditCard className="w-4 h-4" /> Proceed to Pay ${grandTotal}</>
                      ) : paymentMethod === 'flutterwave_momo' ? (
                        <><Smartphone className="w-4 h-4" /> Pay with Mobile Money</>
                      ) : (paymentMethod === 'mtn_momo' || paymentMethod === 'airtel_money') ? (
                        <><Smartphone className="w-4 h-4" /> Pay with {paymentMethod === 'airtel_money' ? 'Airtel Money' : 'MTN MoMo'}</>
                      ) : (
                        <><CreditCard className="w-4 h-4" /> Choose a payment method</>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            {step === 'confirmation' && (
              <div className="text-center space-y-5 sm:space-y-6 py-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">Booking Confirmed!</h3>
                  <p className="text-sm text-neutral-500">Your booking is confirmed and ready</p>
                </div>

                <div className="bg-neutral-50 rounded-lg p-4 sm:p-6 text-left space-y-3 border border-neutral-200">
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Booking Details</h4>
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500 flex-shrink-0">Reference</span>
                    <span className="font-bold text-neutral-900 text-right">{bookingRef}</span>
                  </div>
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500 flex-shrink-0">{itemType === 'experience' ? 'Experience' : 'Homestay'}</span>
                    <span className="font-medium text-neutral-900 text-right leading-snug">{itemTitle}</span>
                  </div>
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500 flex-shrink-0">
                      {itemType === 'homestay' && listingDetails?.duration_value && listingDetails.duration_value > 1 ? 'Dates' : 'Date'}
                    </span>
                    <span className="font-medium text-neutral-900 text-right">
                      {formatBookingDateLabel(selectedDate, itemType === 'homestay' ? listingDetails?.duration_value : undefined)}
                    </span>
                  </div>
                  {sessionLabel && (
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-neutral-500 flex-shrink-0">Session</span>
                      <span className="font-medium text-neutral-900 text-right">{sessionLabel}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500 flex-shrink-0">{itemType === 'homestay' ? 'Guests' : 'Participants'}</span>
                    <span className="font-medium text-neutral-900">{guests}</span>
                  </div>
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500 flex-shrink-0">Status</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                      <Check className="w-3 h-3" />
                      Confirmed
                    </span>
                  </div>
                  {addTransport && transportFare && (
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-neutral-500 flex-shrink-0">Transport</span>
                      <span className="font-medium text-neutral-900 text-right">Roundtrip from {pickupPoint?.label}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-3 border-t border-neutral-200 gap-4">
                    <span className="text-neutral-500 flex-shrink-0">Total Paid</span>
                    <span className="text-lg font-bold text-neutral-900">${grandTotal}</span>
                  </div>
                </div>

                <p className="text-sm text-neutral-500">
                  A confirmation email has been sent to your inbox.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleMessageHost}
                    className="w-full px-6 py-4 sm:py-3.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message Host
                  </button>
                  <BookingReceiptDownloadButton
                    className="w-full px-6 py-4 sm:py-3.5 border border-neutral-200 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
                    data={{
                      bookingRef,
                      itemTitle,
                      itemTypeLabel: itemType === 'experience' ? 'Experience' : 'Homestay',
                      dateLabel: formatBookingDateLabel(selectedDate, itemType === 'homestay' ? listingDetails?.duration_value : undefined),
                      sessionLabel: sessionLabel || undefined,
                      guestsLabel: itemType === 'homestay' ? 'Guests' : 'Participants',
                      guests,
                      lineItems: [
                        { label: 'Subtotal', value: `$${totalPrice.toFixed(2)}` },
                        { label: 'Service Fee (10%)', value: `$${serviceFee.toFixed(2)}` },
                        ...(addTransport && transportFare ? [{ label: `Transport (from ${pickupPoint?.label})`, value: `$${Math.round(transportFare.total_fare / RWF_TO_USD_RATE).toFixed(2)}` }] : []),
                      ],
                      total: grandTotal,
                      travelerName: traveler?.full_name || 'Guest',
                      travelerEmail: traveler?.email,
                      paymentMethodLabel: paymentMethod === 'flutterwave_card' ? 'Flutterwave (Card)'
                        : paymentMethod === 'flutterwave_momo' ? 'Flutterwave (Mobile Money)'
                        : paymentMethod === 'card' ? 'Card (Pesapal)'
                        : paymentMethod === 'mtn_momo' ? 'MTN Mobile Money'
                        : paymentMethod === 'airtel_money' ? 'Airtel Money'
                        : undefined,
                    }}
                  />
                  <button
                    onClick={handleComplete}
                    className="w-full px-6 py-4 sm:py-3.5 border border-neutral-200 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-colors text-sm sm:text-base"
                  >
                    View My Bookings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
