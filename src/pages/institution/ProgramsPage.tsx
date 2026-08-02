import { useState, useEffect } from 'react';
import { Plus, Clock, Users, DollarSign, ArrowLeft, CreditCard as Edit2, Trash2, Check, X, ToggleLeft, ToggleRight, UserCheck, Upload } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { CreateProgramForm } from '../../components/CreateProgramForm';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

interface Program {
  id: string;
  portal_user_id: string;
  title: string;
  description: string;
  duration_hours: number;
  max_participants: number;
  price_per_person: number;
  what_included: string[];
  what_to_bring: string[];
  images: string[];
  active: boolean;
  created_at: string;
}

interface Guide {
  id: string;
  name: string;
  available: boolean;
  specializations: string[];
}

interface ProgramWithGuides extends Program {
  guides: Guide[];
  booking_count: number;
}

export function ProgramsPage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const [programs, setPrograms] = useState<ProgramWithGuides[]>([]);
  const [allGuides, setAllGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramWithGuides | null>(null);
  const [editingProgram, setEditingProgram] = useState<ProgramWithGuides | null>(null);

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  async function loadData() {
    if (!userId) return;
    setLoading(true);
    try {
      const [programsRes, guidesRes, pgRes, bookingsRes] = await Promise.all([
        supabase.from('programs').select('*').eq('portal_user_id', userId).order('created_at', { ascending: false }),
        supabase.from('guides').select('id, name, available, specializations').eq('portal_user_id', userId),
        supabase.from('program_guides').select('program_id, guide_id'),
        supabase.from('bookings').select('program_id').eq('institution_id', userId).not('program_id', 'is', null),
      ]);

      const guides: Guide[] = guidesRes.data || [];
      setAllGuides(guides);

      const guideMap = new Map(guides.map(g => [g.id, g]));
      const pgLinks: { program_id: string; guide_id: string }[] = pgRes.data || [];
      const bookings: { program_id: string }[] = bookingsRes.data || [];

      const bookingCounts = new Map<string, number>();
      bookings.forEach(b => {
        bookingCounts.set(b.program_id, (bookingCounts.get(b.program_id) || 0) + 1);
      });

      const enriched: ProgramWithGuides[] = (programsRes.data || []).map((p: Program) => {
        const programGuideIds = pgLinks.filter(l => l.program_id === p.id).map(l => l.guide_id);
        const programGuides = programGuideIds.map(id => guideMap.get(id)).filter(Boolean) as Guide[];
        return { ...p, guides: programGuides, booking_count: bookingCounts.get(p.id) || 0 };
      });

      setPrograms(enriched);
    } catch (err) {
      console.error('Error loading programs:', err);
    }
    setLoading(false);
  }

  async function toggleActive(program: ProgramWithGuides) {
    await supabase.from('programs').update({ active: !program.active }).eq('id', program.id);
    setPrograms(prev => prev.map(p => p.id === program.id ? { ...p, active: !p.active } : p));
    if (selectedProgram?.id === program.id) setSelectedProgram(p => p ? { ...p, active: !p.active } : null);
  }

  async function deleteProgram(id: string) {
    if (!confirm('Delete this program? This cannot be undone.')) return;
    await supabase.from('program_guides').delete().eq('program_id', id);
    await supabase.from('programs').delete().eq('id', id);
    setPrograms(prev => prev.filter(p => p.id !== id));
    if (selectedProgram?.id === id) setSelectedProgram(null);
  }

  if (editingProgram) {
    return (
      <EditProgramView
        program={editingProgram}
        allGuides={allGuides}
        onBack={() => setEditingProgram(null)}
        onSaved={async () => { await loadData(); setEditingProgram(null); setSelectedProgram(null); }}
      />
    );
  }

  if (selectedProgram) {
    return (
      <ProgramDetail
        program={selectedProgram}
        onBack={() => setSelectedProgram(null)}
        onEdit={() => setEditingProgram(selectedProgram)}
        onToggle={() => toggleActive(selectedProgram)}
        onDelete={() => deleteProgram(selectedProgram.id)}
      />
    );
  }

  const active = programs.filter(p => p.active).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Programs & Packages</h1>
          <p className="text-xs text-neutral-500 mt-0.5">{programs.length} programs · {active} active</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Program
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      ) : programs.length === 0 ? (
        <Card className="p-12 text-center">
          <Plus className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <div className="text-sm font-medium text-neutral-900 mb-1">No programs yet</div>
          <div className="text-xs text-neutral-500 mb-5">Create guided programs and packages for visitors to book.</div>
          <Button size="sm" onClick={() => setShowCreateForm(true)}>Create Your First Program</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(program => (
            <ProgramCard
              key={program.id}
              program={program}
              onClick={() => setSelectedProgram(program)}
              onDelete={() => deleteProgram(program.id)}
            />
          ))}
        </div>
      )}

      {showCreateForm && userId && (
        <CreateProgramForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={loadData}
          portalUserId={userId}
        />
      )}
    </div>
  );
}

function ProgramCard({ program, onClick, onDelete }: {
  program: ProgramWithGuides;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(true);
  }

  async function handleConfirm(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(true);
    await onDelete();
  }

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(false);
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" onClick={onClick}>
      {program.images.length > 0 ? (
        <div className="h-40 overflow-hidden">
          <img src={program.images[0]} alt={program.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center">
          <Users className="w-10 h-10 text-teal-300" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-semibold text-neutral-900 line-clamp-1 flex-1 mr-2">{program.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${program.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
            {program.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {program.description && (
          <p className="text-xs text-neutral-500 mb-3 line-clamp-2">{program.description}</p>
        )}

        <div className="grid grid-cols-3 gap-2 mb-3 text-xs text-neutral-600">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-neutral-400" />
            {program.duration_hours}h
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-neutral-400" />
            Max {program.max_participants}
          </div>
          <div className="flex items-center gap-1 font-medium">
            {program.price_per_person === 0 ? (
              <span className="text-emerald-600">Free</span>
            ) : (
              <>
                <DollarSign className="w-3 h-3 text-neutral-400" />
                <span className="text-neutral-900">${program.price_per_person}</span>
              </>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
          <span>{program.guides.length} guide{program.guides.length !== 1 ? 's' : ''} assigned · {program.booking_count} booking{program.booking_count !== 1 ? 's' : ''}</span>
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
      </div>
    </Card>
  );
}

function ProgramDetail({ program, onBack, onEdit, onToggle, onDelete }: {
  program: ProgramWithGuides;
  onBack: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to programs
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900 mb-1">{program.title}</h1>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{program.duration_hours} hours</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Max {program.max_participants}</span>
            <span className="flex items-center gap-1">
              {program.price_per_person === 0
                ? <span className="text-emerald-600 font-medium">Free</span>
                : <><DollarSign className="w-3.5 h-3.5" />${program.price_per_person}/person</>
              }
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />Edit
          </button>
          <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 border border-rose-200 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-teal-50">
          <div className="text-xs text-neutral-500 mb-1">Total Bookings</div>
          <div className="text-xl font-semibold text-neutral-900">{program.booking_count}</div>
        </Card>
        <Card className="p-4 bg-blue-50">
          <div className="text-xs text-neutral-500 mb-1">Guides Assigned</div>
          <div className="text-xl font-semibold text-neutral-900">{program.guides.length}</div>
        </Card>
        <Card className="p-4 bg-emerald-50">
          <div className="text-xs text-neutral-500 mb-1">Status</div>
          <div className="text-xl font-semibold text-neutral-900">{program.active ? 'Active' : 'Inactive'}</div>
          <button onClick={onToggle} className="mt-1 text-xs text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1">
            {program.active ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
            Toggle status
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {program.images.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Program Images</h3>
              <div className="grid grid-cols-3 gap-3">
                {program.images.map((img, i) => (
                  <div key={i} className="aspect-video rounded-lg overflow-hidden border border-neutral-200">
                    <img src={img} alt={`Program image ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {program.description && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Description</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{program.description}</p>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            {program.what_included.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">What's Included</h3>
                <ul className="space-y-1.5">
                  {program.what_included.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-600">
                      <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {program.what_to_bring.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">What to Bring</h3>
                <ul className="space-y-1.5">
                  {program.what_to_bring.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-neutral-400" />
              Assigned Guides
            </h3>
            {program.guides.length === 0 ? (
              <div className="text-sm text-neutral-500">No guides assigned yet. Edit this program to assign guides.</div>
            ) : (
              <div className="space-y-3">
                {program.guides.map(guide => (
                  <div key={guide.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-600">
                        {guide.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-neutral-900">{guide.name}</div>
                        <div className="text-xs text-neutral-500">{guide.specializations.slice(0, 2).join(', ')}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${guide.available ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
                      {guide.available ? 'Available' : 'Off duty'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Program Details</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-neutral-400 mb-0.5">Duration</div>
                <div className="text-sm text-neutral-900">{program.duration_hours} hours</div>
              </div>
              <div>
                <div className="text-xs text-neutral-400 mb-0.5">Max Participants</div>
                <div className="text-sm text-neutral-900">{program.max_participants} people</div>
              </div>
              <div>
                <div className="text-xs text-neutral-400 mb-0.5">Price</div>
                <div className={`text-sm font-medium ${program.price_per_person === 0 ? 'text-emerald-600' : 'text-neutral-900'}`}>
                  {program.price_per_person === 0 ? 'Free' : `$${program.price_per_person.toFixed(2)} per person`}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-400 mb-0.5">Created</div>
                <div className="text-sm text-neutral-900">{new Date(program.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={onToggle}
                className={`w-full px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  program.active
                    ? 'text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    : 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                {program.active ? 'Deactivate Program' : 'Activate Program'}
              </button>
              <button onClick={onEdit} className="w-full px-4 py-2 text-xs font-medium rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors">
                Edit Program
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EditProgramView({ program, allGuides, onBack, onSaved }: {
  program: ProgramWithGuides;
  allGuides: Guide[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedGuideIds, setSelectedGuideIds] = useState<Set<string>>(new Set(program.guides.map(g => g.id)));
  const [images, setImages] = useState<string[]>(program.images || []);
  const [form, setForm] = useState({
    title: program.title,
    description: program.description || '',
    duration_hours: program.duration_hours,
    max_participants: program.max_participants,
    price_per_person: program.price_per_person,
    whatIncludedText: program.what_included.join('\n'),
    whatToBringText: program.what_to_bring.join('\n'),
    active: program.active,
  });

  const update = (field: string, value: string | number | boolean) => setForm(f => ({ ...f, [field]: value }));

  function toggleGuide(id: string) {
    setSelectedGuideIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 3) {
      alert('You can upload up to 3 images only');
      return;
    }

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
      setImages(prev => [...prev, ...uploadedUrls]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  }

  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    const what_included = form.whatIncludedText.split('\n').map(s => s.trim()).filter(Boolean);
    const what_to_bring = form.whatToBringText.split('\n').map(s => s.trim()).filter(Boolean);

    await supabase.from('programs').update({
      title: form.title,
      description: form.description,
      duration_hours: form.duration_hours,
      max_participants: form.max_participants,
      price_per_person: form.price_per_person,
      what_included,
      what_to_bring,
      images: images,
      active: form.active,
    }).eq('id', program.id);

    await supabase.from('program_guides').delete().eq('program_id', program.id);
    if (selectedGuideIds.size > 0) {
      await supabase.from('program_guides').insert(
        Array.from(selectedGuideIds).map(guide_id => ({ program_id: program.id, guide_id }))
      );
    }

    await onSaved();
    setSaving(false);
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Cancel editing
      </button>

      <h1 className="text-lg font-semibold text-neutral-900 mb-6">Edit Program</h1>

      <div className="max-w-3xl space-y-5">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Program Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Program Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => update('title', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">Duration (hours)</label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={form.duration_hours}
                  onChange={e => update('duration_hours', parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">Max Participants</label>
                <input
                  type="number"
                  min={1}
                  value={form.max_participants}
                  onChange={e => update('max_participants', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Pricing</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => update('price_per_person', 0)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                    form.price_per_person === 0
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  Free
                </button>
                <button
                  type="button"
                  onClick={() => { if (form.price_per_person === 0) update('price_per_person', 1); }}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                    form.price_per_person > 0
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  Paid
                </button>
              </div>
              {form.price_per_person > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500">$</span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={form.price_per_person}
                    onChange={e => update('price_per_person', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  />
                  <span className="text-xs text-neutral-400 whitespace-nowrap">per person</span>
                </div>
              )}
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => update('active', e.target.checked)} className="w-4 h-4" />
              <div>
                <div className="text-sm text-neutral-900">Active</div>
                <div className="text-xs text-neutral-500">Make this program bookable by visitors</div>
              </div>
            </label>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Program Images</h3>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-video rounded-lg overflow-hidden border-2 border-neutral-200 group">
                  <img src={img} alt={`Program image ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length < 3 && (
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="edit-program-image-upload"
                disabled={uploadingImages}
              />
              <label
                htmlFor="edit-program-image-upload"
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                  uploadingImages
                    ? 'border-neutral-300 bg-neutral-50 cursor-not-allowed'
                    : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'
                }`}
              >
                {uploadingImages ? (
                  <>
                    <div className="w-8 h-8 border-3 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mb-2" />
                    <span className="text-xs text-neutral-600 font-medium">Uploading...</span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mb-2">
                      <Upload className="w-5 h-5 text-neutral-600" />
                    </div>
                    <span className="text-xs font-medium text-neutral-900 mb-1">Upload Images</span>
                    <span className="text-xs text-neutral-500">
                      {3 - images.length} {images.length === 2 ? 'image' : 'images'} remaining
                    </span>
                  </>
                )}
              </label>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">What's Included (one per line)</h3>
            <textarea
              value={form.whatIncludedText}
              onChange={e => update('whatIncludedText', e.target.value)}
              rows={5}
              placeholder="e.g. Guided tour&#10;Equipment rental&#10;Refreshments"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 resize-none"
            />
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">What to Bring (one per line)</h3>
            <textarea
              value={form.whatToBringText}
              onChange={e => update('whatToBringText', e.target.value)}
              rows={5}
              placeholder="e.g. Comfortable shoes&#10;Sun protection&#10;Water bottle"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 resize-none"
            />
          </Card>
        </div>

        {allGuides.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Assign Guides</h3>
            <div className="grid grid-cols-2 gap-3">
              {allGuides.map(guide => (
                <label key={guide.id} className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedGuideIds.has(guide.id)}
                    onChange={() => toggleGuide(guide.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-medium text-neutral-600 flex-shrink-0">
                      {guide.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-neutral-900 truncate">{guide.name}</div>
                      <div className="text-xs text-neutral-500 truncate">{guide.specializations.slice(0, 2).join(', ')}</div>
                    </div>
                  </div>
                  <span className={`text-xs flex-shrink-0 ${guide.available ? 'text-emerald-600' : 'text-neutral-400'}`}>
                    {guide.available ? 'Available' : 'Off duty'}
                  </span>
                </label>
              ))}
            </div>
          </Card>
        )}

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
