import { useState, useMemo, useEffect } from 'react';
import { Calendar, Mail, Users, DollarSign, X, FileText, Clock, Sun, Sunset, MessageSquare, Star, CheckCircle, Ban, CircleUser as UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useHostBookings, getHostContext, BookingRecord } from '../../lib/useHostData';
import { TravelerReviewModal } from '../../components/TravelerReviewModal';
import { TravelerProfileModal } from '../../components/TravelerProfileModal';
import { TransportRequestCard } from '../../components/TransportRequestCard';

function BookingDetailDrawer({ booking, onClose }: { booking: BookingRecord; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Booking Details</h3>
            <p className="text-xs text-neutral-500 mt-0.5">{booking.booking_ref}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <span className="text-base font-bold text-orange-600">{booking.traveler_name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">{booking.traveler_name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                booking.status === 'completed' ? 'bg-sky-100 text-sky-700' :
                'bg-red-100 text-red-700'
              }`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Listing</h4>
            <div className="p-3 bg-neutral-50 rounded-xl">
              <p className="text-sm font-medium text-neutral-900">{booking.item_title}</p>
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                booking.booking_type === 'experience' ? 'bg-orange-100 text-orange-700' :
                booking.booking_type === 'homestay' ? 'bg-sky-100 text-sky-700' :
                booking.booking_type === 'attraction' ? 'bg-teal-100 text-teal-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {booking.booking_type.charAt(0).toUpperCase() + booking.booking_type.slice(1)}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Guest Contact</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-neutral-700">{booking.traveler_email}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Booking Info</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  Date
                </div>
                <span className="text-sm font-medium text-neutral-900">
                  {new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              {booking.session && (
                <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    {booking.session === 'morning' ? <Sun className="w-4 h-4 text-neutral-400" /> :
                     booking.session === 'evening' ? <Sunset className="w-4 h-4 text-neutral-400" /> :
                     <Clock className="w-4 h-4 text-neutral-400" />}
                    Session
                  </div>
                  <span className="text-sm font-medium text-neutral-900 capitalize">{booking.session}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Users className="w-4 h-4 text-neutral-400" />
                  Guests
                </div>
                <span className="text-sm font-medium text-neutral-900">{booking.guests} {booking.guests === 1 ? 'person' : 'people'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Clock className="w-4 h-4 text-neutral-400" />
                  Booked on
                </div>
                <span className="text-sm font-medium text-neutral-900">
                  {new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Payment Summary</h4>
            <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Subtotal</span>
                <span className="text-neutral-900">${Number(booking.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Service fee</span>
                <span className="text-neutral-900">${Number(booking.service_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-neutral-200">
                <span className="text-neutral-900">Total</span>
                <span className="text-emerald-600">${Number(booking.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {booking.transport_requested && booking.transport_id && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Transport</h4>
              <TransportRequestCard transportId={booking.transport_id} />
            </div>
          )}

          {booking.status === 'cancelled' && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Cancellation</h4>
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-red-700">Cancelled by traveler</span>
                  {booking.cancelled_at && (
                    <span className="text-xs text-red-500 ml-auto">
                      {new Date(booking.cancelled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
                {booking.cancellation_reason && (
                  <p className="text-xs text-red-700 pl-6 leading-relaxed">{booking.cancellation_reason}</p>
                )}
              </div>
            </div>
          )}

          {booking.special_requests && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Special Requests</h4>
              <p className="text-sm text-neutral-700 bg-amber-50 rounded-xl p-3 border border-amber-100">{booking.special_requests}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function BookingCard({ booking, onViewDetails, onMessage, isReviewed, onReview, onAboutTraveler }: { booking: BookingRecord; onViewDetails: () => void; onMessage: () => void; isReviewed?: boolean; onReview?: () => void; onAboutTraveler?: () => void }) {
  const isPast = new Date(booking.booking_date) < new Date() || booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
          <span className="text-base font-bold text-orange-600">{booking.traveler_name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-0.5">
            <p className="text-sm font-semibold text-neutral-900 truncate">{booking.traveler_name}</p>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
              booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
              booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              booking.status === 'completed' ? 'bg-sky-100 text-sky-700' :
              'bg-red-100 text-red-700'
            }`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mb-3">{booking.traveler_email}</p>

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-sm font-medium text-neutral-900 truncate max-w-xs">{booking.item_title}</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap mb-4">
            <div className="flex items-center gap-1.5 text-xs text-neutral-600">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <span className="font-medium">{new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            {booking.session && (
              <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                {booking.session === 'morning' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> :
                 booking.session === 'evening' ? <Sunset className="w-3.5 h-3.5 text-orange-500" /> :
                 <Clock className="w-3.5 h-3.5 text-neutral-400" />}
                <span className="font-medium capitalize">{booking.session}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-neutral-600">
              <Users className="w-3.5 h-3.5 text-neutral-400" />
              <span className="font-medium">{booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold text-emerald-600">${Number(booking.total_amount).toFixed(0)}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              booking.booking_type === 'experience' ? 'bg-orange-100 text-orange-700' :
              booking.booking_type === 'homestay' ? 'bg-sky-100 text-sky-700' :
              booking.booking_type === 'attraction' ? 'bg-teal-100 text-teal-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {booking.booking_type.charAt(0).toUpperCase() + booking.booking_type.slice(1)}
            </span>
            {booking.transport_requested && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-700">
                Transport Requested
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onViewDetails}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              View Details
            </button>
            {booking.traveler_id && onAboutTraveler && (
              <button
                onClick={onAboutTraveler}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors text-neutral-700"
              >
                <UserCircle className="w-3.5 h-3.5" />
                About Traveler
              </button>
            )}
            <button
              onClick={onMessage}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors text-neutral-700"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Message Guest
            </button>
            {isPast && !isCancelled && onReview && !isReviewed && (
              <button
                onClick={onReview}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
              >
                <Star className="w-3.5 h-3.5" />
                Review Guest
              </button>
            )}
            {isPast && !isCancelled && isReviewed && (
              <div className="flex items-center gap-1 px-3.5 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="w-3.5 h-3.5" />
                Reviewed
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HostBookingsPage() {
  const ctx = getHostContext();
  const navigate = useNavigate();
  const { bookings, loading } = useHostBookings(ctx?.id);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewBooking, setReviewBooking] = useState<BookingRecord | null>(null);
  const [travelerProfileBooking, setTravelerProfileBooking] = useState<BookingRecord | null>(null);

  useEffect(() => {
    if (!ctx?.id || bookings.length === 0) return;
    supabase
      .from('traveler_reviews')
      .select('booking_id')
      .eq('reviewer_type', 'host')
      .eq('reviewer_id', ctx.id)
      .then(({ data }) => {
        const ids = new Set<string>();
        (data || []).forEach(r => { if (r.booking_id) ids.add(r.booking_id); });
        setReviewedBookingIds(ids);
      });
  }, [ctx?.id, bookings]);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const upcoming = useMemo(() =>
    bookings.filter(b => new Date(b.booking_date) >= today && b.status !== 'cancelled')
      .sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime()),
    [bookings, today]
  );

  const past = useMemo(() =>
    bookings.filter(b => new Date(b.booking_date) < today || b.status === 'completed' || b.status === 'cancelled')
      .sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()),
    [bookings, today]
  );

  const displayed = activeTab === 'upcoming' ? upcoming : past;

  const handleMessageGuest = async (booking: BookingRecord) => {
    if (!ctx?.id) return;
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('booking_id', booking.id)
        .maybeSingle();

      if (existing) {
        navigate('/host/messages');
        return;
      }

      await supabase.from('conversations').insert({
        booking_id: booking.id,
        traveler_id: booking.traveler_id,
        traveler_name: booking.traveler_name,
        host_id: ctx.id,
        host_name: ctx.name,
        listing_title: booking.item_title,
        listing_type: booking.booking_type,
      });

      navigate('/host/messages');
    } catch (err) {
      console.error('Error creating conversation:', err);
      navigate('/host/messages');
    }
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Bookings</h1>
        <p className="text-sm text-neutral-500 mt-1">All bookings for your listings</p>
      </div>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-6 w-fit">
        {(['upcoming', 'past'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-200 text-neutral-500'}`}>
              {tab === 'upcoming' ? upcoming.length : past.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="py-20 text-center bg-white border border-neutral-200 rounded-2xl">
          <Calendar className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No {activeTab} bookings</p>
          <p className="text-xs text-neutral-400 mt-1">{activeTab === 'upcoming' ? 'Future bookings will appear here' : 'Past bookings will appear here once completed'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              onViewDetails={() => setSelectedBooking(b)}
              onMessage={() => handleMessageGuest(b)}
              isReviewed={reviewedBookingIds.has(b.id)}
              onReview={() => setReviewBooking(b)}
              onAboutTraveler={b.traveler_id ? () => setTravelerProfileBooking(b) : undefined}
            />
          ))}
        </div>
      )}

      {selectedBooking && (
        <BookingDetailDrawer booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}

      {reviewBooking && ctx && (
        <TravelerReviewModal
          bookingId={reviewBooking.id}
          travelerId={reviewBooking.traveler_id || ''}
          reviewerType="host"
          reviewerId={ctx.id}
          reviewerName={ctx.name}
          reviewerProfilePicture={ctx.profile_picture}
          travelerName={reviewBooking.traveler_name}
          onClose={() => setReviewBooking(null)}
          onSubmitted={() => {
            setReviewedBookingIds(prev => new Set([...prev, reviewBooking.id]));
            setReviewBooking(null);
          }}
        />
      )}

      {travelerProfileBooking && travelerProfileBooking.traveler_id && (
        <TravelerProfileModal
          travelerId={travelerProfileBooking.traveler_id}
          travelerName={travelerProfileBooking.traveler_name}
          travelerProfilePicture={travelerProfileBooking.traveler_profile_picture}
          onClose={() => setTravelerProfileBooking(null)}
        />
      )}
    </div>
  );
}
