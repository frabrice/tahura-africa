import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { ReviewsList, type NormalizedReview } from '../../components/ReviewsList';

export function ReviewsPage() {
  const { user } = useAuth();
  const portalUser = user as PortalUser | null;
  const [reviews, setReviews] = useState<NormalizedReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (portalUser?.id) load(portalUser.id); }, [portalUser?.id]);

  async function load(partnerId: string) {
    setLoading(true);
    // Reviews are only visible here if they land on a listing owned by one
    // of THIS partner's hosts — never another partner's, even though the
    // underlying reviews table has no partner_id of its own to filter on
    // directly.
    const { data: hosts } = await supabase.from('partner_hosts').select('id, name').eq('partner_id', partnerId);
    const hostIds = (hosts || []).map(h => h.id);
    const hostNameById = new Map((hosts || []).map(h => [h.id, h.name]));

    if (!hostIds.length) { setReviews([]); setLoading(false); return; }

    const { data: listings } = await supabase.from('partner_listings').select('id, title, host_id').in('host_id', hostIds);
    const listingIds = (listings || []).map(l => l.id);
    const listingById = new Map((listings || []).map(l => [l.id, l]));

    const { data } = listingIds.length
      ? await supabase.from('reviews').select('id, reviewer_name, reviewer_profile_picture, rating, review_text, created_at, listing_id').in('listing_id', listingIds).order('created_at', { ascending: false })
      : { data: [] as any[] };

    setReviews((data || []).map((r: any) => {
      const listing = listingById.get(r.listing_id);
      const hostName = listing ? hostNameById.get(listing.host_id) : undefined;
      return {
        id: r.id, reviewer_name: r.reviewer_name, reviewer_profile_picture: r.reviewer_profile_picture,
        rating: r.rating, review_text: r.review_text, created_at: r.created_at,
        subtitle: listing ? `on ${listing.title}${hostName ? ` · ${hostName}` : ''}` : undefined,
      };
    }));
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" /> Reviews
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">What travelers say about your hosts' listings</p>
      </div>
      <ReviewsList reviews={reviews} loading={loading} emptyText="No reviews yet" />
    </div>
  );
}
