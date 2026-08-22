import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ReviewsList, type NormalizedReview } from '../../components/ReviewsList';

type Tab = 'listings' | 'travelers' | 'attractions';

export function ReviewsPage() {
  const [tab, setTab] = useState<Tab>('listings');
  const [listingReviews, setListingReviews] = useState<NormalizedReview[]>([]);
  const [travelerReviews, setTravelerReviews] = useState<NormalizedReview[]>([]);
  const [attractionReviews, setAttractionReviews] = useState<NormalizedReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [listingsRes, travelerRes, attractionRes] = await Promise.all([
      supabase.from('reviews').select('id, reviewer_name, reviewer_profile_picture, rating, review_text, created_at, listing_id').order('created_at', { ascending: false }).limit(500),
      supabase.from('traveler_reviews').select('id, reviewer_name, reviewer_profile_picture, rating, review_text, created_at, reviewer_type').order('created_at', { ascending: false }).limit(500),
      supabase.from('attraction_reviews').select('id, reviewer_name, reviewer_profile_picture, rating, guide_rating, review_text, created_at, institution_id').order('created_at', { ascending: false }).limit(500),
    ]);

    const listingIds = [...new Set((listingsRes.data || []).map((r: any) => r.listing_id).filter(Boolean))];
    const institutionIds = [...new Set((attractionRes.data || []).map((r: any) => r.institution_id).filter(Boolean))];
    const [{ data: listings }, { data: institutions }] = await Promise.all([
      listingIds.length ? supabase.from('partner_listings').select('id, title').in('id', listingIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      institutionIds.length ? supabase.from('institution_profiles').select('id, name').in('id', institutionIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ]);
    const listingTitleById = new Map((listings || []).map(l => [l.id, l.title]));
    const institutionNameById = new Map((institutions || []).map(i => [i.id, i.name]));

    setListingReviews((listingsRes.data || []).map((r: any) => ({
      id: r.id, reviewer_name: r.reviewer_name, reviewer_profile_picture: r.reviewer_profile_picture,
      rating: r.rating, review_text: r.review_text, created_at: r.created_at,
      subtitle: listingTitleById.get(r.listing_id) ? `on ${listingTitleById.get(r.listing_id)}` : undefined,
    })));
    setTravelerReviews((travelerRes.data || []).map((r: any) => ({
      id: r.id, reviewer_name: r.reviewer_name, reviewer_profile_picture: r.reviewer_profile_picture,
      rating: r.rating, review_text: r.review_text, created_at: r.created_at,
      badge: r.reviewer_type === 'host' ? 'From a Host' : 'From a Guide',
    })));
    setAttractionReviews((attractionRes.data || []).map((r: any) => ({
      id: r.id, reviewer_name: r.reviewer_name, reviewer_profile_picture: r.reviewer_profile_picture,
      rating: r.rating, review_text: r.review_text, created_at: r.created_at,
      subtitle: institutionNameById.get(r.institution_id) ? `at ${institutionNameById.get(r.institution_id)}` : undefined,
      badge: r.guide_rating ? `Guide: ${r.guide_rating}★` : undefined,
    })));
    setLoading(false);
  }

  const shown = tab === 'listings' ? listingReviews : tab === 'travelers' ? travelerReviews : attractionReviews;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" /> Reviews
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">Every review on the platform — listings, travelers, and attractions</p>
      </div>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit mb-6">
        <button onClick={() => setTab('listings')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${tab === 'listings' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          Listings ({listingReviews.length})
        </button>
        <button onClick={() => setTab('travelers')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${tab === 'travelers' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          Travelers ({travelerReviews.length})
        </button>
        <button onClick={() => setTab('attractions')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${tab === 'attractions' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          Attractions ({attractionReviews.length})
        </button>
      </div>

      <ReviewsList reviews={shown} loading={loading} emptyText="No reviews yet" />
    </div>
  );
}
