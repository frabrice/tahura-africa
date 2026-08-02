import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Globe, Building2, Save, Eye, EyeOff, MapPin, Clock, Check, AlertCircle, Upload, X, ChevronDown, Phone, Mail, Users, CalendarX, BookOpen, Star, Image } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

const INSTITUTION_TYPES = [
  { value: 'museum', label: 'Museum' },
  { value: 'national_park', label: 'National Park' },
  { value: 'heritage_site', label: 'Heritage Site' },
  { value: 'gallery', label: 'Art Gallery' },
  { value: 'zoo', label: 'Zoo & Wildlife Park' },
  { value: 'botanical_garden', label: 'Botanical Garden' },
  { value: 'aquarium', label: 'Aquarium' },
  { value: 'science_center', label: 'Science Center' },
  { value: 'cultural_center', label: 'Cultural Center' },
  { value: 'other', label: 'Other' },
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const COUNTRY_CODES = [
  { code: '+1', country: 'US/CA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+358', country: 'Finland', flag: '🇫🇮' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+420', country: 'Czech Rep.', flag: '🇨🇿' },
  { code: '+36', country: 'Hungary', flag: '🇭🇺' },
  { code: '+30', country: 'Greece', flag: '🇬🇷' },
  { code: '+90', country: 'Turkey', flag: '🇹🇷' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+27', country: 'S. Africa', flag: '🇿🇦' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+251', country: 'Ethiopia', flag: '🇪🇹' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦' },
  { code: '+216', country: 'Tunisia', flag: '🇹🇳' },
  { code: '+213', country: 'Algeria', flag: '🇩🇿' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+972', country: 'Israel', flag: '🇮🇱' },
  { code: '+98', country: 'Iran', flag: '🇮🇷' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', country: 'Nepal', flag: '🇳��' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'S. Korea', flag: '🇰🇷' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+51', country: 'Peru', flag: '🇵🇪' },
];

function getCompleteness(form: any) {
  const checks = [
    { label: 'Institution name', done: !!form.name?.trim() },
    { label: 'Description', done: !!form.description?.trim() },
    { label: 'Location', done: !!form.location?.trim() },
    { label: 'Institution type', done: !!form.type },
    { label: 'Opening hours', done: !!form.opening_time && !!form.closing_time },
    { label: 'Cover image', done: !!form.cover_image?.trim() },
    { label: 'Contact info', done: !!form.phoneNumber?.trim() || !!form.email?.trim() },
  ];
  const done = checks.filter(c => c.done).length;
  return { checks, pct: Math.round((done / checks.length) * 100), done, total: checks.length };
}

function formatTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidWebsite(url: string) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return !!u.hostname;
  } catch {
    return false;
  }
}

interface FormState {
  name: string;
  tagline: string;
  description: string;
  type: string;
  location: string;
  opening_time: string;
  closing_time: string;
  closed_days: string[];
  daily_capacity: string;
  guidelines: string[];
  images: string[];
  cover_image: string;
  countryCode: string;
  phoneNumber: string;
  email: string;
  website: string;
  published: boolean;
  entry_fee_is_free: boolean;
  entry_fee_amount: string;
}

export function ProfilePage() {
  const { user } = useAuth();
  const portalUser = user as PortalUser | null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    tagline: '',
    description: '',
    type: 'museum',
    location: '',
    opening_time: '',
    closing_time: '',
    closed_days: [],
    daily_capacity: '',
    guidelines: [''],
    images: [],
    cover_image: '',
    countryCode: '+1',
    phoneNumber: '',
    email: '',
    website: '',
    published: true,
    entry_fee_is_free: true,
    entry_fee_amount: '',
  });

  useEffect(() => {
    if (portalUser?.id) loadProfile();
  }, [portalUser?.id]);

  const loadProfile = async () => {
    if (!portalUser?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('institution_profiles')
        .select('*')
        .eq('portal_user_id', portalUser.id)
        .maybeSingle();

      if (data) {
        const fullPhone = data.phone || '';
        let countryCode = '+1';
        let phoneNumber = fullPhone;
        for (const c of COUNTRY_CODES.sort((a, b) => b.code.length - a.code.length)) {
          if (fullPhone.startsWith(c.code)) {
            countryCode = c.code;
            phoneNumber = fullPhone.slice(c.code.length).trim();
            break;
          }
        }

        setForm({
          name: data.name || '',
          tagline: data.tagline || '',
          description: data.description || '',
          type: data.type || 'museum',
          location: data.location || '',
          opening_time: data.opening_time || '',
          closing_time: data.closing_time || '',
          closed_days: data.closed_days || [],
          daily_capacity: data.daily_capacity ? String(data.daily_capacity) : '',
          guidelines: data.guidelines?.length > 0 ? data.guidelines : [''],
          images: data.images || [],
          cover_image: data.cover_image || '',
          countryCode,
          phoneNumber,
          email: data.email || '',
          website: data.website || '',
          published: data.published ?? true,
          entry_fee_is_free: data.entry_fee_is_free !== false,
          entry_fee_amount: data.entry_fee_amount ? String(data.entry_fee_amount) : '',
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Institution name is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.location.trim()) errs.location = 'Location is required';
    if (!form.type) errs.type = 'Type is required';
    if (form.email && !isValidEmail(form.email)) errs.email = 'Enter a valid email address';
    if (form.website && !isValidWebsite(form.website)) errs.website = 'Enter a valid website URL (e.g. https://example.com)';
    if (form.opening_time && !form.closing_time) errs.closing_time = 'Closing time is required if opening time is set';
    if (!form.opening_time && form.closing_time) errs.opening_time = 'Opening time is required if closing time is set';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!portalUser?.id) return;
    if (!validate()) return;
    setSaving(true);
    setError(null);

    const cleanedGuidelines = form.guidelines.filter(g => g.trim());
    const fullPhone = form.phoneNumber.trim() ? `${form.countryCode} ${form.phoneNumber.trim()}` : '';
    let websiteUrl = form.website.trim();
    if (websiteUrl && !websiteUrl.startsWith('http')) websiteUrl = `https://${websiteUrl}`;

    try {
      const { error: upsertError } = await supabase
        .from('institution_profiles')
        .upsert({
          portal_user_id: portalUser.id,
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          type: form.type,
          location: form.location,
          opening_time: form.opening_time || null,
          closing_time: form.closing_time || null,
          closed_days: form.closed_days,
          daily_capacity: form.daily_capacity ? parseInt(form.daily_capacity) : 0,
          guidelines: cleanedGuidelines,
          images: form.images,
          cover_image: form.cover_image,
          phone: fullPhone,
          email: form.email,
          website: websiteUrl,
          published: form.published,
          entry_fee_is_free: form.entry_fee_is_free,
          entry_fee_amount: form.entry_fee_is_free ? 0 : (parseFloat(form.entry_fee_amount) || 0),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'portal_user_id' });

      if (upsertError) throw upsertError;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addGuideline = () => setForm(p => ({ ...p, guidelines: [...p.guidelines, ''] }));
  const removeGuideline = (i: number) => setForm(p => ({ ...p, guidelines: p.guidelines.filter((_, idx) => idx !== i) }));
  const updateGuideline = (i: number, val: string) => setForm(p => ({ ...p, guidelines: p.guidelines.map((g, idx) => idx === i ? val : g) }));

  const toggleClosedDay = (day: string) => {
    setForm(p => ({
      ...p,
      closed_days: p.closed_days.includes(day)
        ? p.closed_days.filter(d => d !== day)
        : [...p.closed_days, day],
    }));
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setForm(p => ({ ...p, cover_image: ev.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setForm(p => ({ ...p, images: [...p.images, ev.target!.result as string] }));
        }
      };
      reader.readAsDataURL(file);
    });
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const removeImage = (i: number) => setForm(p => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }));

  const inputClass = (field?: string) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
      field && validationErrors[field]
        ? 'border-red-300 focus:border-red-400 bg-red-50'
        : 'border-neutral-200 focus:border-neutral-400'
    }`;

  if (loading) return <div className="text-neutral-600 py-8">Loading profile...</div>;

  const completeness = getCompleteness(form);
  const coverImg = form.cover_image || (form.images && form.images[0]);
  const fullPhone = form.phoneNumber.trim() ? `${form.countryCode} ${form.phoneNumber.trim()}` : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Institution Profile</h1>
          <p className="text-xs text-neutral-500 mt-0.5">This profile is what travelers see on the Attractions page</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {Object.keys(validationErrors).length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>Please fix the errors below before saving.</div>
        </div>
      )}

      <div className={`gap-6 ${showPreview ? 'grid grid-cols-1 xl:grid-cols-2' : 'block'}`}>
        <div className="space-y-5">

          <Card className={`p-4 border ${completeness.pct === 100 ? 'bg-emerald-50 border-emerald-200' : completeness.pct >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {completeness.pct === 100
                  ? <Check className="w-4 h-4 text-emerald-600" />
                  : <AlertCircle className="w-4 h-4 text-amber-600" />
                }
                <span className="text-sm font-medium text-neutral-900">
                  Profile {completeness.pct === 100 ? 'complete' : `${completeness.pct}% complete`}
                </span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                form.published ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
              }`}>
                {form.published ? 'Published' : 'Draft'}
              </span>
            </div>
            <div className="w-full bg-white/60 h-1.5 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${completeness.pct === 100 ? 'bg-emerald-500' : completeness.pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${completeness.pct}%` }}
              />
            </div>
            {completeness.pct < 100 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {completeness.checks.filter(c => !c.done).map(c => (
                  <span key={c.label} className="text-xs text-neutral-500 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-neutral-400 inline-block" />
                    {c.label} missing
                  </span>
                ))}
              </div>
            )}
            {completeness.pct === 100 && !form.published && (
              <p className="text-xs text-emerald-700">Profile is complete — toggle <strong>Published</strong> below to list under Attractions.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Institution Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm(p => ({ ...p, name: e.target.value }));
                    if (validationErrors.name) setValidationErrors(p => ({ ...p, name: '' }));
                  }}
                  className={inputClass('name')}
                  placeholder="e.g., National History Museum"
                />
                {validationErrors.name && <p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Tagline</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm(p => ({ ...p, tagline: e.target.value }))}
                  className={inputClass()}
                  placeholder="A short, memorable tagline"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))}
                    className={inputClass('type')}
                  >
                    {INSTITUTION_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => {
                      setForm(p => ({ ...p, location: e.target.value }));
                      if (validationErrors.location) setValidationErrors(p => ({ ...p, location: '' }));
                    }}
                    className={inputClass('location')}
                    placeholder="City, Country"
                  />
                  {validationErrors.location && <p className="text-xs text-red-600 mt-1">{validationErrors.location}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => {
                    setForm(p => ({ ...p, description: e.target.value }));
                    if (validationErrors.description) setValidationErrors(p => ({ ...p, description: '' }));
                  }}
                  rows={4}
                  className={inputClass('description') + ' resize-none'}
                  placeholder="Describe your institution to visitors..."
                />
                {validationErrors.description && <p className="text-xs text-red-600 mt-1">{validationErrors.description}</p>}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Visit Information
            </h2>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Opening Time</label>
                  <input
                    type="time"
                    value={form.opening_time}
                    onChange={(e) => {
                      setForm(p => ({ ...p, opening_time: e.target.value }));
                      if (validationErrors.opening_time) setValidationErrors(p => ({ ...p, opening_time: '' }));
                    }}
                    className={inputClass('opening_time')}
                  />
                  {validationErrors.opening_time && <p className="text-xs text-red-600 mt-1">{validationErrors.opening_time}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Closing Time</label>
                  <input
                    type="time"
                    value={form.closing_time}
                    onChange={(e) => {
                      setForm(p => ({ ...p, closing_time: e.target.value }));
                      if (validationErrors.closing_time) setValidationErrors(p => ({ ...p, closing_time: '' }));
                    }}
                    className={inputClass('closing_time')}
                  />
                  {validationErrors.closing_time && <p className="text-xs text-red-600 mt-1">{validationErrors.closing_time}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-2">Closed Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleClosedDay(day)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                        form.closed_days.includes(day)
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                {form.closed_days.length > 0 && (
                  <p className="text-xs text-neutral-500 mt-1.5">
                    Closed on: {form.closed_days.join(', ')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-2">Entry Fee</label>
                <div className="flex gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, entry_fee_is_free: true }))}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                      form.entry_fee_is_free
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    Free Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, entry_fee_is_free: false }))}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                      !form.entry_fee_is_free
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    Paid Entry
                  </button>
                </div>
                {!form.entry_fee_is_free && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-500 font-medium">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.entry_fee_amount}
                      onChange={(e) => setForm(p => ({ ...p, entry_fee_amount: e.target.value }))}
                      className={inputClass()}
                      placeholder="0.00"
                    />
                    <span className="text-xs text-neutral-400 whitespace-nowrap">per booking</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Daily Capacity (visitors per day)</label>
                <input
                  type="number"
                  min="0"
                  value={form.daily_capacity}
                  onChange={(e) => setForm(p => ({ ...p, daily_capacity: e.target.value }))}
                  className={inputClass()}
                  placeholder="e.g., 500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-2">Visitor Guidelines</label>
                <div className="space-y-2">
                  {form.guidelines.map((guideline, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={guideline}
                        onChange={(e) => updateGuideline(i, e.target.value)}
                        className={inputClass()}
                        placeholder="e.g., No flash photography"
                      />
                      {form.guidelines.length > 1 && (
                        <button onClick={() => removeGuideline(i)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addGuideline} className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 text-xs font-medium transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Add Guideline
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Image className="w-4 h-4" />
              Images & Media
            </h2>

            <div className="mb-5">
              <label className="block text-xs font-medium text-neutral-700 mb-2">Cover Image</label>
              {form.cover_image ? (
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-3 border border-neutral-200 group">
                  <img src={form.cover_image} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white text-neutral-900 text-xs font-medium rounded-lg hover:bg-neutral-100 transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Replace
                    </button>
                    <button
                      onClick={() => setForm(p => ({ ...p, cover_image: '' }))}
                      className="px-3 py-1.5 bg-white text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full aspect-[16/9] border-2 border-dashed border-neutral-200 rounded-xl hover:border-neutral-400 hover:bg-neutral-50 transition-all flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-neutral-600"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-xs font-medium">Click to upload cover image</span>
                  <span className="text-xs">JPG, PNG, WebP up to 10MB</span>
                </button>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverImageUpload}
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-2">Gallery Images</label>
              {form.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-neutral-200 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 p-1 bg-white rounded-full shadow text-rose-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50 text-xs font-medium transition-all w-full justify-center"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Gallery Images
              </button>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryImageUpload}
                className="hidden"
              />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Contact & Online Presence
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Phone Number</label>
                <div className="flex gap-2">
                  <div className="relative">
                    <select
                      value={form.countryCode}
                      onChange={(e) => setForm(p => ({ ...p, countryCode: e.target.value }))}
                      className="appearance-none pl-3 pr-7 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400 bg-white min-w-[90px]"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                  </div>
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) => setForm(p => ({ ...p, phoneNumber: e.target.value }))}
                    className={inputClass() + ' flex-1'}
                    placeholder="234 567 8900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm(p => ({ ...p, email: e.target.value }));
                    if (validationErrors.email) setValidationErrors(p => ({ ...p, email: '' }));
                  }}
                  className={inputClass('email')}
                  placeholder="contact@institution.org"
                />
                {validationErrors.email && <p className="text-xs text-red-600 mt-1">{validationErrors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => {
                    setForm(p => ({ ...p, website: e.target.value }));
                    if (validationErrors.website) setValidationErrors(p => ({ ...p, website: '' }));
                  }}
                  className={inputClass('website')}
                  placeholder="https://www.institution.org"
                />
                {validationErrors.website && <p className="text-xs text-red-600 mt-1">{validationErrors.website}</p>}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Publish Profile</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  {form.published
                    ? 'Your institution is listed under Attractions and visible to travelers.'
                    : 'Enable to list your institution under Attractions on the traveler platform.'}
                </p>
              </div>
              <button
                onClick={() => setForm(p => ({ ...p, published: !p.published }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.published ? 'bg-emerald-500' : 'bg-neutral-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.published ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </Card>
        </div>

        {showPreview && (
          <div className="mt-6 xl:mt-0">
            <div className="sticky top-24">
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Eye className="w-3.5 h-3.5" />
                Traveler Preview
              </div>
              <AttractionPreview
                form={form}
                coverImg={coverImg || ''}
                fullPhone={fullPhone}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AttractionPreview({ form, coverImg, fullPhone }: { form: FormState; coverImg: string; fullPhone: string }) {
  const typeLabel = INSTITUTION_TYPES.find(t => t.value === form.type)?.label || form.type;
  const allImages = [
    ...(coverImg ? [coverImg] : []),
    ...form.images.filter(img => img !== coverImg),
  ];

  const hasHours = form.opening_time && form.closing_time;
  const hasClosedDays = form.closed_days.length > 0;
  const hasDailyCapacity = form.daily_capacity && parseInt(form.daily_capacity) > 0;
  const cleanGuidelines = form.guidelines.filter(g => g.trim());

  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-lg max-h-[85vh] overflow-y-auto">
      <div className="relative">
        <div className="aspect-[16/9] bg-neutral-100 overflow-hidden">
          {coverImg ? (
            <img src={coverImg} alt={form.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-300">
              <Image className="w-10 h-10" />
              <span className="text-xs">Cover image will appear here</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
        {allImages.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            {allImages.length} photos
          </div>
        )}
        {!form.published && (
          <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Not published
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">{typeLabel}</div>
        <h3 className="text-lg font-bold text-neutral-900 mb-1">{form.name || 'Institution Name'}</h3>
        {form.tagline && <p className="text-sm text-neutral-500 italic mb-2">{form.tagline}</p>}
        {form.location && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-4">
            <MapPin className="w-3.5 h-3.5" />
            {form.location}
          </div>
        )}

        {form.description && (
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-neutral-900 mb-1.5">About this place</h4>
            <p className="text-xs text-neutral-600 leading-relaxed line-clamp-4">{form.description}</p>
          </div>
        )}

        {(hasHours || hasClosedDays || hasDailyCapacity) && (
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Visit information</h4>
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 space-y-3">
              {hasHours && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-neutral-400 mb-0.5">Opening hours</div>
                    <div className="text-xs font-medium text-neutral-900">
                      {formatTime(form.opening_time)} – {formatTime(form.closing_time)}
                    </div>
                  </div>
                </div>
              )}
              {hasClosedDays && (
                <div className="flex items-start gap-3">
                  <CalendarX className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-neutral-400 mb-0.5">Closed on</div>
                    <div className="text-xs font-medium text-neutral-900">{form.closed_days.join(', ')}</div>
                  </div>
                </div>
              )}
              {hasDailyCapacity && (
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-neutral-400 mb-0.5">Daily capacity</div>
                    <div className="text-xs font-medium text-neutral-900">
                      Up to {parseInt(form.daily_capacity).toLocaleString()} visitors per day
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="text-neutral-400 font-bold text-sm mt-0 flex-shrink-0">$</span>
                <div>
                  <div className="text-xs text-neutral-400 mb-0.5">Entry fee</div>
                  <div className="text-xs font-medium text-neutral-900">
                    {form.entry_fee_is_free
                      ? 'Free admission'
                      : form.entry_fee_amount
                        ? `$${form.entry_fee_amount} per booking`
                        : 'Paid (amount not set)'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {cleanGuidelines.length > 0 && (
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Visitor guidelines</h4>
            <ul className="space-y-2">
              {cleanGuidelines.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-neutral-700">
                  <Check className="w-3.5 h-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(fullPhone || form.email || form.website) && (
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Contact information</h4>
            <div className="space-y-2">
              {fullPhone && (
                <div className="flex items-center gap-2 text-xs text-neutral-700">
                  <Phone className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  {fullPhone}
                </div>
              )}
              {form.email && (
                <div className="flex items-center gap-2 text-xs text-neutral-700">
                  <Mail className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  {form.email}
                </div>
              )}
              {form.website && (
                <div className="flex items-center gap-2 text-xs text-neutral-700">
                  <Globe className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  {form.website.replace(/^https?:\/\//, '')}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-neutral-100 space-y-2">
          <button className="w-full py-3 bg-neutral-900 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4" />
            Book Your Visit
          </button>
          <button className="w-full py-2.5 border-2 border-neutral-200 text-neutral-700 text-sm font-medium rounded-xl flex items-center justify-center gap-2 hover:border-neutral-400 transition-colors">
            <Star className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
