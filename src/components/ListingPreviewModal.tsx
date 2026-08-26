import { X, MapPin, Star } from 'lucide-react';

interface Props {
  listing: any;
  hostName?: string;
  onClose: () => void;
}

export function ListingPreviewModal({ listing, hostName, onClose }: Props) {
  const price = listing.listing_type === 'homestay'
    ? `$${listing.pricing?.base_price ?? listing.pricing?.per_night ?? 0}/night`
    : `$${listing.pricing?.base_price ?? listing.pricing?.per_person ?? 0}/person`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-5 py-3.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-900">Traveler preview</h3>
            {listing.status !== 'active' && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium uppercase tracking-wide">
                {listing.status} — not visible to travelers
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {listing.media?.length > 0 && (
          <div className="grid grid-cols-4 gap-1 p-1">
            <img src={listing.media[0]} alt="" className="col-span-4 sm:col-span-2 sm:row-span-2 w-full h-56 sm:h-full object-cover rounded-lg" />
            {listing.media.slice(1, 5).map((url: string, i: number) => (
              <img key={i} src={url} alt="" className="hidden sm:block w-full h-full object-cover rounded-lg aspect-square" />
            ))}
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h2 className="text-xl font-semibold text-neutral-900">{listing.title}</h2>
            <div className="text-lg font-semibold text-neutral-900 flex-shrink-0">{price}</div>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-500 mb-4">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {listing.location?.name}{listing.location?.region ? `, ${listing.location.region}` : ''}
            </span>
            {hostName && <span>Hosted by {hostName}</span>}
          </div>

          <p className="text-sm text-neutral-700 leading-relaxed mb-6">{listing.description || 'No description provided.'}</p>

          {listing.listing_type === 'itinerary' && listing.itinerary_days?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Itinerary</h3>
              <div className="space-y-3">
                {listing.itinerary_days.map((day: any, i: number) => (
                  <div key={i} className="flex gap-3 p-3 bg-neutral-50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-neutral-900 text-white text-xs font-medium flex items-center justify-center flex-shrink-0">
                      {day.day}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-900">{day.title}</div>
                      {day.place_name && <div className="text-xs text-neutral-500">{day.place_name}</div>}
                      {day.description && <p className="text-xs text-neutral-600 mt-1">{day.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {listing.whats_included?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2">What's included</h3>
              <div className="flex flex-wrap gap-1.5">
                {listing.whats_included.map((item: string) => (
                  <span key={item} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-100">{item}</span>
                ))}
              </div>
            </div>
          )}

          {listing.what_to_bring?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2">What to bring</h3>
              <div className="flex flex-wrap gap-1.5">
                {listing.what_to_bring.map((item: string) => (
                  <span key={item} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">{item}</span>
                ))}
              </div>
            </div>
          )}

          {listing.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {listing.tags.map((t: string) => (
                <span key={t} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[11px]">#{t}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 mt-4 text-xs text-neutral-400">
            <Star className="w-3.5 h-3.5" />
            This is exactly what travelers will see once the listing is live.
          </div>
        </div>
      </div>
    </div>
  );
}
