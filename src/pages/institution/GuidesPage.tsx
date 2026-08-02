import { useState, useEffect } from 'react';
import { UserPlus, Star, Languages, Award, Clock, ToggleLeft, ToggleRight, Trash2, ArrowLeft, CreditCard as Edit2, Check, X, CalendarClock, Mail } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { CreateGuideForm } from '../../components/CreateGuideForm';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

interface Guide {
  id: string;
  portal_user_id: string;
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
  tip: number;
  created_at: string;
}

interface GuideBookingStat {
  guideId: string;
  bookings: number;
  visitors: number;
}

interface GuideSchedule {
  id: string;
  guide_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function GuidesPage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const [guides, setGuides] = useState<Guide[]>([]);
  const [stats, setStats] = useState<Map<string, GuideBookingStat>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [schedulingGuide, setSchedulingGuide] = useState<Guide | null>(null);

  useEffect(() => {
    if (userId) loadGuides();
  }, [userId]);

  async function loadGuides() {
    if (!userId) return;
    setLoading(true);
    try {
      const [guidesRes, bookingsRes] = await Promise.all([
        supabase.from('guides').select('*').eq('portal_user_id', userId).order('created_at', { ascending: false }),
        supabase.from('bookings').select('guide_id, guests').eq('institution_id', userId).not('guide_id', 'is', null),
      ]);
      setGuides(guidesRes.data || []);

      const statMap = new Map<string, GuideBookingStat>();
      (bookingsRes.data || []).forEach((b: { guide_id: string; guests: number }) => {
        if (!b.guide_id) return;
        const existing = statMap.get(b.guide_id) || { guideId: b.guide_id, bookings: 0, visitors: 0 };
        statMap.set(b.guide_id, { ...existing, bookings: existing.bookings + 1, visitors: existing.visitors + b.guests });
      });
      setStats(statMap);
    } catch (err) {
      console.error('Error loading guides:', err);
    }
    setLoading(false);
  }

  async function toggleAvailability(guide: Guide) {
    setTogglingId(guide.id);
    await supabase.from('guides').update({ available: !guide.available }).eq('id', guide.id);
    setGuides(prev => prev.map(g => g.id === guide.id ? { ...g, available: !g.available } : g));
    if (selectedGuide?.id === guide.id) setSelectedGuide(g => g ? { ...g, available: !g.available } : null);
    setTogglingId(null);
  }

  async function deleteGuide(id: string) {
    if (!confirm('Delete this guide? This cannot be undone.')) return;
    setDeletingId(id);
    await supabase.from('program_guides').delete().eq('guide_id', id);
    await supabase.from('guides').delete().eq('id', id);
    setGuides(prev => prev.filter(g => g.id !== id));
    if (selectedGuide?.id === id) setSelectedGuide(null);
    setDeletingId(null);
  }

  if (selectedGuide && !editingGuide) {
    const s = stats.get(selectedGuide.id);
    return (
      <GuideDetail
        guide={selectedGuide}
        bookings={s?.bookings || 0}
        visitors={s?.visitors || 0}
        toggling={togglingId === selectedGuide.id}
        deleting={deletingId === selectedGuide.id}
        onBack={() => setSelectedGuide(null)}
        onToggle={() => toggleAvailability(selectedGuide)}
        onDelete={() => deleteGuide(selectedGuide.id)}
        onEdit={() => setEditingGuide(selectedGuide)}
        onSchedule={() => setSchedulingGuide(selectedGuide)}
      />
    );
  }

  if (editingGuide) {
    return (
      <EditGuideView
        guide={editingGuide}
        onBack={() => setEditingGuide(null)}
        onSaved={async (updated) => {
          setGuides(prev => prev.map(g => g.id === updated.id ? updated : g));
          setSelectedGuide(updated);
          setEditingGuide(null);
        }}
      />
    );
  }

  if (schedulingGuide) {
    return (
      <GuideScheduleView
        guide={schedulingGuide}
        onBack={() => setSchedulingGuide(null)}
      />
    );
  }

  const available = guides.filter(g => g.available).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Guides & Staff</h1>
          <p className="text-xs text-neutral-500 mt-0.5">{guides.length} guides · {available} available</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(true)}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Add Guide
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      ) : guides.length === 0 ? (
        <Card className="p-12 text-center">
          <UserPlus className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <div className="text-sm font-medium text-neutral-900 mb-1">No guides yet</div>
          <div className="text-xs text-neutral-500 mb-5">Add guides to assign them to programs and tours.</div>
          <Button size="sm" onClick={() => setShowCreateForm(true)}>Add Your First Guide</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guides.map(guide => {
            const s = stats.get(guide.id);
            return (
              <GuideCard
                key={guide.id}
                guide={guide}
                stat={s}
                deleting={deletingId === guide.id}
                onClick={() => setSelectedGuide(guide)}
                onDelete={() => deleteGuide(guide.id)}
              />
            );
          })}
        </div>
      )}

      {showCreateForm && userId && (
        <CreateGuideForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={loadGuides}
          portalUserId={userId}
        />
      )}
    </div>
  );
}

function GuideCard({ guide, stat, deleting, onClick, onDelete }: {
  guide: Guide;
  stat: GuideBookingStat | undefined;
  deleting: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(true);
  }

  function handleConfirm(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete();
  }

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(false);
  }

  return (
    <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer relative group" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-700 flex-shrink-0 overflow-hidden">
            {guide.profile_picture ? (
              <img src={guide.profile_picture} alt={guide.name} className="w-full h-full object-cover" />
            ) : (
              <span>{guide.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">{guide.name}</div>
            <div className="text-xs text-neutral-500">{guide.experience_years}y experience</div>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${guide.available ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
          {guide.available ? 'Available' : 'Off duty'}
        </span>
      </div>

      {guide.email && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-neutral-600">
          <Mail className="w-3 h-3" />
          <span className="truncate">{guide.email}</span>
        </div>
      )}

      {guide.bio && (
        <p className="text-xs text-neutral-500 mb-3 line-clamp-2">{guide.bio}</p>
      )}

      <div className="flex items-center gap-3 mb-3 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          {guide.rating.toFixed(1)} ({guide.total_tours} tours)
        </span>
        {stat && stat.bookings > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {stat.bookings} bookings
          </span>
        )}
        {guide.tip > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
            Tip ${guide.tip.toFixed(2)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {guide.specializations.slice(0, 3).map(sp => (
          <span key={sp} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{sp}</span>
        ))}
        {guide.specializations.length > 3 && (
          <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full">+{guide.specializations.length - 3}</span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
        <span>{guide.languages.join(', ')}</span>
        {confirmDelete ? (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <span className="text-rose-600 font-medium mr-1">Delete?</span>
            <button
              onClick={handleConfirm}
              disabled={deleting}
              className="px-2 py-0.5 text-xs bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
              {deleting ? '...' : 'Yes'}
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-0.5 text-xs border border-neutral-300 rounded-md hover:bg-neutral-100 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={handleDeleteClick}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-300 hover:text-rose-500 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </Card>
  );
}

function GuideDetail({ guide, bookings, visitors, toggling, deleting, onBack, onToggle, onDelete, onEdit, onSchedule }: {
  guide: Guide;
  bookings: number;
  visitors: number;
  toggling: boolean;
  deleting: boolean;
  onBack: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSchedule: () => void;
}) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to guides
      </button>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-lg font-semibold text-neutral-700 overflow-hidden flex-shrink-0">
            {guide.profile_picture ? (
              <img src={guide.profile_picture} alt={guide.name} className="w-full h-full object-cover" />
            ) : (
              <span>{guide.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">{guide.name}</h1>
            <p className="text-sm text-neutral-500">{guide.experience_years} years of experience</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSchedule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Schedule
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 border border-rose-200 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-amber-50">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-xs text-neutral-500">Rating</span>
          </div>
          <div className="text-xl font-semibold text-neutral-900">{guide.rating.toFixed(1)}</div>
          <div className="text-xs text-neutral-500">{guide.total_tours} tours completed</div>
        </Card>
        <Card className="p-4 bg-blue-50">
          <div className="text-xs text-neutral-500 mb-1">Bookings via Platform</div>
          <div className="text-xl font-semibold text-neutral-900">{bookings}</div>
          <div className="text-xs text-neutral-500">{visitors} visitors guided</div>
        </Card>
        <Card className="p-4 bg-emerald-50">
          <div className="text-xs text-neutral-500 mb-1">Availability</div>
          <div className="text-xl font-semibold text-neutral-900">{guide.available ? 'Available' : 'Off Duty'}</div>
          <button
            onClick={onToggle}
            disabled={toggling}
            className="mt-1 text-xs text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {guide.available ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
            {toggling ? 'Updating...' : 'Toggle status'}
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {guide.bio && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Biography</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{guide.bio}</p>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-neutral-400" />
              Specializations
            </h3>
            <div className="flex flex-wrap gap-2">
              {guide.specializations.map(sp => (
                <span key={sp} className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 rounded-full">{sp}</span>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Languages className="w-4 h-4 text-neutral-400" />
              Languages Spoken
            </h3>
            <div className="flex flex-wrap gap-2">
              {guide.languages.map(lang => (
                <span key={lang} className="px-3 py-1 text-xs font-medium bg-neutral-100 text-neutral-700 rounded-full">{lang}</span>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={onToggle}
                disabled={toggling}
                className={`w-full px-4 py-2 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                  guide.available
                    ? 'text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    : 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                {toggling ? 'Updating...' : guide.available ? 'Mark as Off Duty' : 'Mark as Available'}
              </button>
              <button
                onClick={onEdit}
                className="w-full px-4 py-2 text-xs font-medium rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
              >
                Edit Profile
              </button>
              <button
                onClick={onSchedule}
                className="w-full px-4 py-2 text-xs font-medium rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <CalendarClock className="w-3.5 h-3.5" />
                Manage Schedule
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Details</h3>
            <div className="space-y-3">
              {guide.email && (
                <div>
                  <div className="text-xs text-neutral-400 mb-0.5">Email</div>
                  <div className="text-sm text-neutral-900 break-all">{guide.email}</div>
                </div>
              )}
              {guide.phone && (
                <div>
                  <div className="text-xs text-neutral-400 mb-0.5">Phone</div>
                  <div className="text-sm text-neutral-900">{guide.phone}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-neutral-400 mb-0.5">Experience</div>
                <div className="text-sm text-neutral-900">{guide.experience_years} years</div>
              </div>
              <div>
                <div className="text-xs text-neutral-400 mb-0.5">Tours Completed</div>
                <div className="text-sm text-neutral-900">{guide.total_tours}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-400 mb-0.5">Booking Tip</div>
                <div className={`text-sm font-medium ${guide.tip > 0 ? 'text-amber-700' : 'text-neutral-400'}`}>
                  {guide.tip > 0 ? `$${guide.tip.toFixed(2)} per booking` : 'No tip assigned'}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-400 mb-0.5">Added</div>
                <div className="text-sm text-neutral-900">{new Date(guide.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EditGuideView({ guide, onBack, onSaved }: {
  guide: Guide;
  onBack: () => void;
  onSaved: (updated: Guide) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: guide.name,
    bio: guide.bio || '',
    experience_years: guide.experience_years,
    specializationsText: guide.specializations.join(', '),
    languagesText: guide.languages.join(', '),
    tip: guide.tip ?? 0,
  });

  const update = (field: string, value: string | number) => setForm(f => ({ ...f, [field]: value }));

  async function save() {
    setSaving(true);
    const specializations = form.specializationsText.split(',').map(s => s.trim()).filter(Boolean);
    const languages = form.languagesText.split(',').map(s => s.trim()).filter(Boolean);
    const { data } = await supabase
      .from('guides')
      .update({ name: form.name, bio: form.bio, experience_years: form.experience_years, specializations, languages, tip: form.tip })
      .eq('id', guide.id)
      .select('*')
      .maybeSingle();
    if (data) onSaved(data as Guide);
    setSaving(false);
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Cancel editing
      </button>

      <h1 className="text-lg font-semibold text-neutral-900 mb-6">Edit Guide: {guide.name}</h1>

      <div className="max-w-2xl space-y-5">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Bio</label>
              <textarea
                value={form.bio}
                onChange={e => update('bio', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">Years of Experience</label>
                <input
                  type="number"
                  min={0}
                  value={form.experience_years}
                  onChange={e => update('experience_years', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">Booking Tip ($)</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.tip}
                    onChange={e => update('tip', e.target.value === '' ? 0 : Number(e.target.value))}
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-1">Auto-added to each booking with this guide</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Skills & Languages</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Specializations (comma-separated)</label>
              <input
                type="text"
                value={form.specializationsText}
                onChange={e => update('specializationsText', e.target.value)}
                placeholder="e.g. Wildlife, Birdwatching, History"
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Languages Spoken (comma-separated)</label>
              <input
                type="text"
                value={form.languagesText}
                onChange={e => update('languagesText', e.target.value)}
                placeholder="e.g. English, French, Swahili"
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function GuideScheduleView({ guide, onBack }: { guide: Guide; onBack: () => void }) {
  const [schedules, setSchedules] = useState<GuideSchedule[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, [guide.id]);

  async function loadSchedules() {
    setLoading(true);
    const { data } = await supabase
      .from('guide_schedules')
      .select('*')
      .eq('guide_id', guide.id);

    const existing = data || [];
    const merged = DAYS_OF_WEEK.map(day => {
      const found = existing.find(s => s.day_of_week === day);
      return found || {
        id: '',
        guide_id: guide.id,
        day_of_week: day,
        start_time: '09:00',
        end_time: '17:00',
        is_working: day !== 'Saturday' && day !== 'Sunday',
      };
    });
    setSchedules(merged as GuideSchedule[]);
    setLoading(false);
  }

  function updateDay(dayIndex: number, field: keyof GuideSchedule, value: any) {
    setSchedules(prev => prev.map((s, i) => i === dayIndex ? { ...s, [field]: value } : s));
  }

  async function saveSchedules() {
    setSaving(true);
    try {
      for (const s of schedules) {
        if (s.id) {
          await supabase.from('guide_schedules').update({
            start_time: s.start_time,
            end_time: s.end_time,
            is_working: s.is_working,
            updated_at: new Date().toISOString(),
          }).eq('id', s.id);
        } else {
          await supabase.from('guide_schedules').upsert({
            guide_id: guide.id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_working: s.is_working,
          }, { onConflict: 'guide_id,day_of_week' });
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await loadSchedules();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  }

  const workingDays = schedules.filter(s => s.is_working).length;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to {guide.name}
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Weekly Schedule</h1>
          <p className="text-xs text-neutral-500 mt-0.5">{guide.name} &bull; {workingDays} working day{workingDays !== 1 ? 's' : ''} per week</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
          <button
            onClick={saveSchedules}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-neutral-100">
            {schedules.map((schedule, i) => (
              <div key={schedule.day_of_week} className={`flex items-center gap-4 px-5 py-4 ${schedule.is_working ? 'bg-white' : 'bg-neutral-50'}`}>
                <div className="w-24 flex-shrink-0">
                  <div className={`text-sm font-medium ${schedule.is_working ? 'text-neutral-900' : 'text-neutral-400'}`}>
                    {schedule.day_of_week}
                  </div>
                </div>

                <button
                  onClick={() => updateDay(i, 'is_working', !schedule.is_working)}
                  className={`relative w-10 h-5 rounded-full flex-shrink-0 transition-colors ${schedule.is_working ? 'bg-emerald-500' : 'bg-neutral-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${schedule.is_working ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>

                {schedule.is_working ? (
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-neutral-500 w-10">Start</label>
                      <input
                        type="time"
                        value={schedule.start_time}
                        onChange={e => updateDay(i, 'start_time', e.target.value)}
                        className="px-2 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                      />
                    </div>
                    <span className="text-neutral-300">—</span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-neutral-500 w-8">End</label>
                      <input
                        type="time"
                        value={schedule.end_time}
                        onChange={e => updateDay(i, 'end_time', e.target.value)}
                        className="px-2 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                      />
                    </div>
                    <span className="text-xs text-neutral-400 ml-2">
                      {(() => {
                        const [sh, sm] = schedule.start_time.split(':').map(Number);
                        const [eh, em] = schedule.end_time.split(':').map(Number);
                        const mins = (eh * 60 + em) - (sh * 60 + sm);
                        if (mins <= 0) return '';
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        return m === 0 ? `${h}h` : `${h}h ${m}m`;
                      })()}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400 italic">Day off</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-4 p-4 bg-sky-50">
        <p className="text-xs text-neutral-600 leading-relaxed">
          <strong>Note:</strong> When a guide has working hours set, traveler bookings can only be made during those hours. Days marked as off will not be available for booking. Booked time slots are automatically blocked out and cannot be double-booked.
        </p>
      </Card>
    </div>
  );
}
