import { useState, useEffect, useRef } from 'react';
import { Upload, X, Loader2, Search, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PortalUser, generateUserIdCode } from '../lib/auth';
import { useToast } from './Toast';
import { Field, TextInput, TextArea, PhoneInput } from './FormControls';

// portal_users still requires email/password_hash/user_id_code (NOT NULL) even
// though an attraction never logs in — these are never surfaced anywhere.
async function randomHash(): Promise<string> {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const hashBuffer = await crypto.subtle.digest('SHA-256', random);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface CreateAttractionFormProps {
  onComplete: () => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'museum', label: 'Museum' },
  { value: 'park', label: 'Park' },
  { value: 'heritage_site', label: 'Heritage Site' },
  { value: 'landmark', label: 'Landmark' },
];

function GuidelinesInput({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  return (
    <Field label="Visitor guidelines">
      <div className="flex gap-2 mb-2">
        <TextInput value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="e.g. No flash photography" />
        <button type="button" onClick={add} className="px-4 py-2.5 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex-shrink-0">Add</button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map(v => (
            <span key={v} className="flex items-center gap-1 px-2.5 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full">
              {v}
              <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="text-neutral-400 hover:text-neutral-700"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}

interface GuideOption {
  id: string;
  name: string;
  status: string; // human label: "Unassigned" or the attraction name it's currently on
}

export function CreateAttractionForm({ onComplete, onCancel }: CreateAttractionFormProps) {
  const { user } = useAuth();
  const opsUser = user as PortalUser;
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('museum');
  const [location, setLocation] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [entryFeeAmount, setEntryFeeAmount] = useState('');
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('18:00');
  const [dailyCapacity, setDailyCapacity] = useState('500');
  const [guidelines, setGuidelines] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [guides, setGuides] = useState<GuideOption[]>([]);
  const [guideSearch, setGuideSearch] = useState('');
  const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('guides').select('id, name, portal_user_id').order('name');
      if (!data) return;
      const ownerIds = [...new Set(data.map(g => g.portal_user_id))];
      const { data: owners } = ownerIds.length
        ? await supabase.from('institution_profiles').select('portal_user_id, name').in('portal_user_id', ownerIds)
        : { data: [] as { portal_user_id: string; name: string }[] };
      const nameByOwner = new Map((owners || []).map(o => [o.portal_user_id, o.name]));
      setGuides(data.map(g => ({
        id: g.id,
        name: g.name,
        status: g.portal_user_id === opsUser?.id ? 'Unassigned' : (nameByOwner.get(g.portal_user_id) || 'Assigned elsewhere'),
      })));
    };
    load();
  }, [opsUser?.id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `attraction-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `attractions/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('listings').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(filePath);
      setCoverImage(publicUrl);
    } catch {
      showToast('Failed to upload photo', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleGuide = (id: string) => {
    setSelectedGuideIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredGuides = guides.filter(g => g.name.toLowerCase().includes(guideSearch.toLowerCase()));

  async function handleSubmit() {
    if (!name.trim() || !location.trim()) {
      showToast('Fill in the attraction name and location', 'error');
      return;
    }
    setSaving(true);

    const [userIdCode, passwordHash] = await Promise.all([generateUserIdCode('institution'), randomHash()]);
    const contactEmail = email.trim() || `attraction-${userIdCode.toLowerCase()}@internal.tahuraafrica.com`;

    const { data: newUser, error: userError } = await supabase.from('portal_users').insert({
      portal_type: 'institution',
      name: name.trim(),
      email: contactEmail,
      password_hash: passwordHash,
      user_id_code: userIdCode,
      phone: phone.trim() || null,
      is_active: true,
      created_by: opsUser?.id || null,
    }).select('id').single();

    if (userError || !newUser) {
      setSaving(false);
      showToast('Failed to create attraction', 'error');
      return;
    }

    const feeAmount = parseFloat(entryFeeAmount) || 0;
    const { error: profileError } = await supabase.from('institution_profiles').insert({
      portal_user_id: newUser.id,
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      type,
      location: location.trim(),
      cover_image: coverImage || '',
      images: coverImage ? [coverImage] : [],
      entry_fee_is_free: isFree,
      entry_fee_amount: isFree ? 0 : feeAmount,
      entry_fee: isFree ? 'Free' : String(feeAmount),
      opening_time: openingTime,
      closing_time: closingTime,
      daily_capacity: parseInt(dailyCapacity) || 0,
      guidelines,
      phone: phone.trim(),
      email: email.trim(),
      published: true,
    });

    if (profileError) {
      setSaving(false);
      showToast('Failed to create attraction profile', 'error');
      return;
    }

    if (selectedGuideIds.length > 0) {
      await supabase.from('guides').update({ portal_user_id: newUser.id }).in('id', selectedGuideIds);
    }

    setSaving(false);
    showToast('Attraction created', 'success');
    onComplete();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        {coverImage ? (
          <img src={coverImage} alt="" className="w-20 h-20 rounded-xl object-cover border border-neutral-200" />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">
            <Upload className="w-5 h-5 text-neutral-300" />
          </div>
        )}
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading…' : 'Cover photo'}
          </button>
        </div>
      </div>

      <Field label="Attraction name" required>
        <TextInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kigali Genocide Memorial" />
      </Field>

      <Field label="Tagline">
        <TextInput value={tagline} onChange={e => setTagline(e.target.value)} placeholder="A short one-liner" />
      </Field>

      <Field label="Description">
        <TextArea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What makes this attraction worth visiting..." />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <select value={type} onChange={e => setType(e.target.value)} className="w-full rounded-lg border border-neutral-300 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-200">
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Location" required>
          <TextInput value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Kigali, Gasabo" />
        </Field>
      </div>

      <div className="border-t border-neutral-100 pt-5">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Entry & hours</h3>
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setIsFree(true)} className={`flex-1 py-2.5 text-xs font-medium rounded-lg border-2 transition-all ${isFree ? 'border-neutral-900 bg-neutral-50 text-neutral-900' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}>Free entry</button>
          <button type="button" onClick={() => setIsFree(false)} className={`flex-1 py-2.5 text-xs font-medium rounded-lg border-2 transition-all ${!isFree ? 'border-neutral-900 bg-neutral-50 text-neutral-900' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}>Paid entry</button>
        </div>
        {!isFree && (
          <Field label="Entry fee (USD)">
            <TextInput type="number" min="0" step="0.01" value={entryFeeAmount} onChange={e => setEntryFeeAmount(e.target.value)} placeholder="10" />
          </Field>
        )}
        <div className="grid grid-cols-3 gap-4 mt-3">
          <Field label="Opens">
            <TextInput type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} />
          </Field>
          <Field label="Closes">
            <TextInput type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} />
          </Field>
          <Field label="Daily capacity">
            <TextInput type="number" min="0" value={dailyCapacity} onChange={e => setDailyCapacity(e.target.value)} />
          </Field>
        </div>
      </div>

      <GuidelinesInput values={guidelines} onChange={setGuidelines} />

      <div className="border-t border-neutral-100 pt-5">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Contact</h3>
        <div className="space-y-3.5">
          <Field label="Phone">
            <PhoneInput value={phone} onChange={setPhone} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="attraction@email.com" />
          </Field>
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-5">
        <h3 className="text-sm font-semibold text-neutral-900 mb-1">Assign guides</h3>
        <p className="text-xs text-neutral-400 mb-3">An attraction can have more than one guide. You can also do this later from the Guides tab.</p>
        <div className="flex items-center gap-2 px-3.5 py-2.5 border border-neutral-200 rounded-lg mb-2">
          <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <input value={guideSearch} onChange={e => setGuideSearch(e.target.value)} placeholder="Search guides by name…" className="flex-1 text-sm outline-none placeholder-neutral-400" />
        </div>
        <div className="max-h-52 overflow-y-auto space-y-1">
          {filteredGuides.length === 0 ? (
            <p className="text-xs text-neutral-400 py-4 text-center">No guides found.</p>
          ) : filteredGuides.map(g => {
            const checked = selectedGuideIds.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGuide(g.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition-colors ${checked ? 'border-neutral-900 bg-neutral-50' : 'border-transparent hover:bg-neutral-50 hover:border-neutral-200'}`}
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">{g.name}</p>
                  <p className="text-[11px] text-neutral-400">{g.status}</p>
                </div>
                {checked && <Check className="w-4 h-4 text-neutral-900 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium border border-neutral-300 rounded-xl hover:bg-neutral-50">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Attraction
        </button>
      </div>
    </div>
  );
}
