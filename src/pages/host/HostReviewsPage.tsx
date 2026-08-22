import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getHostContext } from '../../lib/useHostData';
import { ReviewsList, type NormalizedReview } from '../../components/ReviewsList';

export function HostReviewsPage() {
  const hostContext = getHostContext();
  const [tab, setTab] = useState<'about-listings' | 'about-travelers'>('about-listings');
  const [aboutListings, setAboutListings] = useState<NormalizedReview[]>([]);
  const [aboutTravelers, setAboutTravelers] = useState<NormalizedReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (hostContext?.id) load(hostContext.id); }, [hostContext?.id]);

  async function load(hostId: string) {
    setLoading(true);
    const { data: listings } = await supabase.from('partner_listings').select('id, title').eq('host_id', hostId);
    const listingIds = (listings || []).map(l => l.id);
    const titleById = new Map((listings || []).map(l => [l.id, l.title]));

    const [reviewsRes, travelerReviewsRes] = await Promise.all([
      listingIds.length
        ? supabase.from('reviews').select('id, reviewer_name, reviewer_profile_picture, rating, review_text, created_at, listing_id').in('listing_id', listingIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      supabase.from('traveler_reviews').select('id, reviewer_name, reviewer_profile_picture, rating, review_text, created_at').eq('reviewer_id', hostId).eq('reviewer_type', 'host').order('created_at', { ascending: false }),
    ]);

    setAboutListings((reviewsRes.data || []).map((r: any) => ({
      id: r.id, reviewer_name: r.reviewer_name, reviewer_profile_picture: r.reviewer_profile_picture,
      rating: r.rating, review_text: r.review_text, created_at: r.created_at,
      subtitle: titleById.get(r.listing_id) ? `on ${titleById.get(r.listing_id)}` : undefined,
    })));
    setAboutTravelers((travelerReviewsRes.data || []).map((r: any) => ({
      id: r.id, reviewer_name: r.reviewer_name, reviewer_profile_picture: r.reviewer_profile_picture,
      rating: r.rating, review_text: r.review_text, created_at: r.created_at,
      badge: 'Your review',
    })));
    setLoading(false);
  }

  const shown = tab === 'about-listings' ? aboutListings : aboutTravelers;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" /> Reviews
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">What travelers say about your listings, and what you've said about them</p>
      </div>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit mb-6">
        <button onClick={() => setTab('about-listings')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${tab === 'about-listings' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          About Your Listings ({aboutListings.length})
        </button>
        <button onClick={() => setTab('about-travelers')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${tab === 'about-travelers' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
          Written by You ({aboutTravelers.length})
        </button>
      </div>

      <ReviewsList reviews={shown} loading={loading} emptyText={tab === 'about-listings' ? 'No reviews yet' : "You haven't reviewed any travelers yet"} />
    </div>
  );
}
