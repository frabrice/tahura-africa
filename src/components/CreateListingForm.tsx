import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Building, Home, Map, Plus, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { PortalUser } from '../lib/auth';
import { LocationPicker } from './LocationPicker';
import { compressImage } from '../lib/imageCompression';

interface CreateListingFormProps {
  onComplete: () => void;
  onCancel: () => void;
  /** Ops usage: create the listing under a specific partner instead of the
   *  logged-in one. Omit for the normal partner-portal usage. */
  partnerId?: string;
  /** Host portal usage: the listing is submitted for the host's own partner
   *  to approve rather than published directly. Skips the "Assign Host" step
   *  (the host is implicitly themselves) and inserts as pending_approval. */
  hostSubmission?: { hostId: string; hostName: string; partnerId: string };
}

interface ItineraryDay {
  day: number;
  title: string;
  place_name: string;
  description: string;
}

interface ListingData {
  listing_type: 'experience' | 'homestay' | 'itinerary' | null;
  title: string;
  description: string;
  location: {
    name: string;
    region: string;
    coordinates?: { lat: number; lng: number };
  };
  pricing: {
    base_price: number;
    currency: string;
  };
  details: {
    duration?: string;
    duration_value?: number;
    duration_unit?: string;
    frequency_type?: string;
    difficulty?: string;
    group_size?: number;
    bedrooms?: number;
    bathrooms?: number;
    max_guests?: number;
    amenities?: string[];
  };
  media: string[];
  whats_included: string[];
  what_to_bring: string[];
  tags: string[];
  host_id: string | null;
  itinerary_days?: ItineraryDay[];
}

interface Host {
  id: string;
  name: string;
  profile_picture: string;
  languages: string[];
}

export function CreateListingForm({ onComplete, onCancel, partnerId, hostSubmission }: CreateListingFormProps) {
  const { user } = useAuth();
  const toast = useToast();
  const userId = hostSubmission?.partnerId || partnerId || (user as PortalUser)?.id;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [listingData, setListingData] = useState<ListingData>({
    listing_type: null,
    title: '',
    description: '',
    location: { name: '', region: '' },
    pricing: { base_price: 0, currency: 'USD' },
    details: {},
    media: [],
    whats_included: [],
    what_to_bring: [],
    tags: [],
    host_id: null,
    itinerary_days: [],
  });

  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Separate from listingData.location.name (a free-text display field) so
  // the LocationPicker always echoes back the real address it geocoded,
  // not whatever unrelated text happens to be in the name field.
  const [pickedLocationLabel, setPickedLocationLabel] = useState('');

  useEffect(() => {
    if (userId) {
      if (!hostSubmission) {
        loadHosts();
      }
    }
  }, [userId]);

  async function loadHosts() {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('partner_hosts')
        .select('id, name, profile_picture, languages')
        .eq('partner_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error('Error loading hosts:', error);
      }
      if (data) setHosts(data);
    } catch (error) {
      console.error('Error loading hosts:', error);
    }
  }

  const totalSteps = listingData.listing_type ? 6 : 1;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const selectListingType = (type: 'experience' | 'homestay' | 'itinerary') => {
    setListingData({ ...listingData, listing_type: type });
    setStep(2);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const currentImageCount = listingData.media.length;
    const newImageCount = files.length;
    const totalCount = currentImageCount + newImageCount;

    if (totalCount > 5) {
      toast.showToast(`You can only upload up to 5 images. You have ${currentImageCount}, select ${5 - currentImageCount} or fewer.`, 'warning');
      return;
    }

    setUploadingImages(true);
    setUploadProgress(0);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = await compressImage(files[i]);
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase.storage
          .from('listings')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Error uploading image:', error);
          throw error;
        }

        const { data: publicUrlData } = supabase.storage
          .from('listings')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrlData.publicUrl);

        const progress = Math.round(((i + 1) / files.length) * 100);
        setUploadProgress(progress);
      }

      setListingData({ ...listingData, media: [...listingData.media, ...uploadedUrls] });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.showToast('Failed to upload images. Please try again.', 'error');
    } finally {
      setUploadingImages(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const removeMedia = (url: string) => {
    setListingData({ ...listingData, media: listingData.media.filter(m => m !== url) });
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!userId) return;

    setSubmitError(null);
    setLoading(true);
    try {
      const commonFields = {
        listing_type: listingData.listing_type,
        title: listingData.title,
        description: listingData.description,
        location: listingData.location,
        pricing: listingData.pricing,
        details: listingData.details,
        media: listingData.media,
        whats_included: listingData.whats_included,
        what_to_bring: listingData.what_to_bring,
        tags: listingData.tags,
        ...(listingData.listing_type === 'itinerary' && { itinerary_days: listingData.itinerary_days }),
      };

      const { error } = hostSubmission
        ? await supabase.from('listing_submissions').insert({
            ...commonFields,
            host_id: hostSubmission.hostId,
            partner_id: hostSubmission.partnerId,
          })
        : await supabase.from('partner_listings').insert({
            ...commonFields,
            partner_id: userId,
            host_id: listingData.host_id,
            status: 'active',
          });

      if (error) {
        console.error('Supabase error:', error);
        setSubmitError(error.message || 'Failed to create listing. Please try again.');
        setLoading(false);
        return;
      }

      if (hostSubmission) {
        await supabase.from('notifications').insert({
          recipient_portal_user_id: hostSubmission.partnerId,
          type: 'host_listing_submitted',
          title: 'New listing awaiting your approval',
          message: `${hostSubmission.hostName} submitted "${listingData.title}" for your review.`,
        });
      }

      onComplete();
    } catch (error: any) {
      console.error('Error creating listing:', error);
      setSubmitError(error?.message || 'Failed to create listing. Please try again.');
    }
    setLoading(false);
  };

  const isStep2Valid = listingData.title.trim() !== '' && listingData.description.trim() !== '';
  const isStep3Valid = listingData.location.name.trim() !== '' && listingData.location.region.trim() !== ''
    && listingData.location.coordinates != null;
  const isStep4Valid = listingData.pricing.base_price > 0 && listingData.media.length >= 3 && listingData.media.length <= 5;
  const isStep6Valid = hostSubmission ? true : (hosts.length === 0 || listingData.host_id !== null);

  return (
    <div className="flex flex-col h-full">
      {step > 1 && (
        <div className="px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-neutral-900">
              Create New {listingData.listing_type === 'experience' ? 'Experience' : listingData.listing_type === 'homestay' ? 'Homestay' : 'Itinerary'}
            </h3>
            <div className="text-xs text-neutral-500">Step {step} of {totalSteps}</div>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < step ? 'bg-neutral-900' : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-900 mb-4">Choose Listing Type</h4>
            <p className="text-xs text-neutral-600 mb-6">What type of listing would you like to create?</p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => selectListingType('experience')}
                className="p-6 border-2 border-neutral-200 rounded-lg hover:border-neutral-900 transition-all group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
                <h5 className="text-sm font-medium text-neutral-900 mb-1">Experience</h5>
                <p className="text-xs text-neutral-600">Tours, activities, and cultural experiences</p>
              </button>

              <button
                onClick={() => selectListingType('homestay')}
                className="p-6 border-2 border-neutral-200 rounded-lg hover:border-neutral-900 transition-all group"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition-colors">
                  <Home className="w-6 h-6 text-green-600" />
                </div>
                <h5 className="text-sm font-medium text-neutral-900 mb-1">Homestay</h5>
                <p className="text-xs text-neutral-600">Immersive multi-day cultural experiences in local homes</p>
              </button>

              <button
                onClick={() => selectListingType('itinerary')}
                className="p-6 border-2 border-neutral-200 rounded-lg hover:border-neutral-900 transition-all group col-span-2"
              >
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-200 transition-colors">
                  <Map className="w-6 h-6 text-amber-600" />
                </div>
                <h5 className="text-sm font-medium text-neutral-900 mb-1">Itinerary</h5>
                <p className="text-xs text-neutral-600">Multi-day curated journeys and travel packages</p>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-900 mb-4">Basic Information</h4>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={listingData.title}
                onChange={(e) => {
                  const words = e.target.value.trim().split(/\s+/);
                  if (e.target.value === '' || words.length <= 8) {
                    setListingData({ ...listingData, title: e.target.value });
                  }
                }}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                  listingData.title.trim().split(/\s+/).filter(Boolean).length === 8
                    ? 'border-amber-400'
                    : 'border-neutral-300'
                }`}
                placeholder={listingData.listing_type === 'experience' ? 'e.g., Sunrise with the Hills' : 'e.g., The Backyard Garden Life'}
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-neutral-400">Keep it short and descriptive</span>
                <span className={`text-[11px] font-medium ${
                  listingData.title.trim().split(/\s+/).filter(Boolean).length >= 7
                    ? 'text-amber-600'
                    : 'text-neutral-400'
                }`}>
                  {listingData.title.trim() === '' ? 0 : listingData.title.trim().split(/\s+/).length}/8 words
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={listingData.description}
                onChange={(e) => setListingData({ ...listingData, description: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="Describe what makes this listing special..."
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-900 mb-4">Location</h4>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Location Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={listingData.location.name}
                onChange={(e) => setListingData({
                  ...listingData,
                  location: { ...listingData.location, name: e.target.value }
                })}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="e.g., Volcanoes National Park"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Region <span className="text-red-500">*</span>
              </label>
              <select
                value={listingData.location.region}
                onChange={(e) => setListingData({
                  ...listingData,
                  location: { ...listingData.location, region: e.target.value }
                })}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="">Select region</option>
                <option value="Northern Province">Northern Province</option>
                <option value="Southern Province">Southern Province</option>
                <option value="Eastern Province">Eastern Province</option>
                <option value="Western Province">Western Province</option>
                <option value="Kigali">Kigali</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Exact location <span className="text-red-500">*</span>
              </label>
              <LocationPicker
                value={listingData.location.coordinates
                  ? { ...listingData.location.coordinates, label: pickedLocationLabel || 'Pinned location' }
                  : null}
                onChange={(loc) => {
                  setPickedLocationLabel(loc.label);
                  setListingData({
                    ...listingData,
                    location: { ...listingData.location, coordinates: { lat: loc.lat, lng: loc.lng }, name: listingData.location.name || loc.label },
                  });
                }}
                placeholder="Search for the starting point of this listing..."
              />
              <p className="text-[11px] text-neutral-400 mt-1">This is where travelers get picked up/dropped off if they add transport.</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-900 mb-4">Pricing & Details</h4>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Base Price <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={listingData.pricing.base_price || ''}
                  onChange={(e) => setListingData({
                    ...listingData,
                    pricing: { ...listingData.pricing, base_price: parseFloat(e.target.value) || 0 }
                  })}
                  className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="0"
                />
                <select
                  value={listingData.pricing.currency}
                  onChange={(e) => setListingData({
                    ...listingData,
                    pricing: { ...listingData.pricing, currency: e.target.value }
                  })}
                  className="px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="USD">USD</option>
                  <option value="RWF">RWF</option>
                </select>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {listingData.listing_type === 'homestay' ? 'Price per person for the full experience' : listingData.listing_type === 'itinerary' ? 'Price per person (total package)' : 'Price per person'}
              </p>
            </div>

            {listingData.listing_type === 'experience' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Duration</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={listingData.details.duration_value || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const unit = listingData.details.duration_unit || 'hours';
                        setListingData({
                          ...listingData,
                          details: {
                            ...listingData.details,
                            duration_value: val,
                            duration_unit: unit,
                            duration: `${val} ${unit}`,
                          }
                        });
                      }}
                      className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="e.g., 3"
                    />
                    <select
                      value={listingData.details.duration_unit || 'hours'}
                      onChange={(e) => {
                        const unit = e.target.value;
                        const val = listingData.details.duration_value || 0;
                        setListingData({
                          ...listingData,
                          details: {
                            ...listingData.details,
                            duration_unit: unit,
                            duration: val ? `${val} ${unit}` : '',
                          }
                        });
                      }}
                      className="px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Scheduling</label>
                  <select
                    value={listingData.details.frequency_type || 'once_daily'}
                    onChange={(e) => setListingData({
                      ...listingData,
                      details: { ...listingData.details, frequency_type: e.target.value }
                    })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="once_daily">Once daily</option>
                    <option value="twice_daily">Twice daily (Morning & Evening)</option>
                    <option value="three_daily">Three times daily (Morning, Midday & Evening)</option>
                  </select>
                  <p className="text-xs text-neutral-500 mt-1.5">
                    {listingData.details.frequency_type === 'three_daily'
                      ? 'Travelers will select from: Morning, Midday, or Evening session'
                      : listingData.details.frequency_type === 'twice_daily'
                        ? 'Travelers will select from: Morning or Evening session'
                        : 'Travelers will pick a date only (no session selection)'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Group Size</label>
                  <input
                    type="number"
                    min="1"
                    value={listingData.details.group_size || ''}
                    onChange={(e) => setListingData({
                      ...listingData,
                      details: { ...listingData.details, group_size: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="Max participants per session"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Difficulty</label>
                  <select
                    value={listingData.details.difficulty || ''}
                    onChange={(e) => setListingData({
                      ...listingData,
                      details: { ...listingData.details, difficulty: e.target.value }
                    })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="">Select difficulty</option>
                    <option value="Easy">Easy</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Challenging">Challenging</option>
                  </select>
                </div>
              </>
            )}

            {listingData.listing_type === 'homestay' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Experience Duration (Days)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="7"
                      step="1"
                      value={listingData.details.duration_value || 1}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value) || 1;
                        const val = Math.min(7, Math.max(1, raw));
                        setListingData({
                          ...listingData,
                          details: {
                            ...listingData.details,
                            duration_value: val,
                            duration_unit: 'days',
                            frequency_type: 'once_daily',
                            duration: `${val} days`,
                          }
                        });
                      }}
                      className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="1"
                    />
                    <div className="px-3 py-2 text-sm bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-600">
                      Day(s)
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">Total duration of this homestay experience (1–7 days). Guests pick a start date and these days will be blocked for the full experience.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">Bedrooms</label>
                    <input
                      type="number"
                      min="0"
                      value={listingData.details.bedrooms || ''}
                      onChange={(e) => setListingData({
                        ...listingData,
                        details: { ...listingData.details, bedrooms: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">Bathrooms</label>
                    <input
                      type="number"
                      min="0"
                      value={listingData.details.bathrooms || ''}
                      onChange={(e) => setListingData({
                        ...listingData,
                        details: { ...listingData.details, bathrooms: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Max Guests per Experience</label>
                  <input
                    type="number"
                    min="1"
                    value={listingData.details.max_guests || ''}
                    onChange={(e) => setListingData({
                      ...listingData,
                      details: { ...listingData.details, max_guests: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="e.g., 6"
                  />
                </div>
              </>
            )}

            {listingData.listing_type === 'itinerary' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Duration</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={listingData.details.duration_value || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setListingData({
                          ...listingData,
                          details: {
                            ...listingData.details,
                            duration_value: val,
                            duration_unit: 'days',
                            duration: `${val} days`,
                          }
                        });
                      }}
                      className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="e.g., 3"
                    />
                    <div className="px-3 py-2 text-sm bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-600">
                      Day(s)
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Group Size</label>
                  <input
                    type="number"
                    min="1"
                    value={listingData.details.group_size || ''}
                    onChange={(e) => setListingData({
                      ...listingData,
                      details: { ...listingData.details, group_size: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="Max participants"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Difficulty</label>
                  <select
                    value={listingData.details.difficulty || ''}
                    onChange={(e) => setListingData({
                      ...listingData,
                      details: { ...listingData.details, difficulty: e.target.value }
                    })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="">Select difficulty</option>
                    <option value="Easy">Easy</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Challenging">Challenging</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-neutral-700">Day-by-Day Itinerary</label>
                    <button
                      type="button"
                      onClick={() => {
                        const days = listingData.itinerary_days || [];
                        setListingData({
                          ...listingData,
                          itinerary_days: [...days, { day: days.length + 1, title: '', place_name: '', description: '' }],
                        });
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 px-2 py-1 border border-neutral-300 rounded-lg hover:border-neutral-500 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Day
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mb-3">Describe what happens each day of the journey.</p>
                  {(listingData.itinerary_days || []).length === 0 && (
                    <div className="p-4 bg-neutral-50 border border-dashed border-neutral-300 rounded-lg text-center">
                      <p className="text-xs text-neutral-500">No days added yet. Click "Add Day" to start building your itinerary.</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {(listingData.itinerary_days || []).map((dayEntry, idx) => (
                      <div key={idx} className="border border-neutral-200 rounded-lg p-3 bg-neutral-50 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Day {dayEntry.day}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (listingData.itinerary_days || [])
                                .filter((_, i) => i !== idx)
                                .map((d, i) => ({ ...d, day: i + 1 }));
                              setListingData({ ...listingData, itinerary_days: updated });
                            }}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={dayEntry.title}
                          onChange={(e) => {
                            const updated = [...(listingData.itinerary_days || [])];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setListingData({ ...listingData, itinerary_days: updated });
                          }}
                          placeholder="Day title (e.g., Arrival & Sunset Dinner)"
                          className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                        />
                        <input
                          type="text"
                          value={dayEntry.place_name}
                          onChange={(e) => {
                            const updated = [...(listingData.itinerary_days || [])];
                            updated[idx] = { ...updated[idx], place_name: e.target.value };
                            setListingData({ ...listingData, itinerary_days: updated });
                          }}
                          placeholder="Location / place name (e.g., Kigali)"
                          className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                        />
                        <textarea
                          value={dayEntry.description}
                          onChange={(e) => {
                            const updated = [...(listingData.itinerary_days || [])];
                            updated[idx] = { ...updated[idx], description: e.target.value };
                            setListingData({ ...listingData, itinerary_days: updated });
                          }}
                          rows={3}
                          placeholder="Describe what happens on this day..."
                          className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white resize-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Photos <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-neutral-500 mb-2">
                Upload 3-5 high-quality photos. You have {listingData.media.length} image(s) uploaded.
              </p>
              <div className="mb-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImages || listingData.media.length >= 5}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {uploadingImages && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-neutral-700 font-medium">Uploading images...</p>
                      <p className="text-xs text-neutral-700 font-medium">{uploadProgress}%</p>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-900 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {listingData.media.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {listingData.media.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="w-full h-20 object-cover rounded" />
                      <button
                        onClick={() => removeMedia(url)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {listingData.media.length < 3 && (
                <p className="text-xs text-amber-600 mt-2">
                  Please upload at least 3 images to continue.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-900 mb-4">{listingData.listing_type === 'homestay' ? 'Property Details & Inclusions' : listingData.listing_type === 'itinerary' ? 'Itinerary Tags & Inclusions' : 'Tags & Categories'}</h4>
            <p className="text-xs text-neutral-600 mb-4">{listingData.listing_type === 'homestay' ? 'Select property type and what\'s included in your homestay' : listingData.listing_type === 'itinerary' ? 'Select tags that best describe this itinerary package' : 'Select tags that best describe this experience'}</p>

            {listingData.listing_type === 'itinerary' && (
              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-medium text-neutral-700 mb-2">Journey Type</h5>
                  <div className="flex flex-wrap gap-2">
                    {['Cultural Heritage', 'Adventure', 'Wildlife & Nature', 'Scenic Landscapes', 'Historical Sites', 'Gorilla Trekking', 'Community Tourism', 'Eco-Tourism', 'Photography', 'Spiritual & Wellness'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (listingData.tags.includes(tag)) {
                            setListingData({ ...listingData, tags: listingData.tags.filter(t => t !== tag) });
                          } else {
                            setListingData({ ...listingData, tags: [...listingData.tags, tag] });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                          listingData.tags.includes(tag)
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-neutral-700 mb-2">Suitable For</h5>
                  <div className="flex flex-wrap gap-2">
                    {['Solo Travelers', 'Couples', 'Families', 'Groups', 'Seniors', 'Photographers', 'First-time Visitors', 'Budget Travelers', 'Luxury Seekers'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (listingData.tags.includes(tag)) {
                            setListingData({ ...listingData, tags: listingData.tags.filter(t => t !== tag) });
                          } else {
                            setListingData({ ...listingData, tags: [...listingData.tags, tag] });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                          listingData.tags.includes(tag)
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-neutral-700 mb-2">What's Included</h5>
                  <div className="flex flex-wrap gap-2">
                    {['Professional Guide', 'All Transportation', 'Meals', 'Accommodation', 'Park Entry Fees', 'Permits', 'Airport Transfers', 'Equipment', 'Travel Insurance', '24/7 Support', 'Photos & Videos'].map(item => (
                      <button
                        key={item}
                        onClick={() => {
                          if (listingData.whats_included.includes(item)) {
                            setListingData({ ...listingData, whats_included: listingData.whats_included.filter(i => i !== item) });
                          } else {
                            setListingData({ ...listingData, whats_included: [...listingData.whats_included, item] });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                          listingData.whats_included.includes(item)
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-neutral-700 mb-2">What to Bring</h5>
                  <div className="flex flex-wrap gap-2">
                    {['Comfortable Shoes', 'Rain Jacket', 'Sunscreen', 'Camera', 'Binoculars', 'Insect Repellent', 'Personal Medications', 'Water Bottle', 'Cash', 'ID/Passport', 'Light Daypack'].map(item => (
                      <button
                        key={item}
                        onClick={() => {
                          if (listingData.what_to_bring.includes(item)) {
                            setListingData({ ...listingData, what_to_bring: listingData.what_to_bring.filter(i => i !== item) });
                          } else {
                            setListingData({ ...listingData, what_to_bring: [...listingData.what_to_bring, item] });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                          listingData.what_to_bring.includes(item)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {listingData.listing_type === 'experience' ? (
              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-medium text-neutral-700 mb-2">Activity Type</h5>
                  <div className="flex flex-wrap gap-2">
                    {['Adventure', 'Cultural', 'Wildlife', 'Nature', 'Water Sports', 'Hiking', 'Trekking', 'City Tours', 'Food & Drink', 'Arts & Crafts'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (listingData.tags.includes(tag)) {
                            setListingData({ ...listingData, tags: listingData.tags.filter(t => t !== tag) });
                          } else {
                            setListingData({ ...listingData, tags: [...listingData.tags, tag] });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                          listingData.tags.includes(tag)
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-neutral-700 mb-2">Suitable For</h5>
                  <div className="flex flex-wrap gap-2">
                    {['Family-Friendly', 'Solo Travelers', 'Couples', 'Groups', 'Kids', 'Seniors', 'Photographers', 'History Buffs'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (listingData.tags.includes(tag)) {
                            setListingData({ ...listingData, tags: listingData.tags.filter(t => t !== tag) });
                          } else {
                            setListingData({ ...listingData, tags: [...listingData.tags, tag] });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                          listingData.tags.includes(tag)
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-neutral-700 mb-2">Special Features</h5>
                  <div className="flex flex-wrap gap-2">
                    {['Eco-Friendly', 'Authentic Local', 'Educational', 'Luxury', 'Budget-Friendly', 'Off the Beaten Path', 'Popular', 'Seasonal'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (listingData.tags.includes(tag)) {
                            setListingData({ ...listingData, tags: listingData.tags.filter(t => t !== tag) });
                          } else {
                            setListingData({ ...listingData, tags: [...listingData.tags, tag] });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                          listingData.tags.includes(tag)
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-neutral-700 mb-2">What's Included</h5>
                  <div className="flex flex-wrap gap-2">
                    {['Professional Guide', 'Equipment & Gear', 'Safety Equipment', 'Transportation', 'Meals', 'Snacks & Refreshments', 'Entry Fees', 'Insurance', 'Photos & Videos', 'Certificate', 'Souvenirs', 'Pickup & Drop-off'].map(item => (
                      <button
                        key={item}
                        onClick={() => {
                          if (listingData.whats_included.includes(item)) {
                            setListingData({ ...listingData, whats_included: listingData.whats_included.filter(i => i !== item) });
                          } else {
                            setListingData({ ...listingData, whats_included: [...listingData.whats_included, item] });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                          listingData.whats_included.includes(item)
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-neutral-700 mb-2">What to Bring</h5>
                  <div className="flex flex-wrap gap-2">
                    {['Comfortable Shoes', 'Sunscreen', 'Water Bottle', 'Hat', 'Sunglasses', 'Camera', 'Light Jacket', 'Personal Medications', 'Insect Repellent', 'Swimwear', 'Change of Clothes', 'Cash', 'ID/Passport'].map(item => (
                      <button
                        key={item}
                        onClick={() => {
                          if (listingData.what_to_bring.includes(item)) {
                            setListingData({ ...listingData, what_to_bring: listingData.what_to_bring.filter(i => i !== item) });
                          } else {
                            setListingData({ ...listingData, what_to_bring: [...listingData.what_to_bring, item] });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                          listingData.what_to_bring.includes(item)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-medium text-neutral-700 mb-2">Property Type</h5>
                  <div className="flex flex-wrap gap-2">
                    {['Rural Family Homestead', 'Urban Family Home', 'Artisan Household', 'Culinary Household', 'Farm Stay', 'Conservation Community Home', 'Lakeside Home', 'Modern Cultural Home', 'Heritage Compound', 'Women led Household', 'Multi-Generational Home'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (listingData.tags.includes(tag)) {
                            setListingData({ ...listingData, tags: listingData.tags.filter(t => t !== tag) });
                          } else {
                            setListingData({ ...listingData, tags: [...listingData.tags, tag] });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                          listingData.tags.includes(tag)
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-neutral-700 mb-2">Amenities & What's Included</h5>
                  <div className="flex flex-wrap gap-2">
                    {['Breakfast', 'Lunch', 'Dinner', 'Traditional Cooking Session', 'Tea / Coffee Ceremony', 'Storytelling Session', 'Cultural Activity Participation', 'Craft Workshop (e.g. weaving, art)', 'Farming or Garden Activity', 'Music & Dance Evening', 'Guided Village Walk', 'Private Room', 'Shared Room', 'Bedding & Towels', 'Pickup from Meeting Point'].map(item => (
                      <button
                        key={item}
                        onClick={() => {
                          if (listingData.whats_included.includes(item)) {
                            setListingData({ ...listingData, whats_included: listingData.whats_included.filter(i => i !== item) });
                          } else {
                            setListingData({ ...listingData, whats_included: [...listingData.whats_included, item] });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                          listingData.whats_included.includes(item)
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-neutral-700 mb-2">What to Bring</h5>
                  <div className="flex flex-wrap gap-2">
                    {['Toiletries', 'Towels (if not provided)', 'Personal Medications', 'Comfortable Clothing', 'Jacket or Sweater', 'Sun Protection', 'Camera', 'Reusable Water Bottle', 'Flashlight', 'Small Backpack', 'Cash for Purchases', 'Gifts for Host (optional)'].map(item => (
                      <button
                        key={item}
                        onClick={() => {
                          if (listingData.what_to_bring.includes(item)) {
                            setListingData({ ...listingData, what_to_bring: listingData.what_to_bring.filter(i => i !== item) });
                          } else {
                            setListingData({ ...listingData, what_to_bring: [...listingData.what_to_bring, item] });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                          listingData.what_to_bring.includes(item)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {listingData.tags.length > 0 && (
              <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
                <p className="text-xs text-neutral-600 mb-2">Selected tags ({listingData.tags.length}):</p>
                <div className="flex flex-wrap gap-1.5">
                  {listingData.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-neutral-900 text-white rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 6 && hostSubmission && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-900 mb-1">Review &amp; Submit</h4>
            <p className="text-xs text-neutral-600 mb-4">
              Your partner will review this before it goes live. You'll see its status on your Listings page.
            </p>
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              {listingData.media[0] && (
                <img src={listingData.media[0]} alt="" className="w-full h-40 object-cover" />
              )}
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between"><span className="text-neutral-500">Type</span><span className="text-neutral-900 capitalize font-medium">{listingData.listing_type}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Title</span><span className="text-neutral-900 font-medium">{listingData.title}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Location</span><span className="text-neutral-900">{listingData.location.name}, {listingData.location.region}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Price</span><span className="text-neutral-900">${listingData.pricing.base_price} {listingData.pricing.currency}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Photos</span><span className="text-neutral-900">{listingData.media.length}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Tags</span><span className="text-neutral-900">{listingData.tags.length}</span></div>
              </div>
            </div>
          </div>
        )}

        {step === 6 && !hostSubmission && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-900 mb-4">Assign Host</h4>
            <p className="text-xs text-neutral-600 mb-4">Select a host for this listing</p>

            {hosts.length === 0 ? (
              <div className="p-6 bg-neutral-50 rounded-lg text-center">
                <p className="text-sm text-neutral-600 mb-3">No hosts available</p>
                <p className="text-xs text-neutral-500">Create a host first before assigning to this listing</p>
              </div>
            ) : (
              <div className="space-y-2">
                {hosts.map((host) => (
                  <button
                    key={host.id}
                    onClick={() => setListingData({ ...listingData, host_id: host.id })}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      listingData.host_id === host.id
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {host.profile_picture ? (
                        <img src={host.profile_picture} alt={host.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-neutral-600">{host.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-neutral-900">{host.name}</div>
                        {host.languages.length > 0 && (
                          <div className="text-xs text-neutral-500">Speaks: {host.languages.join(', ')}</div>
                        )}
                      </div>
                      {listingData.host_id === host.id && (
                        <Check className="w-5 h-5 text-neutral-900" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between bg-white">
        <Button variant="secondary" onClick={step === 1 ? onCancel : handleBack}>
          {step === 1 ? 'Cancel' : (
            <>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </>
          )}
        </Button>

        {step > 1 && step < totalSteps && (
          <Button
            onClick={handleNext}
            disabled={
              (step === 2 && !isStep2Valid) ||
              (step === 3 && !isStep3Valid) ||
              (step === 4 && !isStep4Valid)
            }
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}

        {step === totalSteps && (
          <div className="flex flex-col items-end gap-2">
            {submitError && (
              <p className="text-xs text-red-600 max-w-xs text-right">{submitError}</p>
            )}
            <Button onClick={handleSubmit} disabled={loading || !isStep6Valid}>
              {loading ? (hostSubmission ? 'Submitting...' : 'Creating...') : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  {hostSubmission ? 'Submit for Review' : 'Create Listing'}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
