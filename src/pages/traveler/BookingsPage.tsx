import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Tag, Clock, MessageSquare, Star, CheckCircle, X, AlertTriangle, Ban } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TravelerUser } from '../../lib/auth';
import { ReviewModal } from '../../components/ReviewModal';
import { sendEmail } from '../../lib/sendEmail';

interface Booking {
  id: string;
  booking_ref: string;
  booking_type: string;
  item_id?: string;
  partner_id?: string;
  institution_id?: string;
  program_id?: string;
  item_title: string;
  package_name?: string;
  guide_name?: string;
  guide_id?: string;
  host_id?: string;
  booking_date: string;
  guests: number;
  total_amount: number;
  status: string;
  special_requests?: string;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  created_at: string;
}

type TripTab = 'upcoming' | 'past';

function CancellationModal({
  booking, onClose, onConfirm, cancelling,
}: {
  booking: Booking;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  cancelling: boolean;
}) {
  const [reason, setReason] = useState('');
  const isValid = reason.trim().length >= 10;
  const bookingDate = new Date(booking.booking_date);
  const today = new Date();
  const hoursUntil = (bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60);
  const isWithin24h = hoursUntil <= 24 && hoursUntil > 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto animate-slide-up">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                <Ban className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-stone-900">Cancel Trip</h2>
                <p className="text-xs text-stone-400">{booking.booking_ref}</p>
              </div>
            </div>
            <button onClick={onClose} disabled={cancelling} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-50 transition-colors">
              <X className="w-3.5 h-3.5 text-stone-400" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
              <p className="text-[11px] font-medium text-stone-400 mb-0.5 uppercase tracking-wide">Trip</p>
              <p className="text-sm font-semibold text-stone-900">{booking.item_title}</p>
              <p className="text-xs text-stone-500 mt-1">
                {bookingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {' · '}{booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
              </p>
            </div>

            {isWithin24h && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">This trip is within 24 hours. Refund eligibility may vary — contact support for help.</p>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed">Cancellations cannot be undone. You'll need to make a new booking if you change your mind.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Tell us why you're cancelling..."
                rows={3}
                disabled={cancelling}
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-stone-200 placeholder:text-stone-400 disabled:opacity-60"
              />
              <p className={`text-xs mt-1 ${reason.trim().length > 0 && !isValid ? 'text-red-500' : 'text-stone-400'}`}>
                {reason.trim().length}/10 min
              </p>
            </div>
          </div>

          <div className="flex gap-2.5 px-5 py-4 border-t border-stone-100">
            <button onClick={onClose} disabled={cancelling} className="flex-1 py-2.5 text-sm font-medium text-stone-700 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-60">
              Keep Trip
            </button>
            <button
              onClick={() => onConfirm(reason.trim())}
              disabled={!isValid || cancelling}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {cancelling ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Cancelling…</>
              ) : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function BookingCard({
  booking, statusColor, onContactHost, onCancel, isReviewed, onReview,
}: {
  booking: Booking;
  statusColor: (s: string) => string;
  onContactHost?: () => void;
  onCancel?: () => void;
  isReviewed?: boolean;
  onReview?: () => void;
}) {
  const isCancelled = booking.status === 'cancelled';
  const contactLabel = booking.booking_type === 'attraction' ? 'Contact Guide' : 'Contact Host';

  return (
    <div className={`bg-white border border-stone-200/80 rounded-xl p-4 transition-all duration-200 card-hover-glow hover:border-stone-300 ${isCancelled ? 'opacity-60' : ''}`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor(booking.status)}`}>
                {booking.status}
              </span>
              <span className="text-[10px] text-stone-400 capitalize">{booking.booking_type}</span>
              <span className="text-[10px] text-stone-300">·</span>
              <span className="text-[10px] font-medium text-stone-500 font-mono">{booking.booking_ref}</span>
            </div>
            <h3 className={`text-sm font-semibold leading-tight mb-1.5 ${isCancelled ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
              {booking.item_title}
            </h3>
            {booking.package_name && (
              <p className="text-[11px] text-stone-500 mb-1.5 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5 flex-shrink-0" />
                {booking.package_name}
                {booking.guide_name && ` · Guide: ${booking.guide_name}`}
              </p>
            )}
            <div className="flex items-center gap-3 text-[11px] text-stone-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
              </span>
            </div>
            {isCancelled && booking.cancellation_reason && (
              <p className="text-[11px] text-stone-400 mt-1.5 italic line-clamp-1">"{booking.cancellation_reason}"</p>
            )}
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5 sm:ml-3 flex-shrink-0">
            <p className={`text-sm font-bold ${isCancelled ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
              ${booking.total_amount.toFixed(2)}
            </p>
          </div>
        </div>

        {!isCancelled && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-stone-100">
            {onContactHost && (
              <button
                onClick={onContactHost}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 active:scale-[0.98] transition-all"
              >
                <MessageSquare className="w-3 h-3" />
                {contactLabel}
              </button>
            )}
            {onReview && !isReviewed && (
              <button
                onClick={onReview}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-medium rounded-lg hover:bg-amber-100 active:scale-[0.98] transition-all"
              >
                <Star className="w-3 h-3" />
                Write a Review
              </button>
            )}
            {isReviewed && (
              <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg">
                <CheckCircle className="w-3 h-3" />
                Reviewed
              </div>
            )}
            {onCancel && (booking.status === 'confirmed' || booking.status === 'pending') && (
              <button
                onClick={onCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-100 bg-red-50 rounded-lg hover:bg-red-100 active:scale-[0.98] transition-all"
              >
                <Ban className="w-3 h-3" />
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function BookingsPage() {
  const [activeTab, setActiveTab] = useState<TripTab>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const { user } = useAuth();
  const traveler = user as TravelerUser | null;
  const navigate = useNavigate();

  useEffect(() => { loadBookings(); }, [traveler?.id]);

  const loadBookings = async () => {
    if (!traveler?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings').select('*').eq('traveler_id', traveler.id)
        .order('booking_date', { ascending: true });
      if (error) throw error;
      setBookings(data || []);

      if (data && data.length > 0) {
        const bookingIds = data.map(b => b.id);
        const [revRes, attrRevRes] = await Promise.all([
          supabase.from('reviews').select('booking_id').in('booking_id', bookingIds),
          supabase.from('attraction_reviews').select('booking_id').in('booking_id', bookingIds),
        ]);
        const ids = new Set<string>();
        (revRes.data || []).forEach(r => { if (r.booking_id) ids.add(r.booking_id); });
        (attrRevRes.data || []).forEach(r => { if (r.booking_id) ids.add(r.booking_id); });
        setReviewedBookingIds(ids);
      }
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelBooking || !traveler?.id) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const { error } = await supabase.from('bookings').update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'traveler',
        updated_at: new Date().toISOString(),
      }).eq('id', cancelBooking.id).eq('traveler_id', traveler.id);

      if (error) throw error;

      // Cancellation emails — confirm to the traveler, alert the host/guide.
      const emailData = {
        booking_ref: cancelBooking.booking_ref,
        item_title: cancelBooking.item_title,
        booking_type: cancelBooking.booking_type,
        booking_date: cancelBooking.booking_date,
        guests: cancelBooking.guests,
        cancellation_reason: reason,
        traveler_name: traveler.full_name || 'Guest',
      };
      sendEmail({ template: 'booking_cancelled', recipient_email: traveler.email || '', recipient_name: traveler.full_name || '', data: { ...emailData, recipient_role: 'traveler' } });
      if (cancelBooking.host_id) {
        supabase.from('partner_hosts').select('email, name').eq('id', cancelBooking.host_id).maybeSingle().then(({ data: h }) => {
          if (h?.email) sendEmail({ template: 'booking_cancelled', recipient_email: h.email, recipient_name: h.name || '', data: { ...emailData, recipient_role: 'host' } });
        });
      }
      if (cancelBooking.guide_id) {
        supabase.from('guides').select('email, name').eq('id', cancelBooking.guide_id).maybeSingle().then(({ data: g }) => {
          if (g?.email) sendEmail({ template: 'booking_cancelled', recipient_email: g.email, recipient_name: g.name || '', data: { ...emailData, recipient_role: 'host' } });
        });
      }

      setBookings(prev => prev.map(b => b.id === cancelBooking.id ? { ...b, status: 'cancelled', cancellation_reason: reason } : b));
      setCancelBooking(null);
      setActiveTab('past');
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setCancelError('Failed to cancel trip. Please try again or contact support.');
    } finally {
      setCancelling(false);
    }
  };

  const handleContactHost = async (booking: Booking) => {
    if (!traveler?.id) return;
    try {
      const { data: existingConv } = await supabase
        .from('conversations').select('id').eq('booking_id', booking.id).maybeSingle();
      if (existingConv) { navigate('/messages'); return; }

      if (booking.booking_type === 'attraction') {
        await supabase.from('conversations').insert({
          booking_id: booking.id, traveler_id: traveler.id,
          traveler_name: traveler.full_name || 'Traveler',
          guide_id: booking.guide_id || null, guide_name: booking.guide_name || 'Guide',
          listing_title: booking.item_title, listing_type: 'attraction',
        });
      } else {
        if (!booking.host_id) return;
        const { data: host } = await supabase.from('partner_hosts').select('name').eq('id', booking.host_id).maybeSingle();
        await supabase.from('conversations').insert({
          booking_id: booking.id, traveler_id: traveler.id,
          traveler_name: traveler.full_name || 'Traveler',
          host_id: booking.host_id, host_name: host?.name || 'Host',
          listing_title: booking.item_title, listing_type: booking.booking_type,
        });
      }
      navigate('/messages');
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingBookings = bookings.filter(b => b.booking_date >= today && b.status !== 'cancelled');
  const pastBookings = bookings.filter(b => b.booking_date < today || b.status === 'completed' || b.status === 'cancelled');

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-50 text-emerald-700';
      case 'pending': return 'bg-amber-50 text-amber-700';
      case 'completed': return 'bg-sky-50 text-sky-700';
      case 'cancelled': return 'bg-stone-100 text-stone-500';
      default: return 'bg-stone-100 text-stone-500';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-900 leading-tight">My Trips</h1>
        <p className="text-xs text-stone-400 mt-0.5">{bookings.length} booking{bookings.length !== 1 ? 's' : ''} total</p>
      </div>

      <div className="flex gap-1 border-b border-stone-100 mb-5">
        {(['upcoming', 'past'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-3 px-1 mr-5 text-sm font-medium transition-colors capitalize ${
              activeTab === tab ? 'text-stone-900' : 'text-stone-400 hover:text-stone-700'
            }`}
          >
            {tab}
            {tab === 'upcoming' && upcomingBookings.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-stone-900 text-white rounded-full">
                {upcomingBookings.length}
              </span>
            )}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {cancelError && (
        <div className="mb-4 flex items-center gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {cancelError}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-stone-100 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === 'upcoming' && (
            upcomingBookings.length === 0 ? (
              <div className="text-center py-20 animate-fade-up">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-7 h-7 text-stone-300" />
                </div>
                <h3 className="text-base font-semibold text-stone-800 mb-1.5">No upcoming trips</h3>
                <p className="text-sm text-stone-400 max-w-xs mx-auto">Book an experience, homestay, or attraction to get started.</p>
              </div>
            ) : upcomingBookings.map((booking) => (
              <BookingCard
                key={booking.id} booking={booking} statusColor={statusColor}
                onContactHost={() => handleContactHost(booking)}
                onCancel={() => { setCancelError(null); setCancelBooking(booking); }}
              />
            ))
          )}

          {activeTab === 'past' && (
            pastBookings.length === 0 ? (
              <div className="text-center py-20 animate-fade-up">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-7 h-7 text-stone-300" />
                </div>
                <h3 className="text-base font-semibold text-stone-800 mb-1.5">No past trips</h3>
                <p className="text-sm text-stone-400">Your completed trips will appear here.</p>
              </div>
            ) : pastBookings.map((booking) => (
              <BookingCard
                key={booking.id} booking={booking} statusColor={statusColor}
                isReviewed={reviewedBookingIds.has(booking.id)}
                onReview={booking.status !== 'cancelled' ? () => setReviewBooking(booking) : undefined}
              />
            ))
          )}
        </div>
      )}

      {reviewBooking && traveler && (
        <ReviewModal
          bookingId={reviewBooking.id}
          bookingType={reviewBooking.booking_type as 'experience' | 'homestay' | 'attraction' | 'itinerary'}
          itemId={reviewBooking.item_id || null}
          partnerId={reviewBooking.partner_id || null}
          institutionId={reviewBooking.institution_id || null}
          programId={reviewBooking.program_id || null}
          guideId={reviewBooking.guide_id || null}
          travelerId={traveler.id}
          travelerName={traveler.full_name || 'Traveler'}
          travelerPicture={traveler.profile_picture}
          onClose={() => setReviewBooking(null)}
          onSubmitted={() => {
            setReviewedBookingIds(prev => new Set([...prev, reviewBooking.id]));
            setReviewBooking(null);
          }}
        />
      )}

      {cancelBooking && (
        <CancellationModal
          booking={cancelBooking}
          onClose={() => !cancelling && setCancelBooking(null)}
          onConfirm={handleCancelConfirm}
          cancelling={cancelling}
        />
      )}
    </div>
  );
}
