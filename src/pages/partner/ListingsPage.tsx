import { useState, useEffect, useRef } from 'react';
import { Plus, MapPin, Camera, X, Star, Upload, AlertTriangle, TrendingUp, Image } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { SideDrawer } from '../../components/SideDrawer';
import { CreateListingForm } from '../../components/CreateListingForm';
import { LocationPicker } from '../../components/LocationPicker';
import { ShareButton } from '../../components/ShareButton';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

type ListingTab = 'experiences' | 'homestays' | 'itineraries';

interface Listing {
  id: string;
  partner_id: string;
  host_id: string | null;
  guide_id: string | null;
  listing_type: 'experience' | 'homestay' | 'itinerary';
  title: string;
  description: string;
  status: 'active' | 'paused' | 'draft';
  location: { name: string; region: string; coordinates?: { lat: number; lng: number } };
  pricing: { base_price: number; currency: string };
  media: string[];
  details: any;
  whats_included?: string[];
  what_to_bring?: string[];
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface BookingPerf {
  item_id: string;
  total_amount: number;
  status: string;
}

function calcQualityScore(listing: Listing): number {
  let score = 0;
  const mediaCount = listing.media?.length || 0;
  if (mediaCount >= 5) score += 30;
  else if (mediaCount >= 3) score += 18;
  else if (mediaCount >= 1) score += 8;
  const words = (listing.description || '').split(/\s+/).filter(Boolean).length;
  if (words >= 80) score += 25;
  else if (words >= 40) score += 14;
  else if (words >= 15) score += 6;
  const included = listing.whats_included?.length || 0;
  if (included >= 3) score += 20;
  else if (included >= 1) score += 10;
  const tagCount = listing.tags?.length || 0;
  if (tagCount >= 3) score += 15;
  else if (tagCount >= 1) score += 7;
  if (listing.host_id) score += 10;
  return Math.min(score, 100);
}

function QualityBar({ score }: { score: number }) {
  const color = score >= 75 ? '#0d9488' : score >= 50 ? '#C4883A' : '#ef4444';
  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Fair' : 'Weak';
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-neutral-500">Listing Quality</span>
        <span className="text-xs font-semibold" style={{ color }}>{score}% — {label}</span>
      </div>
      <div className="w-full bg-neutral-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

export function ListingsPage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const [activeTab, setActiveTab] = useState<ListingTab>('experiences');
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookingPerf, setBookingPerf] = useState<BookingPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (userId) loadAll();
  }, [userId]);

  async function loadAll() {
    if (!userId) return;
    setLoading(true);
    try {
      const [listingsRes, bookingsRes] = await Promise.all([
        supabase.from('partner_listings').select('*').eq('partner_id', userId).order('created_at', { ascending: false }),
        supabase.from('bookings').select('item_id,total_amount,status').eq('partner_id', userId),
      ]);
      if (listingsRes.data) setListings(listingsRes.data);
      if (bookingsRes.data) setBookingPerf(bookingsRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function getListingStats(id: string) {
    const relevant = bookingPerf.filter(b => b.item_id === id && (b.status === 'confirmed' || b.status === 'completed'));
    const revenue = relevant.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    return { bookings: relevant.length, revenue };
  }

  const handleCreateComplete = () => {
    setShowCreateForm(false);
    loadAll();
  };

  const experiences = listings.filter(l => l.listing_type === 'experience');
  const homestays = listings.filter(l => l.listing_type === 'homestay');
  const itineraries = listings.filter(l => l.listing_type === 'itinerary');
  const displayedListings = activeTab === 'experiences' ? experiences : activeTab === 'homestays' ? homestays : itineraries;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Listings</h1>
        <Button size="sm" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Listing
        </Button>
      </div>

      <div className="flex gap-6 border-b border-neutral-200 mb-6">
        {([
          { id: 'experiences', label: 'Experiences', count: experiences.length },
          { id: 'homestays', label: 'Homestays', count: homestays.length },
          { id: 'itineraries', label: 'Itineraries', count: itineraries.length },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {displayedListings.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-neutral-400" />
            </div>
            <h3 className="text-sm font-medium text-neutral-900 mb-2">No {activeTab} yet</h3>
            <p className="text-xs text-neutral-500 mb-4">Create your first listing to start receiving bookings</p>
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Listing
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayedListings.map(listing => {
            const score = calcQualityScore(listing);
            const { bookings: bCount, revenue: bRevenue } = getListingStats(listing.id);
            const lowPhotos = (listing.media?.length || 0) < 3;
            const coverImage = listing.media?.[0];
            return (
              <div
                key={listing.id}
                className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-warm-sm hover:shadow-warm transition-all duration-300 cursor-pointer group"
                onClick={() => setSelectedListing(listing)}
              >
                {/* Thumbnail */}
                <div className="relative h-40 bg-neutral-100 overflow-hidden">
                  {coverImage ? (
                    <img src={coverImage} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-neutral-300" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <StatusBadgeSmall status={listing.status} />
                    <span className="px-2 py-0.5 text-xs font-medium bg-black/40 text-white rounded-full backdrop-blur-sm capitalize">
                      {listing.listing_type}
                    </span>
                  </div>
                  {(listing.media?.length || 0) > 1 && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-black/40 text-white text-xs rounded-full backdrop-blur-sm">
                      <Image className="w-3 h-3" />
                      {listing.media?.length}
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3">
                    <ShareButton title={listing.title} path={`/${listing.listing_type}/${listing.id}`} variant="chip" />
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-1 truncate">{listing.title}</h3>
                  <div className="flex items-center gap-1 text-xs text-neutral-400 mb-3">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{listing.location?.name}, {listing.location?.region}</span>
                  </div>

                  {/* Performance row */}
                  <div className="flex items-center gap-3 mb-3 py-2 border-t border-b border-neutral-50">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
                      <span className="text-xs font-semibold text-neutral-800">{bCount}</span>
                      <span className="text-xs text-neutral-400">booking{bCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-px h-3 bg-neutral-200" />
                    <div className="text-xs">
                      <span className="font-semibold text-neutral-800">${bRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                      <span className="text-neutral-400 ml-1">earned</span>
                    </div>
                    <div className="w-px h-3 bg-neutral-200" />
                    <div className="text-xs font-semibold text-neutral-800">
                      ${listing.pricing?.base_price ?? 0} <span className="text-neutral-400 font-normal">{listing.pricing?.currency || 'USD'}</span>
                    </div>
                  </div>

                  {/* Quality score */}
                  <QualityBar score={score} />

                  {/* Photo warning */}
                  {lowPhotos && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span>Add {3 - (listing.media?.length || 0)} more photo{3 - (listing.media?.length || 0) !== 1 ? 's' : ''} to boost discovery</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SideDrawer isOpen={showCreateForm} onClose={() => setShowCreateForm(false)} title="Create New Listing">
        <CreateListingForm onComplete={handleCreateComplete} onCancel={() => setShowCreateForm(false)} />
      </SideDrawer>

      <SideDrawer isOpen={selectedListing !== null} onClose={() => setSelectedListing(null)} title="">
        {selectedListing && (
          <ListingDetailView
            listing={selectedListing}
            onUpdate={() => { setSelectedListing(null); loadAll(); }}
            onDelete={() => { setSelectedListing(null); loadAll(); }}
          />
        )}
      </SideDrawer>
    </div>
  );
}

function StatusBadgeSmall({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/90 text-white',
    paused: 'bg-amber-500/90 text-white',
    draft: 'bg-neutral-500/70 text-white',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full backdrop-blur-sm capitalize ${styles[status] || 'bg-neutral-400/70 text-white'}`}>
      {status}
    </span>
  );
}

function ListingDetailView({ listing, onUpdate, onDelete }: { listing: Listing; onUpdate: () => void; onDelete: () => void }) {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: listing.title,
    description: listing.description,
    status: listing.status,
    base_price: listing.pricing.base_price,
    currency: listing.pricing.currency,
    location_name: listing.location?.name || '',
    location_region: listing.location?.region || '',
    location_coordinates: listing.location?.coordinates || null,
    whats_included: listing.whats_included || [],
    what_to_bring: listing.what_to_bring || [],
    tags: listing.tags || [],
    details: listing.details || {},
    media: listing.media || [],
    guide_id: listing.guide_id,
  });
  const [guides, setGuides] = useState<{ id: string; name: string; operating_region: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newIncludedItem, setNewIncludedItem] = useState('');
  const [newBringItem, setNewBringItem] = useState('');
  const [newTag, setNewTag] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (listing.listing_type === 'experience' || listing.listing_type === 'itinerary') {
      supabase.from('guides').select('id, name, operating_region').eq('available', true)
        .then(({ data }) => setGuides(data || []));
    }
  }, [listing.listing_type]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const currentCount = editData.media.length;
    if (currentCount + files.length > 5) {
      alert(`You can only have up to 5 images. You currently have ${currentCount}. Please select ${5 - currentCount} or fewer.`);
      return;
    }
    setUploadingImages(true);
    setUploadProgress(0);
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const fileName = `${userId || 'listing'}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error } = await supabase.storage.from('listings').upload(fileName, file, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(fileName);
        uploaded.push(publicUrl);
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setEditData(prev => ({ ...prev, media: [...prev.media, ...uploaded] }));
    } catch (err: any) {
      alert('Failed to upload images: ' + err.message);
    } finally {
      setUploadingImages(false);
      setUploadProgress(0);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setEditData(prev => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }));
  };

  const setCoverImage = (index: number) => {
    if (index === 0) return;
    setEditData(prev => {
      const newMedia = [...prev.media];
      const [chosen] = newMedia.splice(index, 1);
      newMedia.unshift(chosen);
      return { ...prev, media: newMedia };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('partner_listings').update({
        title: editData.title,
        description: editData.description,
        status: editData.status,
        location: { name: editData.location_name, region: editData.location_region, coordinates: editData.location_coordinates || undefined },
        pricing: { base_price: editData.base_price, currency: editData.currency },
        whats_included: editData.whats_included,
        what_to_bring: editData.what_to_bring,
        tags: editData.tags,
        details: editData.details,
        media: editData.media,
        guide_id: editData.guide_id,
        updated_at: new Date().toISOString(),
      }).eq('id', listing.id);
      if (error) throw error;
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      alert(`Failed to update listing: ${error?.message || 'Unknown error'}`);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('partner_listings').delete().eq('id', listing.id);
      if (error) throw error;
      onDelete();
    } catch (error: any) {
      alert(`Failed to delete listing: ${error?.message || 'Unknown error'}`);
    }
    setDeleting(false);
  };

  const displayMedia = isEditing ? editData.media : listing.media;
  const coverImage = displayMedia[0];

  return (
    <div className="flex flex-col h-full">
      <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {coverImage ? (
            <div className="relative h-56 bg-neutral-100 overflow-hidden">
              <img src={coverImage} alt={listing.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-medium bg-white/20 backdrop-blur-sm text-white rounded-full border border-white/30">
                    {listing.listing_type === 'experience' ? 'Experience' : listing.listing_type === 'homestay' ? 'Homestay' : 'Itinerary'}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/90 text-white rounded-full">Cover</span>
                </div>
                <h2 className="text-xl font-semibold text-white leading-tight">
                  {isEditing ? editData.title : listing.title}
                </h2>
                <div className="flex items-center gap-1.5 mt-1 text-white/80 text-xs">
                  <MapPin className="w-3 h-3" />
                  {listing.location.name}, {listing.location.region}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-40 bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">No photos yet</p>
              </div>
            </div>
          )}

          {displayMedia.length > 1 && (
            <div className="flex gap-1.5 px-4 py-3 bg-white border-b border-neutral-100 overflow-x-auto">
              {displayMedia.slice(1).map((url, i) => (
                <div key={i} className="relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden group">
                  <img src={url} className="w-full h-full object-cover" />
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button onClick={() => setCoverImage(i + 1)} className="p-1 bg-white/90 rounded text-xs">
                        <Star className="w-3 h-3 text-amber-500" />
                      </button>
                      <button onClick={() => removeImage(i + 1)} className="p-1 bg-white/90 rounded text-xs">
                        <X className="w-3 h-3 text-rose-500" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {isEditing && displayMedia.length < 5 && (
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex-shrink-0 w-16 h-12 rounded-lg border-2 border-dashed border-neutral-300 flex items-center justify-center hover:border-neutral-400 transition-colors"
                >
                  <Plus className="w-4 h-4 text-neutral-400" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">
          {!isEditing ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs border rounded-full capitalize ${listing.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : listing.status === 'paused' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>
                      {listing.status}
                    </span>
                    <span className="text-xs text-neutral-400 capitalize">{listing.listing_type}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900">{listing.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-neutral-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {listing.location.name}, {listing.location.region}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-neutral-900">${listing.pricing.base_price}</div>
                  <div className="text-xs text-neutral-400">{listing.pricing.currency} per person</div>
                </div>
              </div>

              {listing.description && (
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Description</h4>
                  <p className="text-sm text-neutral-700 leading-relaxed">{listing.description}</p>
                </div>
              )}

              {listing.whats_included && listing.whats_included.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">What's Included</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {listing.whats_included.map((item, i) => (
                      <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-100">{item}</span>
                    ))}
                  </div>
                </div>
              )}

              {listing.what_to_bring && listing.what_to_bring.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">What to Bring</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {listing.what_to_bring.map((item, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">{item}</span>
                    ))}
                  </div>
                </div>
              )}

              {listing.tags && listing.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {listing.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-lg">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={e => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Status</label>
                <select
                  value={editData.status}
                  onChange={e => setEditData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Base Price</label>
                  <input
                    type="number"
                    value={editData.base_price}
                    onChange={e => setEditData(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Currency</label>
                  <input
                    type="text"
                    value={editData.currency}
                    onChange={e => setEditData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Location Name</label>
                  <input
                    type="text"
                    value={editData.location_name}
                    onChange={e => setEditData(prev => ({ ...prev, location_name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Region</label>
                  <input
                    type="text"
                    value={editData.location_region}
                    onChange={e => setEditData(prev => ({ ...prev, location_region: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Exact location {editData.location_coordinates == null && <span className="text-amber-600">(not set — transport pickup and the Explore Map pin won't be exact until this is)</span>}
                </label>
                <LocationPicker
                  value={editData.location_coordinates
                    ? { ...editData.location_coordinates, label: editData.location_name }
                    : null}
                  onChange={(loc) => setEditData(prev => ({ ...prev, location_coordinates: { lat: loc.lat, lng: loc.lng } }))}
                  placeholder="Search for the starting point of this listing..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Description</label>
                <textarea
                  value={editData.description}
                  onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none"
                />
              </div>

              {/* Photos management */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-2">Photos ({editData.media.length}/5)</label>
                <div className="grid grid-cols-3 gap-2">
                  {editData.media.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img src={url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {i > 0 && (
                          <button onClick={() => setCoverImage(i)} className="p-1.5 bg-white/90 rounded-full">
                            <Star className="w-3 h-3 text-amber-500" />
                          </button>
                        )}
                        {i === 0 && <span className="text-white text-xs font-medium">Cover</span>}
                        <button onClick={() => removeImage(i)} className="p-1.5 bg-white/90 rounded-full">
                          <X className="w-3 h-3 text-rose-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {editData.media.length < 5 && (
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImages}
                      className="aspect-square rounded-lg border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-1 hover:border-neutral-300 transition-colors"
                    >
                      {uploadingImages ? (
                        <span className="text-xs text-neutral-500">{uploadProgress}%</span>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-neutral-300" />
                          <span className="text-xs text-neutral-400">Add</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* What's Included */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-2">What's Included</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newIncludedItem}
                    onChange={e => setNewIncludedItem(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newIncludedItem.trim()) { setEditData(prev => ({ ...prev, whats_included: [...prev.whats_included, newIncludedItem.trim()] })); setNewIncludedItem(''); }}}
                    placeholder="Add item..."
                    className="flex-1 px-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-200"
                  />
                  <button onClick={() => { if (newIncludedItem.trim()) { setEditData(prev => ({ ...prev, whats_included: [...prev.whats_included, newIncludedItem.trim()] })); setNewIncludedItem(''); }}} className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-lg">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {editData.whats_included.map((item, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-100">
                      {item}
                      <button onClick={() => setEditData(prev => ({ ...prev, whats_included: prev.whats_included.filter((_, j) => j !== i) }))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-2">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newTag.trim()) { setEditData(prev => ({ ...prev, tags: [...(prev.tags || []), newTag.trim()] })); setNewTag(''); }}}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-200"
                  />
                  <button onClick={() => { if (newTag.trim()) { setEditData(prev => ({ ...prev, tags: [...(prev.tags || []), newTag.trim()] })); setNewTag(''); }}} className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-lg">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(editData.tags || []).map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-lg">
                      #{tag}
                      <button onClick={() => setEditData(prev => ({ ...prev, tags: (prev.tags || []).filter((_, j) => j !== i) }))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Guide assignment */}
              {(listing.listing_type === 'experience' || listing.listing_type === 'itinerary') && (
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-2">Assigned Guide</label>
                  <select
                    value={editData.guide_id || ''}
                    onChange={e => setEditData(prev => ({ ...prev, guide_id: e.target.value || null }))}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-300 bg-white"
                  >
                    <option value="">No guide assigned</option>
                    {guides.map(g => (
                      <option key={g.id} value={g.id}>{g.name}{g.operating_region ? ` — ${g.operating_region}` : ''}</option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-400 mt-1">From the shared Operations guide pool.</p>
                </div>
              )}

              {/* What to bring */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-2">What to Bring</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newBringItem}
                    onChange={e => setNewBringItem(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newBringItem.trim()) { setEditData(prev => ({ ...prev, what_to_bring: [...prev.what_to_bring, newBringItem.trim()] })); setNewBringItem(''); }}}
                    placeholder="Add item..."
                    className="flex-1 px-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-200"
                  />
                  <button onClick={() => { if (newBringItem.trim()) { setEditData(prev => ({ ...prev, what_to_bring: [...prev.what_to_bring, newBringItem.trim()] })); setNewBringItem(''); }}} className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-lg">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {editData.what_to_bring.map((item, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                      {item}
                      <button onClick={() => setEditData(prev => ({ ...prev, what_to_bring: prev.what_to_bring.filter((_, j) => j !== i) }))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-neutral-100 p-4 flex gap-3">
        {isEditing ? (
          <>
            <button onClick={() => setIsEditing(false)} className="flex-1 px-4 py-2.5 border border-neutral-200 text-sm font-medium text-neutral-700 rounded-xl hover:bg-neutral-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        ) : (
          <>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2.5 border border-rose-200 text-rose-600 text-sm font-medium rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <button onClick={() => setIsEditing(true)} className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors">
              Edit Listing
            </button>
          </>
        )}
      </div>
    </div>
  );
}
