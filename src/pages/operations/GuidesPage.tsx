import { useState, useEffect } from 'react';
import {
  Plus, Search, X, Star, Trash2, Pencil, Mail, Phone, Award,
  Check, UserRound, Loader2,
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

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
  max_engagements_per_day: number;
  created_at: string;
}

const SPECIALIZATION_PRESETS = [
  'Wildlife', 'Birding', 'Nature & Hiking', 'History', 'Culture', 'Gorilla Trekking',
  'Photography', 'Adventure', 'City Tours', 'Community Tourism', 'Art & Craft', 'Cuisine',
];
const LANGUAGE_PRESETS = ['English', 'Kinyarwanda', 'French', 'Swahili', 'German', 'Mandarin'];

type FormState = {
  name: string;
  email: string;
  phone: string;
  bio: string;
  specializations: string[];
  languages: string[];
  experience_years: string;
  max_engagements_per_day: string;
  profile_picture: string;
  available: boolean;
};

const EMPTY_FORM: FormState = {
  name: '', email: '', phone: '', bio: '',
  specializations: [], languages: [],
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

              <div className="flex items-center gap-3 mt-3 text-[11px] text-neutral-500">
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
    </div>
  );
}

function DeleteGuideButton({ guide, onDeleted }: { guide: Guide; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await supabase.from('guides').delete().eq('id', guide.id);
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
  const [form, setForm] = useState<FormState>(
    guide
      ? {
          name: guide.name || '',
          email: guide.email || '',
          phone: guide.phone || '',
          bio: guide.bio || '',
          specializations: guide.specializations || [],
          languages: guide.languages || [],
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

  async function handleSave() {
    if (!form.name.trim()) { setError('Guide name is required.'); return; }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      bio: form.bio.trim(),
      specializations: form.specializations,
      languages: form.languages,
      experience_years: parseInt(form.experience_years) || 0,
      max_engagements_per_day: parseInt(form.max_engagements_per_day) || 1,
      profile_picture: form.profile_picture.trim() || null,
      available: form.available,
      updated_at: new Date().toISOString(),
    };

    try {
      if (guide) {
        const { error: e } = await supabase.from('guides').update(payload).eq('id', guide.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('guides').insert({ ...payload, portal_user_id: opsUserId });
        if (e) throw e;
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save guide.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-base font-semibold text-neutral-900">{guide ? 'Edit Guide' : 'New Guide'}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <Field label="Full name" required>
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="input"
              placeholder="e.g. Jean-Paul Uwimana"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input pl-9" placeholder="guide@email.com" />
              </div>
            </Field>
            <Field label="Phone">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input pl-9" placeholder="+250 ..." />
              </div>
            </Field>
          </div>

          <Field label="Short bio">
            <textarea
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              rows={3}
              className="input resize-none"
              placeholder="A sentence or two about this guide's experience and style."
            />
          </Field>

          <Field label="Specializations">
            <ChipGroup options={SPECIALIZATION_PRESETS} selected={form.specializations} onToggle={v => toggleIn('specializations', v)} />
          </Field>

          <Field label="Languages">
            <ChipGroup options={LANGUAGE_PRESETS} selected={form.languages} onToggle={v => toggleIn('languages', v)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Years of experience">
              <input type="number" min="0" value={form.experience_years} onChange={e => setForm(p => ({ ...p, experience_years: e.target.value }))} className="input" placeholder="0" />
            </Field>
            <Field label="Daily quota (max engagements/day)">
              <input type="number" min="1" value={form.max_engagements_per_day} onChange={e => setForm(p => ({ ...p, max_engagements_per_day: e.target.value }))} className="input" placeholder="1" />
            </Field>
          </div>

          <Field label="Profile picture URL">
            <input value={form.profile_picture} onChange={e => setForm(p => ({ ...p, profile_picture: e.target.value }))} className="input" placeholder="https://..." />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, available: !p.available }))}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                form.available ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-neutral-300'
              }`}
            >
              {form.available && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className="text-xs text-neutral-700">Available for assignments</span>
          </label>

          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Saving...' : guide ? 'Save changes' : 'Create guide'}
          </Button>
        </div>
      </div>

      <style>{`.input{width:100%;padding:0.55rem 0.75rem;font-size:0.8125rem;border:1px solid #d4d4d4;border-radius:0.5rem;background:#fff;outline:none}.input:focus{border-color:#a3a3a3;box-shadow:0 0 0 2px #e5e5e5}`}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
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
