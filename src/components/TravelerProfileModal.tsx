import { useState, useEffect } from 'react';
import { X, Star, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TravelerReview {
  id: string;
  reviewer_type: 'host' | 'guide';
  reviewer_name: string;
  reviewer_profile_picture?: string;
  rating: number;
  review_text: string;
  created_at: string;
}

interface TravelerProfileModalProps {
  travelerId: string;
  travelerName: string;
  travelerProfilePicture?: string;
  onClose: () => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`}
        />
      ))}
    </div>
  );
}

export function TravelerProfileModal({
  travelerId,
  travelerName,
  travelerProfilePicture,
  onClose,
}: TravelerProfileModalProps) {
  const [reviews, setReviews] = useState<TravelerReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [travelerId]);

  async function loadReviews() {
    setLoading(true);
    const { data } = await supabase
      .from('traveler_reviews')
      .select('id, reviewer_type, reviewer_name, reviewer_profile_picture, rating, review_text, created_at')
      .eq('traveler_id', travelerId)
      .order('created_at', { ascending: false });
    setReviews(data || []);
    setLoading(false);
  }

  const initials = travelerName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">About Traveler</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500 hover:text-neutral-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-neutral-100 flex items-center justify-center">
                {travelerProfilePicture ? (
                  <img
                    src={travelerProfilePicture}
                    alt={travelerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-neutral-500">{initials || <User className="w-7 h-7 text-neutral-400" />}</span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900">{travelerName}</h3>
                {avgRating !== null && (
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={Math.round(avgRating)} />
                    <span className="text-sm text-neutral-500">
                      {avgRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                    </span>
                  </div>
                )}
                {avgRating === null && !loading && (
                  <p className="text-sm text-neutral-400 mt-1">No reviews yet</p>
                )}
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-neutral-100 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-neutral-300" />
                </div>
                <p className="text-sm font-medium text-neutral-700 mb-1">No Reviews Yet</p>
                <p className="text-xs text-neutral-400">This traveler hasn't received any reviews from hosts or guides.</p>
              </div>
            ) : (
              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                  Reviews from Hosts & Guides
                </h4>
                <div className="space-y-3">
                  {reviews.map((review) => {
                    const reviewerInitials = review.reviewer_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <div
                        key={review.id}
                        className="p-4 bg-neutral-50 rounded-xl border border-neutral-100"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-neutral-200 flex items-center justify-center">
                            {review.reviewer_profile_picture ? (
                              <img
                                src={review.reviewer_profile_picture}
                                alt={review.reviewer_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-neutral-500">{reviewerInitials}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-neutral-900 truncate">
                                {review.reviewer_name}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                review.reviewer_type === 'host'
                                  ? 'bg-sky-50 text-sky-600 border border-sky-100'
                                  : 'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                                {review.reviewer_type === 'host' ? 'Host' : 'Guide'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <StarRating rating={review.rating} />
                              <span className="text-xs text-neutral-400">
                                {new Date(review.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-neutral-700 leading-relaxed">{review.review_text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
