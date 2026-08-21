import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Languages, Award, Star, Clock, Moon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/Card';
import { Section } from '../../components/Section';
import { ShareButton } from '../../components/ShareButton';
import { useSEO } from '../../lib/useSEO';

interface Host {
  id: string;
  name: string;
  profile_picture: string;
  bio: string;
  languages: string[];
  expertise: string[];
  years_experience: number;
  location?: { name: string; region: string };
}

interface Listing {
  id: string;
  title: string;
  listing_type: 'experience' | 'homestay';
  media: string[];
  pricing: {
    base_price: number;
    currency: string;
  };
  location: {
    name: string;
    region: string;
  };
  details?: {
    duration_value?: number;
    duration_unit?: string;
  };
}

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_profile_picture: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export function HostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [host, setHost] = useState<Host | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHostData();
    loadReviews();
  }, [id]);

  useSEO({
    title: host?.name || 'Local Host',
    description: host?.bio
      ? host.bio.slice(0, 155)
      : 'Meet the local hosts and guides behind Tahura Africa\'s experiences, homestays, and journeys.',
    image: host?.profile_picture,
    jsonLd: host ? {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: host.name,
      description: host.bio,
      image: host.profile_picture,
    } : undefined,
  });

  async function loadHostData() {
    if (!id) return;
    setLoading(true);
    try {
      const { data: hostData } = await supabase
        .from('partner_hosts')
        .select('*')
        .eq('id', id)
        .eq('status', 'active')
        .maybeSingle();

      if (hostData) {
        setHost(hostData);

        const { data: listingsData } = await supabase
          .from('partner_listings')
          .select('id, title, listing_type, media, pricing, location, details')
          .eq('host_id', id)
          .eq('status', 'active');

        if (listingsData) setListings(listingsData);
      }
    } catch (error) {
      console.error('Error loading host data:', error);
    }
    setLoading(false);
  }

  async function loadReviews() {
    if (!id) return;
    try {
      const { data: listingsData } = await supabase
        .from('partner_listings')
        .select('id')
        .eq('host_id', id)
        .eq('status', 'active');

      if (listingsData && listingsData.length > 0) {
        const listingIds = listingsData.map(l => l.id);
        const { data } = await supabase
          .from('reviews')
          .select('*')
          .in('listing_id', listingIds)
          .order('created_at', { ascending: false })
          .limit(10);

        if (data) setReviews(data);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!host) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-neutral-500">Host not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-neutral-900 underline">Go Back</button>
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <ShareButton title={host.name} path={`/hosts/${id}`} variant="plain" />
      </div>

      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-2xl p-6 md:p-8 mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-shrink-0">
            {host.profile_picture ? (
              <img
                src={host.profile_picture}
                alt={host.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-2xl md:text-3xl font-semibold text-white">
                  {host.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-2">{host.name}</h1>
            <p className="text-sm text-neutral-600 mb-3">Local Host & Experience Provider</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-600">
              {host.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {host.location.name}, {host.location.region}
                </span>
              )}
              {host.languages && host.languages.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Languages className="w-4 h-4" />
                  {host.languages.join(', ')}
                </span>
              )}
              {host.years_experience > 0 && (
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  {host.years_experience} {host.years_experience === 1 ? 'year' : 'years'}
                </span>
              )}
              {reviews.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {averageRating} ({reviews.length})
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {host.bio && (
            <Section title="About">
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                {host.bio}
              </p>
            </Section>
          )}

          {host.expertise && host.expertise.length > 0 && (
            <Section title="Areas of Expertise">
              <div className="flex flex-wrap gap-2">
                {host.expertise.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 text-sm bg-amber-50 text-neutral-700 rounded-lg border border-amber-100"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {listings.length > 0 && (
            <Section title="Experiences & Stays">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {listings.map((listing) => (
                  <Card
                    key={listing.id}
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      if (listing.listing_type === 'experience') {
                        navigate(`/experience/${listing.id}`);
                      } else {
                        navigate(`/homestay/${listing.id}`);
                      }
                    }}
                  >
                    {listing.media && listing.media[0] ? (
                      <div className="aspect-[4/3] bg-neutral-100">
                        <img
                          src={listing.media[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-neutral-100"></div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-neutral-500 capitalize">{listing.listing_type}</span>
                        {listing.location && (
                          <span className="text-xs text-neutral-400">{listing.location.name}</span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-neutral-900 mb-1.5 line-clamp-2">{listing.title}</h3>
                      {listing.details?.duration_value && (
                        <div className="flex items-center gap-1 text-xs text-neutral-500 mb-2">
                          {listing.listing_type === 'homestay' ? (
                            <>
                              <Moon className="w-3 h-3" />
                              <span>{listing.details.duration_value} {listing.details.duration_value === 1 ? 'night' : 'nights'}</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>{listing.details.duration_value} {listing.details.duration_unit === 'days' ? (listing.details.duration_value === 1 ? 'day' : 'days') : 'hrs'}</span>
                            </>
                          )}
                        </div>
                      )}
                      <div className="text-sm font-medium text-neutral-900">
                        ${listing.pricing?.base_price || 0} {listing.pricing?.currency || 'USD'}
                        <span className="text-xs text-neutral-500 ml-1">
                          {listing.listing_type === 'homestay' ? '/ night' : '/ person'}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {reviews.length > 0 && (
            <Section title="Reviews">
              <div className="relative">
                <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
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
                </div>
              </div>
            </Section>
          )}
        </div>

        <div className="hidden lg:block lg:col-span-1">
          <Card className="p-5 sticky top-24 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-100">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2">Quick Info</h3>
              <div className="space-y-3">
                {host.years_experience > 0 && (
                  <div className="flex items-start gap-2">
                    <Award className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-neutral-900">Experience</p>
                      <p className="text-xs text-neutral-600">{host.years_experience} {host.years_experience === 1 ? 'year' : 'years'} hosting</p>
                    </div>
                  </div>
                )}
                {host.languages && host.languages.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Languages className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-neutral-900">Languages</p>
                      <p className="text-xs text-neutral-600">{host.languages.join(', ')}</p>
                    </div>
                  </div>
                )}
                {reviews.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5 fill-amber-400" />
                    <div>
                      <p className="text-xs font-medium text-neutral-900">Rating</p>
                      <p className="text-xs text-neutral-600">{averageRating} stars from {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-amber-200">
              <p className="text-xs text-neutral-600 leading-relaxed">
                {host.name.split(' ')[0]} typically responds within 24 hours.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
