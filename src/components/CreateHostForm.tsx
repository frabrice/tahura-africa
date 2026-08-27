import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, Upload, X, User, ChevronDown } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { PortalUser } from '../lib/auth';
import { compressImage } from '../lib/imageCompression';

interface CreateHostFormProps {
  onComplete: () => void;
  onCancel: () => void;
  /** Ops usage: create the host under a specific partner instead of the
   *  logged-in one. Omit for the normal partner-portal usage. */
  partnerId?: string;
  /** Ops usage: create the host with no partner at all — independent,
   *  managed directly by Ops, assignable to a partner later. */
  opsCreateIndependent?: boolean;
}

interface HostData {
  name: string;
  bio: string;
  profile_picture: string;
  languages: string[];
  email: string;
  phone: string;
  phoneCountryCode: string;
  expertise: string[];
  years_experience: number;
}

const COUNTRY_CODES = [
  { code: '+250', country: 'Rwanda', flag: 'RW' },
  { code: '+1', country: 'United States', flag: 'US' },
  { code: '+44', country: 'United Kingdom', flag: 'GB' },
  { code: '+33', country: 'France', flag: 'FR' },
  { code: '+49', country: 'Germany', flag: 'DE' },
  { code: '+39', country: 'Italy', flag: 'IT' },
  { code: '+34', country: 'Spain', flag: 'ES' },
  { code: '+31', country: 'Netherlands', flag: 'NL' },
  { code: '+32', country: 'Belgium', flag: 'BE' },
  { code: '+41', country: 'Switzerland', flag: 'CH' },
  { code: '+46', country: 'Sweden', flag: 'SE' },
  { code: '+47', country: 'Norway', flag: 'NO' },
  { code: '+45', country: 'Denmark', flag: 'DK' },
  { code: '+358', country: 'Finland', flag: 'FI' },
  { code: '+48', country: 'Poland', flag: 'PL' },
  { code: '+43', country: 'Austria', flag: 'AT' },
  { code: '+351', country: 'Portugal', flag: 'PT' },
  { code: '+30', country: 'Greece', flag: 'GR' },
  { code: '+420', country: 'Czech Republic', flag: 'CZ' },
  { code: '+36', country: 'Hungary', flag: 'HU' },
  { code: '+40', country: 'Romania', flag: 'RO' },
  { code: '+7', country: 'Russia', flag: 'RU' },
  { code: '+380', country: 'Ukraine', flag: 'UA' },
  { code: '+90', country: 'Turkey', flag: 'TR' },
  { code: '+972', country: 'Israel', flag: 'IL' },
  { code: '+966', country: 'Saudi Arabia', flag: 'SA' },
  { code: '+971', country: 'UAE', flag: 'AE' },
  { code: '+974', country: 'Qatar', flag: 'QA' },
  { code: '+965', country: 'Kuwait', flag: 'KW' },
  { code: '+968', country: 'Oman', flag: 'OM' },
  { code: '+91', country: 'India', flag: 'IN' },
  { code: '+92', country: 'Pakistan', flag: 'PK' },
  { code: '+880', country: 'Bangladesh', flag: 'BD' },
  { code: '+94', country: 'Sri Lanka', flag: 'LK' },
  { code: '+977', country: 'Nepal', flag: 'NP' },
  { code: '+86', country: 'China', flag: 'CN' },
  { code: '+81', country: 'Japan', flag: 'JP' },
  { code: '+82', country: 'South Korea', flag: 'KR' },
  { code: '+66', country: 'Thailand', flag: 'TH' },
  { code: '+84', country: 'Vietnam', flag: 'VN' },
  { code: '+60', country: 'Malaysia', flag: 'MY' },
  { code: '+65', country: 'Singapore', flag: 'SG' },
  { code: '+62', country: 'Indonesia', flag: 'ID' },
  { code: '+63', country: 'Philippines', flag: 'PH' },
  { code: '+61', country: 'Australia', flag: 'AU' },
  { code: '+64', country: 'New Zealand', flag: 'NZ' },
  { code: '+27', country: 'South Africa', flag: 'ZA' },
  { code: '+254', country: 'Kenya', flag: 'KE' },
  { code: '+255', country: 'Tanzania', flag: 'TZ' },
  { code: '+256', country: 'Uganda', flag: 'UG' },
  { code: '+251', country: 'Ethiopia', flag: 'ET' },
  { code: '+20', country: 'Egypt', flag: 'EG' },
  { code: '+212', country: 'Morocco', flag: 'MA' },
  { code: '+216', country: 'Tunisia', flag: 'TN' },
  { code: '+213', country: 'Algeria', flag: 'DZ' },
  { code: '+234', country: 'Nigeria', flag: 'NG' },
  { code: '+233', country: 'Ghana', flag: 'GH' },
  { code: '+225', country: 'Ivory Coast', flag: 'CI' },
  { code: '+237', country: 'Cameroon', flag: 'CM' },
  { code: '+243', country: 'DR Congo', flag: 'CD' },
  { code: '+55', country: 'Brazil', flag: 'BR' },
  { code: '+54', country: 'Argentina', flag: 'AR' },
  { code: '+57', country: 'Colombia', flag: 'CO' },
  { code: '+52', country: 'Mexico', flag: 'MX' },
  { code: '+56', country: 'Chile', flag: 'CL' },
  { code: '+51', country: 'Peru', flag: 'PE' },
  { code: '+58', country: 'Venezuela', flag: 'VE' },
  { code: '+593', country: 'Ecuador', flag: 'EC' },
  { code: '+1-876', country: 'Jamaica', flag: 'JM' },
  { code: '+1-246', country: 'Barbados', flag: 'BB' },
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

export function CreateHostForm({ onComplete, onCancel, partnerId, opsCreateIndependent }: CreateHostFormProps) {
  const { user } = useAuth();
  const toast = useToast();
  const userId: string | null = opsCreateIndependent ? null : (partnerId || (user as PortalUser)?.id || null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hostData, setHostData] = useState<HostData>({
    name: '',
    bio: '',
    profile_picture: '',
    languages: [],
    email: '',
    phone: '',
    phoneCountryCode: '+250',
    expertise: [],
    years_experience: 0,
  });

  const [languageInput, setLanguageInput] = useState('');
  const [expertiseInput, setExpertiseInput] = useState('');
  const [travelerId, setTravelerId] = useState<string | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setUploadingImage(true);
    try {
      const file = await compressImage(rawFile);
      const fileExt = file.name.split('.').pop();
      const fileName = `host-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `host-pictures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('listings')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('listings')
        .getPublicUrl(filePath);

      setHostData({ ...hostData, profile_picture: publicUrl });
    } catch (error: any) {
      toast.showToast('Failed to upload image: ' + error.message, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const addLanguage = () => {
    if (languageInput.trim() && !hostData.languages.includes(languageInput.trim())) {
      setHostData({ ...hostData, languages: [...hostData.languages, languageInput.trim()] });
      setLanguageInput('');
    }
  };

  const removeLanguage = (lang: string) => {
    setHostData({ ...hostData, languages: hostData.languages.filter(l => l !== lang) });
  };

  const addExpertise = () => {
    if (expertiseInput.trim() && !hostData.expertise.includes(expertiseInput.trim())) {
      setHostData({ ...hostData, expertise: [...hostData.expertise, expertiseInput.trim()] });
      setExpertiseInput('');
    }
  };

  const removeExpertise = (exp: string) => {
    setHostData({ ...hostData, expertise: hostData.expertise.filter(e => e !== exp) });
  };

  const checkTravelerEmail = async () => {
    if (!hostData.email.trim()) return;

    setLoading(true);
    try {
      // Preferred path: a SECURITY DEFINER function returns only id + full_name,
      // so the travelers table no longer needs to be readable by the anon key
      // (migration 20260724140000). Falls back to the direct query for
      // environments where the migration has not been applied yet.
      let record: { id: string; full_name: string } | null = null;

      const { data: rpcData, error: rpcError } = await supabase.rpc('lookup_traveler_by_email', {
        p_email: hostData.email,
      });

      if (!rpcError) {
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        record = row ? { id: row.id, full_name: row.full_name } : null;
      } else {
        const { data } = await supabase
          .from('travelers')
          .select('id, full_name')
          .eq('email', hostData.email)
          .maybeSingle();
        record = data || null;
      }

      setTravelerId(record?.id || null);
      setEmailChecked(true);

      if (record && !hostData.name.trim()) {
        setHostData({ ...hostData, name: record.full_name });
      }
    } catch (error) {
      console.error('Error checking traveler:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!userId && !opsCreateIndependent) {
      toast.showToast('User not authenticated', 'error');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = hostData.phone.trim()
        ? `${hostData.phoneCountryCode}${hostData.phone.trim()}`
        : '';

      const { data, error } = await supabase.from('partner_hosts').insert({
        partner_id: userId,
        name: hostData.name,
        bio: hostData.bio,
        profile_picture: hostData.profile_picture,
        languages: hostData.languages,
        email: hostData.email,
        phone: fullPhone,
        expertise: hostData.expertise,
        years_experience: hostData.years_experience,
        status: 'active',
        traveler_user_id: travelerId,
      }).select();

      if (error) throw error;

      console.log('Host created successfully:', data);
      toast.showToast('Host created successfully', 'success');

      const newHostId = data?.[0]?.id;
      if (newHostId) {
        // Fire-and-forget: the host record is already created either way,
        // and the notify function re-derives every detail (name, email,
        // who added them) from this row server-side rather than trusting
        // anything from the client, so there's nothing here to await.
        supabase.functions.invoke('notify-host-created', { body: { host_id: newHostId } }).catch(() => {});
      }

      onComplete();
    } catch (error: any) {
      console.error('Error creating host:', error);
      toast.showToast(`Failed to create host: ${error?.message || 'Unknown error'}`, 'error');
    }
    setLoading(false);
  };

  const isStep1Valid = hostData.name.trim() !== '' && hostData.bio.trim() !== '';
  const isStep2Valid = hostData.email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hostData.email);
  const isStep3Valid = true;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-neutral-900">Create New Host</h3>
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

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-900 mb-4">Basic Information</h4>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Host Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={hostData.name}
                onChange={(e) => setHostData({ ...hostData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="Enter host name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Bio <span className="text-red-500">*</span>
              </label>
              <textarea
                value={hostData.bio}
                onChange={(e) => setHostData({ ...hostData, bio: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="Tell travelers about this host..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Profile Picture
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {hostData.profile_picture ? (
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-neutral-200 flex-shrink-0">
                    <img
                      src={hostData.profile_picture}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-green-700 font-medium mb-1">Image uploaded</p>
                    <button
                      type="button"
                      onClick={() => setHostData({ ...hostData, profile_picture: '' })}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-3 h-3" />
                    Replace
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-neutral-300 rounded-lg hover:border-neutral-400 hover:bg-neutral-50 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {uploadingImage ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center animate-pulse">
                        <Upload className="w-4 h-4 text-neutral-400" />
                      </div>
                      <span className="text-xs text-neutral-500">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                        <User className="w-6 h-6 text-neutral-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-neutral-700">Click to upload a photo</p>
                        <p className="text-xs text-neutral-400 mt-0.5">PNG, JPG, WEBP up to 5MB</p>
                      </div>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-900 mb-4">Contact Information</h4>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-2">
                <p className="text-xs text-amber-800 leading-relaxed">
                  Use the same email this host uses on the traveler side. If they don't have a traveler account yet, ask them to create one first at{' '}
                  <span className="font-semibold">/traveler/signup</span> using this same email.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={hostData.email}
                  onChange={(e) => {
                    setHostData({ ...hostData, email: e.target.value });
                    setEmailChecked(false);
                    setTravelerId(null);
                  }}
                  className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                    hostData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hostData.email)
                      ? 'border-red-300 bg-red-50'
                      : 'border-neutral-300'
                  }`}
                  placeholder="host@example.com"
                />
                <Button
                  size="sm"
                  onClick={checkTravelerEmail}
                  disabled={loading || !isStep2Valid}
                >
                  {loading ? 'Checking...' : 'Verify'}
                </Button>
              </div>
              {hostData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hostData.email) && (
                <p className="text-xs text-red-600 mt-1">Please enter a valid email address</p>
              )}
              {emailChecked && (
                <div className={`text-xs p-2.5 rounded-lg mt-2 ${travelerId ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-neutral-50 border border-neutral-200 text-neutral-600'}`}>
                  {travelerId ? (
                    <span className="font-medium">Traveler account found — host will be linked automatically.</span>
                  ) : (
                    <span>No traveler account found yet. The host can still be created; linking will happen automatically once they sign up as a traveler with this email.</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Phone Number
              </label>
              <div className="flex">
                <CountryCodeDropdown
                  value={hostData.phoneCountryCode}
                  onChange={(code) => setHostData({ ...hostData, phoneCountryCode: code })}
                />
                <input
                  type="tel"
                  value={hostData.phone}
                  onChange={(e) => setHostData({ ...hostData, phone: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 border-l-0"
                  placeholder="7XX XXX XXX"
                />
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Select country code then enter the number without leading zero
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Languages Spoken
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={languageInput}
                  onChange={(e) => setLanguageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                  className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="e.g., English, French, Kinyarwanda"
                />
                <Button size="sm" onClick={addLanguage}>Add</Button>
              </div>
              {hostData.languages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {hostData.languages.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full"
                    >
                      {lang}
                      <button onClick={() => removeLanguage(lang)} className="hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-900 mb-4">Experience & Expertise</h4>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Years of Experience
              </label>
              <input
                type="number"
                min="0"
                value={hostData.years_experience || ''}
                onChange={(e) => setHostData({ ...hostData, years_experience: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Areas of Expertise
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={expertiseInput}
                  onChange={(e) => setExpertiseInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
                  className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="e.g., Wildlife tracking, Cultural tours"
                />
                <Button size="sm" onClick={addExpertise}>Add</Button>
              </div>
              {hostData.expertise.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {hostData.expertise.map((exp) => (
                    <span
                      key={exp}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full"
                    >
                      {exp}
                      <button onClick={() => removeExpertise(exp)} className="hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <h5 className="text-xs font-semibold text-neutral-900 mb-3">Review Summary</h5>
              <dl className="space-y-2 text-xs">
                <div className="flex gap-2">
                  <dt className="text-neutral-500 min-w-[80px]">Name:</dt>
                  <dd className="text-neutral-900 font-medium">{hostData.name}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-neutral-500 min-w-[80px]">Email:</dt>
                  <dd className="text-neutral-900">{hostData.email}</dd>
                </div>
                {hostData.phone && (
                  <div className="flex gap-2">
                    <dt className="text-neutral-500 min-w-[80px]">Phone:</dt>
                    <dd className="text-neutral-900">{hostData.phoneCountryCode} {hostData.phone}</dd>
                  </div>
                )}
                {hostData.languages.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-neutral-500 min-w-[80px]">Languages:</dt>
                    <dd className="text-neutral-900">{hostData.languages.join(', ')}</dd>
                  </div>
                )}
                {hostData.years_experience > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-neutral-500 min-w-[80px]">Experience:</dt>
                    <dd className="text-neutral-900">{hostData.years_experience} years</dd>
                  </div>
                )}
                {hostData.profile_picture && (
                  <div className="flex gap-2 items-center">
                    <dt className="text-neutral-500 min-w-[80px]">Photo:</dt>
                    <dd className="flex items-center gap-2">
                      <img src={hostData.profile_picture} alt="" className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-green-700 font-medium">Uploaded</span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
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

        {step < totalSteps ? (
          <Button
            onClick={handleNext}
            disabled={
              (step === 1 && !isStep1Valid) ||
              (step === 2 && !isStep2Valid)
            }
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading || !isStep3Valid}
          >
            {loading ? 'Creating...' : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Create Host
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
