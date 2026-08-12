import { useState, useEffect } from 'react';
import {
  Plus, Search, X, Star, Trash2, Pencil, Mail, Award,
  UserRound, Loader2, MapPin, DollarSign,
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextInput, PhoneInput, isValidEmail, isValidPhone } from '../../components/FormControls';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { logAdminAction } from '../../lib/auditLog';

interface Guide {
  id: string;
  portal_user_id: string | null;
  name: string;
  bio: string;
  specializations: string[];
  languages: string[];
  experience_years: number;
  rating: number;
  total_tours: number;
  available: boolean;
  profile_picture: string | null;
  email: string;
  phone: string;
  operating_region: string;
  max_engagements_per_day: number;
  created_at: string;
}

const SPECIALIZATION_PRESETS = [
  'Wildlife', 'Birding', 'Nature & Hiking', 'History', 'Culture', 'Gorilla Trekking',
  'Photography', 'Adventure', 'City Tours', 'Community Tourism', 'Art & Craft', 'Cuisine',
];
const LANGUAGE_PRESETS = ['English', 'Kinyarwanda', 'French', 'Swahili', 'German', 'Mandarin'];
const REGION_PRESETS = [
  'Kigali',
  'Northern — Musanze / Volcanoes',
  'Eastern — Akagera',
  'Southern — Nyungwe / Huye',
  'Western — Kivu / Rubavu',
  'Nationwide',
];

type FormState = {
  name: string;
  email: string;
  phone: string;
  bio: string;
  specializations: string[];
  languages: string[];
  operating_region: string;
  experience_years: string;
  max_engagements_per_day: string;
  profile_picture: string;
  available: boolean;
};

const EMPTY_FORM: FormState = {
  name: '', email: '', phone: '', bio: '',
  specializations: [], languages: [], operating_region: '',
  experience_years: '', max_engagements_per_day: '1',
  profile_picture: '', available: true,
};

export function GuidesPage() {
  const { user } = useAuth();
  const opsUser = user as PortalUser;
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Guide | null>(null);
  const [recordingPaymentFor, setRecordingPaymentFor] = useState<Guide | null>(null);

  useEffect(() => { loadGuides(); }, []);

  async function loadGuides() {
    setLoading(true);
    const { data } = await supabase
      .from('guides')
      .select('*')
      .order('created_at', { ascending: false });
    setGuides((data as Guide[]) || []);
    setLoading(false);
  }

  function openCreate() { setEditing(null); setShowForm(true); }
  function openEdit(g: Guide) { setEditing(g); setShowForm(true); }

  async function toggleAvailable(g: Guide) {
    setGuides(prev => prev.map(x => x.id === g.id ? { ...x, available: !x.available } : x));
    await supabase.from('guides').update({ available: !g.available }).eq('id', g.id);
  }

  const filtered = guides.filter(g => {
    const q = filter.toLowerCase();
    return !q || g.name.toLowerCase().includes(q) ||
      (g.specializations || []).some(s => s.toLowerCase().includes(q)) ||
      (g.email || '').toLowerCase().includes(q);
  });

  const availableCount = guides.filter(g => g.available).length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Guides</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Your shared pool of guides — {guides.length} total · {availableCount} available. Assign them to attractions when you create them.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Guide
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-neutral-500">{filtered.length} shown</div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by name, specialty..."
            className="pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <UserRound className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <div className="text-sm font-medium text-neutral-900 mb-1">
            {filter ? 'No guides match your filter' : 'No guides yet'}
          </div>
          <div className="text-xs text-neutral-500 mb-4">
            {filter ? 'Try a different search.' : 'Create your first guide to start building the pool.'}
          </div>
          {!filter && (
            <Button variant="secondary" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1.5" />
              New Guide
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(g => (
            <Card key={g.id} className="p-4">
              <div className="flex items-start gap-3">
                {g.profile_picture ? (
                  <img src={g.profile_picture} alt={g.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-neutral-200 flex items-center justify-center text-sm text-neutral-500 flex-shrink-0">
                    {(g.name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-900 truncate">{g.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {Number(g.rating || 0).toFixed(1)}
                    </span>
                    <span>·</span>
                    <span>{g.experience_years || 0}y exp</span>
                    <span>·</span>
                    <span>{g.total_tours || 0} tours</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleAvailable(g)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                    g.available
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                  }`}
                  title="Toggle availability"
                >
                  {g.available ? 'Available' : 'Off duty'}
                </button>
              </div>

              {g.specializations?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {g.specializations.slice(0, 4).map(s => (
                    <span key={s} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full text-[10px]">{s}</span>
                  ))}
                  {g.specializations.length > 4 && (
                    <span className="px-2 py-0.5 bg-neutral-100 text-neutral-400 rounded-full text-[10px]">+{g.specializations.length - 4}</span>
                  )}
                </div>
              )}

              {g.operating_region && (
                <div className="flex items-center gap-1 mt-2 text-[11px] text-neutral-600">
                  <MapPin className="w-3 h-3 text-neutral-400" />{g.operating_region}
                </div>
              )}

              <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500">
                <span className="flex items-center gap-1"><Award className="w-3 h-3" />{g.max_engagements_per_day}/day quota</span>
                {g.languages?.length > 0 && <span className="truncate">{g.languages.join(', ')}</span>}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-100">
                <button
                  onClick={() => openEdit(g)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <DeleteGuideButton guide={g} onDeleted={loadGuides} />
                <button
                  onClick={() => setRecordingPaymentFor(g)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Pay
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <GuideFormDrawer
          guide={editing}
          opsUserId={opsUser?.id || ''}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadGuides(); }}
        />
      )}

      {recordingPaymentFor && (
        <RecordPaymentModal
          guide={recordingPaymentFor}
          opsUserId={opsUser?.id || ''}
          onClose={() => setRecordingPaymentFor(null)}
        />
      )}
    </div>
  );
}

function RecordPaymentModal({ guide, opsUserId, onClose }: { guide: Guide; opsUserId: string; onClose: () => void }) {
  const { user } = useAuth();
  const me = user as PortalUser;
  const [type, setType] = useState<'tip' | 'salary'>('tip');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = parseFloat(amount) || 0;

  async function handleSave() {
    if (parsed <= 0) { setError('Enter an amount greater than zero.'); return; }
    setSaving(true);
    setError(null);

    const { error: e } = type === 'tip'
      ? await supabase.from('guide_tips').insert({
          institution_id: opsUserId,
          guide_id: guide.id,
          tip_amount: parsed,
          status: 'paid',
          notes: description.trim() || 'Recorded by Operations',
        })
      : await supabase.from('guide_salary_payments').insert({
          institution_id: opsUserId,
          guide_id: guide.id,
          amount: parsed,
          description: description.trim() || 'Salary payment',
          payment_method: 'bank_transfer',
          status: 'paid',
        });

    if (e) {
      setError(e.message || 'Failed to record payment.');
      setSaving(false);
      return;
    }
    logAdminAction({ actor: me, action: type === 'tip' ? 'guide.tip.record' : 'guide.salary.record', targetType: 'guide', targetId: guide.id, details: { amount: parsed, name: guide.name } });
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between p-5 border-b border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-900">Record payment — {guide.name}</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit">
              {(['tip', 'salary'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${type === t ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Amount (USD)</label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">{type === 'tip' ? 'Note' : 'Description'} (optional)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={type === 'tip' ? 'e.g. Cash tip from Akagera group' : 'e.g. August salary'}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <div className="flex gap-3 px-5 pb-5">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors">Cancel</button>
            <button
              disabled={saving || parsed <= 0}
              onClick={handleSave}
              className="flex-1 py-2.5 text-sm font-medium bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Record ${parsed.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function DeleteGuideButton({ guide, onDeleted }: { guide: Guide; onDeleted: () => void }) {
  const { user } = useAuth();
  const me = user as PortalUser;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await supabase.from('guides').delete().eq('id', guide.id);
    logAdminAction({ actor: me, action: 'guide.delete', targetType: 'guide', targetId: guide.id, details: { name: guide.name } });
    setDeleting(false);
    onDeleted();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
      >
        {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
        Confirm
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-2.5 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50"
      >
        Cancel
      </button>
    </div>
  );
}

function GuideFormDrawer({
  guide, opsUserId, onClose, onSaved,
}: { guide: Guide | null; opsUserId: string; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const me = user as PortalUser;
  const [form, setForm] = useState<FormState>(
    guide
      ? {
          name: guide.name || '',
          email: guide.email || '',
          phone: guide.phone || '',
          bio: guide.bio || '',
          specializations: guide.specializations || [],
          languages: guide.languages || [],
          operating_region: guide.operating_region || '',
          experience_years: String(guide.experience_years ?? ''),
          max_engagements_per_day: String(guide.max_engagements_per_day ?? 1),
          profile_picture: guide.profile_picture || '',
          available: guide.available ?? true,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleIn(list: 'specializations' | 'languages', value: string) {
    setForm(p => ({
      ...p,
      [list]: p[list].includes(value) ? p[list].filter(x => x !== value) : [...p[list], value],
    }));
  }

  const emailInvalid = !!form.email && !isValidEmail(form.email);
  const phoneInvalid = !!form.phone && !isValidPhone(form.phone);

  async function handleSave() {
    if (!form.name.trim()) { setError('Guide name is required.'); return; }
    if (emailInvalid) { setError('Enter a valid email address.'); return; }
    if (phoneInvalid) { setError('Enter a valid phone number.'); return; }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      bio: form.bio.trim(),
      specializations: form.specializations,
      languages: form.languages,
      operating_region: form.operating_region,
      experience_years: parseInt(form.experience_years) || 0,
      max_engagements_per_day: parseInt(form.max_engagements_per_day) || 1,
      profile_picture: form.profile_picture.trim() || null,
      available: form.available,
      updated_at: new Date().toISOString(),
    };

    // Write, with a graceful fallback if the operating_region migration
    // hasn't been applied yet (so guide creation never hard-breaks).
    const write = (body: Record<string, unknown>) =>
      guide
        ? supabase.from('guides').update(body).eq('id', guide.id)
        : supabase.from('guides').insert({ ...body, portal_user_id: opsUserId });

    let { error: e } = await write(payload);
    if (e && /operating_region/i.test(e.message)) {
      const { operating_region: _omit, ...rest } = payload;
      void _omit;
      ({ error: e } = await write(rest));
    }

    if (e) {
      setError(e.message || 'Failed to save guide.');
      setSaving(false);
      return;
    }
    logAdminAction({ actor: me, action: guide ? 'guide.update' : 'guide.create', targetType: 'guide', targetId: guide?.id, details: { name: payload.name } });
    onSaved();
  }

  const initials = (form.name || '?').trim()[0]?.toUpperCase() || '?';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-start justify-between px-8 py-5 border-b border-neutral-200">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
              <UserRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 leading-tight">{guide ? 'Edit guide' : 'New guide'}</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Add a guide to your shared pool — assign them to attractions later.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-7 space-y-8">
          {/* Identity */}
          <section>
            <SectionHead>Identity &amp; contact</SectionHead>
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0 text-center">
                {form.profile_picture ? (
                  <img src={form.profile_picture} alt="" className="w-20 h-20 rounded-2xl object-cover border border-neutral-200" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-2xl font-semibold text-neutral-400">{initials}</div>
                )}
                <div className="text-[10px] text-neutral-400 mt-1.5">Preview</div>
              </div>
              <div className="flex-1 space-y-4">
                <Field label="Full name" required>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g. Jean-Paul Uwimana" />
                </Field>
                <Field label="Photo URL" hint="Shown to travelers on the guide's profile.">
                  <input value={form.profile_picture} onChange={e => setForm(p => ({ ...p, profile_picture: e.target.value }))} className="input" placeholder="https://..." />
                </Field>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5 mt-4">
              <Field label="Email" error={emailInvalid ? 'Enter a valid email address.' : null}>
                <TextInput icon={Mail} type="email" value={form.email} invalid={emailInvalid} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="guide@email.com" />
              </Field>
              <Field label="Phone" hint="Used to coordinate bookings (WhatsApp)." error={phoneInvalid ? 'Enter a valid phone number.' : null}>
                <PhoneInput value={form.phone} invalid={phoneInvalid} onChange={v => setForm(p => ({ ...p, phone: v }))} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Operating region" hint="Where they're based / operate — used to match guides to nearby attractions.">
                <select value={form.operating_region} onChange={e => setForm(p => ({ ...p, operating_region: e.target.value }))} className="input">
                  <option value="">Select a region…</option>
                  {REGION_PRESETS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>
          </section>

          {/* Expertise */}
          <section>
            <SectionHead>Expertise</SectionHead>
            <div className="space-y-4">
              <Field label="Specializations" hint="What they're great at — used to match them to the right attractions.">
                <ChipGroup options={SPECIALIZATION_PRESETS} selected={form.specializations} onToggle={v => toggleIn('specializations', v)} />
              </Field>
              <Field label="Languages" hint="Languages they can guide in — used to match travelers.">
                <ChipGroup options={LANGUAGE_PRESETS} selected={form.languages} onToggle={v => toggleIn('languages', v)} />
              </Field>
              <Field label="Short bio" hint="A line or two shown on their public profile.">
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} className="input resize-none" placeholder="Experience, style, what makes their tours special." />
              </Field>
            </div>
          </section>

          {/* Capacity & status */}
          <section>
            <SectionHead>Capacity &amp; status</SectionHead>
            <div className="grid grid-cols-2 gap-5">
              <Field label="Years of experience">
                <input type="number" min="0" value={form.experience_years} onChange={e => setForm(p => ({ ...p, experience_years: e.target.value }))} className="input" placeholder="0" />
              </Field>
              <Field label="Daily quota" hint="Max separate tours this guide can run per day.">
                <input type="number" min="1" value={form.max_engagements_per_day} onChange={e => setForm(p => ({ ...p, max_engagements_per_day: e.target.value }))} className="input" placeholder="1" />
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 mt-4">
              <div>
                <div className="text-sm font-medium text-neutral-800">Available for assignments</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Off-duty guides won't be offered for new bookings.</div>
              </div>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, available: !p.available }))}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.available ? 'bg-emerald-500' : 'bg-neutral-300'}`}
                aria-pressed={form.available}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.available ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          </section>

          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} className="px-5">Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving} className="px-6">
            {saving ? 'Saving…' : guide ? 'Save changes' : 'Create guide'}
          </Button>
        </div>
      </div>

      <style>{`
        .input{width:100%;padding:0.6rem 0.8rem;font-size:0.8125rem;color:#1f2937;border:1px solid #d4d4d4;border-radius:0.6rem;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s}
        .input::placeholder{color:#9ca3af}
        .input:focus{border-color:#64748b;box-shadow:0 0 0 3px rgba(100,116,139,.15)}
        @keyframes slidein{from{transform:translateX(24px);opacity:.4}to{transform:translateX(0);opacity:1}}
        .animate-slide-in{animation:slidein .22s ease-out}
      `}</style>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">{children}</div>
  );
}

function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error
        ? <p className="text-[11px] text-red-600 mt-1">{error}</p>
        : hint ? <p className="text-[11px] text-neutral-400 mt-1">{hint}</p> : null}
    </div>
  );
}

function ChipGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              on ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default GuidesPage;
