import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Car, Star, Phone, Mail, Camera, AlertTriangle, Award, Globe, Shield, Zap, CreditCard as Edit2, X } from 'lucide-react';
import { DRIVER_TIER_LABELS, VEHICLE_AMENITY_OPTIONS, DRIVER_SPECIALIZATION_OPTIONS } from '../../lib/mobilityService';

const TEAL = '#0d9488';

const TIER_COLORS: Record<string, string> = {
  bronze: 'from-amber-700 to-amber-600',
  silver: 'from-slate-500 to-slate-400',
  gold: 'from-amber-500 to-yellow-400',
  platinum: 'from-sky-600 to-sky-400',
};

const TIER_REQUIREMENTS: Record<string, { trips: number; minRating: number; acceptance: number }> = {
  silver: { trips: 20, minRating: 4.5, acceptance: 80 },
  gold: { trips: 100, minRating: 4.8, acceptance: 90 },
  platinum: { trips: 300, minRating: 4.9, acceptance: 95 },
};

interface EditSection {
  type: 'info' | 'vehicle' | 'documents' | null;
}

export function DriverProfilePage() {
  const [driver, setDriver] = useState<any>({
    id: 'demo-driver',
    full_name: 'Jean Claude Mutabazi',
    phone: '+250 788 123 456',
    email: 'jeanclaude@email.com',
    profile_picture: null,
    license_number: 'DL-2024-087432',
    license_expiry: '2027-06-15',
    languages: ['English', 'French', 'Kinyarwanda'],
    specializations: ['airport', 'wildlife_tours', 'city_tours'],
    status: 'active',
    tier: 'silver',
    rating: 4.85,
    total_trips: 127,
    max_engagements_per_day: 8,
    vehicle: {
      plate_number: 'RAB 123 X',
      model: 'Toyota Land Cruiser',
      year_manufactured: 2022,
      is_ev: false,
      color: 'White',
      amenities: ['ac', 'wifi', 'charging_ports'],
    },
    documents: {
      id_card_url: null,
      license_url: null,
    },
  });
  const [editSection, setEditSection] = useState<EditSection>({ type: null });
  const [editData, setEditData] = useState<any>(null);

  const nextTier = driver.tier === 'bronze' ? 'silver' : driver.tier === 'silver' ? 'gold' : driver.tier === 'gold' ? 'platinum' : null;
  const nextRequirements = nextTier ? TIER_REQUIREMENTS[nextTier] : null;

  const handleEdit = (section: EditSection['type']) => {
    setEditSection({ type: section });
    if (section === 'info') {
      setEditData({
        full_name: driver.full_name,
        phone: driver.phone,
        email: driver.email,
        languages: [...(driver.languages || [])],
        specializations: [...(driver.specializations || [])],
      });
    } else if (section === 'vehicle') {
      setEditData({ ...driver.vehicle });
    }
  };

  const handleSave = () => {
    if (editSection.type === 'info') {
      setDriver((prev: any) => ({ ...prev, ...editData }));
    } else if (editSection.type === 'vehicle') {
      setDriver((prev: any) => ({ ...prev, vehicle: editData }));
    }
    setEditSection({ type: null });
  };

  const toggleSpecialization = (spec: string) => {
    if (!editData) return;
    const current = editData.specializations || [];
    const updated = current.includes(spec)
      ? current.filter((s: string) => s !== spec)
      : [...current, spec];
    setEditData((prev: any) => ({ ...prev, specializations: updated }));
  };

  const toggleLanguage = (lang: string) => {
    if (!editData) return;
    const current = editData.languages || [];
    const updated = current.includes(lang)
      ? current.filter((l: string) => l !== lang)
      : [...current, lang];
    setEditData((prev: any) => ({ ...prev, languages: updated }));
  };

  const toggleAmenity = (amenity: string) => {
    if (!editData) return;
    const current = editData.amenities || [];
    const updated = current.includes(amenity)
      ? current.filter((a: string) => a !== amenity)
      : [...current, amenity];
    setEditData((prev: any) => ({ ...prev, amenities: updated }));
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiry <= thirtyDaysFromNow;
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className={`rounded-2xl p-6 bg-gradient-to-br ${TIER_COLORS[driver.tier] || TIER_COLORS.bronze}`}>
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40">
              {driver.profile_picture ? (
                <img src={driver.profile_picture} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white/80" />
              )}
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
              <Camera className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{driver.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-4 h-4 text-white/80 fill-white/80" />
              <span className="text-white font-medium">{driver.rating?.toFixed(2)}</span>
              <span className="text-white/60">·</span>
              <span className="text-white/80">{driver.total_trips} trips</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium">
              <Award className="w-3.5 h-3.5" />
              {DRIVER_TIER_LABELS[driver.tier] || driver.tier} Driver
            </div>
          </div>

          <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            driver.status === 'active' ? 'bg-emerald-400/30 text-emerald-100' : 'bg-red-400/30 text-red-100'
          }`}>
            {driver.status === 'active' ? 'Online' : driver.status}
          </div>
        </div>
      </div>

      {/* Tier Progress */}
      {nextTier && nextRequirements && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Progress to {DRIVER_TIER_LABELS[nextTier]}</h3>
            <span className="text-xs text-slate-500">{DRIVER_TIER_LABELS[driver.tier]} → {DRIVER_TIER_LABELS[nextTier]}</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Trips</span>
                <span className="font-medium">{driver.total_trips}/{nextRequirements.trips}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, (driver.total_trips / nextRequirements.trips) * 100)}%`,
                    background: TEAL,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Rating</span>
                <span className="font-medium">{driver.rating?.toFixed(2)}/{nextRequirements.minRating}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, ((driver.rating - 4) / (nextRequirements.minRating - 4)) * 100)}%`,
                    background: TEAL,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personal Info */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Personal Information</h3>
          <button
            onClick={() => handleEdit('info')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            style={{ color: TEAL }}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="flex items-center gap-3 p-4">
            <Phone className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">Phone</div>
              <div className="font-medium text-slate-900">{driver.phone}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Mail className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">Email</div>
              <div className="font-medium text-slate-900">{driver.email || '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Globe className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">Languages</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(driver.languages || []).map((lang: string) => (
                  <span key={lang} className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">{lang}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4">
            <Award className="w-4 h-4 text-slate-400 mt-0.5" />
            <div>
              <div className="text-xs text-slate-500">Specializations</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(driver.specializations || []).map((spec: string) => (
                  <span key={spec} className="px-2 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700">
                    {spec.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Vehicle Information</h3>
          <button
            onClick={() => handleEdit('vehicle')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            style={{ color: TEAL }}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>

        {driver.vehicle ? (
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">{driver.vehicle.model}</div>
                <div className="text-sm text-slate-500">{driver.vehicle.year_manufactured} · {driver.vehicle.color}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-medium text-slate-900">{driver.vehicle.plate_number}</div>
                {driver.vehicle.is_ev && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600 justify-end mt-0.5">
                    <Zap className="w-3 h-3" />
                    Electric Vehicle
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1.5">Amenities</div>
              <div className="flex flex-wrap gap-1.5">
                {(driver.vehicle.amenities || []).map((a: string) => (
                  <span key={a} className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 capitalize">
                    {a.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 text-center">
            <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No vehicle linked yet</p>
          </div>
        )}
      </div>

      {/* License Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-4">License & Documents</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-slate-500" />
              <div>
                <div className="font-medium text-slate-900">Driver's License</div>
                <div className="text-xs text-slate-500">{driver.license_number}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${isExpiringSoon(driver.license_expiry) ? 'text-red-600' : 'text-emerald-600'}`}>
                {new Date(driver.license_expiry).toLocaleDateString()}
              </div>
              <div className="text-xs text-slate-500">Expires</div>
            </div>
          </div>

          {isExpiringSoon(driver.license_expiry) && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-700">Your license expires soon. Please renew to keep driving.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editSection.type && editData && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditSection({ type: null })} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-5 border-b border-slate-200 flex items-center justify-between z-10">
                <h3 className="font-semibold text-slate-900">
                  {editSection.type === 'info' ? 'Edit Personal Info' : 'Edit Vehicle Info'}
                </h3>
                <button onClick={() => setEditSection({ type: null })} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {editSection.type === 'info' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={editData.full_name}
                        onChange={(e) => setEditData((prev: any) => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) => setEditData((prev: any) => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData((prev: any) => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Languages</label>
                      <div className="flex flex-wrap gap-2">
                        {['English', 'French', 'Kinyarwanda', 'Swahili', 'Spanish', 'German', 'Chinese'].map((lang) => (
                          <button
                            key={lang}
                            onClick={() => toggleLanguage(lang)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                              editData.languages?.includes(lang)
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Specializations</label>
                      <div className="flex flex-wrap gap-2">
                        {DRIVER_SPECIALIZATION_OPTIONS.map((spec) => (
                          <button
                            key={spec}
                            onClick={() => toggleSpecialization(spec)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                              editData.specializations?.includes(spec)
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {spec.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {editSection.type === 'vehicle' && editData && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Plate Number</label>
                      <input
                        type="text"
                        value={editData.plate_number}
                        onChange={(e) => setEditData((prev: any) => ({ ...prev, plate_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Model</label>
                      <input
                        type="text"
                        value={editData.model}
                        onChange={(e) => setEditData((prev: any) => ({ ...prev, model: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Year</label>
                        <input
                          type="number"
                          value={editData.year_manufactured}
                          onChange={(e) => setEditData((prev: any) => ({ ...prev, year_manufactured: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Color</label>
                        <input
                          type="text"
                          value={editData.color}
                          onChange={(e) => setEditData((prev: any) => ({ ...prev, color: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_ev"
                        checked={editData.is_ev}
                        onChange={(e) => setEditData((prev: any) => ({ ...prev, is_ev: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-300 text-teal-600"
                      />
                      <label htmlFor="is_ev" className="text-sm font-medium text-slate-700">Electric Vehicle (EV)</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Amenities</label>
                      <div className="flex flex-wrap gap-2">
                        {VEHICLE_AMENITY_OPTIONS.map((amenity) => (
                          <button
                            key={amenity}
                            onClick={() => toggleAmenity(amenity)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                              editData.amenities?.includes(amenity)
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {amenity.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="sticky bottom-0 bg-white p-5 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setEditSection({ type: null })}
                  className="flex-1 py-2.5 font-medium border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 font-medium text-white rounded-xl"
                  style={{ background: TEAL }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
