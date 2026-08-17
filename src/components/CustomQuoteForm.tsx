import { useState, useEffect, useRef } from 'react';
import { Upload, X, Plus, Trash2, Loader2, Compass, Home as HomeIcon, Route } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { Field, TextInput, TextArea, PhoneInput } from './FormControls';
import { CreatedBy, QuoteType, ItineraryDay, computeClientTotal, QUOTE_VALIDITY_PRESETS } from '../lib/customQuotes';

interface Attribution {
  partnerId?: string | null;
  hostId?: string | null;
  guideId?: string | null;
}

interface CustomQuoteFormProps {
  createdBy: CreatedBy;
  attribution: Attribution;
  onComplete: () => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: QuoteType; label: string; icon: typeof Compass }[] = [
  { value: 'experience', label: 'Experience', icon: Compass },
  { value: 'homestay', label: 'Homestay', icon: HomeIcon },
  { value: 'itinerary', label: 'Itinerary', icon: Route },
];

function TagInput({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  return (
    <Field label={label}>
      <div className="flex gap-2 mb-2">
        <TextInput value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={placeholder} />
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

export function CustomQuoteForm({ createdBy, attribution, onComplete, onCancel }: CustomQuoteFormProps) {
  const { showToast } = useToast();
  const [commissionRate, setCommissionRate] = useState(0.10);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [quoteType, setQuoteType] = useState<QuoteType>('experience');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('days');
  const [guests, setGuests] = useState('2');
  const [whatsIncluded, setWhatsIncluded] = useState<string[]>([]);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([{ day: 1, title: '', description: '' }]);

  const [netAmount, setNetAmount] = useState('');
  const [validityHours, setValidityHours] = useState(48);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  useEffect(() => {
    supabase.from('system_rules').select('value').eq('id', '7').maybeSingle().then(({ data }) => {
      if (data?.value) setCommissionRate(Number(data.value) / 100);
    });
  }, []);

  const netAmountNum = parseFloat(netAmount) || 0;
  const clientTotal = computeClientTotal(netAmountNum, commissionRate);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `quote-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `quotes/${fileName}`;
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

  function addDay() {
    setItineraryDays(d => [...d, { day: d.length + 1, title: '', description: '' }]);
  }
  function removeDay(idx: number) {
    setItineraryDays(d => d.filter((_, i) => i !== idx).map((day, i) => ({ ...day, day: i + 1 })));
  }
  function updateDay(idx: number, patch: Partial<ItineraryDay>) {
    setItineraryDays(d => d.map((day, i) => i === idx ? { ...day, ...patch } : day));
  }

  async function handleSubmit() {
    if (!title.trim() || !clientName.trim() || !clientEmail.trim() || netAmountNum <= 0) {
      showToast('Fill in the title, client details, and a valid amount', 'error');
      return;
    }
    setSaving(true);
    const validUntil = new Date(Date.now() + validityHours * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('custom_quotes').insert({
      quote_type: quoteType,
      title: title.trim(),
      description: description.trim(),
      cover_image: coverImage || null,
      duration_value: durationValue ? parseInt(durationValue) : null,
      duration_unit: durationValue ? durationUnit : null,
      guests: parseInt(guests) || 1,
      whats_included: quoteType !== 'itinerary' ? whatsIncluded : [],
      itinerary_days: quoteType === 'itinerary' ? itineraryDays.filter(d => d.title.trim()) : null,
      net_amount: netAmountNum,
      commission_rate_locked: commissionRate,
      client_total: clientTotal,
      valid_until: validUntil,
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      client_phone: clientPhone.trim() || null,
      partner_id: attribution.partnerId || null,
      host_id: attribution.hostId || null,
      guide_id: attribution.guideId || null,
      created_by: createdBy,
      status: 'draft',
    });

    setSaving(false);
    if (error) {
      showToast('Failed to create quote', 'error');
      return;
    }
    showToast('Quote created', 'success');
    onComplete();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-2">
        {TYPE_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const selected = quoteType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setQuoteType(opt.value)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${selected ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}
            >
              <Icon className={`w-5 h-5 ${selected ? 'text-neutral-900' : 'text-neutral-400'}`} />
              <span className={`text-xs font-medium ${selected ? 'text-neutral-900' : 'text-neutral-500'}`}>{opt.label}</span>
            </button>
          );
        })}
      </div>

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
          <p className="text-[11px] text-neutral-400 mt-1">Optional, but a real photo makes the quote look far more real.</p>
        </div>
      </div>

      <Field label="Title" required>
        <TextInput value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 3-Day Private Gorilla Trek & Kivu Retreat" />
      </Field>

      <Field label="Description">
        <TextArea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What makes this trip special..." />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Duration">
          <TextInput type="number" min="0" value={durationValue} onChange={e => setDurationValue(e.target.value)} placeholder="3" />
        </Field>
        <Field label="Unit">
          <select value={durationUnit} onChange={e => setDurationUnit(e.target.value as 'hours' | 'days')} className="w-full rounded-lg border border-neutral-300 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-200">
            <option value="days">Days</option>
            <option value="hours">Hours</option>
          </select>
        </Field>
        <Field label="Guests">
          <TextInput type="number" min="1" value={guests} onChange={e => setGuests(e.target.value)} />
        </Field>
      </div>

      {quoteType === 'itinerary' ? (
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-2">Day by day</label>
          <div className="space-y-3">
            {itineraryDays.map((d, i) => (
              <div key={i} className="flex gap-2 items-start p-3 bg-neutral-50 rounded-xl">
                <span className="text-xs font-bold text-neutral-500 mt-2.5 w-12 flex-shrink-0">Day {d.day}</span>
                <div className="flex-1 space-y-2">
                  <TextInput value={d.title} onChange={e => updateDay(i, { title: e.target.value })} placeholder="Arrival & Kigali city tour" />
                  <TextArea rows={2} value={d.description} onChange={e => updateDay(i, { description: e.target.value })} placeholder="Details for this day..." />
                </div>
                {itineraryDays.length > 1 && (
                  <button onClick={() => removeDay(i)} className="p-1.5 text-neutral-400 hover:text-red-600 mt-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addDay} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900">
            <Plus className="w-3.5 h-3.5" /> Add another day
          </button>
        </div>
      ) : (
        <TagInput
          label={quoteType === 'homestay' ? "What's included in the stay" : "What's included"}
          values={whatsIncluded}
          onChange={setWhatsIncluded}
          placeholder="e.g. Airport transfer"
        />
      )}

      <div className="border-t border-neutral-100 pt-5">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Pricing</h3>
        <Field label="What you want to receive" hint="Tahura's commission is added on top — the client never sees this number.">
          <TextInput type="number" min="0" step="0.01" value={netAmount} onChange={e => setNetAmount(e.target.value)} placeholder="500" />
        </Field>
        {netAmountNum > 0 && (
          <p className="mt-2 text-sm text-neutral-600">
            Client pays: <span className="font-bold text-neutral-900">${clientTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-neutral-400"> (includes {(commissionRate * 100).toFixed(0)}% platform fee)</span>
          </p>
        )}

        <div className="mt-4">
          <label className="block text-xs font-medium text-neutral-700 mb-2">Payment link valid for</label>
          <div className="flex flex-wrap gap-2">
            {QUOTE_VALIDITY_PRESETS.map(p => (
              <button
                key={p.hours}
                onClick={() => setValidityHours(p.hours)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${validityHours === p.hours ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-5">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Client details</h3>
        <div className="space-y-3.5">
          <Field label="Client name" required>
            <TextInput value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client's full name" />
          </Field>
          <Field label="Client email" required>
            <TextInput type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" />
          </Field>
          <Field label="Client phone">
            <PhoneInput value={clientPhone} onChange={setClientPhone} />
          </Field>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium border border-neutral-300 rounded-xl hover:bg-neutral-50">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Quote
        </button>
      </div>
    </div>
  );
}
