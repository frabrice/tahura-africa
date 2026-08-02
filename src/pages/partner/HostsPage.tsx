import { useState, useEffect, useRef } from 'react';
import { Plus, Mail, Phone, CalendarClock, ArrowLeft, Check, ToggleLeft, ToggleRight, Camera, X, Award, Languages } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { SideDrawer } from '../../components/SideDrawer';
import { CreateHostForm } from '../../components/CreateHostForm';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

interface Host {
  id: string;
  partner_id: string;
  name: string;
  bio: string;
  profile_picture: string;
  languages: string[];
  email: string;
  phone: string;
  expertise: string[];
  years_experience: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface HostSchedule {
  id: string;
  host_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function HostsPage() {
  const { user } = useAuth();
  const userId = (user as PortalUser)?.id;
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (userId) {
      loadHosts();
    }
  }, [userId]);

  async function loadHosts() {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partner_hosts')
        .select('*')
        .eq('partner_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading hosts:', error);
      }
      if (data) setHosts(data);
    } catch (error) {
      console.error('Error loading hosts:', error);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleCreateComplete = () => {
    setShowCreateForm(false);
    loadHosts();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Hosts</h1>
        <Button size="sm" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Host
        </Button>
      </div>

      {hosts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-neutral-400" />
            </div>
            <h3 className="text-sm font-medium text-neutral-900 mb-2">No hosts yet</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Create your first host to assign to your listings
            </p>
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Host
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Host</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Languages</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Experience</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {hosts.map(host => (
                <tr key={host.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {host.profile_picture ? (
                        <img
                          src={host.profile_picture}
                          alt={host.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                          <span className="text-xs font-medium text-neutral-600">
                            {host.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-neutral-900">{host.name}</div>
                        {host.expertise.length > 0 && (
                          <div className="text-xs text-neutral-500">{host.expertise[0]}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {host.languages.length > 0 ? host.languages.join(', ') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {host.years_experience > 0 ? `${host.years_experience} years` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {host.email && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                          <Mail className="w-3 h-3" />
                          {host.email}
                        </div>
                      )}
                      {host.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                          <Phone className="w-3 h-3" />
                          {host.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs border ${
                        host.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                      }`}
                    >
                      {host.status.charAt(0).toUpperCase() + host.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedHost(host)}
                      className="text-xs font-medium text-neutral-900 hover:text-neutral-600 transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <SideDrawer
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Create New Host"
      >
        <CreateHostForm
          onComplete={handleCreateComplete}
          onCancel={() => setShowCreateForm(false)}
        />
      </SideDrawer>

      <SideDrawer
        isOpen={selectedHost !== null}
        onClose={() => setSelectedHost(null)}
        title=""
      >
        {selectedHost && (
          <HostDetailView
            host={selectedHost}
            onUpdate={() => {
              setSelectedHost(null);
              loadHosts();
            }}
            onDelete={() => {
              setSelectedHost(null);
              loadHosts();
            }}
          />
        )}
      </SideDrawer>
    </div>
  );
}

function HostDetailView({ host, onUpdate, onDelete }: { host: Host; onUpdate: () => void; onDelete: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [editData, setEditData] = useState({
    name: host.name,
    bio: host.bio,
    email: host.email,
    phone: host.phone,
    years_experience: host.years_experience,
    status: host.status,
    profile_picture: host.profile_picture,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
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
      setEditData(prev => ({ ...prev, profile_picture: publicUrl }));
    } catch (error: any) {
      alert('Failed to upload image: ' + error.message);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('partner_hosts')
        .update({
          name: editData.name,
          bio: editData.bio,
          email: editData.email,
          phone: editData.phone,
          years_experience: editData.years_experience,
          status: editData.status,
          profile_picture: editData.profile_picture,
          updated_at: new Date().toISOString(),
        })
        .eq('id', host.id);

      if (error) throw error;
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating host:', error);
      alert(`Failed to update host: ${error?.message || 'Unknown error'}`);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this host? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('partner_hosts')
        .delete()
        .eq('id', host.id);

      if (error) throw error;
      onDelete();
    } catch (error: any) {
      console.error('Error deleting host:', error);
      alert(`Failed to delete host: ${error?.message || 'Unknown error'}`);
    }
    setDeleting(false);
  };

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    try {
      const newStatus = host.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('partner_hosts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', host.id);

      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      console.error('Error toggling status:', error);
      alert(`Failed to update status: ${error?.message || 'Unknown error'}`);
    }
    setTogglingStatus(false);
  };

  if (showSchedule) {
    return <HostScheduleView host={host} onBack={() => setShowSchedule(false)} />;
  }

  const currentPicture = isEditing ? editData.profile_picture : host.profile_picture;

  return (
    <div className="flex flex-col h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <div className="flex-1 overflow-y-auto">
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6 md:p-8">
          <div className="flex items-start gap-5">
            <div className="relative flex-shrink-0">
              {currentPicture ? (
                <img
                  src={currentPicture}
                  alt={isEditing ? editData.name : host.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-2xl font-semibold text-white">
                    {(isEditing ? editData.name : host.name).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-md hover:bg-neutral-700 transition-colors disabled:opacity-50"
                >
                  {uploadingImage ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="text-xl font-semibold text-neutral-900 mb-2 w-full px-3 py-1.5 border border-neutral-300 rounded-lg bg-white"
                />
              ) : (
                <h2 className="text-xl font-semibold text-neutral-900 mb-1">{host.name}</h2>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-neutral-600 mt-2">
                {host.expertise.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    {host.expertise[0]}
                  </span>
                )}
                {host.languages.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5" />
                    {host.languages.join(', ')}
                  </span>
                )}
                {host.years_experience > 0 && (
                  <span className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-neutral-400"></div>
                    {host.years_experience} {host.years_experience === 1 ? 'year' : 'years'} experience
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {isEditing ? (
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                    className="px-3 py-1 text-xs font-medium border rounded-full bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                ) : (
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full border ${
                      host.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                    }`}
                  >
                    {host.status.charAt(0).toUpperCase() + host.status.slice(1)}
                  </span>
                )}
                {isEditing && editData.profile_picture && (
                  <button
                    onClick={() => setEditData(prev => ({ ...prev, profile_picture: '' }))}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <div className="grid grid-cols-3 gap-4 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
              <div>
                <div className="text-xs font-medium text-neutral-600 mb-1">Email</div>
                {isEditing ? (
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="text-sm font-medium text-neutral-900 w-full px-2 py-1 border border-neutral-300 rounded"
                  />
                ) : (
                  <div className="text-sm font-medium text-neutral-900 truncate">{host.email || '-'}</div>
                )}
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-600 mb-1">Phone</div>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="text-sm font-medium text-neutral-900 w-full px-2 py-1 border border-neutral-300 rounded"
                  />
                ) : (
                  <div className="text-sm font-medium text-neutral-900">{host.phone || '-'}</div>
                )}
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-600 mb-1">Experience</div>
                {isEditing ? (
                  <input
                    type="number"
                    value={editData.years_experience}
                    onChange={(e) => setEditData({ ...editData, years_experience: parseInt(e.target.value) || 0 })}
                    className="text-sm font-medium text-neutral-900 w-full px-2 py-1 border border-neutral-300 rounded"
                  />
                ) : (
                  <div className="text-sm font-medium text-neutral-900">{host.years_experience} years</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setShowSchedule(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-2 border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <CalendarClock className="w-4 h-4" />
                Edit Schedule
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={togglingStatus}
                className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-2 rounded-lg transition-colors disabled:opacity-50 ${
                  host.status === 'active'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                {host.status === 'active' ? (
                  <>
                    <ToggleRight className="w-5 h-5" />
                    {togglingStatus ? 'Updating...' : 'Active'}
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5" />
                    {togglingStatus ? 'Updating...' : 'Set Active'}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                Bio
              </h3>
              {isEditing ? (
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg leading-relaxed"
                />
              ) : (
                <p className="text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-4 rounded-lg">
                  {host.bio || 'No bio provided'}
                </p>
              )}
            </div>

            {host.languages.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {host.languages.map((lang) => (
                    <span key={lang} className="px-3 py-1.5 bg-green-50 text-xs font-medium text-green-700 rounded-full border border-green-200">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {host.expertise.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
                  Areas of Expertise
                </h3>
                <div className="flex flex-wrap gap-2">
                  {host.expertise.map((exp) => (
                    <span key={exp} className="px-3 py-1.5 bg-amber-50 text-xs font-medium text-amber-700 rounded-full border border-amber-200">
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-rose-500 to-pink-500 rounded-full"></div>
                Timeline
              </h3>
              <div className="bg-rose-50 p-6 rounded-xl border border-rose-100 space-y-3">
                <div>
                  <span className="text-xs font-medium text-neutral-600">Created</span>
                  <div className="text-sm font-medium text-neutral-900 mt-1">
                    {new Date(host.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-neutral-600">Last Updated</span>
                  <div className="text-sm font-medium text-neutral-900 mt-1">
                    {new Date(host.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200 p-6 bg-white flex items-center justify-between">
        {isEditing ? (
          <>
            <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Host'}
            </Button>
            <Button onClick={() => setIsEditing(true)}>
              Edit Host
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function HostScheduleView({ host, onBack }: { host: Host; onBack: () => void }) {
  const [schedules, setSchedules] = useState<HostSchedule[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, [host.id]);

  async function loadSchedules() {
    setLoading(true);
    const { data } = await supabase
      .from('host_schedules')
      .select('*')
      .eq('host_id', host.id);

    const existing = data || [];
    const merged = DAYS_OF_WEEK.map(day => {
      const found = existing.find((s: HostSchedule) => s.day_of_week === day);
      return found || {
        id: '',
        host_id: host.id,
        day_of_week: day,
        start_time: '09:00',
        end_time: '17:00',
        is_working: day !== 'Saturday' && day !== 'Sunday',
      };
    });
    setSchedules(merged as HostSchedule[]);
    setLoading(false);
  }

  function updateDay(dayIndex: number, field: keyof HostSchedule, value: any) {
    setSchedules(prev => prev.map((s, i) => i === dayIndex ? { ...s, [field]: value } : s));
  }

  async function saveSchedules() {
    setSaving(true);
    try {
      for (const s of schedules) {
        if (s.id) {
          await supabase.from('host_schedules').update({
            start_time: s.start_time,
            end_time: s.end_time,
            is_working: s.is_working,
            updated_at: new Date().toISOString(),
          }).eq('id', s.id);
        } else {
          await supabase.from('host_schedules').upsert({
            host_id: host.id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_working: s.is_working,
          }, { onConflict: 'host_id,day_of_week' });
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
    <div className="flex flex-col h-full">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to {host.name}
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Weekly Schedule</h1>
          <p className="text-xs text-neutral-500 mt-0.5">{host.name} · {workingDays} working day{workingDays !== 1 ? 's' : ''} per week</p>
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
          <strong>Note:</strong> Host availability affects booking options. When inactive, packages remain visible but cannot be booked. Schedule controls working hours for each day of the week.
        </p>
      </Card>
    </div>
  );
}
