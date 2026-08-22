import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getGuideContext } from '../../lib/useGuideData';
import { ReviewsList, type NormalizedReview } from '../../components/ReviewsList';

export function GuideReviewsPage() {
  const guideContext = getGuideContext();
  const [tab, setTab] = useState<'about-you' | 'about-travelers'>('about-you');
  const [aboutYou, setAboutYou] = useState<NormalizedReview[]>([]);
  const [aboutTravelers, setAboutTravelers] = useState<NormalizedReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (guideContext?.id) load(guideContext.id); }, [guideContext?.id]);

  async function load(guideId: string) {
    setLoading(true);
    const [attractionReviewsRes, travelerReviewsRes] = await Promise.all([
      supabase.from('attraction_reviews').select('id, reviewer_name, reviewer_profile_picture, rating, guide_rating, review_text, created_at, institution_id').eq('guide_id', guideId).order('created_at', { ascending: false }),
      supabase.from('traveler_reviews').select('id, reviewer_name, reviewer_profile_picture, rating, review_text, created_at').eq('reviewer_id', guideId).eq('reviewer_type', 'guide').order('created_at', { ascending: false }),
    ]);

    const institutionIds = [...new Set((attractionReviewsRes.data || []).map((r: any) => r.institution_id).filter(Boolean))];
    const { data: institutions } = institutionIds.length
      ? await supabase.from('institution_profiles').select('id, name').in('id', institutionIds)
      : { data: [] as { id: string; name: string }[] };
    const nameById = new Map((institutions || []).map(i => [i.id, i.name]));

    setAboutYou((attractionReviewsRes.data || []).map((r: any) => ({
      id: r.id, reviewer_name: r.reviewer_name, reviewer_profile_picture: r.reviewer_profile_picture,
      rating: r.guide_rating ?? r.rating, review_text: r.review_text, created_at: r.created_at,
      subtitle: nameById.get(r.institution_id) ? `at ${nameById.get(r.institution_id)}` : undefined,
    })));
    setAboutTravelers((travelerReviewsRes.data || []).map((r: any) => ({
      id: r.id, reviewer_name: r.reviewer_name, reviewer_profile_picture: r.reviewer_profile_picture,
      rating: r.rating, review_text: r.review_text, created_at: r.created_at,
      badge: 'Your review',
    })));
    setLoading(false);
  }

  const shown = tab === 'about-you' ? aboutYou : aboutTravelers;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" /> Reviews
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">What travelers say about you, and what you've said about them</p>
      </div>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit mb-6">
        <button onClick={() => setTab('about-you')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${tab === 'about-you' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          About You ({aboutYou.length})
        </button>
        <button onClick={() => setTab('about-travelers')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${tab === 'about-travelers' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          Written by You ({aboutTravelers.length})
        </button>
      </div>

      <ReviewsList reviews={shown} loading={loading} emptyText={tab === 'about-you' ? 'No reviews yet' : "You haven't reviewed any travelers yet"} />
    </div>
  );
}
