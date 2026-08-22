import { Star } from 'lucide-react';
import { Card } from './Card';

export interface NormalizedReview {
  id: string;
  reviewer_name: string;
  reviewer_profile_picture?: string | null;
  rating: number;
  review_text: string;
  created_at: string;
  subtitle?: string; // e.g. "on Nyungwe Forest Canopy Walk" or "about Jane Doe"
  badge?: string; // e.g. "Traveler → Host", "Host → Traveler"
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}`} />
      ))}
    </div>
  );
}

export function ReviewsList({ reviews, loading, emptyText }: { reviews: NormalizedReview[]; loading?: boolean; emptyText?: string }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className="p-10 text-center bg-neutral-50">
        <p className="text-sm text-neutral-400">{emptyText || 'No reviews yet'}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map(review => (
        <Card key={review.id} className="p-4">
          <div className="flex items-start gap-3">
            {review.reviewer_profile_picture ? (
              <img src={review.reviewer_profile_picture} alt={review.reviewer_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-neutral-600">{review.reviewer_name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{review.reviewer_name}</p>
                  {review.subtitle && <p className="text-xs text-neutral-400">{review.subtitle}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {review.badge && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">{review.badge}</span>
                  )}
                  <span className="text-xs text-neutral-400">{new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              <div className="mt-1.5"><StarRow rating={review.rating} /></div>
              <p className="text-sm text-neutral-700 leading-relaxed mt-2">{review.review_text}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
