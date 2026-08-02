import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, Users, Star, Clock, Check, ChevronDown, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Section } from '../../components/Section';
import { BookingDrawer } from '../../components/BookingDrawer';
import { ImageGrid } from '../../components/ImageGrid';
import { HorizontalScrollRow } from '../../components/HorizontalScrollRow';
import { AuthPromptToast } from '../../components/AuthPromptToast';

interface ItineraryDay {
  day: number;
  title: string;
  place_name: string;
  description: string;
}

interface Itinerary {
  id: string;
  title: string;
  description: string;
  provider_name: string;
  partner_id: string;
  host_id?: string;
  host_profile_picture?: string;
  location: { name: string; region: string };
  pricing: { base_price: number; currency: string };
  details: {
    duration?: string;
    duration_value?: number;
    duration_unit?: string;
    difficulty?: string;
    group_size?: number;
  };
  media: string[];
  whats_included: string[];
  what_to_bring: string[];
  tags: string[];
  itinerary_days?: ItineraryDay[];
}

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_profile_picture: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export function ItineraryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isTraveler, user } = useAuth();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingDrawer, setShowBookingDrawer] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Set<number>>(new Set());

  useEffect(() => {
    if ((location.state as any)?.openBooking && isAuthenticated && isTraveler) {
      setShowBookingDrawer(true);
      window.history.replaceState({}, '');
    }
  }, [location.state, isAuthenticated, isTraveler]);

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
    setShowBookingDrawer(true);
  }, [isAuthenticated, isTraveler, navigate, location.pathname]);

  useEffect(() => {
    if (id) {
      loadItinerary();
      loadReviews();
    }
  }, [id]);

  useEffect(() => {
    if (id && isAuthenticated && isTraveler && user) {
      checkSaved();
    }
  }, [id, isAuthenticated, isTraveler, user]);

  async function loadItinerary() {
    setLoading(true);
    const { data, error } = await supabase
      .from('partner_listings')
      .select('*, partner_hosts(id, name, profile_picture)')
      .eq('id', id)
      .eq('listing_type', 'itinerary')
      .maybeSingle();

    if (!error && data) {
      const hostData = (data as any).partner_hosts as any;
      setItinerary({
        id: data.id,
        title: data.title,
        description: data.description,
        provider_name: hostData?.name || 'Local Partner',
        partner_id: data.partner_id,
        host_id: hostData?.id,
        host_profile_picture: hostData?.profile_picture,
        location: data.location || { name: '', region: '' },
        pricing: data.pricing || { base_price: 0, currency: 'USD' },
        details: data.details || {},
        media: data.media || [],
        whats_included: data.whats_included || [],
        what_to_bring: data.what_to_bring || [],
        tags: data.tags || [],
        itinerary_days: data.itinerary_days || [],
      });
    }
    setLoading(false);
  }

  async function loadReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('listing_id', id)
      .order('created_at', { ascending: false })
      .limit(6);
    if (data) setReviews(data);
  }

  async function checkSaved() {
    if (!user || !id) return;
    const { data } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', (user as any).id)
      .eq('listing_id', id)
      .maybeSingle();
    setSaved(!!data);
  }

  async function handleSave() {
    if (!isAuthenticated || !isTraveler || !user || !itinerary) {
      setShowAuthPrompt(true);
      return;
    }
    if (saved) {
      await supabase.from('saved_items').delete().eq('user_id', (user as any).id).eq('listing_id', itinerary.id);
      setSaved(false);
    } else {
      await supabase.from('saved_items').insert({
        user_id: (user as any).id,
        listing_id: itinerary.id,
        listing_type: 'itinerary',
      });
      setSaved(true);
    }
  }

  function toggleDetail(index: number) {
    setExpandedDetails(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-neutral-500">Journey not found</p>
        <button onClick={() => navigate('/')} className="mt-4 text-sm text-neutral-900 underline">Back to Explore</button>
      </div>
    );
  }

  const avgRating = reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const duration = itinerary.details?.duration_value
    ? `${itinerary.details.duration_value} ${itinerary.details.duration_unit || 'days'}`
    : itinerary.details?.duration || null;

  const hasItineraryDetails = itinerary.itinerary_days && itinerary.itinerary_days.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-4 md:mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Explore</span>
      </button>

      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
            Journey
          </span>
          {itinerary.details?.difficulty && (
            <span className="px-2.5 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-600 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {itinerary.details.difficulty}
            </span>
          )}
          {itinerary.tags?.slice(0, 3).map(tag => (
            <span key={tag} className="px-2.5 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-600 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-neutral-900 mb-3">{itinerary.title}</h1>
        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-neutral-600 mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {itinerary.location?.name}, {itinerary.location?.region}
          </span>
          {duration && (
            <>
              <span className="hidden md:inline text-neutral-300">|</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {duration}
              </span>
            </>
          )}
          {itinerary.details?.group_size && (
            <>
              <span className="hidden md:inline text-neutral-300">|</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Up to {itinerary.details.group_size} people
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap text-sm text-neutral-600">
          <span>Led by {itinerary.provider_name}</span>
          {reviews.length > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{avgRating.toFixed(1)}</span>
              <span className="text-neutral-400">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
            </span>
          )}
        </div>
      </div>

      <ImageGrid images={itinerary.media} title={itinerary.title} />

      <div className="lg:hidden mb-6">
        <Card className="p-4 bg-amber-50">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-xs text-neutral-500 mb-1">Price</div>
              <div className="text-lg font-medium text-neutral-900">
                ${itinerary.pricing?.base_price?.toLocaleString()} <span className="text-sm font-normal">{itinerary.pricing?.currency}</span>
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">per person</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 sm:py-2.5 text-sm font-medium border rounded-lg transition-all ${
                saved
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-white border-neutral-300 text-neutral-900 hover:border-neutral-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${saved ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{saved ? 'Saved' : 'Save'}</span>
            </button>
            <Button className="flex-1 rounded-lg" variant="primary" onClick={handleBookClick}>
              Book Now
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <Section title="About this journey">
            <p className="text-sm text-neutral-700 leading-relaxed">
              {itinerary.description}
            </p>

            {hasItineraryDetails && (
              <div className="mt-5 space-y-2">
                {itinerary.itinerary_days!.map((day, index) => {
                  const isOpen = expandedDetails.has(index);
                  return (
                    <div
                      key={index}
                      className="border border-neutral-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleDetail(index)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-neutral-50 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <div className="flex items-center gap-3 pr-4 min-w-0">
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                            {day.day}
                          </span>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-neutral-900 block truncate">{day.title}</span>
                            <span className="text-xs text-neutral-500 truncate block">{day.place_name}</span>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-neutral-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 bg-neutral-50 border-t border-neutral-100">
                          <p className="text-sm text-neutral-600 leading-relaxed">{day.description}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {itinerary.whats_included?.length > 0 && (
            <Section title="What's included">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {itinerary.whats_included.map((item, i) => (
                  <div
                    key={i}
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

          {itinerary.what_to_bring?.length > 0 && (
            <Section title="What to bring">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {itinerary.what_to_bring.map((item, i) => (
                  <div
                    key={i}
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
              className={`p-4 md:p-5 bg-amber-50/50 ${itinerary.host_id ? 'cursor-pointer hover:bg-amber-100/50 transition-colors' : ''}`}
              onClick={() => {
                if (itinerary.host_id) {
                  navigate(`/hosts/${itinerary.host_id}`);
                }
              }}
            >
              <div className="flex items-start gap-3">
                {itinerary.host_profile_picture ? (
                  <img
                    src={itinerary.host_profile_picture}
                    alt={itinerary.provider_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-neutral-600">
                      {itinerary.provider_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-neutral-900 mb-1">{itinerary.provider_name}</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Operating in the {itinerary.location.region} region, committed to delivering
                    authentic and sustainable journey experiences.
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
          <Card className="p-5 sticky top-24 bg-amber-50">
            <div className="mb-5">
              <div className="text-xs text-neutral-500 mb-1">Price</div>
              <div className="text-lg font-medium text-neutral-900">
                ${itinerary.pricing?.base_price?.toLocaleString()} {itinerary.pricing?.currency}
              </div>
              <div className="text-xs text-neutral-500 mt-1">per person</div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleSave}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg transition-all ${
                  saved
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-white border-neutral-300 text-neutral-900 hover:border-neutral-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${saved ? 'fill-red-500 text-red-500' : ''}`} />
                {saved ? 'Saved' : 'Save'}
              </button>
              <Button className="w-full rounded-lg" variant="primary" onClick={handleBookClick}>
                Book This Journey
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {showBookingDrawer && (
        <BookingDrawer
          isOpen={showBookingDrawer}
          onClose={() => setShowBookingDrawer(false)}
          itemTitle={itinerary.title}
          itemType="itinerary"
          itemId={itinerary.id}
          hostId={itinerary.host_id}
          priceMin={itinerary.pricing?.base_price || 0}
          priceMax={itinerary.pricing?.base_price || 0}
          listingDetails={itinerary.details}
          onComplete={() => {
            setShowBookingDrawer(false);
            navigate('/trips');
          }}
        />
      )}

      <AuthPromptToast
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        message="You need to be logged in to book this journey. Taking you to the login page now…"
      />
    </div>
  );
}
