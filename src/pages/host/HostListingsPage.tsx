import { Package, MapPin, Home, Compass } from 'lucide-react';
import { useHostListings, getHostContext, ListingRecord } from '../../lib/useHostData';

function ListingCard({ listing }: { listing: ListingRecord }) {
  const price = (listing.pricing as any)?.base_price || listing.pricing?.amount;
  const per = 'person';

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      <div className="relative h-44 bg-neutral-100">
        {listing.media?.[0] ? (
          <img src={listing.media[0]} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {listing.listing_type === 'homestay' ? (
              <Home className="w-10 h-10 text-neutral-300" />
            ) : (
              <Compass className="w-10 h-10 text-neutral-300" />
            )}
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            listing.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
            listing.status === 'paused' ? 'bg-amber-100 text-amber-700' :
            'bg-neutral-100 text-neutral-600'
          }`}>
            {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/90 font-medium text-neutral-700 capitalize">
            {listing.listing_type === 'homestay' ? 'Homestay' : 'Experience'}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-neutral-900 mb-1 line-clamp-1">{listing.title}</h3>
        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 text-neutral-400" />
          <span className="text-xs text-neutral-500">{listing.location?.name || '—'}{listing.location?.region ? `, ${listing.location.region}` : ''}</span>
        </div>
        <p className="text-xs text-neutral-500 line-clamp-2 mb-4">{listing.description}</p>

        {listing.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {listing.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          {price ? (
            <div>
              <span className="text-base font-bold text-neutral-900">${price}</span>
              <span className="text-xs text-neutral-400"> / {per}</span>
            </div>
          ) : (
            <span className="text-xs text-neutral-400">Price not set</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function HostListingsPage() {
  const ctx = getHostContext();
  const { listings, loading } = useHostListings(ctx?.id);

  const activeCount = listings.filter(l => l.status === 'active').length;
  const pausedCount = listings.filter(l => l.status === 'paused').length;

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">My Listings</h1>
        <p className="text-sm text-neutral-500 mt-1">All listings you are assigned to as host</p>
      </div>

      {!loading && listings.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-neutral-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-neutral-900">{listings.length}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Total Listings</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Active</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-2xl font-bold text-amber-700">{pausedCount}</p>
            <p className="text-xs text-amber-600 mt-0.5">Paused</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : listings.length === 0 ? (
        <div className="py-20 text-center bg-white border border-neutral-200 rounded-2xl">
          <Package className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No listings assigned yet</p>
          <p className="text-xs text-neutral-400 mt-1">Ask your partner administrator to assign you to a listing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map(l => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
