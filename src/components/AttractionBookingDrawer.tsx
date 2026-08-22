import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, CreditCard, Check, Info, Star, Award, Clock, CheckCircle, AlertCircle, ChevronRight, ArrowLeft, MessageSquare, Loader2, ShieldCheck, Calendar, Smartphone, Car, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TravelerUser } from '../lib/auth';
import { sendEmail } from '../lib/sendEmail';
import { PaymentMethodSelector, type PaymentMethodId } from './PaymentMethodSelector';
import { getActiveGateway, type ActiveGateway } from '../lib/paymentGateway';
import { BookingReceiptDownloadButton } from './BookingReceiptDownloadButton';
import { getTransportZones, calculateTransportFare } from '../lib/mobilityService';
import type { TransportZone, TransportFareCalculation } from '../lib/types';
import { getCoordinates, RWANDA_LOCATION_NAMES } from '../lib/rwandaGazetteer';
import { RWF_TO_USD_RATE } from '../lib/transportPricing';
import { useDebounce } from '../lib/useDebounce';
import { getGuideBookedRanges, getManualClosures, isRangeAvailable, parseDateStr } from '../lib/availability';

interface Program {
  id: string;
  title: string;
  description: string;
  duration_hours: number;
  max_participants: number;
  price_per_person: number;
  what_included: string[];
  what_to_bring: string[];
  images: string[];
}

interface Guide {
  id: string;
  name: string;
  bio: string;
  specializations: string[];
  languages: string[];
  experience_years: number;
  rating: number;
  total_tours: number;
  profile_picture: string | null;
  tip: number;
}

interface AttractionBookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  attractionName: string;
  locationName?: string;
  institutionId?: string;
  basePrice?: string;
  entryFeeIsFree?: boolean;
  entryFeeAmount?: number;
  programs: Program[];
  guides: Guide[];
  onComplete: () => void;
}

type BookingStep = 'packages' | 'datetime' | 'guides' | 'payment' | 'confirmation';

function generateTimeSlots(startTime: string, endTime: string, durationHours: number): string[] {
  if (!startTime || !endTime || durationHours <= 0) return [];
  const slots: string[] = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const durationMins = durationHours * 60;
  for (let t = startMins; t + durationMins <= endMins; t += 30) {
    const hh = Math.floor(t / 60).toString().padStart(2, '0');
    const mm = (t % 60).toString().padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function addHours(timeStr: string, hours: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + m + Math.round(hours * 60);
  const hh = Math.floor(totalMins / 60) % 24;
  const mm = totalMins % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

export function AttractionBookingDrawer({
  isOpen,
  onClose,
  attractionName,
  locationName,
  institutionId,
  entryFeeIsFree = true,
  entryFeeAmount = 0,
  programs,
  guides,
  onComplete,
}: AttractionBookingDrawerProps) {
  const [step, setStep] = useState<BookingStep>('packages');
  const [selectedPrograms, setSelectedPrograms] = useState<Program[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [guests, setGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [addTransport, setAddTransport] = useState(false);
  const [transportZone, setTransportZone] = useState<TransportZone | null>(null);
  const [transportZones, setTransportZones] = useState<TransportZone[]>([]);
  const [transportFare, setTransportFare] = useState<TransportFareCalculation | null>(null);
  const [pickupLocation, setPickupLocation] = useState('');
  const [transportLoading, setTransportLoading] = useState(false);
  const [transportLocationError, setTransportLocationError] = useState<string | null>(null);
  const [pesapalUrl, setPesapalUrl] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [gateway, setGateway] = useState<ActiveGateway>('flutterwave');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [momoPhone, setMomoPhone] = useState('');
  const [momoStage, setMomoStage] = useState<'idle' | 'awaiting'>('idle');
  const [momoAmountRwf, setMomoAmountRwf] = useState<number | null>(null);
  const momoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [viewingProgramDetails, setViewingProgramDetails] = useState<Program | null>(null);
  const [viewingGuideDetails, setViewingGuideDetails] = useState<Guide | null>(null);
  const [guideReviews, setGuideReviews] = useState<Array<{ id: string; reviewer_name: string; reviewer_profile_picture?: string; rating: number; review_text: string; created_at: string }>>([]);
  const [loadingGuideReviews, setLoadingGuideReviews] = useState(false);
  const { user } = useAuth();
  const traveler = user as TravelerUser | null;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [guideSchedules, setGuideSchedules] = useState<Record<string, Record<string, { is_working: boolean; start_time: string; end_time: string }>>>({});
  const navigate = useNavigate();
  const [institutionHours, setInstitutionHours] = useState<{ opening_time: string; closing_time: string; closed_days: string[] }>({
    opening_time: '08:00',
    closing_time: '18:00',
    closed_days: [],
  });
  const [visible, setVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => () => { if (momoPollRef.current) clearInterval(momoPollRef.current); }, []);

  useEffect(() => {
    if (isOpen) getActiveGateway().then(setGateway);
  }, [isOpen]);

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

  const debouncedPickup = useDebounce(pickupLocation, 500);

  // Same gap fixed in the Experience/Homestay/Journey booking drawer: the
  // listing's own location and the pickup field are both free text with no
  // stored coordinates, so resolving both against the shared Rwanda
  // gazetteer is what makes the distance-based fare below real instead of
  // silently always computing 0km.
  const calculateTransport = async () => {
    if (!transportZone) return;
    const pickupCoords = getCoordinates(pickupLocation);
    if (!pickupCoords) {
      setTransportFare(null);
      setTransportLocationError(pickupLocation.trim() ? 'Pick a recognized town or neighbourhood so we can estimate the fare.' : null);
      return;
    }
    setTransportLocationError(null);
    setTransportLoading(true);
    try {
      const dropoffCoords = getCoordinates(locationName || attractionName) || getCoordinates('Kigali')!;
      const fare = await calculateTransportFare(
        { name: pickupLocation, address: '', coordinates: pickupCoords },
        { name: locationName || attractionName, address: '', coordinates: dropoffCoords },
        transportZone.id,
        true
      );
      setTransportFare(fare);
    } catch (error) {
      console.error('Error calculating transport:', error);
    } finally {
      setTransportLoading(false);
    }
  };

  useEffect(() => {
    if (addTransport && transportZone) {
      calculateTransport();
    } else {
      setTransportFare(null);
      setTransportLocationError(null);
    }
  }, [addTransport, transportZone, guests, debouncedPickup]);

  useEffect(() => {
    if (guides.length > 0) loadGuideSchedules();
  }, [guides]);

  useEffect(() => {
    if (institutionId) loadInstitutionHours();
  }, [institutionId]);

  useEffect(() => {
    if (!viewingGuideDetails) { setGuideReviews([]); return; }
    setLoadingGuideReviews(true);
    supabase
      .from('attraction_reviews')
      .select('id, reviewer_name, reviewer_profile_picture, rating, review_text, created_at')
      .eq('guide_id', viewingGuideDetails.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setGuideReviews(data || []);
        setLoadingGuideReviews(false);
      });
  }, [viewingGuideDetails?.id]);

  async function loadInstitutionHours() {
    if (!institutionId) return;
    const { data } = await supabase
      .from('institution_profiles')
      .select('opening_time, closing_time, closed_days')
      .eq('portal_user_id', institutionId)
      .maybeSingle();
    if (data) {
      setInstitutionHours({
        opening_time: data.opening_time || '08:00',
        closing_time: data.closing_time || '18:00',
        closed_days: data.closed_days || [],
      });
    }
  }

  async function loadGuideSchedules() {
    const guideIds = guides.map(g => g.id);
    const { data } = await supabase
      .from('guide_schedules')
      .select('guide_id, day_of_week, is_working, start_time, end_time')
      .in('guide_id', guideIds);
    const map: Record<string, Record<string, { is_working: boolean; start_time: string; end_time: string }>> = {};
    (data || []).forEach((s: any) => {
      if (!map[s.guide_id]) map[s.guide_id] = {};
      map[s.guide_id][s.day_of_week] = { is_working: s.is_working, start_time: s.start_time, end_time: s.end_time };
    });
    setGuideSchedules(map);
  }

  function getDayName(dateStr: string) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  }

  function isDateClosed(dateStr: string): boolean {
    if (!dateStr) return false;
    return institutionHours.closed_days.includes(getDayName(dateStr));
  }

  function getAvailableTimeSlots(dateStr: string, durationHours: number): string[] {
    if (!dateStr || durationHours <= 0) return [];
    return generateTimeSlots(
      institutionHours.opening_time || '08:00',
      institutionHours.closing_time || '18:00',
      durationHours
    );
  }

  function isGuideAvailableForSlot(guideId: string, dateStr: string, timeSlot: string, durationHours: number): { available: boolean; reason?: string } {
    if (!dateStr || !timeSlot) return { available: true };
    const dayName = getDayName(dateStr);
    const schedMap = guideSchedules[guideId];
    if (!schedMap) return { available: true };
    const daySched = schedMap[dayName];
    if (!daySched) return { available: true };
    if (!daySched.is_working) return { available: false, reason: 'Not working this day' };
    const [sh, sm] = daySched.start_time.split(':').map(Number);
    const [eh, em] = daySched.end_time.split(':').map(Number);
    const [tsh, tsm] = timeSlot.split(':').map(Number);
    const slotEndStr = addHours(timeSlot, durationHours);
    const [teh, tem] = slotEndStr.split(':').map(Number);
    const guideStart = sh * 60 + sm;
    const guideEnd = eh * 60 + em;
    const slotStart = tsh * 60 + tsm;
    const slotEnd = teh * 60 + tem;
    if (slotStart < guideStart || slotEnd > guideEnd) {
      return { available: false, reason: `Works ${formatTime(daySched.start_time)}–${formatTime(daySched.end_time)}` };
    }
    return { available: true };
  }

  function toggleProgram(program: Program) {
    setSelectedPrograms(prev => {
      const exists = prev.some(p => p.id === program.id);
      if (exists) return prev.filter(p => p.id !== program.id);
      return [...prev, program];
    });
  }

  if (!visible) return null;

  const hasPrograms = programs.length > 0;
  const hasGuides = guides.length > 0;
  const durationHours = selectedPrograms.length > 0
    ? Math.max(...selectedPrograms.map(p => p.duration_hours))
    : 1;

  const programsSubtotal = selectedPrograms.reduce((sum, p) => sum + p.price_per_person * guests, 0);
  const actualEntryFee = entryFeeIsFree ? 0 : entryFeeAmount;
  const guideTip = selectedGuide ? (selectedGuide.tip ?? 0) : 0;
  const subtotal = actualEntryFee + programsSubtotal + guideTip;
  const serviceFee = parseFloat((subtotal * 0.1).toFixed(2));
  // Transport isn't fee-able — added after the service fee, same as the
  // Experience/Homestay/Journey booking drawer.
  const transportUsd = addTransport && transportFare ? Math.round(transportFare.total_fare / RWF_TO_USD_RATE) : 0;
  const totalWithFee = parseFloat((subtotal + serviceFee + transportUsd).toFixed(2));

  const availableTimeSlots = selectedDate ? getAvailableTimeSlots(selectedDate, durationHours) : [];
  const dateClosed = isDateClosed(selectedDate);

  const handleNextFromPackages = () => setStep('datetime');
  const handleNextFromDateTime = () => { if (hasGuides) setStep('guides'); else setStep('payment'); };
  const handleNextFromGuides = () => setStep('payment');

  // Creates the booking row on first use (both the card and mobile-money
  // paths need one before they can call their respective payment function),
  // and returns its id/ref without re-creating it on subsequent retries.
  const ensureBookingCreated = async (): Promise<{ bId: string; bRef: string }> => {
    if (bookingId && bookingRef) return { bId: bookingId, bRef: bookingRef };

    // A guide can only lead one engagement at a time — this drawer never
    // checked availability at all before, unlike the host-led booking flow.
    if (selectedGuide && selectedDate) {
      const requestDate = parseDateStr(selectedDate);
      const [bookedRanges, closures, guideRow] = await Promise.all([
        getGuideBookedRanges(selectedGuide.id),
        getManualClosures('guide', selectedGuide.id),
        supabase.from('guides').select('max_engagements_per_day').eq('id', selectedGuide.id).maybeSingle(),
      ]);
      const dailyLimit = guideRow.data?.max_engagements_per_day || 1;
      if (!isRangeAvailable(bookedRanges, closures, requestDate, requestDate, dailyLimit)) {
        throw new Error(`${selectedGuide.name} is no longer available on this date. Please choose another guide or date.`);
      }
    }

    const ref = `BK-${Math.floor(100000 + Math.random() * 900000)}`;
    const primaryProgram = selectedPrograms[0] || null;

    const { data: bookingData, error: insertError } = await supabase.from('bookings').insert({
      booking_ref: ref,
      traveler_id: traveler?.id || null,
      traveler_name: traveler?.full_name || 'Guest',
      traveler_email: traveler?.email || 'guest@example.com',
      traveler_profile_picture: traveler?.profile_picture || '',
      booking_type: 'attraction',
      item_id: institutionId || null,
      item_title: attractionName,
      institution_id: institutionId || null,
      program_id: primaryProgram?.id || null,
      guide_id: selectedGuide?.id || null,
      package_name: selectedPrograms.length > 0 ? selectedPrograms.map(p => p.title).join(', ') : null,
      guide_name: selectedGuide?.name || null,
      booking_date: selectedDate,
      guests,
      subtotal: programsSubtotal,
      service_fee: serviceFee,
      total_amount: totalWithFee,
      entry_fee_amount: actualEntryFee,
      tip_amount: guideTip,
      special_requests: specialRequests,
      // Paid bookings stay pending until Pesapal/InTouch confirms payment
      // (their respective callback functions flip them to confirmed/paid).
      // Free bookings have nothing to pay, so they are confirmed immediately.
      status: totalWithFee > 0 ? 'pending' : 'confirmed',
      payment_status: totalWithFee > 0 ? 'pending' : 'paid',
    }).select().single();
    if (insertError) throw insertError;

    if (selectedPrograms.length > 0 && bookingData?.id) {
      const bookingProgramRows = selectedPrograms.map(p => ({
        booking_id: bookingData.id,
        program_id: p.id,
        program_title: p.title,
        price_snapshot: p.price_per_person,
        is_free: p.price_per_person === 0,
      }));
      await supabase.from('booking_programs').insert(bookingProgramRows);
    }

    // Record the transport request (no automated driver dispatch — the
    // host/guide/partner or Ops arranges pickup manually, this just makes
    // sure the request and fare survive past checkout instead of being
    // silently discarded).
    if (addTransport && transportFare && bookingData?.id) {
      const pickupCoords = getCoordinates(pickupLocation);
      const dropoffCoords = getCoordinates(locationName || attractionName) || getCoordinates('Kigali')!;
      const { data: transport } = await supabase.from('transports').insert({
        booking_id: bookingData.id,
        transport_type: 'roundtrip',
        pickup_location: { name: pickupLocation, address: '', coordinates: pickupCoords, landmark: '' },
        dropoff_location: { name: locationName || attractionName, address: '', coordinates: dropoffCoords, landmark: '' },
        scheduled_pickup_time: new Date(`${selectedDate}T00:00:00`).toISOString(),
        distance_km: transportFare.distance_km,
        base_fare: transportFare.base_fare,
        total_fare: transportFare.total_fare,
        surge_multiplier: transportFare.surge_multiplier,
        status: 'pending_dispatch',
      }).select('id').single();
      if (transport) {
        await supabase.from('bookings').update({ transport_requested: true, transport_id: transport.id }).eq('id', bookingData.id);
      }
    }

    const bRef = ref;
    const bId = bookingData?.id || '';
    setBookingRef(bRef);
    setBookingId(bId);
    return { bId, bRef };
  };

  const handleProceedToPesapal = async () => {
    if (!paymentMethod) return;
    setSaving(true);
    setIframeLoading(true);
    setSaveError(null);

    try {
      const { bId, bRef } = await ensureBookingCreated();

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const orderRes = await fetch(`${supabaseUrl}/functions/v1/pesapal-create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          booking_id: bId,
          booking_ref: bRef,
          amount: totalWithFee,
          currency: 'USD',
          description: `${attractionName}${selectedPrograms.length > 0 ? ` - ${selectedPrograms.map(p => p.title).join(', ')}` : ''}`,
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
      setSaveError(err.message || 'Failed to initiate payment. Please try again.');
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
    setSaving(true);
    setSaveError(null);

    try {
      const { bId, bRef } = await ensureBookingCreated();

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/flutterwave-create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({
          booking_id: bId,
          booking_ref: bRef,
          amount: totalWithFee,
          currency: 'USD',
          description: `${attractionName}${selectedPrograms.length > 0 ? ` - ${selectedPrograms.map(p => p.title).join(', ')}` : ''}`,
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
      setSaveError(err.message || 'Failed to initiate payment. Please try again.');
      setSaving(false);
    }
  };

  const sendBookingEmails = () => {
    const programNames = selectedPrograms.map(p => p.title).join(', ');
    const emailData = {
      booking_ref: bookingRef,
      traveler_name: traveler?.full_name || 'Guest',
      traveler_email: traveler?.email || '',
      booking_type: 'attraction',
      item_title: attractionName,
      booking_date: selectedDate,
      package_name: programNames,
      guide_name: selectedGuide?.name || '',
      guests,
      entry_fee: actualEntryFee,
      programs_subtotal: programsSubtotal,
      guide_tip: guideTip,
      subtotal,
      service_fee: serviceFee,
      total_amount: totalWithFee,
      special_requests: specialRequests,
    };

    sendEmail({
      template: 'booking_confirmation_traveler',
      recipient_email: traveler?.email || '',
      recipient_name: traveler?.full_name || '',
      data: emailData,
    });

    if (selectedGuide) {
      supabase.from('guides').select('email, name').eq('id', selectedGuide.id).maybeSingle().then(({ data: gData }) => {
        if (gData?.email) {
          sendEmail({
            template: 'new_booking_guide',
            recipient_email: gData.email,
            recipient_name: gData.name || selectedGuide.name,
            data: { ...emailData, guide_name: gData.name || selectedGuide.name },
          });
        }
      });
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

    const { data: refreshed } = await supabase
      .from('bookings')
      .select('payment_status')
      .eq('id', bookingId)
      .maybeSingle();

    if (refreshed?.payment_status === 'paid') return 'paid';
    if (refreshed?.payment_status === 'failed') return 'failed';
    return 'pending';
  };

  const handlePaymentConfirmed = async () => {
    if (!bookingId) return;
    setVerifyingPayment(true);
    setSaveError(null);

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
      setSaveError('Your payment could not be confirmed. No charge was made — please try again.');
    } else {
      setSaveError("We haven't received confirmation of your payment yet. If you completed it, wait a moment and click the button again.");
    }
  };

  const stopMomoPoll = () => {
    if (momoPollRef.current) { clearInterval(momoPollRef.current); momoPollRef.current = null; }
  };

  const handleInTouchPay = async () => {
    const digits = momoPhone.replace(/\D/g, '');
    if (!/^(250)?0?7[2389]\d{7}$/.test(digits)) {
      setSaveError('Enter a valid MTN (078/079) or Airtel (072/073) number.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const { bId, bRef } = await ensureBookingCreated();

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/intouch-request-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({
          booking_id: bId,
          booking_ref: bRef,
          amount_usd: totalWithFee,
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
        const { data: b } = await supabase.from('bookings').select('payment_status').eq('id', bId).maybeSingle();
        if (b?.payment_status === 'paid') {
          stopMomoPoll();
          sendBookingEmails();
          setMomoStage('idle');
          setStep('confirmation');
        } else if (b?.payment_status === 'failed') {
          stopMomoPoll();
          setMomoStage('idle');
          setSaveError('The payment was declined or cancelled. You can try again.');
        } else if (elapsed >= 150) {
          stopMomoPoll();
          setMomoStage('idle');
          setSaveError("We didn't get a confirmation in time. If you approved the prompt, check My Trips shortly — otherwise try again.");
        }
      }, 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Mobile money payment failed. Please try again.');
      setSaving(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    setStep('packages');
    setSelectedPrograms([]);
    setSelectedGuide(null);
    setSelectedDate('');
    setSelectedTimeSlot('');
    setGuests(1);
    setSpecialRequests('');
    setBookingRef('');
    setBookingId('');
    setSaveError(null);
    setPesapalUrl(null);
    setIframeLoading(false);
    stopMomoPoll();
    setMomoStage('idle');
    setMomoPhone('');
    setMomoAmountRwf(null);
    setPaymentMethod(null);
    setAddTransport(false);
    setPickupLocation('');
    setTransportFare(null);
    setTransportLocationError(null);
  };

  const handleMessageGuide = async () => {
    if (!bookingId || !traveler?.id) return;
    try {
      const guideName = selectedGuide?.name || 'Guide';
      const greeting = `Hey ${guideName.split(' ')[0]}, `;

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
        guide_id: selectedGuide?.id || null,
        guide_name: guideName,
        listing_title: attractionName,
        listing_type: 'attraction',
      }).select('id').single();
      navigate(newConv ? `/messages?conversation=${newConv.id}&greeting=${encodeURIComponent(greeting)}` : '/messages');
      onClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const stepOrder: BookingStep[] = ['packages', 'datetime', 'guides', 'payment', 'confirmation'];
  const stepLabels: Record<BookingStep, string> = {
    packages: 'Package',
    datetime: 'Date & Time',
    guides: 'Guide',
    payment: 'Payment',
    confirmation: 'Confirmed',
  };
  const currentStepIndex = stepOrder.indexOf(step);
  const visibleSteps = hasGuides ? stepOrder : stepOrder.filter(s => s !== 'guides');

  const stepTitle = () => {
    if (step === 'packages') return hasPrograms ? 'Choose Your Packages' : 'Book Your Visit';
    if (step === 'datetime') return 'Select Date & Time';
    if (step === 'guides') return 'Choose Your Guide';
    if (step === 'payment') return 'Payment';
    if (step === 'confirmation') return 'Booking Confirmed';
    return '';
  };

  const canProceedFromDateTime = !!selectedDate && !dateClosed && (availableTimeSlots.length === 0 || !!selectedTimeSlot);

  const prevStep = () => {
    if (step === 'datetime') setStep('packages');
    else if (step === 'guides') setStep('datetime');
    else if (step === 'payment') setStep(hasGuides ? 'guides' : 'datetime');
  };
  const hasPrev = step !== 'packages' && step !== 'confirmation';

  const drawerTranslate = isOpen ? 'translate-x-0' : 'translate-x-full';
  const overlayOpacity = isOpen ? 'opacity-100' : 'opacity-0';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className={`absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity duration-350 ${overlayOpacity}`}
        onClick={onClose}
      />

      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[92%] md:w-4/5 lg:w-3/4 xl:w-2/3 bg-white shadow-2xl flex flex-col transition-transform duration-350 ease-in-out ${drawerTranslate}`}
      >
        <div className="flex-shrink-0 border-b border-neutral-100 px-4 sm:px-6 md:px-10 py-4 sm:py-5 bg-white">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-3">
              {hasPrev && (
                <button
                  onClick={prevStep}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500 hover:text-neutral-900 flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-neutral-900 leading-tight">{stepTitle()}</h2>
                <p className="text-xs text-neutral-400 mt-0.5 truncate">{attractionName}</p>
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
              {visibleSteps.filter(s => s !== 'confirmation').map((s, i, arr) => {
                const isDone = stepOrder.indexOf(s) < currentStepIndex;
                const isActive = s === step;
                return (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    {i > 0 && <div className={`h-px flex-1 transition-colors ${isDone ? 'bg-neutral-900' : 'bg-neutral-200'}`} />}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                        isDone ? 'bg-neutral-900 text-white' :
                        isActive ? 'bg-neutral-900 text-white' :
                        'bg-neutral-100 text-neutral-400'
                      }`}>
                        {isDone ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-neutral-900' : isDone ? 'text-neutral-600' : 'text-neutral-400'}`}>
                        {stepLabels[s]}
                      </span>
                    </div>
                    {i < arr.length - 1 && <div className={`h-px flex-1 transition-colors ${isDone ? 'bg-neutral-900' : 'bg-neutral-200'}`} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 md:px-10 py-5 sm:py-8 w-full max-w-2xl">

            {step === 'packages' && !viewingProgramDetails && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-neutral-500 mb-1">Entry Fee</div>
                    {entryFeeIsFree ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold">
                        <Check className="w-3 h-3" />
                        Free Admission
                      </span>
                    ) : (
                      <div className="text-sm font-semibold text-neutral-900">${entryFeeAmount?.toFixed(2)} per booking</div>
                    )}
                  </div>
                </div>

                {hasPrograms ? (
                  <>
                    <p className="text-sm text-neutral-500">Select one or more packages for your visit.</p>
                    {programs.map((program) => {
                      const isSelected = selectedPrograms.some(p => p.id === program.id);
                      return (
                        <div
                          key={program.id}
                          onClick={() => toggleProgram(program)}
                          className={`p-5 border-2 transition-all cursor-pointer rounded-lg ${
                            isSelected ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start gap-3 flex-1 pr-4">
                              <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                                isSelected ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-neutral-900">{program.title}</h3>
                                <p className="text-sm text-neutral-500 mt-1 leading-relaxed">{program.description}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {program.price_per_person === 0 ? (
                                <div className="text-base font-bold text-emerald-600">Free</div>
                              ) : (
                                <>
                                  <div className="text-xl font-bold text-neutral-900">${program.price_per_person}</div>
                                  <div className="text-xs text-neutral-400">per person</div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-neutral-500 mb-3 pl-8">
                            {program.duration_hours > 0 && (
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{program.duration_hours}h duration</span>
                            )}
                            {program.max_participants > 0 && (
                              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Max {program.max_participants}</span>
                            )}
                          </div>
                          <div className="pl-8">
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewingProgramDetails(program); }}
                              className="px-3 py-1.5 text-xs border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-all rounded-lg flex items-center gap-1.5"
                            >
                              <Info className="w-3.5 h-3.5" />
                              Details
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {selectedPrograms.length > 0 && (
                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
                        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Selected ({selectedPrograms.length})</div>
                        <div className="space-y-1">
                          {selectedPrograms.map(p => (
                            <div key={p.id} className="flex justify-between text-sm">
                              <span className="text-neutral-700">{p.title}</span>
                              <span className="font-medium text-neutral-900">
                                {p.price_per_person === 0 ? 'Free' : `$${p.price_per_person}/person`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-sm text-neutral-500">
                    No specific packages — general visit booking.
                  </div>
                )}
                <button
                  onClick={handleNextFromPackages}
                  className="w-full mt-2 px-6 py-4 sm:py-3.5 bg-neutral-900 text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                >
                  Continue to Date & Time
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 'packages' && viewingProgramDetails && (
              <div>
                <button
                  onClick={() => setViewingProgramDetails(null)}
                  className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 mb-5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to packages
                </button>
                <div className="border-2 border-neutral-900 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-4">
                      <h3 className="text-xl font-bold text-neutral-900">{viewingProgramDetails.title}</h3>
                      <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{viewingProgramDetails.description}</p>
                    </div>
                    <div className="text-right">
                      {viewingProgramDetails.price_per_person === 0 ? (
                        <div className="text-2xl font-bold text-emerald-600">Free</div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-neutral-900">${viewingProgramDetails.price_per_person}</div>
                          <div className="text-xs text-neutral-400">per person</div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-neutral-500 mb-5 pb-4 border-b border-neutral-100">
                    {viewingProgramDetails.duration_hours > 0 && (
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{viewingProgramDetails.duration_hours}h</span>
                    )}
                    {viewingProgramDetails.max_participants > 0 && (
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Max {viewingProgramDetails.max_participants}</span>
                    )}
                  </div>
                  {viewingProgramDetails.what_included?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        What's Included
                      </h4>
                      <div className="space-y-2">
                        {viewingProgramDetails.what_included.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                            </div>
                            <span className="text-sm text-neutral-800 font-medium">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {viewingProgramDetails.what_to_bring?.length > 0 && (
                    <div className="mb-5">
                      <h4 className="text-sm font-semibold text-neutral-900 mb-3">What to Bring</h4>
                      <div className="space-y-2">
                        {viewingProgramDetails.what_to_bring.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-sky-50 border border-sky-100">
                            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold">!</span>
                            </div>
                            <span className="text-sm text-neutral-800 font-medium">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => { toggleProgram(viewingProgramDetails); setViewingProgramDetails(null); }}
                    className="w-full px-6 py-3.5 bg-neutral-900 text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
                  >
                    {selectedPrograms.some(p => p.id === viewingProgramDetails.id) ? 'Deselect Package' : 'Add This Package'}
                  </button>
                </div>
              </div>
            )}

            {step === 'datetime' && (
              <div className="space-y-6">
                {selectedPrograms.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-neutral-900 mb-1">
                        {selectedPrograms.length === 1 ? selectedPrograms[0].title : `${selectedPrograms.length} packages selected`}
                      </div>
                      <div className="text-xs text-neutral-500">{durationHours}h max duration</div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Select Visit Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedTimeSlot(''); setSelectedGuide(null); }}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 text-sm"
                  />
                  {dateClosed && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Closed on {getDayName(selectedDate)}s. Please choose another date.
                    </div>
                  )}
                </div>

                {selectedDate && !dateClosed && (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Select Time Slot
                      {selectedPrograms.length > 0 && (
                        <span className="font-normal text-neutral-400">({durationHours}h duration)</span>
                      )}
                    </label>
                    {availableTimeSlots.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {availableTimeSlots.map((slot) => {
                          const endSlot = addHours(slot, durationHours);
                          return (
                            <button
                              key={slot}
                              onClick={() => { setSelectedTimeSlot(slot); setSelectedGuide(null); }}
                              className={`px-3 py-2.5 rounded-lg text-xs font-medium border-2 transition-all ${
                                selectedTimeSlot === slot
                                  ? 'border-neutral-900 bg-neutral-900 text-white'
                                  : 'border-neutral-200 text-neutral-700 hover:border-neutral-500'
                              }`}
                            >
                              <div>{formatTime(slot)}</div>
                              <div className="text-[10px] opacity-60">–{formatTime(endSlot)}</div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 text-center">
                        No time slots available for this date.
                      </div>
                    )}
                  </div>
                )}

                {selectedDate && !dateClosed && (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Number of Visitors
                    </label>
                    <input
                      type="number"
                      value={guests}
                      onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 text-sm"
                    />
                  </div>
                )}

                {selectedDate && !dateClosed && (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-900 mb-2">Special Requests</label>
                    <textarea
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={3}
                      placeholder="Any special requirements or accessibility needs..."
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 text-sm resize-none"
                    />
                  </div>
                )}

                {selectedDate && !dateClosed && (
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
                        {addTransport ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </button>

                    {addTransport && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Pickup Location
                          </label>
                          <input
                            type="text"
                            list="rwanda-pickup-locations-attraction"
                            value={pickupLocation}
                            onChange={(e) => setPickupLocation(e.target.value)}
                            placeholder="e.g., Kimironko, Kigali Airport..."
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                          />
                          <datalist id="rwanda-pickup-locations-attraction">
                            {RWANDA_LOCATION_NAMES.map(name => <option key={name} value={name} />)}
                          </datalist>
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
                            }}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                          >
                            {transportZones.map((zone) => (
                              <option key={zone.id} value={zone.id}>{zone.region}</option>
                            ))}
                          </select>
                        </div>

                        {transportLoading ? (
                          <div className="flex items-center justify-center py-3">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                          </div>
                        ) : transportFare ? (
                          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Base fare</span>
                              <span className="font-medium text-slate-700">{(transportFare.base_fare / 1000).toFixed(1)}k RWF</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Distance ({transportFare.distance_km} km)</span>
                              <span className="font-medium text-slate-700">{(transportFare.distance_fare / 1000).toFixed(1)}k RWF</span>
                            </div>
                            {transportFare.surge_multiplier > 1 && (
                              <div className="flex justify-between text-amber-600">
                                <span>Surge ({((transportFare.surge_multiplier - 1) * 100).toFixed(0)}%)</span>
                                <span>{transportFare.surge_reason}</span>
                              </div>
                            )}
                            <div className="pt-2 border-t border-slate-200 flex justify-between">
                              <span className="font-medium text-slate-900">Round trip total</span>
                              <span className="font-bold text-teal-700">{(transportFare.total_fare / 1000).toFixed(1)}k RWF</span>
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
                )}

                {selectedDate && !dateClosed && selectedTimeSlot && (
                  <PriceSummaryCard
                    entryFeeIsFree={entryFeeIsFree}
                    entryFeeAmount={actualEntryFee}
                    selectedPrograms={selectedPrograms}
                    guests={guests}
                    guideTip={0}
                    serviceFeeRate={0.1}
                    showGuide={false}
                    transportUsd={transportUsd}
                  />
                )}

                <button
                  onClick={handleNextFromDateTime}
                  disabled={!canProceedFromDateTime}
                  className="w-full px-6 py-3.5 bg-neutral-900 text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {hasGuides ? 'Choose a Guide' : 'Continue to Payment'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 'guides' && !viewingGuideDetails && (
              <div className="space-y-4">
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="text-xs text-neutral-600 space-y-0.5">
                    <div className="font-medium text-neutral-900">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-neutral-500">
                      {formatTime(selectedTimeSlot)} – {formatTime(addHours(selectedTimeSlot, durationHours))} · {guests} visitor{guests !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-neutral-500">
                  Choose a guide for your visit (optional). A guide tip will be added to your total.
                </p>

                {guides.length === 0 ? (
                  <div className="py-8 text-center text-sm text-neutral-400">No guides available</div>
                ) : (
                  guides.map((guide) => {
                    const avail = isGuideAvailableForSlot(guide.id, selectedDate, selectedTimeSlot, durationHours);
                    return (
                      <div
                        key={guide.id}
                        className={`p-5 border-2 rounded-lg transition-all ${
                          !avail.available ? 'border-neutral-100 bg-neutral-50' :
                          selectedGuide?.id === guide.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
                        }`}
                      >
                        <div className="flex items-start gap-4 mb-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${avail.available ? 'bg-amber-100' : 'bg-neutral-100'}`}>
                            {guide.profile_picture ? (
                              <img src={guide.profile_picture} alt={guide.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className={`text-base font-bold ${avail.available ? 'text-amber-700' : 'text-neutral-400'}`}>
                                {guide.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className={`text-sm font-semibold ${avail.available ? 'text-neutral-900' : 'text-neutral-400'}`}>{guide.name}</h3>
                              {!avail.available && (
                                <span className="text-xs px-2 py-0.5 bg-rose-50 text-rose-500 rounded-full border border-rose-100">Unavailable</span>
                              )}
                              {avail.available && guide.tip > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200 font-medium">
                                  +${guide.tip.toFixed(2)} tip
                                </span>
                              )}
                            </div>
                            {guide.specializations?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {guide.specializations.slice(0, 2).map((s, i) => (
                                  <span key={i} className={`text-xs px-2 py-0.5 rounded ${avail.available ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-50 text-neutral-300'}`}>{s}</span>
                                ))}
                              </div>
                            )}
                            <div className={`flex items-center gap-3 text-xs ${avail.available ? 'text-neutral-500' : 'text-neutral-300'}`}>
                              {guide.rating > 0 && (
                                <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{guide.rating.toFixed(1)}</span>
                              )}
                              {guide.experience_years > 0 && (
                                <span className="flex items-center gap-1"><Award className="w-3 h-3" />{guide.experience_years} yrs</span>
                              )}
                              {guide.languages?.length > 0 && (
                                <span>{guide.languages.slice(0, 2).join(', ')}</span>
                              )}
                            </div>
                            {!avail.available && avail.reason && (
                              <div className="text-xs text-rose-400 mt-1">{avail.reason}</div>
                            )}
                            {avail.available && selectedTimeSlot && (
                              <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Available {formatTime(selectedTimeSlot)}–{formatTime(addHours(selectedTimeSlot, durationHours))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewingGuideDetails(guide); }}
                            className="px-3 py-2 text-xs border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 rounded-lg transition-all flex items-center gap-1.5"
                          >
                            <Info className="w-3.5 h-3.5" />
                            Profile
                          </button>
                          <button
                            onClick={() => avail.available && setSelectedGuide(g => g?.id === guide.id ? null : guide)}
                            disabled={!avail.available}
                            className={`flex-1 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                              !avail.available ? 'bg-neutral-50 text-neutral-300 border border-neutral-100 cursor-not-allowed' :
                              selectedGuide?.id === guide.id ? 'bg-neutral-900 text-white' :
                              'border border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white'
                            }`}
                          >
                            {!avail.available ? 'Unavailable' : selectedGuide?.id === guide.id ? 'Selected' : 'Choose Guide'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                <button
                  onClick={handleNextFromGuides}
                  className="w-full mt-2 px-6 py-3.5 bg-neutral-900 text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                >
                  {selectedGuide ? `Continue with ${selectedGuide.name.split(' ')[0]}` : 'Continue Without Guide'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 'guides' && viewingGuideDetails && (
              <div>
                <button
                  onClick={() => setViewingGuideDetails(null)}
                  className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 mb-5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to guides
                </button>
                <div className="border-2 border-neutral-900 rounded-lg p-5">
                  <div className="flex items-start gap-5 mb-5 pb-5 border-b border-neutral-100">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {viewingGuideDetails.profile_picture ? (
                        <img src={viewingGuideDetails.profile_picture} alt={viewingGuideDetails.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-amber-700">{viewingGuideDetails.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-neutral-900 mb-1">{viewingGuideDetails.name}</h3>
                      {viewingGuideDetails.specializations?.length > 0 && (
                        <p className="text-sm text-neutral-500 mb-2">{viewingGuideDetails.specializations.join(' · ')}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-neutral-600 flex-wrap">
                        {viewingGuideDetails.experience_years > 0 && (
                          <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-neutral-400" />{viewingGuideDetails.experience_years} yrs</span>
                        )}
                        {viewingGuideDetails.total_tours > 0 && (
                          <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-neutral-400" />{viewingGuideDetails.total_tours}+ tours</span>
                        )}
                        {viewingGuideDetails.rating > 0 && (
                          <span className="flex items-center gap-1.5"><Star className="w-4 h-4 fill-amber-400 text-amber-400" />{viewingGuideDetails.rating.toFixed(1)}</span>
                        )}
                      </div>
                      {viewingGuideDetails.tip > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-medium">
                          Guide tip: ${viewingGuideDetails.tip.toFixed(2)} per booking
                        </div>
                      )}
                    </div>
                  </div>
                  {viewingGuideDetails.bio && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-neutral-900 mb-2">About</h4>
                      <p className="text-sm text-neutral-600 leading-relaxed">{viewingGuideDetails.bio}</p>
                    </div>
                  )}
                  {viewingGuideDetails.languages?.length > 0 && (
                    <div className="mb-5">
                      <h4 className="text-sm font-semibold text-neutral-900 mb-2">Languages</h4>
                      <div className="flex flex-wrap gap-2">
                        {viewingGuideDetails.languages.map((lang, i) => (
                          <span key={i} className="px-3 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full">{lang}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-5">
                    <h4 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      Traveler Reviews
                    </h4>
                    {loadingGuideReviews ? (
                      <div className="space-y-2">
                        {[1, 2].map(i => <div key={i} className="animate-pulse h-16 bg-neutral-100 rounded-lg" />)}
                      </div>
                    ) : guideReviews.length === 0 ? (
                      <div className="py-4 text-center text-sm text-neutral-400 bg-neutral-50 rounded-lg border border-neutral-100">
                        No reviews yet for this guide.
                      </div>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                        {guideReviews.map(review => {
                          const initials = review.reviewer_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                          return (
                            <div key={review.id} className="flex-shrink-0 w-56 bg-neutral-50 border border-neutral-100 rounded-xl p-3.5">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {review.reviewer_profile_picture ? (
                                    <img src={review.reviewer_profile_picture} alt={review.reviewer_name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-xs font-bold text-neutral-500">{initials}</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-neutral-900 truncate">{review.reviewer_name}</p>
                                  <div className="flex gap-0.5">
                                    {[1,2,3,4,5].map(s => (
                                      <Star key={s} className={`w-2.5 h-2.5 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3">{review.review_text}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => { setSelectedGuide(viewingGuideDetails); setViewingGuideDetails(null); }}
                    className="w-full px-6 py-3.5 bg-neutral-900 text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
                  >
                    Choose This Guide
                  </button>
                </div>
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-4">
                <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-4">Booking Summary</h4>

                  <div className="space-y-2.5 mb-4">
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-neutral-500 flex-shrink-0">Attraction</span>
                      <span className="font-medium text-neutral-900 text-right leading-snug max-w-[60%]">{attractionName}</span>
                    </div>
                    {selectedGuide && (
                      <div className="flex justify-between text-sm gap-4">
                        <span className="text-neutral-500">Guide</span>
                        <span className="font-medium text-neutral-900">{selectedGuide.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-neutral-500">Date</span>
                      <span className="font-medium text-neutral-900">
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {selectedTimeSlot && (
                      <div className="flex justify-between text-sm gap-4">
                        <span className="text-neutral-500">Time</span>
                        <span className="font-medium text-neutral-900">{formatTime(selectedTimeSlot)} – {formatTime(addHours(selectedTimeSlot, durationHours))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-neutral-500">Visitors</span>
                      <span className="font-medium text-neutral-900">{guests}</span>
                    </div>
                  </div>

                  <div className="border-t border-neutral-200 pt-3 space-y-2">
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-neutral-500">Entry Fee</span>
                      <span className={`font-medium ${entryFeeIsFree ? 'text-emerald-600' : 'text-neutral-900'}`}>
                        {entryFeeIsFree ? 'Free' : `$${actualEntryFee.toFixed(2)}`}
                      </span>
                    </div>

                    {selectedPrograms.length > 0 ? selectedPrograms.map(p => (
                      <div key={p.id} className="flex justify-between text-sm gap-4">
                        <span className="text-neutral-500 truncate max-w-[55%]">{p.title} × {guests}</span>
                        <span className={`font-medium ${p.price_per_person === 0 ? 'text-emerald-600' : 'text-neutral-900'}`}>
                          {p.price_per_person === 0 ? 'Free' : `$${(p.price_per_person * guests).toFixed(2)}`}
                        </span>
                      </div>
                    )) : (
                      <div className="flex justify-between text-sm gap-4">
                        <span className="text-neutral-500">Programs</span>
                        <span className="text-neutral-400 italic">None selected</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-neutral-500">Guide Tip</span>
                      <span className={`font-medium ${guideTip > 0 ? 'text-amber-700' : 'text-neutral-400'}`}>
                        {guideTip > 0 ? `$${guideTip.toFixed(2)}` : selectedGuide ? '$0.00' : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm gap-4 pt-1 border-t border-neutral-100">
                      <span className="text-neutral-500">Service Fee (10%)</span>
                      <span className="font-medium text-neutral-900">${serviceFee.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between font-bold pt-2 border-t border-neutral-200 gap-4">
                      <span className="text-sm text-neutral-900">Total</span>
                      <span className="text-xl text-neutral-900">${totalWithFee.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {saveError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {saveError}
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
                ) : !pesapalUrl && !iframeLoading && (
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
                      className="w-full px-6 py-4 sm:py-3.5 bg-neutral-900 text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Preparing Payment...
                        </>
                      ) : paymentMethod === 'flutterwave_card' || paymentMethod === 'card' ? (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Proceed to Pay ${totalWithFee.toFixed(2)}
                        </>
                      ) : paymentMethod === 'flutterwave_momo' ? (
                        <>
                          <Smartphone className="w-4 h-4" />
                          Pay with Mobile Money
                        </>
                      ) : (paymentMethod === 'mtn_momo' || paymentMethod === 'airtel_money') ? (
                        <>
                          <Smartphone className="w-4 h-4" />
                          Pay with {paymentMethod === 'airtel_money' ? 'Airtel Money' : 'MTN MoMo'}
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Choose a payment method
                        </>
                      )}
                    </button>
                  </>
                )}

                {iframeLoading && !pesapalUrl && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                    <p className="text-sm text-neutral-500">Loading secure payment form...</p>
                  </div>
                )}

                {pesapalUrl && (
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
                )}
              </div>
            )}

            {step === 'confirmation' && (
              <div className="text-center space-y-6 py-4">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-neutral-900 mb-2">Booking Confirmed!</h3>
                  <p className="text-sm text-neutral-500">Your attraction visit has been booked</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-6 text-left space-y-3 border border-neutral-200">
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-4">Visit Details</h4>
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500">Reference</span>
                    <span className="font-bold text-neutral-900">{bookingRef}</span>
                  </div>
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500 flex-shrink-0">Attraction</span>
                    <span className="font-medium text-neutral-900 text-right max-w-[60%]">{attractionName}</span>
                  </div>
                  {selectedPrograms.length > 0 && (
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-neutral-500 flex-shrink-0">Packages</span>
                      <span className="font-medium text-neutral-900 text-right">{selectedPrograms.map(p => p.title).join(', ')}</span>
                    </div>
                  )}
                  {selectedGuide && (
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-neutral-500">Guide</span>
                      <span className="font-medium text-neutral-900">{selectedGuide.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500">Date</span>
                    <span className="font-medium text-neutral-900">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {selectedTimeSlot && (
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-neutral-500">Time</span>
                      <span className="font-medium text-neutral-900">{formatTime(selectedTimeSlot)} – {formatTime(addHours(selectedTimeSlot, durationHours))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500">Visitors</span>
                    <span className="font-medium text-neutral-900">{guests}</span>
                  </div>
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500">Status</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                      <Check className="w-3 h-3" />
                      Confirmed
                    </span>
                  </div>
                  <div className="border-t border-neutral-200 pt-3 space-y-2">
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-neutral-500">Entry Fee</span>
                      <span className={entryFeeIsFree ? 'text-emerald-600 font-medium' : 'text-neutral-900 font-medium'}>
                        {entryFeeIsFree ? 'Free' : `$${actualEntryFee.toFixed(2)}`}
                      </span>
                    </div>
                    {selectedPrograms.map(p => (
                      <div key={p.id} className="flex justify-between text-sm gap-4">
                        <span className="text-neutral-500 truncate max-w-[55%]">{p.title} × {guests}</span>
                        <span className={p.price_per_person === 0 ? 'text-emerald-600 font-medium' : 'text-neutral-900 font-medium'}>
                          {p.price_per_person === 0 ? 'Free' : `$${(p.price_per_person * guests).toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                    {guideTip > 0 && (
                      <div className="flex justify-between text-sm gap-4">
                        <span className="text-neutral-500">Guide Tip</span>
                        <span className="text-amber-700 font-medium">${guideTip.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-neutral-500">Service Fee</span>
                      <span className="font-medium text-neutral-900">${serviceFee.toFixed(2)}</span>
                    </div>
                    {addTransport && transportFare && (
                      <div className="flex justify-between text-sm gap-4">
                        <span className="text-neutral-500">Transport</span>
                        <span className="font-medium text-neutral-900 text-right">Roundtrip from {pickupLocation}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-1 border-t border-neutral-100 gap-4">
                      <span className="text-neutral-500">Total Paid</span>
                      <span className="text-lg font-bold text-neutral-900">${totalWithFee.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-neutral-500">Please arrive 15 minutes before your scheduled time.</p>
                <div className="space-y-3">
                  {selectedGuide && (
                    <button
                      onClick={handleMessageGuide}
                      className="w-full px-6 py-3.5 bg-neutral-900 text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message Guide
                    </button>
                  )}
                  <BookingReceiptDownloadButton
                    className="w-full px-6 py-3.5 border border-neutral-200 text-neutral-700 text-sm font-semibold rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
                    data={{
                      bookingRef,
                      itemTitle: attractionName,
                      itemTypeLabel: 'Attraction Visit',
                      dateLabel: new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                      sessionLabel: selectedTimeSlot ? `${formatTime(selectedTimeSlot)} – ${formatTime(addHours(selectedTimeSlot, durationHours))}` : undefined,
                      guestsLabel: 'Visitors',
                      guests,
                      lineItems: [
                        { label: 'Entry Fee', value: entryFeeIsFree ? 'Free' : `$${actualEntryFee.toFixed(2)}` },
                        ...selectedPrograms.map(p => ({
                          label: `${p.title} × ${guests}`,
                          value: p.price_per_person === 0 ? 'Free' : `$${(p.price_per_person * guests).toFixed(2)}`,
                        })),
                        ...(guideTip > 0 ? [{ label: 'Guide Tip', value: `$${guideTip.toFixed(2)}` }] : []),
                        { label: 'Service Fee', value: `$${serviceFee.toFixed(2)}` },
                        ...(addTransport && transportFare ? [{ label: `Transport (from ${pickupLocation})`, value: `$${transportUsd.toFixed(2)}` }] : []),
                      ],
                      total: totalWithFee,
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
                    className="w-full px-6 py-3.5 border border-neutral-200 text-neutral-700 text-sm font-semibold rounded-lg hover:bg-neutral-50 transition-colors"
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

function PriceSummaryCard({
  entryFeeIsFree,
  entryFeeAmount,
  selectedPrograms,
  guests,
  guideTip,
  serviceFeeRate,
  showGuide,
  transportUsd = 0,
}: {
  entryFeeIsFree: boolean;
  entryFeeAmount: number;
  selectedPrograms: Program[];
  guests: number;
  guideTip: number;
  serviceFeeRate: number;
  showGuide: boolean;
  transportUsd?: number;
}) {
  const programsSubtotal = selectedPrograms.reduce((s, p) => s + p.price_per_person * guests, 0);
  const subtotalBase = entryFeeAmount + programsSubtotal + (showGuide ? guideTip : 0);
  const fee = parseFloat((subtotalBase * serviceFeeRate).toFixed(2));
  // Transport isn't fee-able — it's added after the service fee, same as the
  // Experience/Homestay/Journey booking drawer.
  const total = parseFloat((subtotalBase + fee + transportUsd).toFixed(2));

  return (
    <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 space-y-2">
      <div className="flex justify-between text-sm gap-4">
        <span className="text-neutral-500">Entry Fee</span>
        <span className={`font-medium ${entryFeeIsFree ? 'text-emerald-600' : 'text-neutral-900'}`}>
          {entryFeeIsFree ? 'Free' : `$${entryFeeAmount.toFixed(2)}`}
        </span>
      </div>
      {selectedPrograms.map(p => (
        <div key={p.id} className="flex justify-between text-sm gap-4">
          <span className="text-neutral-500 truncate max-w-[55%]">{p.title} × {guests}</span>
          <span className={`font-medium ${p.price_per_person === 0 ? 'text-emerald-600' : 'text-neutral-900'}`}>
            {p.price_per_person === 0 ? 'Free' : `$${(p.price_per_person * guests).toFixed(2)}`}
          </span>
        </div>
      ))}
      {showGuide && guideTip > 0 && (
        <div className="flex justify-between text-sm gap-4">
          <span className="text-neutral-500">Guide Tip</span>
          <span className="font-medium text-amber-700">${guideTip.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm gap-4">
        <span className="text-neutral-500">Service Fee (10%)</span>
        <span className="font-medium text-neutral-900">${fee.toFixed(2)}</span>
      </div>
      {transportUsd > 0 && (
        <div className="flex justify-between text-sm gap-4">
          <span className="text-neutral-500">Transport (Roundtrip)</span>
          <span className="font-medium text-neutral-900">${transportUsd.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm pt-2 border-t border-neutral-200 gap-4">
        <span className="font-semibold text-neutral-900">Total</span>
        <span className="text-lg font-bold text-neutral-900">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
