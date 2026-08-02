import { useState, useEffect } from 'react';
import { ArrowLeft, Flag, ShieldOff, Trash2, Star, Calendar, DollarSign, Users, AlertTriangle, Image } from 'lucide-react';
import { Card } from '../../../components/Card';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { PortalUser } from '../../../lib/auth';
import { FlagContentModal } from '../../../components/FlagContentModal';
import { sendEmail } from '../../../lib/sendEmail';

interface Props {
  listingId: string;
  partnerId: string;
  onBack: () => void;
}

export function ListingDetailView({ listingId, partnerId, onBack }: Props) {
  const { user } = useAuth();
  const opsUser = user as PortalUser;
  const [listing, setListing] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [host, setHost] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeFlag, setActiveFlag] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [listingId]);

  async function loadData() {
    setLoading(true);
    const [listingRes, partnerRes, bookingsRes, reviewsRes, flagRes] = await Promise.all([
      supabase.from('partner_listings').select('*').eq('id', listingId).maybeSingle(),
      supabase.from('portal_users').select('name, email, phone, user_id_code').eq('id', partnerId).maybeSingle(),
      supabase.from('bookings').select('*').eq('item_id', listingId).order('created_at', { ascending: false }).limit(10),
      supabase.from('reviews').select('*').eq('listing_id', listingId).order('created_at', { ascending: false }),
      supabase.from('content_flags').select('*').eq('target_type', 'listing').eq('target_id', listingId).eq('status', 'active').maybeSingle(),
    ]);

    setListing(listingRes.data);
    setPartner(partnerRes.data);
    setBookings(bookingsRes.data || []);
    setReviews(reviewsRes.data || []);
    setActiveFlag(flagRes.data);

    if (listingRes.data?.host_id) {
      const { data: hostData } = await supabase
        .from('partner_hosts')
        .select('name, email, profile_picture')
        .eq('id', listingRes.data.host_id)
        .maybeSingle();
      setHost(hostData);
    }
    setLoading(false);
  }

  async function handleUnflag() {
    if (!activeFlag) return;
    await supabase.from('content_flags').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', activeFlag.id);
    await supabase.from('partner_listings').update({ is_flagged: false }).eq('id', listingId);

    await supabase.from('notifications').insert({
      recipient_portal_user_id: partnerId,
      type: 'listing_unflagged',
      title: `Flag removed from "${listing?.title}"`,
      message: 'The flag on your listing has been resolved. Your listing is now visible to travelers again.',
      metadata: { target_type: 'listing', target_id: listingId, target_title: listing?.title },
    });

    if (partner?.email) {
      sendEmail({ template: 'content_resolved', recipient_email: partner.email, recipient_name: partner.name || '', data: { target_type: 'listing', target_title: listing?.title } });
    }

    loadData();
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from('partner_listings').update({ status: 'draft' }).eq('id', listingId);

    await supabase.from('notifications').insert({
      recipient_portal_user_id: partnerId,
      type: 'listing_removed',
      title: `Your listing "${listing?.title}" has been removed`,
      message: 'Your listing has been taken down by the operations team. If you believe this was in error, please contact support.',
      metadata: { target_type: 'listing', target_id: listingId, target_title: listing?.title },
    });

    if (partner?.email) {
      sendEmail({ template: 'content_removed', recipient_email: partner.email, recipient_name: partner.name || '', data: { target_type: 'listing', target_title: listing?.title } });
    }

    setDeleting(false);
    onBack();
  }

  if (loading || !listing) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
      </div>
    );
  }

  const totalRevenue = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.total_amount || 0), 0);
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
  const price = listing.listing_type === 'homestay'
    ? `$${listing.pricing?.per_night || 0}/night`
    : `$${listing.pricing?.per_person || listing.pricing?.amount || 0}/person`;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Partner
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-base font-semibold text-neutral-900">{listing.title}</h2>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
              listing.listing_type === 'experience' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {listing.listing_type}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
              listing.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' :
              listing.status === 'paused' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-neutral-100 text-neutral-500 border border-neutral-200'
            }`}>
              {listing.status}
            </span>
            {listing.is_flagged && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-medium">
                <Flag className="w-3 h-3" />
                Flagged
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500">{listing.location?.name}{listing.location?.region ? `, ${listing.location.region}` : ''}</p>
        </div>

        <div className="flex items-center gap-2">
          {listing.is_flagged ? (
            <button
              onClick={handleUnflag}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <ShieldOff className="w-3.5 h-3.5" />
              Remove Flag
            </button>
          ) : (
            <button
              onClick={() => setShowFlagModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              Flag Listing
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      </div>

      {activeFlag && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-red-800 mb-1">Active Flag</div>
              <div className="text-xs text-red-700 mb-1">Severity: <span className="font-medium capitalize">{activeFlag.severity?.replace('_', ' ')}</span></div>
              <div className="text-xs text-red-700">{activeFlag.reason}</div>
              <div className="text-[10px] text-red-500 mt-1">Flagged on {new Date(activeFlag.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 bg-blue-50">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">Bookings</span>
          </div>
          <div className="text-lg font-semibold text-neutral-900">{bookings.length}</div>
        </Card>
        <Card className="p-4 bg-emerald-50">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">Revenue</span>
          </div>
          <div className="text-lg font-semibold text-neutral-900">${totalRevenue.toLocaleString()}</div>
        </Card>
        <Card className="p-4 bg-amber-50">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">Avg Rating</span>
          </div>
          <div className="text-lg font-semibold text-neutral-900">{avgRating > 0 ? avgRating.toFixed(1) : '-'}</div>
        </Card>
        <Card className="p-4 bg-teal-50">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">Reviews</span>
          </div>
          <div className="text-lg font-semibold text-neutral-900">{reviews.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-5 bg-slate-50">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Listing Information</h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-neutral-500">Description</span>
              <p className="text-neutral-700 mt-0.5 leading-relaxed">{listing.description || 'No description provided.'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-neutral-500">Price</span>
                <div className="text-neutral-900 font-medium mt-0.5">{price}</div>
              </div>
              {listing.details?.duration && (
                <div>
                  <span className="text-neutral-500">Duration</span>
                  <div className="text-neutral-900 font-medium mt-0.5">{listing.details.duration}</div>
                </div>
              )}
              {listing.details?.frequency && (
                <div>
                  <span className="text-neutral-500">Frequency</span>
                  <div className="text-neutral-900 font-medium mt-0.5">{listing.details.frequency}</div>
                </div>
              )}
              {listing.details?.max_guests && (
                <div>
                  <span className="text-neutral-500">Max Guests</span>
                  <div className="text-neutral-900 font-medium mt-0.5">{listing.details.max_guests}</div>
                </div>
              )}
            </div>
            {listing.tags?.length > 0 && (
              <div>
                <span className="text-neutral-500">Tags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {listing.tags.map((t: string) => (
                    <span key={t} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px]">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {listing.whats_included?.length > 0 && (
              <div>
                <span className="text-neutral-500">What's Included</span>
                <ul className="mt-1 space-y-0.5">
                  {listing.whats_included.map((item: string, i: number) => (
                    <li key={i} className="text-neutral-700 flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {listing.what_to_bring?.length > 0 && (
              <div>
                <span className="text-neutral-500">What to Bring</span>
                <ul className="mt-1 space-y-0.5">
                  {listing.what_to_bring.map((item: string, i: number) => (
                    <li key={i} className="text-neutral-700 flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-blue-500 rounded-full flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 bg-sky-50">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Ownership</h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-neutral-500">Partner</span>
                <div className="text-neutral-900 font-medium mt-0.5">{partner?.name || '-'}</div>
                <div className="text-neutral-500">{partner?.email} | {partner?.user_id_code}</div>
              </div>
              {host && (
                <div>
                  <span className="text-neutral-500">Assigned Host</span>
                  <div className="flex items-center gap-2 mt-1">
                    {host.profile_picture ? (
                      <img src={host.profile_picture} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] text-neutral-500">
                        {(host.name || '?')[0]}
                      </div>
                    )}
                    <div>
                      <div className="text-neutral-900 font-medium">{host.name}</div>
                      <div className="text-neutral-500">{host.email || '-'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {listing.media?.length > 0 && (
            <Card className="p-5 bg-neutral-50">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <Image className="w-4 h-4 text-neutral-400" />
                Media ({listing.media.length})
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {listing.media.slice(0, 8).map((url: string, i: number) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="w-full aspect-square object-cover rounded-md border border-neutral-200"
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {reviews.length > 0 && (
        <Card className="p-5 mb-6 bg-amber-50">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Reviews ({reviews.length})</h3>
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="p-3 bg-white border border-neutral-200 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-900">{r.reviewer_name}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-300'}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-neutral-600">{r.review_text}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {bookings.length > 0 && (
        <Card className="p-5 bg-neutral-50">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Recent Bookings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left pb-2 font-medium text-neutral-600">Ref</th>
                  <th className="text-left pb-2 font-medium text-neutral-600">Traveler</th>
                  <th className="text-left pb-2 font-medium text-neutral-600">Date</th>
                  <th className="text-center pb-2 font-medium text-neutral-600">Guests</th>
                  <th className="text-left pb-2 font-medium text-neutral-600">Amount</th>
                  <th className="text-center pb-2 font-medium text-neutral-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td className="py-2 text-neutral-900 font-mono">{b.booking_ref}</td>
                    <td className="py-2 text-neutral-700">{b.traveler_name}</td>
                    <td className="py-2 text-neutral-600">{new Date(b.booking_date).toLocaleDateString()}</td>
                    <td className="py-2 text-center text-neutral-600">{b.guests}</td>
                    <td className="py-2 text-neutral-900">${b.total_amount}</td>
                    <td className="py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        b.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                        b.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        b.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                        'bg-neutral-100 text-neutral-500'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showFlagModal && (
        <FlagContentModal
          targetType="listing"
          targetId={listingId}
          targetTitle={listing.title}
          ownerPortalUserId={partnerId}
          flaggedBy={opsUser?.id || ''}
          onClose={() => setShowFlagModal(false)}
          onFlagged={() => { setShowFlagModal(false); loadData(); }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Remove Listing</h3>
                <p className="text-xs text-neutral-500">This will set the listing to draft status</p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 mb-1">
              Are you sure you want to remove <span className="font-medium">"{listing.title}"</span>?
            </p>
            <p className="text-xs text-neutral-500 mb-6">
              The listing will be hidden from travelers. Existing bookings and reviews will be preserved.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Remove Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
