import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, Star, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Section } from '../../components/Section';
import { BookingDrawer } from '../../components/BookingDrawer';
import { HorizontalScrollRow } from '../../components/HorizontalScrollRow';
import { AuthPromptToast } from '../../components/AuthPromptToast';
import { ShareButton } from '../../components/ShareButton';
import { useSEO } from '../../lib/useSEO';

interface Experience {
  id: string;
  title: string;
  description: string;
  provider_name: string;
  host_id?: string;
  host_profile_picture?: string;
  location: { name: string; region: string; coordinates?: { lat: number; lng: number } };
  pricing: { base_price: number; currency: string };
  details: {
    duration?: string;
    duration_value?: number;
    duration_unit?: string;
    frequency_type?: string;
    difficulty?: string;
    group_size?: number;
  };
  media: string[];
  whats_included: string[];
  what_to_bring: string[];
  tags: string[];
}

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_profile_picture: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export function ExperienceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isTraveler, user } = useAuth();
  const [experience, setExperience] = useState<Experience | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    if ((location.state as any)?.openBooking && isAuthenticated && isTraveler) {
      setShowBookingModal(true);
      window.history.replaceState({}, '');
    }
  }, [location.state, isAuthenticated, isTraveler]);

  useSEO({
    title: experience?.title || 'Experience',
    description: experience?.description
      ? experience.description.slice(0, 155)
      : 'Book authentic, locally-guided experiences across Rwanda and East Africa on Tahura Africa.',
    image: experience?.media?.[0],
    jsonLd: experience ? {
      '@context': 'https://schema.org',
      '@type': 'TouristAttraction',
      name: experience.title,
      description: experience.description,
      image: experience.media,
      address: experience.location?.name ? {
        '@type': 'PostalAddress',
        addressLocality: experience.location.name,
        addressRegion: experience.location.region,
        addressCountry: 'RW',
      } : undefined,
      offers: {
        '@type': 'Offer',
        price: experience.pricing?.base_price,
        priceCurrency: experience.pricing?.currency || 'USD',
        availability: 'https://schema.org/InStock',
      },
    } : undefined,
  });

  const handleBookClick = useCallback(() => {
    if (!isAuthenticated || !isTraveler) {
      setShowAuthPrompt(true);
      setTimeout(() => {
        navigate('/traveler/login', {
          state: { returnTo: location.pathname, openBooking: true },
        });
      }, 2200);
      return;
    }
    setShowBookingModal(true);
  }, [isAuthenticated, isTraveler, navigate, location.pathname]);

  useEffect(() => {
    if (id) {
      loadExperience();
      loadReviews();
      checkIfSaved();
    }
  }, [id, user]);

  async function loadExperience() {
    if (!id) return;
    setLoading(true);
    try {
      const { data: listing } = await supabase
        .from('partner_listings')
        .select('*, partner_hosts!partner_listings_host_id_fkey(id, name, profile_picture)')
        .eq('id', id)
        .eq('listing_type', 'experience')
        .eq('status', 'active')
        .eq('is_flagged', false)
        .maybeSingle();

      if (listing) {
        const hostData = listing.partner_hosts as any;
        const experienceData: Experience = {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          provider_name: hostData?.name || 'Local Partner',
          host_id: hostData?.id,
          host_profile_picture: hostData?.profile_picture,
          location: listing.location,
          pricing: listing.pricing || { base_price: 0, currency: 'USD' },
          details: listing.details || {},
          media: listing.media || [],
          whats_included: listing.whats_included || [],
          what_to_bring: listing.what_to_bring || [],
          tags: listing.tags || [],
        };
        setExperience(experienceData);
      }
    } catch (error) {
      console.error('Error loading experience:', error);
    }
    setLoading(false);
  }

  async function checkIfSaved() {
    if (!user || !id) return;
    try {
      const { data } = await supabase
        .from('saved_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', id)
        .maybeSingle();

      setSaved(!!data);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  }

  async function loadReviews() {
    if (!id) return;
    try {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('listing_id', id)
        .order('created_at', { ascending: false });

      if (data) setReviews(data);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  }

  const handleSave = async () => {
    if (!user || !id) {
      setShowAuthPrompt(true);
      setTimeout(() => {
        navigate('/traveler/login', {
          state: { returnTo: location.pathname },
        });
      }, 2200);
      return;
    }

    try {
      if (saved) {
        await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', id);
        setSaved(false);
      } else {
        await supabase
          .from('saved_items')
          .insert({
            user_id: user.id,
            listing_id: id,
            listing_type: 'experience',
          });
        setSaved(true);
      }
    } catch (error) {
      console.error('Error toggling saved status:', error);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-neutral-500">Experience not found</p>
        <button onClick={() => navigate('/')} className="mt-4 text-sm text-neutral-900 underline">Back to Explore</button>
      </div>
    );
  }

  const media = experience.media || [];
  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviewCount).toFixed(1) : null;
  const price = experience.pricing?.base_price || 0;
  const d = experience.details || {};
  const durationText = d.duration_value
    ? `${d.duration_value} ${d.duration_unit === 'days' ? (d.duration_value === 1 ? 'day' : 'days') : (d.duration_value === 1 ? 'hour' : 'hours')}`
    : d.duration || null;
  const facts: { l: string; v: string }[] = [];
  if (durationText) facts.push({ l: 'Duration', v: durationText });
  if (d.group_size) facts.push({ l: 'Group', v: `Up to ${d.group_size}` });
  if (d.difficulty) facts.push({ l: 'Level', v: d.difficulty });
  if (d.frequency_type && d.frequency_type !== 'once_daily') facts.push({ l: 'Sessions', v: d.frequency_type === 'three_daily' ? '3× daily' : '2× daily' });

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-24 lg:pb-10">
      {/* Immersive hero */}
      <div className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-warm mb-4">
        <div className="aspect-[16/11] sm:aspect-[16/9] bg-stone-200">
          {media[heroIdx] ? (
            <img src={media[heroIdx]} alt={experience.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-stone-400" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 pointer-events-none" />

        <button
          onClick={() => navigate('/')}
          className="absolute top-3.5 left-3.5 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur-sm text-white text-[13px] font-medium px-3 py-1.5 hover:bg-black/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Explore
        </button>
        <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2">
          <ShareButton title={experience?.title || 'Tahura Africa'} path={`/experience/${id}`} variant="overlay" />
          <button
            onClick={handleSave}
            className={`w-9 h-9 grid place-items-center rounded-full backdrop-blur-sm transition-colors ${saved ? 'bg-white text-rose-500' : 'bg-black/35 text-white hover:bg-black/50'}`}
            aria-label={saved ? 'Saved' : 'Save'}
          >
            <Heart className={`w-4 h-4 ${saved ? 'fill-rose-500' : ''}`} />
          </button>
        </div>
        {media.length > 1 && (
          <span className="absolute top-3.5 left-1/2 -translate-x-1/2 z-10 text-[11px] font-semibold text-white bg-black/35 backdrop-blur-sm rounded-full px-2.5 py-1 tabular-nums">
            {heroIdx + 1} / {media.length}
          </span>
        )}

        <div className="absolute left-5 right-5 bottom-5 z-10 text-white">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">
            {experience.location?.name}{experience.location?.region ? ` · ${experience.location.region}` : ''}
          </span>
          <h1 className="font-display text-2xl sm:text-3xl md:text-[2.5rem] font-semibold leading-[1.05] mt-1.5 mb-2" style={{ textShadow: '0 2px 20px rgba(0,0,0,.45)' }}>
            {experience.title}
          </h1>
          <div className="flex items-center gap-x-3 gap-y-1 text-[13px] flex-wrap opacity-95">
            {avgRating && (
              <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" /> {avgRating} · {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span>
            )}
            {avgRating && <span className="opacity-50">·</span>}
            <span>Hosted by {experience.provider_name}</span>
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {media.map((m, i) => (
            <button
              key={i}
              onClick={() => setHeroIdx(i)}
              className={`flex-none w-16 h-12 rounded-lg overflow-hidden transition-all ${i === heroIdx ? 'ring-2 ring-orange-500 ring-offset-1' : 'opacity-70 hover:opacity-100'}`}
            >
              <img src={m} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fact chips */}
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {facts.map((f) => (
            <div key={f.l} className="flex flex-col rounded-xl border border-stone-200 bg-white px-3.5 py-2 min-w-[84px] shadow-warm-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-400">{f.l}</span>
              <span className="text-[13px] font-semibold text-stone-900">{f.v}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <Section title="About this experience">
            <p className="text-sm text-neutral-700 leading-relaxed">
              {experience.description}
            </p>
          </Section>

          {experience.whats_included && experience.whats_included.length > 0 && (
            <Section title="What's included">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {experience.whats_included.map((item: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100 transition-all hover:bg-green-100"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-neutral-800 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {experience.what_to_bring && experience.what_to_bring.length > 0 && (
            <Section title="What to bring">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {experience.what_to_bring.map((item: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100 transition-all hover:bg-blue-100"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <span className="text-sm text-neutral-800 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="About the provider">
            <Card
              className={`p-4 md:p-5 bg-amber-50/50 ${(experience as any).host_id ? 'cursor-pointer hover:bg-amber-100/50 transition-colors' : ''}`}
              onClick={() => {
                if ((experience as any).host_id) {
                  navigate(`/hosts/${(experience as any).host_id}`);
                }
              }}
            >
              <div className="flex items-start gap-3">
                {(experience as any).host_profile_picture ? (
                  <img
                    src={(experience as any).host_profile_picture}
                    alt={experience.provider_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-neutral-600">
                      {experience.provider_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-neutral-900 mb-1">{experience.provider_name}</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Operating in the {experience.location.region} for over a decade, committed to
                    sustainable practices and authentic local experiences.
                  </p>
                </div>
              </div>
            </Card>
          </Section>

          {reviews.length > 0 && (
            <Section title="Reviews">
              <HorizontalScrollRow>
                  <div className="flex gap-4 pb-2">
                    {reviews.map((review) => (
                      <Card
                        key={review.id}
                        className="flex-shrink-0 w-[280px] md:w-[320px] p-4 bg-neutral-50"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          {review.reviewer_profile_picture ? (
                            <img
                              src={review.reviewer_profile_picture}
                              alt={review.reviewer_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-neutral-600">
                                {review.reviewer_name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-neutral-900 truncate">
                              {review.reviewer_name}
                            </h4>
                            <div className="flex items-center gap-1 mt-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < review.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-neutral-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-neutral-700 leading-relaxed line-clamp-4">
                          {review.review_text}
                        </p>
                      </Card>
                    ))}
                  </div>
              </HorizontalScrollRow>
            </Section>
          )}
        </div>

        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-stone-200 bg-white shadow-warm p-5">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-[26px] font-bold text-stone-900 tabular-nums leading-none">${price}</span>
              <span className="text-sm text-stone-500">/ person</span>
              {avgRating && (
                <span className="ml-auto text-sm text-stone-600 inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {avgRating}</span>
              )}
            </div>
            <button onClick={handleBookClick} className="w-full grid grid-cols-2 gap-2 mb-3 text-left">
              <span className="rounded-xl border border-stone-200 px-3 py-2.5 bg-stone-50 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-400">Date</span>
                <span className="text-sm text-stone-800 font-medium">Select date</span>
              </span>
              <span className="rounded-xl border border-stone-200 px-3 py-2.5 bg-stone-50 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-400">Guests</span>
                <span className="text-sm text-stone-800 font-medium">Add guests</span>
              </span>
            </button>
            <button onClick={handleBookClick} className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-[15px] py-3.5 transition-colors shadow-[0_8px_20px_-8px_rgba(234,88,12,0.6)]">
              Reserve
            </button>
            <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-stone-500">
              <span className="text-emerald-600">◆</span> You won't be charged yet · Free cancellation
            </div>
            <button onClick={handleSave} className={`w-full mt-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${saved ? 'text-rose-500' : 'text-stone-500 hover:text-stone-800'}`}>
              <Heart className={`w-4 h-4 ${saved ? 'fill-rose-500' : ''}`} /> {saved ? 'Saved to wishlist' : 'Save to wishlist'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky reserve bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 py-3 flex items-center gap-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex-1 leading-tight">
          <span className="text-lg font-bold text-stone-900 tabular-nums">${price}</span>
          <span className="text-xs text-stone-500"> / person</span>
        </div>
        <button onClick={handleSave} className={`w-11 h-11 grid place-items-center rounded-xl border transition-colors ${saved ? 'border-rose-200 bg-rose-50 text-rose-500' : 'border-stone-200 text-stone-600'}`} aria-label={saved ? 'Saved' : 'Save'}>
          <Heart className={`w-5 h-5 ${saved ? 'fill-rose-500' : ''}`} />
        </button>
        <button onClick={handleBookClick} className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 transition-colors">
          Reserve
        </button>
      </div>

      <BookingDrawer
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        itemTitle={experience.title}
        itemType="experience"
        locationName={`${experience.location?.name || ''}${experience.location?.region ? `, ${experience.location.region}` : ''}`}
        locationCoordinates={experience.location?.coordinates}
        itemId={experience.id}
        hostId={experience.host_id}
        priceMin={experience.pricing?.base_price || 0}
        priceMax={experience.pricing?.base_price || 0}
        listingDetails={experience.details}
        onComplete={() => {
          setShowBookingModal(false);
          navigate('/trips');
        }}
      />

      <AuthPromptToast
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        message="You need to be logged in to book this experience. Taking you to the login page now…"
      />
    </div>
  );
}
