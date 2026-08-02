import { useState, useRef } from 'react';
import { X, ChevronRight, Check, User, Award, Languages, Briefcase, Upload, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CreateGuideFormProps {
  onClose: () => void;
  onSuccess: () => void;
  portalUserId: string;
}

const SPECIALIZATION_OPTIONS = [
  'History', 'Culture', 'Nature & Wildlife', 'Adventure',
  'Food & Cuisine', 'Architecture', 'Art & Museums', 'Religious Sites',
  'Local Traditions', 'Photography', 'Hiking & Trekking', 'Urban Exploration',
];

const LANGUAGE_OPTIONS = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian',
  'Dutch', 'Swedish', 'Norwegian', 'Swahili', 'Kinyarwanda',
];

const STEPS = [
  { id: 1, label: 'Basic Info', icon: User },
  { id: 2, label: 'Specializations', icon: Award },
  { id: 3, label: 'Languages', icon: Languages },
  { id: 4, label: 'Experience', icon: Briefcase },
];

const COUNTRY_CODES = [
  { code: '+250', country: 'Rwanda', flag: 'RW' },
  { code: '+254', country: 'Kenya', flag: 'KE' },
  { code: '+255', country: 'Tanzania', flag: 'TZ' },
  { code: '+256', country: 'Uganda', flag: 'UG' },
  { code: '+251', country: 'Ethiopia', flag: 'ET' },
  { code: '+257', country: 'Burundi', flag: 'BI' },
  { code: '+243', country: 'DR Congo', flag: 'CD' },
  { code: '+27', country: 'South Africa', flag: 'ZA' },
  { code: '+234', country: 'Nigeria', flag: 'NG' },
  { code: '+233', country: 'Ghana', flag: 'GH' },
  { code: '+20', country: 'Egypt', flag: 'EG' },
  { code: '+212', country: 'Morocco', flag: 'MA' },
  { code: '+1', country: 'United States', flag: 'US' },
  { code: '+44', country: 'United Kingdom', flag: 'GB' },
  { code: '+33', country: 'France', flag: 'FR' },
  { code: '+49', country: 'Germany', flag: 'DE' },
  { code: '+39', country: 'Italy', flag: 'IT' },
  { code: '+34', country: 'Spain', flag: 'ES' },
  { code: '+31', country: 'Netherlands', flag: 'NL' },
  { code: '+32', country: 'Belgium', flag: 'BE' },
  { code: '+41', country: 'Switzerland', flag: 'CH' },
  { code: '+43', country: 'Austria', flag: 'AT' },
  { code: '+46', country: 'Sweden', flag: 'SE' },
  { code: '+47', country: 'Norway', flag: 'NO' },
  { code: '+45', country: 'Denmark', flag: 'DK' },
  { code: '+358', country: 'Finland', flag: 'FI' },
  { code: '+91', country: 'India', flag: 'IN' },
  { code: '+86', country: 'China', flag: 'CN' },
  { code: '+81', country: 'Japan', flag: 'JP' },
  { code: '+82', country: 'South Korea', flag: 'KR' },
  { code: '+61', country: 'Australia', flag: 'AU' },
  { code: '+64', country: 'New Zealand', flag: 'NZ' },
  { code: '+55', country: 'Brazil', flag: 'BR' },
  { code: '+52', country: 'Mexico', flag: 'MX' },
  { code: '+7', country: 'Russia', flag: 'RU' },
  { code: '+90', country: 'Turkey', flag: 'TR' },
  { code: '+966', country: 'Saudi Arabia', flag: 'SA' },
  { code: '+971', country: 'UAE', flag: 'AE' },
  { code: '+972', country: 'Israel', flag: 'IL' },
];

function CountryCodeDropdown({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = COUNTRY_CODES.filter(
    (c) =>
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search)
  );

  const selected = COUNTRY_CODES.find((c) => c.code === value) || COUNTRY_CODES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm border border-neutral-300 rounded-l-lg bg-neutral-50 hover:bg-neutral-100 transition-colors border-r-0 whitespace-nowrap h-[38px]"
      >
        <span className="text-xs font-medium text-neutral-700">{selected.code}</span>
        <ChevronDown className="w-3 h-3 text-neutral-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-neutral-200 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-neutral-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country..."
              className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.code + c.country}
                type="button"
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                  setSearch('');
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 flex items-center justify-between transition-colors ${
                  c.code === value ? 'bg-neutral-100 font-medium' : ''
                }`}
              >
                <span className="text-neutral-700">{c.country}</span>
                <span className="text-neutral-400 font-mono">{c.code}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-xs text-neutral-400 text-center">No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CreateGuideForm({ onClose, onSuccess, portalUserId }: CreateGuideFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    phoneCountryCode: '+250',
    bio: '',
    specializations: [] as string[],
    languages: [] as string[],
    experience_years: 0,
  });

  function toggleSpecialization(spec: string) {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec],
    }));
  }

  function toggleLanguage(lang: string) {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang],
    }));
  }

  function handleProfilePictureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Profile picture must be less than 5MB');
        return;
      }
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleNext() {
    if (step === 1 && !formData.name.trim()) { setError('Please enter the guide name'); return; }
    if (step === 1 && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError('Please enter a valid email address'); return; }
    if (step === 2 && formData.specializations.length === 0) { setError('Please select at least one specialization'); return; }
    if (step === 3 && formData.languages.length === 0) { setError('Please select at least one language'); return; }
    setError(null);
    setStep(s => s + 1);
  }

  function handleBack() {
    setError(null);
    setStep(s => s - 1);
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      let profilePictureUrl = null;

      // Upload profile picture if provided
      if (profilePicture) {
        const fileExt = profilePicture.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `guides/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, profilePicture, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);

        profilePictureUrl = publicUrl;
      }

      const { error: insertError } = await supabase.from('guides').insert({
        portal_user_id: portalUserId,
        name: formData.name,
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() ? `${formData.phoneCountryCode} ${formData.phone.trim()}` : '',
        bio: formData.bio,
        specializations: formData.specializations,
        languages: formData.languages,
        experience_years: formData.experience_years,
        profile_picture: profilePictureUrl,
        available: true,
        rating: 0,
        total_tours: 0,
      });
      if (insertError) throw insertError;
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
      <div className="w-full max-w-4xl bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Add Guide</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Step {step} of {STEPS.length}</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex px-6 pt-4 gap-2">
          {STEPS.map(s => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'
                }`}>
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
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
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Profile Picture</label>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {profilePicturePreview ? (
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-neutral-200">
                        <img src={profilePicturePreview} alt="Profile preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setProfilePicture(null);
                            setProfilePicturePreview(null);
                          }}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-neutral-100 flex items-center justify-center border-2 border-dashed border-neutral-300">
                        <ImageIcon className="w-8 h-8 text-neutral-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                      id="profile-picture-upload"
                    />
                    <label
                      htmlFor="profile-picture-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      {profilePicture ? 'Change Photo' : 'Upload Photo'}
                    </label>
                    <p className="text-xs text-neutral-500 mt-2">JPG, PNG or GIF. Max size 5MB.</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  placeholder="Guide's full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Email Address
                  <span className="ml-1 font-normal text-neutral-400">(used for guide dashboard access)</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  placeholder="guide@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Phone Number</label>
                <div className="flex">
                  <CountryCodeDropdown
                    value={formData.phoneCountryCode}
                    onChange={(code) => setFormData({ ...formData, phoneCountryCode: code })}
                  />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                    className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 border-l-0"
                    placeholder="7XX XXX XXX"
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Enter number without leading zero (country code selected automatically)
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Biography</label>
                <textarea
                  value={formData.bio}
                  onChange={e => setFormData(f => ({ ...f, bio: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 resize-none"
                  placeholder="Tell visitors about this guide's background and expertise..."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-neutral-900">Specializations <span className="text-rose-500">*</span></h3>
                <p className="text-xs text-neutral-500 mt-0.5">Select all areas this guide specializes in</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SPECIALIZATION_OPTIONS.map(spec => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialization(spec)}
                    className={`px-3 py-2.5 border-2 rounded-lg text-left text-sm transition-all ${
                      formData.specializations.includes(spec)
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
              {formData.specializations.length > 0 && (
                <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
                  <div className="text-xs text-neutral-500 mb-1.5">Selected ({formData.specializations.length}):</div>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.specializations.map(s => (
                      <span key={s} className="text-xs px-2 py-1 bg-neutral-900 text-white rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-neutral-900">Languages Spoken <span className="text-rose-500">*</span></h3>
                <p className="text-xs text-neutral-500 mt-0.5">Select all languages this guide can communicate in</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGE_OPTIONS.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`px-3 py-2.5 border-2 rounded-lg text-left text-sm transition-all ${
                      formData.languages.includes(lang)
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              {formData.languages.length > 0 && (
                <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
                  <div className="text-xs text-neutral-500 mb-1.5">Selected ({formData.languages.length}):</div>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.languages.map(l => (
                      <span key={l} className="text-xs px-2 py-1 bg-neutral-900 text-white rounded-full">{l}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Years of Experience</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={formData.experience_years}
                  onChange={e => setFormData(f => ({ ...f, experience_years: parseInt(e.target.value) || 0 }))}
                  className="w-32 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div className="border border-neutral-100 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                  <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Summary</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <div className="text-xs text-neutral-400 mb-0.5">Name</div>
                    <div className="text-sm font-medium text-neutral-900">{formData.name}</div>
                  </div>
                  {formData.email && (
                    <div>
                      <div className="text-xs text-neutral-400 mb-0.5">Email</div>
                      <div className="text-sm text-neutral-900">{formData.email}</div>
                    </div>
                  )}
                  {formData.phone && (
                    <div>
                      <div className="text-xs text-neutral-400 mb-0.5">Phone</div>
                      <div className="text-sm text-neutral-900">{formData.phoneCountryCode} {formData.phone}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-neutral-400 mb-0.5">Specializations</div>
                    <div className="flex flex-wrap gap-1">
                      {formData.specializations.map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-400 mb-0.5">Languages</div>
                    <div className="flex flex-wrap gap-1">
                      {formData.languages.map(l => (
                        <span key={l} className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-full">{l}</span>
                      ))}
                    </div>
                  </div>
                  {formData.experience_years > 0 && (
                    <div>
                      <div className="text-xs text-neutral-400 mb-0.5">Experience</div>
                      <div className="text-sm text-neutral-900">{formData.experience_years} years</div>
                    </div>
                  )}
                  {formData.bio && (
                    <div>
                      <div className="text-xs text-neutral-400 mb-0.5">Bio preview</div>
                      <div className="text-xs text-neutral-600 line-clamp-3">{formData.bio}</div>
                    </div>
                  )}
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
              {loading ? 'Creating...' : 'Create Guide'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
