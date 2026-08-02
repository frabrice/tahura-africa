import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TravelerUser } from '../lib/auth';
import { sendEmail } from '../lib/sendEmail';

interface BookingOption {
  id: string;
  booking_ref: string;
  item_title: string;
  booking_type: string;
  partner_id: string | null;
  institution_id: string | null;
}

interface Props {
  onClose: () => void;
}

export function SubmitTicketModal({ onClose }: Props) {
  const { user } = useAuth();
  const traveler = user as TravelerUser | null;

  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingId, setBookingId] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    if (!traveler?.id) {
      setLoadingBookings(false);
      return;
    }
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_ref, item_title, booking_type, partner_id, institution_id')
      .eq('traveler_id', traveler.id)
      .order('created_at', { ascending: false });
    setBookings(data || []);
    setLoadingBookings(false);
  }

  async function handleSubmit() {
    if (!traveler?.id || !subject.trim() || !description.trim()) return;
    setSubmitting(true);
    setError('');

    const selectedBooking = bookings.find(b => b.id === bookingId);

    let portalType: string = 'general';
    let targetPortalId: string | null = null;

    if (selectedBooking) {
      portalType = selectedBooking.booking_type === 'attraction' ? 'institution' : 'partner';
      targetPortalId = portalType === 'institution'
        ? selectedBooking.institution_id
        : selectedBooking.partner_id;
    }

    const { error: insertError } = await supabase.from('support_tickets').insert({
      created_by_auth_id: traveler.id,
      created_by_name: traveler.full_name || 'Traveler',
      created_by_email: traveler.email || '',
      created_by_type: 'traveler',
      portal_type: portalType,
      target_portal_id: targetPortalId,
      booking_id: bookingId || null,
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
    });

    setSubmitting(false);

    if (insertError) {
      setError('Something went wrong. Please try again.');
    } else {
      setSubmitted(true);
      if (traveler?.email) {
        sendEmail({
          template: 'support_ticket_confirmation',
          recipient_email: traveler.email,
          recipient_name: traveler.full_name || '',
          data: {
            created_by_name: traveler.full_name || 'Traveler',
            subject: subject.trim(),
            description: description.trim(),
            category,
            priority,
          },
        });
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-semibold text-neutral-900">
            {submitted ? 'Ticket Submitted' : 'Submit a Support Ticket'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 mb-2">
                Your ticket has been submitted
              </h3>
              <p className="text-sm text-neutral-500 mb-6 max-w-xs mx-auto">
                We will get back to you as soon as possible. You can track the status of your ticket from "View My Tickets."
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Related Booking <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <select
                  value={bookingId}
                  onChange={e => setBookingId(e.target.value)}
                  disabled={loadingBookings}
                  className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white disabled:opacity-60"
                >
                  <option value="">None -- General Inquiry</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.booking_ref} - {b.item_title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                  >
                    <option value="general">General</option>
                    <option value="booking">Booking Issue</option>
                    <option value="payment">Payment Issue</option>
                    <option value="quality">Quality Concern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Please provide details about your issue..."
                  className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !subject.trim() || !description.trim()}
                className="w-full py-3 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40"
              >
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
