import { useState, useEffect } from 'react';
import { X, ChevronRight, Check, FileText, List, Backpack, Image as ImageIcon, Users, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Guide {
  id: string;
  name: string;
  specializations: string[];
  languages: string[];
  available: boolean;
}

interface CreateProgramFormProps {
  onClose: () => void;
  onSuccess: () => void;
  portalUserId: string;
}

const STEPS = [
  { id: 1, label: 'Details', icon: FileText },
  { id: 2, label: 'Included', icon: List },
  { id: 3, label: 'To Bring', icon: Backpack },
  { id: 4, label: 'Images', icon: ImageIcon },
  { id: 5, label: 'Guides', icon: Users },
];

const INCLUDED_OPTIONS = [
  'Entry fee / Admission ticket',
  'Professional guide',
  'Transportation (to and from)',
  'Transportation within attraction',
  'Lunch',
  'Breakfast',
  'Dinner',
  'Snacks and refreshments',
  'Drinking water',
  'Photography opportunities',
  'Souvenir gift',
  'Safety equipment',
  'Insurance coverage',
];

const TO_BRING_OPTIONS = [
  'Comfortable walking shoes',
  'Sun protection (hat, sunglasses)',
  'Sunscreen',
  'Water bottle',
  'Camera',
  'Light jacket or sweater',
  'Rain gear / Umbrella',
  'Personal medication',
  'Valid ID / Passport',
  'Cash for personal expenses',
  'Backpack or day bag',
  'Insect repellent',
];

export function CreateProgramForm({ onClose, onSuccess, portalUserId }: CreateProgramFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_hours: 1,
    max_participants: 10,
    price_per_person: 0,
    what_included: [] as string[],
    what_to_bring: [] as string[],
    images: [] as string[],
    selected_guides: [] as string[],
  });

  useEffect(() => {
    loadGuides();
  }, []);

  async function loadGuides() {
    setLoadingGuides(true);
    const { data } = await supabase
      .from('guides')
      .select('id, name, specializations, languages, available')
      .eq('portal_user_id', portalUserId)
      .order('name');
    setGuides(data || []);
    setLoadingGuides(false);
  }

  function handleNext() {
    if (step === 1 && !formData.title.trim()) { setError('Please enter the program title'); return; }
    if (step === 2 && formData.what_included.length === 0) { setError('Please select at least one included item'); return; }
    if (step === 3 && formData.what_to_bring.length === 0) { setError('Please select at least one item to bring'); return; }
    setError(null);
    setStep(s => s + 1);
  }

  function handleBack() {
    setError(null);
    setStep(s => s - 1);
  }

  function toggleGuide(id: string) {
    setFormData(prev => ({
      ...prev,
      selected_guides: prev.selected_guides.includes(id)
        ? prev.selected_guides.filter(g => g !== id)
        : [...prev.selected_guides, id],
    }));
  }

  function toggleIncluded(item: string) {
    setFormData(prev => ({
      ...prev,
      what_included: prev.what_included.includes(item)
        ? prev.what_included.filter(i => i !== item)
        : [...prev.what_included, item],
    }));
  }

  function toggleToBring(item: string) {
    setFormData(prev => ({
      ...prev,
      what_to_bring: prev.what_to_bring.includes(item)
        ? prev.what_to_bring.filter(i => i !== item)
        : [...prev.what_to_bring, item],
    }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formData.images.length + files.length > 3) {
      setError('You can upload up to 3 images only');
      return;
    }

    setError(null);
    setUploadingImages(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Each image must be less than 5MB');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `programs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('programs')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('programs')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  }

  function removeImage(index: number) {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const { data: programData, error: insertError } = await supabase
        .from('programs')
        .insert({
          portal_user_id: portalUserId,
          title: formData.title,
          description: formData.description,
          duration_hours: formData.duration_hours,
          max_participants: formData.max_participants,
          price_per_person: formData.price_per_person,
          what_included: formData.what_included,
          what_to_bring: formData.what_to_bring,
          images: formData.images,
          active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (formData.selected_guides.length > 0) {
        await supabase.from('program_guides').insert(
          formData.selected_guides.map(guide_id => ({ program_id: programData.id, guide_id }))
        );
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-4xl bg-white h-full flex flex-col shadow-2xl overflow-hidden" style={{ width: '66.666667%' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Add Program</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Step {step} of {STEPS.length}</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex px-6 pt-4 gap-1">
          {STEPS.map(s => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'
                }`}>
                  {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-xs ${active ? 'text-neutral-900 font-medium' : 'text-neutral-400'}`}>{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="h-0.5 mx-6 mt-3 bg-neutral-100 rounded-full">
          <div
            className="h-full bg-neutral-900 rounded-full transition-all duration-300"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Program Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  placeholder="e.g., Historical City Walking Tour"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 resize-none"
                  placeholder="Describe what participants will experience..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Duration (hours) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={formData.duration_hours}
                    onChange={e => setFormData(f => ({ ...f, duration_hours: parseFloat(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Max Participants <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_participants}
                    onChange={e => setFormData(f => ({ ...f, max_participants: parseInt(e.target.value) || 10 }))}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Pricing</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, price_per_person: 0 }))}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                      formData.price_per_person === 0
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, price_per_person: f.price_per_person > 0 ? f.price_per_person : 10 }))}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                      formData.price_per_person > 0
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                    }`}
                  >
                    Paid
                  </button>
                </div>
                {formData.price_per_person > 0 && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.price_per_person}
                      onChange={e => setFormData(f => ({ ...f, price_per_person: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">per person</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-neutral-900">What's Included <span className="text-rose-500">*</span></h3>
                <p className="text-xs text-neutral-500 mt-0.5">Select all items included in your program</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {INCLUDED_OPTIONS.map(option => {
                  const isSelected = formData.what_included.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleIncluded(option)}
                      className={`px-4 py-3 border-2 rounded-lg text-left text-sm transition-all ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                          isSelected ? 'border-white bg-white' : 'border-neutral-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-neutral-900" />}
                        </div>
                        <span className="flex-1">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {formData.what_included.length > 0 && (
                <div className="mt-5 p-4 bg-neutral-50 rounded-lg">
                  <div className="text-xs font-medium text-neutral-700 mb-2">Selected ({formData.what_included.length}):</div>
                  <div className="flex flex-wrap gap-2">
                    {formData.what_included.map(item => (
                      <span key={item} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-neutral-900 text-white rounded-full">
                        {item}
                        <button
                          type="button"
                          onClick={() => toggleIncluded(item)}
                          className="hover:text-rose-300 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-neutral-900">What to Bring <span className="text-rose-500">*</span></h3>
                <p className="text-xs text-neutral-500 mt-0.5">Select items participants should bring along</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TO_BRING_OPTIONS.map(option => {
                  const isSelected = formData.what_to_bring.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleToBring(option)}
                      className={`px-4 py-3 border-2 rounded-lg text-left text-sm transition-all ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                          isSelected ? 'border-white bg-white' : 'border-neutral-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-neutral-900" />}
                        </div>
                        <span className="flex-1">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {formData.what_to_bring.length > 0 && (
                <div className="mt-5 p-4 bg-neutral-50 rounded-lg">
                  <div className="text-xs font-medium text-neutral-700 mb-2">Selected ({formData.what_to_bring.length}):</div>
                  <div className="flex flex-wrap gap-2">
                    {formData.what_to_bring.map(item => (
                      <span key={item} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-neutral-900 text-white rounded-full">
                        {item}
                        <button
                          type="button"
                          onClick={() => toggleToBring(item)}
                          className="hover:text-rose-300 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-neutral-900">Program Images</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Upload up to 3 images to showcase your program</p>
              </div>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-5">
                  {formData.images.map((img, i) => (
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden border-2 border-neutral-200 group">
                      <img src={img} alt={`Program image ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                        <span className="text-xs text-white font-medium">Image {i + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {formData.images.length < 3 && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="program-image-upload"
                    disabled={uploadingImages}
                  />
                  <label
                    htmlFor="program-image-upload"
                    className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      uploadingImages
                        ? 'border-neutral-300 bg-neutral-50 cursor-not-allowed'
                        : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'
                    }`}
                  >
                    {uploadingImages ? (
                      <>
                        <div className="w-10 h-10 border-3 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mb-3" />
                        <span className="text-sm text-neutral-600 font-medium">Uploading images...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                          <Upload className="w-6 h-6 text-neutral-600" />
                        </div>
                        <span className="text-sm font-medium text-neutral-900 mb-1">Upload Images</span>
                        <span className="text-xs text-neutral-500 mb-2">Click to browse or drag and drop</span>
                        <span className="text-xs text-neutral-400">
                          JPG, PNG or GIF • Max 5MB each • {3 - formData.images.length} {formData.images.length === 2 ? 'image' : 'images'} remaining
                        </span>
                      </>
                    )}
                  </label>
                </div>
              )}

              {formData.images.length === 3 && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-emerald-800 font-medium">Maximum images uploaded</span>
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">You've uploaded the maximum of 3 images</p>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-neutral-900">Assign Guides</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Select one or more guides for this program (optional)</p>
              </div>

              {loadingGuides ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-3 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
                </div>
              ) : guides.length === 0 ? (
                <div className="p-6 bg-neutral-50 rounded-xl text-center">
                  <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <div className="text-sm text-neutral-600">No guides yet</div>
                  <div className="text-xs text-neutral-400 mt-1">You can assign guides later after adding them.</div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {guides.map(guide => {
                    const selected = formData.selected_guides.includes(guide.id);
                    return (
                      <button
                        key={guide.id}
                        type="button"
                        onClick={() => toggleGuide(guide.id)}
                        className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                          selected ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-medium text-neutral-900">{guide.name}</div>
                            <div className="text-xs text-neutral-500 mt-0.5">{guide.specializations.slice(0, 3).join(' · ')}</div>
                            <div className="text-xs text-neutral-400 mt-0.5">{guide.languages.join(', ')}</div>
                          </div>
                          {selected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 border border-neutral-100 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                  <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Program Summary</h3>
                </div>
                <div className="p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Title</span>
                    <span className="text-neutral-900 font-medium">{formData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Duration</span>
                    <span className="text-neutral-900">{formData.duration_hours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Max participants</span>
                    <span className="text-neutral-900">{formData.max_participants}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Price</span>
                    <span className={`font-medium ${formData.price_per_person === 0 ? 'text-emerald-600' : 'text-neutral-900'}`}>
                      {formData.price_per_person === 0 ? 'Free' : `$${formData.price_per_person}/person`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Included items</span>
                    <span className="text-neutral-900">{formData.what_included.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Items to bring</span>
                    <span className="text-neutral-900">{formData.what_to_bring.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Images</span>
                    <span className="text-neutral-900">{formData.images.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Guides assigned</span>
                    <span className="text-neutral-900">{formData.selected_guides.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-sm font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Program'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
