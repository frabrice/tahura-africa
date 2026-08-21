import { useState, useRef, useEffect } from 'react';
import { Home, Compass, Check, X, Upload, User as UserIcon, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TravelerUser } from '../../lib/auth';
import { sendEmail } from '../../lib/sendEmail';
import { Field, TextInput, TextArea, PhoneInput, isValidEmail, isValidPhone } from '../../components/FormControls';
import { useSEO } from '../../lib/useSEO';

type ApplicantType = 'host' | 'guide';

const REGION_PRESETS = [
  'Kigali',
  'Northern — Musanze / Volcanoes',
  'Eastern — Akagera',
  'Southern — Nyungwe / Huye',
  'Western — Kivu / Rubavu',
  'Nationwide',
];

interface FormState {
  applicant_type: ApplicantType | null;
  full_name: string;
  email: string;
  phone: string;
  bio: string;
  profile_picture: string;
  languages: string[];
  years_experience: string;
  motivation: string;
  host_expertise: string[];
  guide_specializations: string[];
  operating_region: string;
}

const EMPTY_FORM: FormState = {
  applicant_type: null,
  full_name: '', email: '', phone: '', bio: '', profile_picture: '',
  languages: [], years_experience: '', motivation: '',
  host_expertise: [], guide_specializations: [], operating_region: '',
};

function TagInput({ label, hint, values, onChange, placeholder }: {
  label: string; hint?: string; values: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2 mb-2">
        <TextInput
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <button type="button" onClick={add} className="px-4 py-2.5 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex-shrink-0">
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map(v => (
            <span key={v} className="flex items-center gap-1 px-2.5 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full">
              {v}
              <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}

export function BecomeALocalPage() {
  const { user, userType } = useAuth();
  const traveler = userType === 'traveler' ? (user as TravelerUser) : null;

  useSEO({
    title: 'Become a Local',
    description: 'Apply to become a Host or Guide on Tahura Africa and start welcoming travelers to Rwanda and East Africa.',
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (traveler) {
      setForm(f => ({
        ...f,
        full_name: f.full_name || traveler.full_name || '',
        email: f.email || traveler.email || '',
        phone: f.phone || traveler.phone || '',
        profile_picture: f.profile_picture || traveler.profile_picture || '',
      }));
    }
  }, [traveler]);

  const selectRole = (type: ApplicantType) => {
    setForm(f => ({ ...f, applicant_type: type }));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `application-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `applications/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('listings').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(filePath);
      setForm(f => ({ ...f, profile_picture: publicUrl }));
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const emailInvalid = !!form.email && !isValidEmail(form.email);
  const phoneInvalid = !!form.phone && !isValidPhone(form.phone);

  async function handleSubmit() {
    if (!form.applicant_type) { setError('Choose whether you\'re applying as a Host or a Guide.'); return; }
    if (!form.full_name.trim()) { setError('Enter your full name.'); return; }
    if (!form.email.trim() || emailInvalid) { setError('Enter a valid email address.'); return; }
    if (!form.phone.trim() || phoneInvalid) { setError('Enter a valid phone number.'); return; }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from('host_guide_applications').insert({
      applicant_type: form.applicant_type,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      bio: form.bio.trim(),
      profile_picture: form.profile_picture || null,
      languages: form.languages,
      years_experience: parseInt(form.years_experience) || 0,
      motivation: form.motivation.trim(),
      host_expertise: form.applicant_type === 'host' ? form.host_expertise : [],
      guide_specializations: form.applicant_type === 'guide' ? form.guide_specializations : [],
      operating_region: form.applicant_type === 'guide' ? form.operating_region : '',
      traveler_user_id: traveler?.id || null,
    });

    if (insertError) {
      setError(insertError.message || 'Failed to submit your application. Please try again.');
      setSaving(false);
      return;
    }

    sendEmail({
      template: 'application_received',
      recipient_email: form.email.trim(),
      recipient_name: form.full_name.trim(),
      data: { applicant_type: form.applicant_type, full_name: form.full_name.trim() },
    });

    sendEmail({
      template: 'application_received_admin',
      recipient_email: 'tahuraafrica@gmail.com',
      recipient_name: 'Tahura Africa',
      data: {
        applicant_type: form.applicant_type,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        years_experience: form.years_experience,
        review_link: `${window.location.origin}/operations`,
      },
    });

    setSaving(false);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 md:px-6 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="font-display text-3xl font-bold text-neutral-900 mb-3">Thanks for applying!</h1>
        <p className="text-neutral-600 leading-relaxed">
          We've sent a confirmation to <strong>{form.email}</strong>. Our team reviews every application by hand —
          we'll be in touch as soon as we've made a decision.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: '#0F0D0B' }}>
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(196,136,58,0.18), transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(212,95,69,0.15), transparent 70%)' }} />
        <div className="relative max-w-4xl mx-auto px-4 md:px-6 py-20 md:py-28 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-5" style={{ color: '#E8B86D' }}>Become a Local</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            Welcome travelers, your way
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Every place has locals who make it unforgettable — someone to open their home, or someone to show the way.
            Which one are you?
          </p>
        </div>
      </div>

      {/* Role cards */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 -mt-10 md:-mt-14 relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
        <button
          onClick={() => selectRole('host')}
          className={`text-left bg-white rounded-2xl p-7 shadow-xl border-2 transition-all hover:-translate-y-0.5 ${form.applicant_type === 'host' ? 'border-neutral-900' : 'border-transparent'}`}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: '#FBEADF' }}>
            <Home className="w-5 h-5" style={{ color: '#C4883A' }} />
          </div>
          <h2 className="font-display text-xl font-bold text-neutral-900 mb-2">Host</h2>
          <p className="text-sm text-neutral-500 leading-relaxed mb-4">
            Share your home, land, or space. Travelers stay with you and experience daily life the way you actually live it.
          </p>
          <ul className="space-y-1.5 text-xs text-neutral-500 mb-5">
            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />A space to welcome guests</li>
            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />Earn from every stay</li>
            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />Backed by a Tahura partner</li>
          </ul>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-900">
            Apply as a Host <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>

        <button
          onClick={() => selectRole('guide')}
          className={`text-left bg-white rounded-2xl p-7 shadow-xl border-2 transition-all hover:-translate-y-0.5 ${form.applicant_type === 'guide' ? 'border-neutral-900' : 'border-transparent'}`}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: '#F5D3B8' }}>
            <Compass className="w-5 h-5" style={{ color: '#C14B32' }} />
          </div>
          <h2 className="font-display text-xl font-bold text-neutral-900 mb-2">Guide</h2>
          <p className="text-sm text-neutral-500 leading-relaxed mb-4">
            Lead the way. Take travelers through experiences and attractions you know inside out, in your own style.
          </p>
          <ul className="space-y-1.5 text-xs text-neutral-500 mb-5">
            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />Knowledge of a region or activity</li>
            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />Earn tips and per-tour pay</li>
            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />Assigned across attractions &amp; tours</li>
          </ul>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-900">
            Apply as a Guide <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>

      {/* Form */}
      <div ref={formRef} className="max-w-2xl mx-auto px-4 md:px-6 pb-24">
        <div className="mb-8">
          <h3 className="font-display text-2xl font-bold text-neutral-900 mb-1.5">Your application</h3>
          <p className="text-sm text-neutral-500">Takes about five minutes. Our team reviews every application personally.</p>
        </div>

        <div className="flex gap-2 mb-8 p-1 bg-neutral-100 rounded-xl w-fit">
          {(['host', 'guide'] as const).map(t => (
            <button
              key={t}
              onClick={() => setForm(f => ({ ...f, applicant_type: t }))}
              className={`px-5 py-2 text-sm font-medium rounded-lg capitalize transition-all ${form.applicant_type === t ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Applying as {t}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {form.profile_picture ? (
                <img src={form.profile_picture} alt="" className="w-16 h-16 rounded-full object-cover border border-neutral-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-neutral-300" />
                </div>
              )}
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? 'Uploading…' : 'Add a photo'}
              </button>
              <p className="text-[11px] text-neutral-400 mt-1">Optional, but helps us put a face to your application.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Full name" required>
              <TextInput value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Aline Uwase" />
            </Field>
            <Field label="Years of experience" hint="In hosting, guiding, or hospitality generally">
              <TextInput type="number" min="0" value={form.years_experience} onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))} placeholder="0" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" required error={emailInvalid ? 'Enter a valid email address.' : null}>
              <TextInput type="email" value={form.email} invalid={emailInvalid} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@email.com" />
            </Field>
            <Field label="Phone" required error={phoneInvalid ? 'Enter a valid phone number.' : null}>
              <PhoneInput value={form.phone} invalid={phoneInvalid} onChange={v => setForm(f => ({ ...f, phone: v }))} />
            </Field>
          </div>

          <Field label="About you" hint="A couple of sentences — who you are, what you do.">
            <TextArea rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell travelers a bit about yourself..." />
          </Field>

          <TagInput
            label="Languages"
            hint="Languages you're comfortable speaking with travelers"
            values={form.languages}
            onChange={v => setForm(f => ({ ...f, languages: v }))}
            placeholder="e.g. Kinyarwanda"
          />

          {form.applicant_type === 'host' && (
            <TagInput
              label="What kind of stays do you offer?"
              hint="e.g. Cultural Experiences, Farm Stay, City Apartment"
              values={form.host_expertise}
              onChange={v => setForm(f => ({ ...f, host_expertise: v }))}
              placeholder="e.g. Cultural Experiences"
            />
          )}

          {form.applicant_type === 'guide' && (
            <>
              <TagInput
                label="What do you guide?"
                hint="e.g. Gorilla Trekking, City Tours, Birding"
                values={form.guide_specializations}
                onChange={v => setForm(f => ({ ...f, guide_specializations: v }))}
                placeholder="e.g. Gorilla Trekking"
              />
              <Field label="Where do you operate?">
                <select
                  value={form.operating_region}
                  onChange={e => setForm(f => ({ ...f, operating_region: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 text-sm text-neutral-800 bg-white px-3 py-2.5 focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">Select a region…</option>
                  {REGION_PRESETS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </>
          )}

          <Field label={`Why do you want to join Tahura${form.applicant_type ? ` as a ${form.applicant_type}` : ''}?`}>
            <TextArea rows={3} value={form.motivation} onChange={e => setForm(f => ({ ...f, motivation: e.target.value }))} placeholder="What draws you to this?" />
          </Field>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#0F0D0B' }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Submitting…' : 'Submit application'}
          </button>
        </div>
      </div>
    </div>
  );
}
