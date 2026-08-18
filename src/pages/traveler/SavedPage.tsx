import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X, MapPin, Compass, Landmark, Map } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SavedListing {
  id: string;
  title: string;
  provider: string;
  location: string;
  price: number;
  image: string;
  type: 'experience' | 'homestay' | 'itinerary';
  duration_value?: number;
  duration_unit?: string;
}

interface SavedAttraction {
  id: string;
  name: string;
  location: string;
  entryFee: string;
  image: string;
}

function SavedCard({
  image,
  title,
  subtitle,
  meta,
  price,
  route,
  onRemove,
  typeIcon,
  typeLabel,
  typeColor,
}: {
  image: string;
  title: string;
  subtitle: string;
  meta?: string;
  price: string;
  route: string;
  onRemove: () => void;
  typeIcon: React.ReactNode;
  typeLabel: string;
  typeColor: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="group bg-white border border-stone-200/80 rounded-xl overflow-hidden hover:border-stone-300 transition-all duration-200 card-hover-glow hover:-translate-y-0.5">
      <div className="flex gap-0">
        <div
          className="relative w-24 sm:w-28 flex-shrink-0 cursor-pointer"
          onClick={() => navigate(route)}
        >
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover aspect-square" />
          ) : (
            <div className="w-full h-full aspect-square bg-stone-100 flex items-center justify-center">
              <Heart className="w-5 h-5 text-stone-300" />
            </div>
          )}
          <div className={`absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-white/90 backdrop-blur-sm ${typeColor}`}>
            {typeIcon}
            {typeLabel}
          </div>
        </div>
        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between" onClick={() => navigate(route)} style={{ cursor: 'pointer' }}>
          <div>
            <h3 className="text-[13px] font-semibold text-stone-900 line-clamp-2 leading-snug mb-1">{title}</h3>
            <p className="text-[11px] text-stone-500 mb-1 truncate">{subtitle}</p>
            {meta && (
              <p className="text-[11px] text-stone-400 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">{meta}</span>
              </p>
            )}
          </div>
          <p className="text-sm font-bold text-stone-900 mt-1">{price}</p>
        </div>
        <div className="flex-shrink-0 p-2">
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-stone-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SavedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [experiences, setExperiences] = useState<SavedListing[]>([]);
  const [homestays, setHomestays] = useState<SavedListing[]>([]);
  const [itineraries, setItineraries] = useState<SavedListing[]>([]);
  const [attractions, setAttractions] = useState<SavedAttraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSavedItems(); }, [user]);

  async function loadSavedItems() {
    if (!user) { setLoading(false); return; }

    try {
      const { data: savedItems } = await supabase
        .from('saved_items').select('*').eq('user_id', user.id);

      if (!savedItems) { setLoading(false); return; }

      const listingIds = savedItems.filter(i => i.listing_id).map(i => i.listing_id);
      const institutionIds = savedItems.filter(i => i.institution_id).map(i => i.institution_id);

      const [listingsResult, institutionsResult] = await Promise.all([
        listingIds.length > 0
          ? supabase.from('partner_listings').select('*, partner_hosts(name)').in('id', listingIds)
          : Promise.resolve({ data: [] }),
        institutionIds.length > 0
          ? supabase.from('institution_profiles').select('*').in('id', institutionIds)
          : Promise.resolve({ data: [] }),
      ]);

      const expList: SavedListing[] = [];
      const homeList: SavedListing[] = [];
      const itineraryList: SavedListing[] = [];

      listingsResult.data?.forEach((listing: any) => {
        const item: SavedListing = {
          id: listing.id,
          title: listing.title,
          provider: listing.partner_hosts?.name || 'Local Host',
          location: `${listing.location?.name || ''}, ${listing.location?.region || ''}`,
          price: listing.pricing?.base_price || 0,
          image: listing.media?.[0] || '',
          type: listing.listing_type,
          duration_value: listing.details?.duration_value,
          duration_unit: listing.details?.duration_unit,
        };
        if (listing.listing_type === 'experience') expList.push(item);
        else if (listing.listing_type === 'homestay') homeList.push(item);
        else if (listing.listing_type === 'itinerary') itineraryList.push(item);
      });

      const attrList: SavedAttraction[] = institutionsResult.data?.map((inst: any) => ({
        id: inst.id,
        name: inst.name,
        location: inst.location || '',
        entryFee: inst.entry_fee_is_free !== false ? 'Free entry' : (inst.entry_fee_amount ? (() => { const r = inst.entry_fee_amount; const v = Number.isInteger(r) ? r : parseFloat(r.toFixed(2)); return `$${v} entry`; })() : inst.entry_fee || 'Paid'),
        image: inst.cover_image || inst.images?.[0] || '',
      })) || [];

      setExperiences(expList);
      setHomestays(homeList);
      setItineraries(itineraryList);
      setAttractions(attrList);
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
    setLoading(false);
  }

  async function handleRemove(itemId: string, type: 'listing' | 'institution') {
    if (!user) return;
    try {
      const q = supabase.from('saved_items').delete().eq('user_id', user.id);
      if (type === 'listing') await q.eq('listing_id', itemId);
      else await q.eq('institution_id', itemId);
      loadSavedItems();
    } catch (error) {
      console.error('Error removing saved item:', error);
    }
  }

  if (loading) {
    return (
      <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto animate-fade-in">
        <div className="h-7 w-32 bg-stone-100 rounded-lg skeleton-shimmer mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-stone-100 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const hasNoItems = experiences.length === 0 && homestays.length === 0 && itineraries.length === 0 && attractions.length === 0;
  const total = experiences.length + homestays.length + itineraries.length + attractions.length;

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-900 leading-tight">Saved</h1>
          {!hasNoItems && <p className="text-xs text-stone-400 mt-0.5">{total} item{total !== 1 ? 's' : ''}</p>}
        </div>
      </div>

      {hasNoItems ? (
        <div className="text-center py-20 animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
            <Heart className="w-7 h-7 text-stone-300" />
          </div>
          <h3 className="text-base font-semibold text-stone-800 mb-1.5">Your wishlist is empty</h3>
          <p className="text-sm text-stone-400 mb-6 max-w-xs mx-auto leading-relaxed">
            Save experiences, homestays, and attractions you'd love to revisit
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 active:scale-[0.98] transition-all"
          >
            <Compass className="w-4 h-4" />
            Start exploring
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {experiences.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Compass className="w-3.5 h-3.5 text-orange-500" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">Experiences</p>
                <span className="text-[11px] text-stone-300">({experiences.length})</span>
              </div>
              <div className="space-y-2.5">
                {experiences.map((item) => (
                  <SavedCard
                    key={item.id}
                    image={item.image}
                    title={item.title}
                    subtitle={item.provider}
                    meta={item.location}
                    price={`$${item.price} / person`}
                    route={`/experience/${item.id}`}
                    onRemove={() => handleRemove(item.id, 'listing')}
                    typeIcon={<Compass className="w-2 h-2 mr-0.5" />}
                    typeLabel="Experience"
                    typeColor="text-sky-600"
                  />
                ))}
              </div>
            </div>
          )}

          {homestays.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-3.5 h-3.5 text-green-600" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">Homestays</p>
                <span className="text-[11px] text-stone-300">({homestays.length})</span>
              </div>
              <div className="space-y-2.5">
                {homestays.map((item) => (
                  <SavedCard
                    key={item.id}
                    image={item.image}
                    title={item.title}
                    subtitle={item.provider}
                    meta={item.location}
                    price={`$${item.price} / night`}
                    route={`/homestay/${item.id}`}
                    onRemove={() => handleRemove(item.id, 'listing')}
                    typeIcon={<MapPin className="w-2 h-2 mr-0.5" />}
                    typeLabel="Homestay"
                    typeColor="text-green-700"
                  />
                ))}
              </div>
            </div>
          )}

          {itineraries.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Map className="w-3.5 h-3.5 text-amber-600" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">Journeys</p>
                <span className="text-[11px] text-stone-300">({itineraries.length})</span>
              </div>
              <div className="space-y-2.5">
                {itineraries.map((item) => (
                  <SavedCard
                    key={item.id}
                    image={item.image}
                    title={item.title}
                    subtitle={item.provider}
                    meta={item.location}
                    price={`$${item.price}`}
                    route={`/itinerary/${item.id}`}
                    onRemove={() => handleRemove(item.id, 'listing')}
                    typeIcon={<Map className="w-2 h-2 mr-0.5" />}
                    typeLabel="Journey"
                    typeColor="text-amber-700"
                  />
                ))}
              </div>
            </div>
          )}

          {attractions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Landmark className="w-3.5 h-3.5 text-sky-500" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">Attractions</p>
                <span className="text-[11px] text-stone-300">({attractions.length})</span>
              </div>
              <div className="space-y-2.5">
                {attractions.map((item) => (
                  <SavedCard
                    key={item.id}
                    image={item.image}
                    title={item.name}
                    subtitle={item.location}
                    price={item.entryFee}
                    route={`/attraction/${item.id}`}
                    onRemove={() => handleRemove(item.id, 'institution')}
                    typeIcon={<Landmark className="w-2 h-2 mr-0.5" />}
                    typeLabel="Attraction"
                    typeColor="text-sky-600"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
