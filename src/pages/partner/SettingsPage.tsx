import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { Card } from '../../components/Card';
import { User, Bell, CreditCard, Shield, MapPin, Tag, Check, AlertCircle } from 'lucide-react';

type Tab = 'account' | 'notifications' | 'payout' | 'policy';

interface FormData {
  name: string;
  email: string;
  phone: string;
  contact_person: string;
  country: string;
  province: string;
  specific_location: string;
  specialty: string;
  tags: string[];
}

interface NotifPrefs {
  new_booking: boolean;
  booking_reminder: boolean;
  booking_cancelled: boolean;
  payout_processed: boolean;
  messages: boolean;
  marketing: boolean;
}

export function SettingsPage() {
  const { user } = useAuth();
  const portalUser = user as PortalUser | null;

  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [saving, setSaving] = useState(false);
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    name: '', email: '', phone: '', contact_person: '',
    country: '', province: '', specific_location: '', specialty: '', tags: [],
  });

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    new_booking: true, booking_reminder: true, booking_cancelled: true,
    payout_processed: true, messages: true, marketing: false,
  });

  const [payoutSchedule, setPayoutSchedule] = useState('monthly');
  const [cancellationPolicy, setCancellationPolicy] = useState('flexible');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (portalUser?.id) loadUser();
  }, [portalUser?.id]);

  async function loadUser() {
    const { data } = await supabase
      .from('portal_users')
      .select('name,email,phone,contact_person,country,province,specific_location,specialty,tags')
      .eq('id', portalUser!.id)
      .maybeSingle();

    if (data) {
      setForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        contact_person: data.contact_person || '',
        country: data.country || '',
        province: data.province || '',
        specific_location: data.specific_location || '',
        specialty: data.specialty || '',
        tags: data.tags || [],
      });
    }
  }

  const showSaved = (section: string) => {
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 2500);
  };

  async function saveAccount() {
    if (!portalUser?.id) return;
    setSaving(true); setError(null);
    const { error: err } = await supabase.from('portal_users').update({
      name: form.name,
      phone: form.phone,
      contact_person: form.contact_person,
      country: form.country,
      province: form.province,
      specific_location: form.specific_location,
      specialty: form.specialty,
      tags: form.tags,
    }).eq('id', portalUser.id);
    setSaving(false);
    if (err) setError(err.message);
    else showSaved('account');
  }

  async function saveNotifications() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setSaving(false);
    showSaved('notifications');
  }

  async function savePayout() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setSaving(false);
    showSaved('payout');
  }

  async function savePolicy() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setSaving(false);
    showSaved('policy');
  }

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  };

  const tabs = [
    { id: 'account' as Tab, label: 'Account', icon: User },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
    { id: 'payout' as Tab, label: 'Payout', icon: CreditCard },
    { id: 'policy' as Tab, label: 'Policy', icon: Shield },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900">Settings</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        <aside className="w-40 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 max-w-xl">
          {activeTab === 'account' && (
            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-neutral-400" />
                  Business Information
                </h3>
                <div className="space-y-3">
                  <Field label="Business / Display Name">
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                    />
                  </Field>
                  <Field label="Email" hint="Email cannot be changed">
                    <input
                      type="email"
                      value={form.email}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-500"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                    />
                  </Field>
                  <Field label="Contact Person">
                    <input
                      type="text"
                      value={form.contact_person}
                      onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                    />
                  </Field>
                  <Field label="Specialty">
                    <input
                      type="text"
                      value={form.specialty}
                      onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                      placeholder="e.g. Adventure tourism, Cultural experiences"
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                    />
                  </Field>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                  Location
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Country">
                      <input
                        type="text"
                        value={form.country}
                        onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                      />
                    </Field>
                    <Field label="Province / Region">
                      <input
                        type="text"
                        value={form.province}
                        onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                      />
                    </Field>
                  </div>
                  <Field label="Specific Location">
                    <input
                      type="text"
                      value={form.specific_location}
                      onChange={e => setForm(f => ({ ...f, specific_location: e.target.value }))}
                      placeholder="City, district, or area"
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                    />
                  </Field>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-neutral-400" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2 mb-3 min-h-8">
                  {form.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-neutral-400 hover:text-neutral-700 ml-0.5">&times;</button>
                    </span>
                  ))}
                  {form.tags.length === 0 && <span className="text-xs text-neutral-400">No tags added</span>}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag and press Enter..."
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                  />
                  <button onClick={addTag} className="px-3 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors">
                    Add
                  </button>
                </div>
              </Card>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span className="text-xs text-rose-700">{error}</span>
                </div>
              )}

              <SaveButton saving={saving} saved={savedSection === 'account'} onClick={saveAccount} />
            </div>
          )}

          {activeTab === 'notifications' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4 text-neutral-400" />
                Notification Preferences
              </h3>
              <div className="space-y-4">
                <NotifToggle label="New bookings" description="Receive an alert when a traveler places a booking" checked={notifPrefs.new_booking} onChange={v => setNotifPrefs(p => ({ ...p, new_booking: v }))} />
                <NotifToggle label="Booking reminders" description="Get reminded 24 hours before an upcoming booking" checked={notifPrefs.booking_reminder} onChange={v => setNotifPrefs(p => ({ ...p, booking_reminder: v }))} />
                <NotifToggle label="Booking cancellations" description="Notify when a traveler cancels a booking" checked={notifPrefs.booking_cancelled} onChange={v => setNotifPrefs(p => ({ ...p, booking_cancelled: v }))} />
                <NotifToggle label="Payout processed" description="Receive confirmation when a payout is sent" checked={notifPrefs.payout_processed} onChange={v => setNotifPrefs(p => ({ ...p, payout_processed: v }))} />
                <NotifToggle label="New messages" description="Alert when you receive a new traveler message" checked={notifPrefs.messages} onChange={v => setNotifPrefs(p => ({ ...p, messages: v }))} />
                <NotifToggle label="Marketing & updates" description="Tips, platform news, and feature announcements" checked={notifPrefs.marketing} onChange={v => setNotifPrefs(p => ({ ...p, marketing: v }))} />
              </div>
              <div className="mt-5">
                <SaveButton saving={saving} saved={savedSection === 'notifications'} onClick={saveNotifications} />
              </div>
            </Card>
          )}

          {activeTab === 'payout' && (
            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-neutral-400" />
                  Bank Account
                </h3>
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-neutral-700">No bank account connected</div>
                    <div className="text-xs text-neutral-400 mt-0.5">Connect an account to receive payouts</div>
                  </div>
                  <button className="px-3 py-2 text-xs font-medium border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors bg-white">
                    Connect Bank
                  </button>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4">Payout Schedule</h3>
                <div className="space-y-2">
                  {[
                    { value: 'weekly', label: 'Weekly', desc: 'Every Monday' },
                    { value: 'biweekly', label: 'Bi-weekly', desc: 'Every other Monday' },
                    { value: 'monthly', label: 'Monthly', desc: '15th of each month' },
                  ].map(opt => (
                    <label key={opt.value} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${payoutSchedule === opt.value ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${payoutSchedule === opt.value ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300'}`}>
                        {payoutSchedule === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-neutral-900">{opt.label}</div>
                        <div className="text-xs text-neutral-500">{opt.desc}</div>
                      </div>
                      <input type="radio" name="payout" value={opt.value} checked={payoutSchedule === opt.value} onChange={e => setPayoutSchedule(e.target.value)} className="sr-only" />
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <SaveButton saving={saving} saved={savedSection === 'payout'} onClick={savePayout} />
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'policy' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-neutral-400" />
                Cancellation Policy
              </h3>
              <p className="text-xs text-neutral-500 mb-4">Applies to all listings unless overridden at the listing level.</p>
              <div className="space-y-3">
                {[
                  { value: 'flexible', label: 'Flexible', desc: 'Full refund if cancelled at least 24 hours before the booking date.', badge: 'Recommended' },
                  { value: 'moderate', label: 'Moderate', desc: 'Full refund if cancelled 5 or more days before the booking date.', badge: null },
                  { value: 'strict', label: 'Strict', desc: '50% refund if cancelled 7 or more days before. No refund within 7 days.', badge: null },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${cancellationPolicy === opt.value ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${cancellationPolicy === opt.value ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300'}`}>
                      {cancellationPolicy === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900">{opt.label}</span>
                        {opt.badge && <span className="px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded">{opt.badge}</span>}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">{opt.desc}</div>
                    </div>
                    <input type="radio" name="policy" value={opt.value} checked={cancellationPolicy === opt.value} onChange={e => setCancellationPolicy(e.target.value)} className="sr-only" />
                  </label>
                ))}
              </div>
              <div className="mt-5">
                <SaveButton saving={saving} saved={savedSection === 'policy'} onClick={savePolicy} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-600 mb-1.5">{label}</label>
      {children}
      {hint && <div className="text-xs text-neutral-400 mt-1">{hint}</div>}
    </div>
  );
}

function NotifToggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-neutral-100 last:border-0">
      <div>
        <div className="text-sm text-neutral-900">{label}</div>
        <div className="text-xs text-neutral-500 mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 mt-0.5 rounded-full transition-colors ${checked ? 'bg-neutral-900' : 'bg-neutral-200'}`}
        style={{ height: '22px', width: '40px' }}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${saved ? 'bg-emerald-600 text-white' : 'bg-neutral-900 text-white hover:bg-neutral-800'}`}
    >
      {saved && <Check className="w-4 h-4" />}
      {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
    </button>
  );
}
