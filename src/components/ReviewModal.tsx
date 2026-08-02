import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/sendEmail';

interface ReviewModalProps {
  bookingId: string;
  bookingType: 'experience' | 'homestay' | 'attraction' | 'itinerary';
  itemId: string | null;
  partnerId: string | null;
  institutionId: string | null;
  programId: string | null;
  guideId: string | null;
  travelerId: string;
  travelerName: string;
  travelerPicture?: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ReviewModal({
  bookingId,
  bookingType,
  itemId,
  institutionId,
  programId,
  guideId,
  travelerId,
  travelerName,
  travelerPicture,
  onClose,
  onSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [guideRating, setGuideRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [hoverGuideRating, setHoverGuideRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const isAttraction = bookingType === 'attraction';

  async function handleSubmit() {
    if (rating === 0 || !reviewText.trim()) return;
    setSubmitting(true);

    if (isAttraction && institutionId) {
      await supabase.from('attraction_reviews').insert({
        booking_id: bookingId,
        institution_id: institutionId,
        program_id: programId,
        guide_id: guideId,
        traveler_id: travelerId,
        reviewer_name: travelerName,
        reviewer_profile_picture: travelerPicture || '',
        rating,
        guide_rating: guideId ? (guideRating || null) : null,
        review_text: reviewText.trim().slice(0, 200),
      });
    } else if (itemId) {
      await supabase.from('reviews').insert({
        listing_id: itemId,
        booking_id: bookingId,
        reviewer_name: travelerName,
        reviewer_profile_picture: travelerPicture || '',
        rating,
        review_text: reviewText.trim().slice(0, 200),
      });
    }

    setSubmitting(false);

    if (isAttraction && institutionId) {
      if (guideId && guideRating > 0) {
        supabase.from('guides').select('email, name').eq('id', guideId).maybeSingle().then(({ data: g }) => {
          if (g?.email) {
            sendEmail({
              template: 'review_received_guide',
              recipient_email: g.email,
              recipient_name: g.name || '',
              data: { rating: guideRating, review_text: reviewText.trim(), reviewer_name: travelerName, program_name: '' },
            });
          }
        });
      }
    } else if (itemId) {
      supabase.from('partner_listings').select('partner_id').eq('id', itemId).maybeSingle().then(({ data: listing }) => {
        if (listing?.partner_id) {
          supabase.from('partner_hosts').select('email, name').eq('partner_id', listing.partner_id).maybeSingle().then(({ data: host }) => {
            if (host?.email) {
              supabase.from('partner_listings').select('title').eq('id', itemId).maybeSingle().then(({ data: l }) => {
                sendEmail({
                  template: 'review_received_host',
                  recipient_email: host.email,
                  recipient_name: host.name || '',
                  data: { rating, review_text: reviewText.trim(), reviewer_name: travelerName, listing_title: l?.title || '' },
                });
              });
            }
          });
        }
      });
    }

    onSubmitted();
    onClose();
  }

  function StarRow({ value, hover, onSet, onHover }: { value: number; hover: number; onSet: (n: number) => void; onHover: (n: number) => void }) {
    return (
      <div className="flex gap-1" onMouseLeave={() => onHover(0)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onMouseEnter={() => onHover(n)} onClick={() => onSet(n)} className="p-0.5">
            <Star className={`w-6 h-6 transition-colors ${n <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-neutral-300'}`} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-900">Write a Review</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-2">Overall Rating</label>
              <StarRow value={rating} hover={hoverRating} onSet={setRating} onHover={setHoverRating} />
            </div>

            {isAttraction && guideId && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-2">Guide Rating (optional)</label>
                <StarRow value={guideRating} hover={hoverGuideRating} onSet={setGuideRating} onHover={setHoverGuideRating} />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Your Review</label>
              <textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={4}
                placeholder="Share your experience..."
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
