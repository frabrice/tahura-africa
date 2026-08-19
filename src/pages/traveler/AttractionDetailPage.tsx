import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Heart, MapPin, Clock, Phone, Mail, Globe,
  Check, Users, CalendarX, X, ChevronLeft, ChevronRight, BookOpen, ShieldCheck, Star, Ticket
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AttractionBookingDrawer } from '../../components/AttractionBookingDrawer';
import { AuthPromptToast } from '../../components/AuthPromptToast';
import { ShareButton } from '../../components/ShareButton';

const INSTITUTION_TYPE_LABELS: Record<string, string> = {
  museum: 'Museum',
  national_park: 'National Park',
  heritage_site: 'Heritage Site',
  gallery: 'Art Gallery',
  zoo: 'Zoo & Wildlife Park',
  botanical_garden: 'Botanical Garden',
  aquarium: 'Aquarium',
  science_center: 'Science Center',
  cultural_center: 'Cultural Center',
  other: 'Attraction',
};

interface InstitutionProfile {
  id: string;
  portal_user_id: string;
  name: string;
  tagline: string;
  description: string;
  type: string;
  location: string;
  entry_fee: string;
  entry_fee_is_free: boolean;
  entry_fee_amount: number;
  visiting_hours: string;
  guidelines: string[];
  images: string[];
  cover_image: string;
  phone: string;
  email: string;
  website: string;
  published: boolean;
  daily_capacity: number;
  opening_time: string;
  closing_time: string;
  closed_days: string[];
}

interface Program {
  id: string;
  portal_user_id: string;
  title: string;
  description: string;
  duration_hours: number;
  max_participants: number;
  price_per_person: number;
  what_included: string[];
  what_to_bring: string[];
  images: string[];
  active: boolean;
}

interface Guide {
  id: string;
  name: string;
  bio: string;
  specializations: string[];
  languages: string[];
  experience_years: number;
  rating: number;
  total_tours: number;
  available: boolean;
  profile_picture: string | null;
  tip: number;
}

interface AttractionReview {
  id: string;
  reviewer_name: string;
  reviewer_profile_picture: string;
  rating: number;
  review_text: string;
  created_at: string;
}

function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (i: number) => {
    setLightboxIndex(i);
    document.body.style.overflow = 'hidden';
  };
  const closeLightbox = () => {
    setLightboxIndex(null);
    document.body.style.overflow = 'unset';
  };
  const prev = () => setLightboxIndex(i => (i === null || i === 0 ? images.length - 1 : i - 1));
  const next = () => setLightboxIndex(i => (i === null || i === images.length - 1 ? 0 : i + 1));

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[16/9] bg-neutral-100 mb-6 rounded-xl flex items-center justify-center">
        <span className="text-neutral-400 text-sm">No images available</span>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-3 pb-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => openLightbox(i)}
              className={`flex-shrink-0 aspect-[4/3] bg-neutral-100 overflow-hidden rounded-xl border-2 border-transparent hover:border-neutral-300 transition-all hover:shadow-lg group cursor-pointer ${
                i === 0 ? 'w-[calc(60%-6px)]' : 'w-[calc(40%-6px)]'
              }`}
            >
              <img
                src={img}
                alt={`${title} ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <p className="text-xs text-neutral-400 text-right mt-1.5 pr-1">
            {images.length} photos · scroll to see more
          </p>
        )}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors z-10"
          >
            <X className="w-5 h-5 text-neutral-900" />
          </button>
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-neutral-100 shadow-lg transition-all hover:scale-105"
              >
                <ChevronLeft className="w-6 h-6 text-neutral-900" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-neutral-100 shadow-lg transition-all hover:scale-105"
              >
                <ChevronRight className="w-6 h-6 text-neutral-900" />
              </button>
            </>
          )}
          <div className="max-w-5xl max-h-[90vh] mx-4 sm:mx-12 md:mx-16" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[lightboxIndex]}
              alt={`${title} ${lightboxIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
            />
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`h-1.5 rounded-full transition-all ${i === lightboxIndex ? 'bg-white w-6' : 'bg-white/50 w-1.5 hover:bg-white/80'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function formatTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function AttractionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isTraveler, user } = useAuth();
  const [institution, setInstitution] = useState<InstitutionProfile | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [reviews, setReviews] = useState<AttractionReview[]>([]);

  useEffect(() => {
    if ((location.state as any)?.openBooking && isAuthenticated && isTraveler) {
      setShowBookingModal(true);
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
    setShowBookingModal(true);
  }, [isAuthenticated, isTraveler, navigate, location.pathname]);

  useEffect(() => {
    if (id) {
      loadInstitution();
      checkIfSaved();
      loadReviews();
    }
  }, [id, user]);

  async function loadInstitution() {
    if (!id) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('institution_profiles')
        .select('*')
        .eq('id', id)
        .eq('published', true)
        .eq('is_flagged', false)
        .maybeSingle();

      if (profile) {
        setInstitution(profile);
        await Promise.all([
          loadPrograms(profile.portal_user_id),
          loadGuides(profile.portal_user_id),
        ]);
      }
    } catch (error) {
      console.error('Error loading institution:', error);
    }
    setLoading(false);
  }

  async function loadPrograms(portalUserId: string) {
    const { data } = await supabase
      .from('programs')
      .select('*')
      .eq('portal_user_id', portalUserId)
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (data) setPrograms(data);
  }

  async function loadGuides(portalUserId: string) {
    const { data } = await supabase
      .from('guides')
      .select('*')
      .eq('portal_user_id', portalUserId)
      .eq('available', true)
      .order('rating', { ascending: false });
    if (data) setGuides(data);
  }

  async function loadReviews() {
    if (!id) return;
    try {
      const { data } = await supabase
        .from('attraction_reviews')
        .select('id, reviewer_name, reviewer_profile_picture, rating, review_text, created_at')
        .eq('institution_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setReviews(data);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  }

  async function checkIfSaved() {
    if (!user || !id) return;
    try {
      const { data } = await supabase
        .from('saved_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('institution_id', id)
        .maybeSingle();

      setSaved(!!data);
    } catch (error) {
      console.error('Error checking saved status:', error);
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
          .eq('institution_id', id);
        setSaved(false);
      } else {
        await supabase
          .from('saved_items')
          .insert({
            user_id: user.id,
            institution_id: id,
          });
        setSaved(true);
      }
    } catch (error) {
      console.error('Error toggling saved status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="text-center py-24">
        <p className="text-sm text-neutral-500 mb-4">Attraction not found</p>
        <button onClick={() => navigate('/')} className="text-sm font-medium text-neutral-900 underline">
          Back to Explore
        </button>
      </div>
    );
  }

  const allImages = [
    ...(institution.cover_image ? [institution.cover_image] : []),
    ...(institution.images || []).filter(img => img !== institution.cover_image),
  ];

  const typeLabel = INSTITUTION_TYPE_LABELS[institution.type] || 'Attraction';
  const hasPackages = programs.length > 0;
  const hasGuides = guides.length > 0;
  const hasHours = institution.opening_time && institution.closing_time;
  const hasClosedDays = institution.closed_days && institution.closed_days.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <ShareButton title={institution.name} path={`/attraction/${id}`} variant="plain" />
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{typeLabel}</span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 mb-2">{institution.name}</h1>
        {institution.tagline && (
          <p className="text-base text-neutral-500 italic mb-3">{institution.tagline}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-neutral-600">
          {institution.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-neutral-400" />
              {institution.location}
            </span>
          )}
          {hasHours && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-neutral-400" />
              {formatTime(institution.opening_time)} – {formatTime(institution.closing_time)}
            </span>
          )}
          {reviews.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} ({reviews.length})
            </span>
          )}
        </div>
      </div>

      <ImageGallery images={allImages} title={institution.name} />

      <div className="lg:hidden mb-6">
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              {hasPackages && (
                <div className="text-xs text-neutral-500">{programs.length} package{programs.length !== 1 ? 's' : ''} available</div>
              )}
            </div>
            <button
              onClick={handleSave}
              className={`p-3 rounded-full border-2 transition-all ${saved ? 'bg-rose-50 border-rose-300 text-rose-500' : 'border-neutral-200 text-neutral-400 hover:border-neutral-400'}`}
            >
              <Heart className={`w-5 h-5 ${saved ? 'fill-rose-500' : ''}`} />
            </button>
          </div>
          <button
            onClick={handleBookClick}
            className="w-full py-4 sm:py-3 bg-neutral-900 text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            {hasPackages ? 'Book a Package' : 'Book Your Visit'}
          </button>
          {(hasPackages || hasGuides) && (
            <p className="text-xs text-neutral-400 text-center mt-2">
              {hasPackages && hasGuides
                ? `${programs.length} package${programs.length !== 1 ? 's' : ''} · ${guides.length} guide${guides.length !== 1 ? 's' : ''} available`
                : hasPackages
                ? `${programs.length} package${programs.length !== 1 ? 's' : ''} to choose from`
                : `${guides.length} guide${guides.length !== 1 ? 's' : ''} available`}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-8">
          {institution.description && (
            <section>
              <h2 className="text-lg font-semibold text-neutral-900 mb-3">About this place</h2>
              <p className="text-sm text-neutral-700 leading-relaxed">{institution.description}</p>
            </section>
          )}

          {(hasHours || hasClosedDays || institution.daily_capacity > 0 || institution.entry_fee_is_free !== undefined) && (
            <section>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Visit information</h2>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Ticket className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-neutral-500 mb-0.5">Entry fee</div>
                    {institution.entry_fee_is_free !== false ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold">
                        <Check className="w-3 h-3" />
                        Free admission
                      </span>
                    ) : (
                      <div className="text-sm font-medium text-neutral-900">
                        ${institution.entry_fee_amount?.toFixed(2)} <span className="text-neutral-500 font-normal">per booking</span>
                      </div>
                    )}
                  </div>
                </div>
                {hasHours && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-neutral-500 mb-0.5">Opening hours</div>
                      <div className="text-sm font-medium text-neutral-900">
                        {formatTime(institution.opening_time)} – {formatTime(institution.closing_time)}
                      </div>
                    </div>
                  </div>
                )}

                {hasClosedDays && (
                  <div className="flex items-start gap-3">
                    <CalendarX className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-neutral-500 mb-0.5">Closed on</div>
                      <div className="text-sm font-medium text-neutral-900">
                        {institution.closed_days.join(', ')}
                      </div>
                    </div>
                  </div>
                )}

                {institution.daily_capacity > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-neutral-500 mb-0.5">Daily capacity</div>
                      <div className="text-sm font-medium text-neutral-900">
                        Up to {institution.daily_capacity.toLocaleString()} visitors per day
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {institution.guidelines && institution.guidelines.filter(g => g.trim()).length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Visitor guidelines</h2>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-600">Please review before your visit</span>
                </div>
                <ul className="space-y-3">
                  {institution.guidelines.filter(g => g.trim()).map((guideline, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-neutral-700">
                      <Check className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                      <span>{guideline}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {(institution.phone || institution.email || institution.website) && (
            <section>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Contact information</h2>
              <div className="space-y-3">
                {institution.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    <span className="text-neutral-700">{institution.phone}</span>
                  </div>
                )}
                {institution.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    <a href={`mailto:${institution.email}`} className="text-neutral-700 hover:text-neutral-900 transition-colors hover:underline">
                      {institution.email}
                    </a>
                  </div>
                )}
                {institution.website && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    <a
                      href={institution.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-700 hover:text-neutral-900 transition-colors hover:underline truncate"
                    >
                      {institution.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {reviews.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-neutral-900">
                  Visitor Reviews
                  <span className="text-sm font-normal text-neutral-500 ml-2">
                    ({reviews.length})
                  </span>
                </h2>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-neutral-900">
                    {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="flex gap-4 pb-2">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="flex-shrink-0 w-[280px] md:w-[320px] p-4 bg-neutral-50 border border-neutral-200 rounded-xl"
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
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              {hasPackages && (
                <div className="text-sm font-semibold text-neutral-900">{programs.length} package{programs.length !== 1 ? 's' : ''} available</div>
              )}
              {!hasPackages && (
                <div className="text-sm font-semibold text-neutral-900">Book your visit</div>
              )}
            </div>

            {(hasPackages || hasGuides) && (
              <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                {hasPackages && (
                  <div className="flex items-center gap-2 text-xs text-neutral-600">
                    <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                    {programs.length} tour package{programs.length !== 1 ? 's' : ''}
                    <span className="ml-auto text-neutral-400">from ${Math.min(...programs.map(p => p.price_per_person))}/person</span>
                  </div>
                )}
                {hasGuides && (
                  <div className="flex items-center gap-2 text-xs text-neutral-600">
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    {guides.length} guide{guides.length !== 1 ? 's' : ''} available
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleBookClick}
                className="w-full py-3 bg-neutral-900 text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                {hasPackages ? 'Book a Package' : 'Book Your Visit'}
              </button>
              <button
                onClick={handleSave}
                className={`w-full py-2.5 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  saved
                    ? 'bg-rose-50 border-rose-300 text-rose-600'
                    : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${saved ? 'fill-rose-500 text-rose-500' : ''}`} />
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>

            {hasHours && (
              <div className="pt-3 border-t border-neutral-100 text-xs text-neutral-500 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Open {formatTime(institution.opening_time)} – {formatTime(institution.closing_time)}
                </div>
                {hasClosedDays && (
                  <div className="flex items-center gap-2">
                    <CalendarX className="w-3.5 h-3.5" />
                    Closed: {institution.closed_days.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AttractionBookingDrawer
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        attractionName={institution.name}
        locationName={institution.location}
        institutionId={institution.portal_user_id}
        entryFeeIsFree={institution.entry_fee_is_free !== false}
        entryFeeAmount={institution.entry_fee_amount || 0}
        programs={programs}
        guides={guides}
        onComplete={() => {
          setShowBookingModal(false);
          navigate('/trips');
        }}
      />

      <AuthPromptToast
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        message="You need to be logged in to book this attraction. Taking you to the login page now…"
      />
    </div>
  );
}
