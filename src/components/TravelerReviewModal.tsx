import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/sendEmail';

interface TravelerReviewModalProps {
  bookingId: string;
  travelerId: string;
  reviewerType: 'host' | 'guide';
  reviewerId: string;
  reviewerName: string;
  reviewerProfilePicture?: string;
  travelerName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function TravelerReviewModal({
  bookingId,
  travelerId,
  reviewerType,
  reviewerId,
  reviewerName,
  reviewerProfilePicture,
  travelerName,
  onClose,
  onSubmitted,
}: TravelerReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating === 0 || !reviewText.trim()) return;
    setSubmitting(true);

    await supabase.from('traveler_reviews').insert({
      booking_id: bookingId,
      traveler_id: travelerId,
      reviewer_type: reviewerType,
      reviewer_id: reviewerId,
      reviewer_name: reviewerName,
      reviewer_profile_picture: reviewerProfilePicture || '',
      rating,
      review_text: reviewText.trim().slice(0, 200),
    });

    setSubmitting(false);

    supabase.from('traveler_users').select('email, full_name').eq('id', travelerId).maybeSingle().then(({ data: trav }) => {
      if (trav?.email) {
        sendEmail({
          template: 'traveler_review_received',
          recipient_email: trav.email,
          recipient_name: trav.full_name || travelerName,
          data: {
            reviewer_type: reviewerType,
            reviewer_name: reviewerName,
            rating,
            review_text: reviewText.trim(),
          },
        });
      }
    });

    onSubmitted();
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Review {travelerName}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">Share your experience hosting this guest</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-2">Rating</label>
              <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onMouseEnter={() => setHoverRating(n)} onClick={() => setRating(n)} className="p-0.5">
                    <Star className={`w-6 h-6 transition-colors ${n <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-neutral-300'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Your Review</label>
              <textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={4}
                placeholder="How was your experience with this guest?"
                className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 resize-none"
              />
              <div className="text-right mt-1">
                <span className={`text-xs ${reviewText.length >= 180 ? 'text-amber-600' : 'text-neutral-400'}`}>
                  {reviewText.length}/200
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-6 pb-6">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || rating === 0 || !reviewText.trim()}
              className="flex-1 py-2.5 text-sm font-medium bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-40"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
