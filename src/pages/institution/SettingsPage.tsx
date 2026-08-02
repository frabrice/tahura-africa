import { useState, useEffect } from 'react';
import { Building2, Clock, Phone, Shield, Check } from 'lucide-react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';

type Tab = 'profile' | 'operations' | 'contact' | 'security';

interface FormData {
  name: string;
  type: string;
  description: string;
  location: string;
  entry_fee: string;
  visiting_hours: string;
  opening_time: string;
  closing_time: string;
  daily_capacity: number;
  closed_days: string[];
  phone: string;
  email: string;
  website: string;
  published: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function SettingsPage() {
  const { user } = useAuth();
  const portalUser = user as PortalUser | null;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'attraction',
    description: '',
    location: '',
    entry_fee: '',
    visiting_hours: '',
    opening_time: '',
    closing_time: '',
    daily_capacity: 500,
    closed_days: [],
    phone: '',
    email: '',
    website: '',
    published: false,
  });

  useEffect(() => {
    if (portalUser?.id) loadProfile();
  }, [portalUser?.id]);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('institution_profiles')
        .select('*')
        .eq('portal_user_id', portalUser!.id)
        .maybeSingle();

      if (data) {
        setProfileId(data.id);
        setFormData({
          name: data.name || '',
          type: data.type || 'attraction',
          description: data.description || '',
          location: data.location || '',
          entry_fee: data.entry_fee || '',
          visiting_hours: data.visiting_hours || '',
          opening_time: data.opening_time || '',
          closing_time: data.closing_time || '',
          daily_capacity: data.daily_capacity || 500,
          closed_days: data.closed_days || [],
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          published: data.published || false,
        });
      } else {
        setFormData(f => ({ ...f, name: portalUser?.name || '', email: portalUser?.email || '' }));
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
    setLoading(false);
  }

  const update = (field: keyof FormData, value: string | boolean | number | string[]) =>
    setFormData(f => ({ ...f, [field]: value }));

  function toggleClosedDay(day: string) {
    setFormData(f => ({
      ...f,
      closed_days: f.closed_days.includes(day)
        ? f.closed_days.filter(d => d !== day)
        : [...f.closed_days, day],
    }));
  }

  const handleSave = async () => {
    if (!portalUser?.id) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        location: formData.location,
        entry_fee: formData.entry_fee,
        visiting_hours: formData.visiting_hours,
        opening_time: formData.opening_time || null,
        closing_time: formData.closing_time || null,
        daily_capacity: formData.daily_capacity,
        closed_days: formData.closed_days.length > 0 ? formData.closed_days : null,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        published: formData.published,
        updated_at: new Date().toISOString(),
      };

      if (profileId) {
        await supabase.from('institution_profiles').update(payload).eq('id', profileId);
      } else {
        const { data } = await supabase
          .from('institution_profiles')
          .insert({ ...payload, portal_user_id: portalUser.id })
          .select('id')
          .maybeSingle();
        if (data) setProfileId(data.id);
      }

      await supabase.from('portal_users').update({ name: formData.name }).eq('id', portalUser.id);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving settings:', err);
    }
    setSaving(false);
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Institution Profile', icon: Building2 },
    { id: 'operations', label: 'Operations', icon: Clock },
    { id: 'contact', label: 'Contact Info', icon: Phone },
    { id: 'security', label: 'Visibility', icon: Shield },
  ];

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-neutral-900 mb-6">Settings</h1>
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Settings</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Manage your institution profile and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {saved ? <><Check className="w-4 h-4" />Saved!</> : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-6">
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 max-w-2xl">
          {activeTab === 'profile' && (
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-5">Institution Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Institution Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => update('name', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => update('type', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  >
                    <option value="national_park">National Park</option>
                    <option value="museum">Museum</option>
                    <option value="heritage_site">Heritage Site</option>
                    <option value="cultural_center">Cultural Center</option>
                    <option value="attraction">Attraction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => update('description', e.target.value)}
                    rows={5}
                    placeholder="Describe your institution for visitors..."
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Location / Address</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => update('location', e.target.value)}
                    placeholder="e.g. Nairobi, Kenya"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  />
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'operations' && (
            <div className="space-y-5">
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-neutral-900 mb-5">Capacity Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1.5">Daily Visitor Capacity</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.daily_capacity}
                      onChange={e => update('daily_capacity', parseInt(e.target.value) || 1)}
                      className="w-48 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                    />
                    <p className="text-xs text-neutral-400 mt-1">Maximum number of visitors allowed per day</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1.5">Entry Fee</label>
                    <input
                      type="text"
                      value={formData.entry_fee}
                      onChange={e => update('entry_fee', e.target.value)}
                      placeholder="e.g. $15 per person or Free"
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-semibold text-neutral-900 mb-5">Operating Hours</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1.5">Opening Time</label>
                      <input
                        type="time"
                        value={formData.opening_time}
                        onChange={e => update('opening_time', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1.5">Closing Time</label>
                      <input
                        type="time"
                        value={formData.closing_time}
                        onChange={e => update('closing_time', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-2">Hours Description</label>
                    <input
                      type="text"
                      value={formData.visiting_hours}
                      onChange={e => update('visiting_hours', e.target.value)}
                      placeholder="e.g. Mon–Fri 8:00–18:00, Weekends 9:00–17:00"
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-2">Closed Days</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleClosedDay(day)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                            formData.closed_days.includes(day)
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">Selected days are marked as closed to visitors</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'contact' && (
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-5">Public Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Public Contact Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => update('email', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => update('phone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={e => update('website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  />
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-5">Visibility & Publishing</h3>
              <div className="space-y-5">
                <div className="p-4 border border-neutral-200 rounded-lg">
                  <label className="flex items-start gap-4 cursor-pointer">
                    <div className="mt-0.5">
                      <input
                        type="checkbox"
                        checked={formData.published}
                        onChange={e => update('published', e.target.checked)}
                        className="w-4 h-4"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-900 mb-1">Published</div>
                      <div className="text-xs text-neutral-500">When enabled, your institution will be visible to travelers on the platform. Disable this to temporarily hide your institution without deleting any data.</div>
                    </div>
                    <div className="ml-auto flex-shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${formData.published ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
                        {formData.published ? 'Live' : 'Hidden'}
                      </span>
                    </div>
                  </label>
                </div>

                <div className="p-4 bg-neutral-50 rounded-lg">
                  <div className="text-xs font-medium text-neutral-700 mb-2">Account Information</div>
                  <div className="space-y-2 text-xs text-neutral-500">
                    <div className="flex justify-between">
                      <span>Account email</span>
                      <span className="text-neutral-900">{portalUser?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Account type</span>
                      <span className="text-neutral-900 capitalize">{portalUser?.portal_type || 'institution'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
