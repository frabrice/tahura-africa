import { BookOpen, Clock, Users, DollarSign, Compass } from 'lucide-react';
import { useGuidePrograms, useGuideAssignedListings, getGuideContext, ProgramRecord, AssignedListingRecord } from '../../lib/useGuideData';
import { ShareButton } from '../../components/ShareButton';

function ListingCard({ listing }: { listing: AssignedListingRecord }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      <div className="relative h-44 bg-orange-50">
        {listing.media?.[0] ? (
          <img src={listing.media[0]} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Compass className="w-10 h-10 text-orange-300" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${listing.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
            {listing.status === 'active' ? 'Active' : listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-white/90 text-neutral-700 capitalize">{listing.listing_type}</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-neutral-900 mb-2 line-clamp-1">{listing.title}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-semibold text-neutral-900">
            <DollarSign className="w-3 h-3 text-neutral-400" />
            {listing.pricing?.base_price ?? 0} {listing.pricing?.currency || 'USD'}
          </div>
          <ShareButton title={listing.title} path={`/${listing.listing_type}/${listing.id}`} variant="chip" />
        </div>
      </div>
    </div>
  );
}

function ProgramCard({ program }: { program: ProgramRecord }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      <div className="relative h-44 bg-teal-50">
        {program.images?.[0] ? (
          <img src={program.images[0]} alt={program.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-teal-300" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${program.active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
            {program.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-neutral-900 line-clamp-1">{program.title}</h3>
          {program.institution_id && (
            <ShareButton title={program.title} path={`/attraction/${program.institution_id}`} variant="chip" className="flex-shrink-0" />
          )}
        </div>
        {program.description && (
          <p className="text-xs text-neutral-500 line-clamp-2 mb-4">{program.description}</p>
        )}

        <div className="grid grid-cols-3 gap-2 text-xs text-neutral-600 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-neutral-400" />
            {program.duration_hours}h
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-neutral-400" />
            Max {program.max_participants}
          </div>
          <div className="flex items-center gap-1 font-semibold text-neutral-900">
            <DollarSign className="w-3 h-3 text-neutral-400" />
            ${program.price_per_person}
          </div>
        </div>

        {program.what_included?.length > 0 && (
          <div>
            <p className="text-xs text-neutral-400 mb-1.5">What's included</p>
            <div className="flex flex-wrap gap-1">
              {program.what_included.slice(0, 3).map((item, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full">{item}</span>
              ))}
              {program.what_included.length > 3 && (
                <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full">+{program.what_included.length - 3} more</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function GuideProgramsPage() {
  const ctx = getGuideContext();
  const { programs, loading: loadingPrograms } = useGuidePrograms(ctx?.id);
  const { listings, loading: loadingListings } = useGuideAssignedListings(ctx?.id);

  const loading = loadingPrograms || loadingListings;
  const activeCount = programs.filter(p => p.active).length;
  const totalAssignments = programs.length + listings.length;

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">My Programs</h1>
        <p className="text-sm text-neutral-500 mt-1">Attraction programs and partner listings you're assigned to guide</p>
      </div>

      {!loading && programs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-neutral-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-neutral-900">{programs.length}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Total Programs</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Active</p>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-neutral-700">{programs.length - activeCount}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Inactive</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : totalAssignments === 0 ? (
        <div className="py-20 text-center bg-white border border-neutral-200 rounded-2xl">
          <BookOpen className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No programs or listings assigned yet</p>
          <p className="text-xs text-neutral-400 mt-1">Operations assigns attraction programs, and partners can attach you to their experiences and journeys</p>
        </div>
      ) : (
        <div className="space-y-10">
          {programs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">Attraction Programs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {programs.map(p => <ProgramCard key={p.id} program={p} />)}
              </div>
            </div>
          )}
          {listings.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">Partner Experiences &amp; Journeys</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {listings.map(l => <ListingCard key={l.id} listing={l} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
