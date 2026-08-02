import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { travelerAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { TravelerUser } from '../../lib/auth';
import { User, Settings, Shield, HelpCircle, LogOut, Camera, X, CheckCircle, Loader2, Home, ArrowLeft, Star, MessageSquare, Trash2, AlertTriangle, ChevronRight, Lock, Eye, EyeOff } from 'lucide-react';

interface TravelerReview {
  id: string;
  reviewer_type: string;
  reviewer_name: string;
  reviewer_profile_picture: string;
  rating: number;
  review_text: string;
  created_at: string;
}

const inputClass = "w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white placeholder-stone-400 text-stone-900";
const labelClass = "block text-xs font-medium text-stone-700 mb-1.5";

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, login: setAuthUser } = useAuth();
  const travelerUser = user as TravelerUser;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState<'none' | 'personal' | 'account' | 'delete'>('none');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingHost, setCheckingHost] = useState(false);
  const [hostModalState, setHostModalState] = useState<'none' | 'not_host'>('none');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [travelerReviews, setTravelerReviews] = useState<TravelerReview[]>([]);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!travelerUser?.id) return;
    supabase
      .from('traveler_reviews')
      .select('id, reviewer_type, reviewer_name, reviewer_profile_picture, rating, review_text, created_at')
      .eq('traveler_id', travelerUser.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setTravelerReviews(data);
      });
  }, [travelerUser?.id]);

  const [formData, setFormData] = useState({
    full_name: travelerUser?.full_name || '',
    email: travelerUser?.email || '',
    phone: travelerUser?.phone || '',
    bio: travelerUser?.bio || '',
    date_of_birth: travelerUser?.date_of_birth || '',
    nationality: travelerUser?.nationality || '',
    preferred_language: travelerUser?.preferred_language || '',
    countries_visited: (travelerUser?.countries_visited || []).join(', '),
  });

  const [accountData, setAccountData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  const checkHostStatus = async () => {
    if (!travelerUser) {
      navigate('/traveler/login');
      return;
    }
    setCheckingHost(true);
    try {
      const { isHost, hostData, isGuide, guideData } = await travelerAuth.checkIsHost(travelerUser.id);
      if (isHost && hostData) {
        localStorage.setItem('hostContext', JSON.stringify(hostData));
        navigate('/host');
      } else if (isGuide && guideData) {
        localStorage.setItem('guideContext', JSON.stringify(guideData));
        navigate('/guide');
      } else {
        setHostModalState('not_host');
      }
    } finally {
      setCheckingHost(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !travelerUser) return;

    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${travelerUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { profile_picture: publicUrl }
      });

      if (updateError) throw updateError;

      setAuthUser('traveler', { ...travelerUser, profile_picture: publicUrl });
      showSuccess('Profile photo updated!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showError('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePersonalInfoSave = async () => {
    if (!travelerUser) return;
    setSaving(true);

    try {
      const countriesArray = formData.countries_visited
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.full_name,
          phone: formData.phone,
          bio: formData.bio,
          date_of_birth: formData.date_of_birth,
          nationality: formData.nationality,
          preferred_language: formData.preferred_language,
          countries_visited: countriesArray,
        }
      });

      if (updateError) throw updateError;

      setAuthUser('traveler', { ...travelerUser, ...formData, countries_visited: countriesArray });
      showSuccess('Profile updated successfully!');
      setActiveSection('none');
    } catch (error: any) {
      showError('Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (accountData.newPassword !== accountData.confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (accountData.newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);

    try {
      const { error } = await travelerAuth.updatePassword(accountData.newPassword);
      if (error) throw new Error(error);

      showSuccess('Password updated successfully!');
      setAccountData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setActiveSection('none');
    } catch (error: any) {
      showError('Failed to update password: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/traveler/login');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setDeleteError('Your session has expired. Please log in again.');
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-traveler-account`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'active_bookings') {
          setDeleteError(`You have ${data.count} upcoming trip(s). Please cancel them before deleting your account.`);
        } else if (data.error === 'linked_host_or_guide') {
          const roles: string[] = [];
          const admins: string[] = [];
          if (data.isHost) { roles.push('host'); admins.push('partner'); }
          if (data.isGuide) { roles.push('guide'); admins.push('institution'); }
          setDeleteError(`Your account is linked as a ${roles.join(' and ')}. Please ask your ${admins.join(' and ')} administrator to remove you first, then try again.`);
        } else {
          setDeleteError(data.message || 'Failed to delete account. Please try again.');
        }
        return;
      }

      localStorage.removeItem('hostContext');
      localStorage.removeItem('guideContext');
      logout();
      navigate('/traveler/login');
    } catch {
      setDeleteError('An unexpected error occurred. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const initials = travelerUser?.full_name
    ? travelerUser.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const avgRating = travelerReviews.length > 0
    ? travelerReviews.reduce((sum, r) => sum + r.rating, 0) / travelerReviews.length
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10 animate-fade-in">
      {successMessage && (
        <div className="fixed top-20 right-4 md:right-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2.5 animate-fade-up text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-20 right-4 md:right-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2.5 animate-fade-up text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Home
      </button>

      <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden mb-4 shadow-sm">
        <div className="h-20 bg-gradient-to-r from-stone-800 via-stone-700 to-stone-900 relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(251,146,60,0.4) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(34,197,94,0.3) 0%, transparent 50%)' }} />
        </div>

        <div className="px-5 pb-5 -mt-10">
          <div className="flex items-end justify-between mb-3">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-gradient-to-br from-orange-400 via-amber-400 to-green-500 flex items-center justify-center">
                {travelerUser?.profile_picture ? (
                  <img src={travelerUser.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xl font-bold">{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploadingImage ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
            <button
              onClick={checkHostStatus}
              disabled={checkingHost}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {checkingHost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Home className="w-3.5 h-3.5" />}
              {checkingHost ? 'Checking...' : 'Switch to Host'}
            </button>
          </div>

          <div>
            <h1 className="text-xl font-bold text-stone-900 leading-tight">{travelerUser?.full_name || 'Traveler'}</h1>
            <p className="text-sm text-stone-500 mt-0.5">{travelerUser?.email}</p>
            {travelerUser?.nationality && (
              <p className="text-xs text-stone-400 mt-1">{travelerUser.nationality}</p>
            )}
            {avgRating !== null && (
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`} />
                ))}
                <span className="text-[11px] text-stone-500 ml-1 font-mono">{avgRating.toFixed(1)}</span>
                <span className="text-[11px] text-stone-400">({travelerReviews.length} review{travelerReviews.length !== 1 ? 's' : ''})</span>
              </div>
            )}
            {travelerUser?.bio && (
              <p className="text-xs text-stone-600 mt-2 leading-relaxed line-clamp-2">{travelerUser.bio}</p>
            )}

            {/* Profile stats */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-100">
              <div className="text-center">
                <p className="text-sm font-bold text-stone-900">{travelerUser?.trip_count || 0}</p>
                <p className="text-[10px] text-stone-400 uppercase tracking-wide">Trips</p>
              </div>
              <div className="w-px h-6 bg-stone-200" />
              <div className="text-center">
                <p className="text-sm font-bold text-stone-900">{(travelerUser?.countries_visited || []).length}</p>
                <p className="text-[10px] text-stone-400 uppercase tracking-wide">Countries</p>
              </div>
              <div className="w-px h-6 bg-stone-200" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-stone-400">Profile completion</p>
                  <p className="text-[10px] font-medium text-stone-600">
                    {(() => {
                      let score = 0;
                      const max = 7;
                      if (travelerUser?.full_name) score++;
                      if (travelerUser?.phone) score++;
                      if (travelerUser?.profile_picture) score++;
                      if (travelerUser?.bio) score++;
                      if (travelerUser?.date_of_birth) score++;
                      if (travelerUser?.nationality) score++;
                      if (travelerUser?.preferred_language) score++;
                      return `${Math.round((score / max) * 100)}%`;
                    })()}
                  </p>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${(() => {
                        let score = 0;
                        const max = 7;
                        if (travelerUser?.full_name) score++;
                        if (travelerUser?.phone) score++;
                        if (travelerUser?.profile_picture) score++;
                        if (travelerUser?.bio) score++;
                        if (travelerUser?.date_of_birth) score++;
                        if (travelerUser?.nationality) score++;
                        if (travelerUser?.preferred_language) score++;
                        return Math.round((score / max) * 100);
                      })()}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <button
          onClick={() => setActiveSection(activeSection === 'personal' ? 'none' : 'personal')}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-stone-200/80 rounded-xl hover:border-stone-300 hover:bg-stone-50/50 transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-stone-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-stone-900">Personal Information</div>
            <div className="text-xs text-stone-400 mt-0.5">Update your profile details</div>
          </div>
          <ChevronRight className={`w-4 h-4 text-stone-300 transition-transform duration-200 ${activeSection === 'personal' ? 'rotate-90' : ''}`} />
        </button>

        {activeSection === 'personal' && (
          <div className="bg-white border border-stone-200/80 rounded-xl p-5 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">Edit Personal Information</h3>
              <button onClick={() => setActiveSection('none')} className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={labelClass}>Full Name</label>
                <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={formData.email} disabled className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl bg-stone-50 text-stone-400 cursor-not-allowed" />
                <p className="text-[11px] text-stone-400 mt-1">Cannot be changed</p>
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Nationality</label>
                <input type="text" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} className={inputClass} placeholder="e.g., Rwandan" />
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Preferred Language</label>
                <select
                  value={formData.preferred_language}
                  onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select language...</option>
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="rw">Kinyarwanda</option>
                  <option value="sw">Swahili</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Countries Visited</label>
                <input
                  type="text"
                  value={formData.countries_visited}
                  onChange={(e) => setFormData({ ...formData, countries_visited: e.target.value })}
                  className={inputClass}
                  placeholder="e.g., Rwanda, Uganda, Kenya"
                />
                <p className="text-[11px] text-stone-400 mt-1">Comma-separated list of countries you've visited</p>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white placeholder-stone-400 text-stone-900 resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={handlePersonalInfoSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setActiveSection('none')}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-sm font-semibold rounded-xl hover:bg-stone-200 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setActiveSection(activeSection === 'account' ? 'none' : 'account')}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-stone-200/80 rounded-xl hover:border-stone-300 hover:bg-stone-50/50 transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
            <Settings className="w-4 h-4 text-stone-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-stone-900">Account Settings</div>
            <div className="text-xs text-stone-400 mt-0.5">Change password</div>
          </div>
          <ChevronRight className={`w-4 h-4 text-stone-300 transition-transform duration-200 ${activeSection === 'account' ? 'rotate-90' : ''}`} />
        </button>

        {activeSection === 'account' && (
          <div className="bg-white border border-stone-200/80 rounded-xl p-5 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">Change Password</h3>
              <button onClick={() => setActiveSection('none')} className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className={labelClass}>New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={accountData.newPassword}
                    onChange={(e) => setAccountData({ ...accountData, newPassword: e.target.value })}
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white placeholder-stone-400 text-stone-900"
                    placeholder="Min. 6 characters"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={accountData.confirmPassword}
                    onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white placeholder-stone-400 text-stone-900"
                    placeholder="Repeat new password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={handlePasswordChange}
                disabled={saving}
                className="flex-1 py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Updating...' : 'Update Password'}
              </button>
              <button
                onClick={() => setActiveSection('none')}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-sm font-semibold rounded-xl hover:bg-stone-200 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-3.5 bg-white border border-stone-200/80 rounded-xl opacity-50 cursor-not-allowed">
          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-stone-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-stone-900">Privacy & Security</div>
            <div className="text-xs text-stone-400 mt-0.5">Coming soon</div>
          </div>
        </div>

        <button
          onClick={() => navigate('/help-support')}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-stone-200/80 rounded-xl hover:border-stone-300 hover:bg-stone-50/50 transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-4 h-4 text-stone-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-stone-900">Help & Support</div>
            <div className="text-xs text-stone-400 mt-0.5">FAQs and contact us</div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-300" />
        </button>
      </div>

      {travelerReviews.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">Reviews About You</p>
            <span className="text-[11px] text-stone-300">({travelerReviews.length})</span>
          </div>
          <div className="space-y-2.5">
            {travelerReviews.map((review) => (
              <div key={review.id} className="bg-white border border-stone-200/80 rounded-xl p-4 card-hover-glow">
                <div className="flex items-start gap-3">
                  {review.reviewer_profile_picture ? (
                    <img src={review.reviewer_profile_picture} alt={review.reviewer_name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-stone-600">{review.reviewer_name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-xs font-semibold text-stone-900 truncate">{review.reviewer_name}</h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        review.reviewer_type === 'host' ? 'bg-orange-50 text-orange-600' : 'bg-teal-50 text-teal-600'
                      }`}>
                        {review.reviewer_type === 'host' ? 'Host' : 'Guide'}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-2">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`} />
                      ))}
                      <span className="text-[10px] text-stone-400 ml-1.5 font-mono">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">{review.review_text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {travelerReviews.length === 0 && (
        <div className="bg-white border border-stone-200/80 rounded-xl p-6 text-center mb-6">
          <MessageSquare className="w-7 h-7 text-stone-200 mx-auto mb-2.5" />
          <p className="text-sm font-medium text-stone-500">No reviews yet</p>
          <p className="text-xs text-stone-400 mt-1">Reviews from hosts and guides will appear here after your trips</p>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={() => {
            setActiveSection(activeSection === 'delete' ? 'none' : 'delete');
            setDeleteConfirmText('');
            setDeleteError(null);
          }}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-red-100 rounded-xl hover:border-red-200 hover:bg-red-50/30 transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-red-600">Delete Account</div>
            <div className="text-xs text-red-400 mt-0.5">Permanently delete your account and data</div>
          </div>
          <ChevronRight className={`w-4 h-4 text-red-200 transition-transform duration-200 ${activeSection === 'delete' ? 'rotate-90' : ''}`} />
        </button>

        {activeSection === 'delete' && (
          <div className="bg-white border border-red-100 rounded-xl p-5 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-red-700">Delete Account</h3>
              <button onClick={() => { setActiveSection('none'); setDeleteError(null); setDeleteConfirmText(''); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4">
              <div className="flex gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-amber-800">This action is permanent and cannot be undone</p>
                  <ul className="text-[11px] text-amber-700 space-y-1 list-disc list-inside">
                    <li>Your saved items and personal data will be permanently removed</li>
                    <li>Your booking history, conversations, and reviews will be anonymized</li>
                    <li>Any host or guide link will be severed</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4">
              <p className="text-[11px] text-stone-500 leading-relaxed">
                If you have active bookings, cancel them first. If linked as a host or guide, ask your administrator to remove you before deleting.
              </p>
            </div>

            {deleteError && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{deleteError}</p>
              </div>
            )}

            <div>
              <label className={labelClass}>
                Type <span className="font-bold text-red-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-400/20 focus:border-red-400 transition-all bg-white placeholder-stone-400 text-stone-900"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete My Account'}
              </button>
              <button
                onClick={() => { setActiveSection('none'); setDeleteError(null); setDeleteConfirmText(''); }}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-sm font-semibold rounded-xl hover:bg-stone-200 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-stone-200/80 rounded-xl hover:border-red-200 hover:bg-red-50/30 transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-red-600">Sign Out</div>
          </div>
        </button>
      </div>

      {hostModalState === 'not_host' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl animate-slide-up">
            <div className="flex justify-end mb-2">
              <button onClick={() => setHostModalState('none')} className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-stone-100 rounded-2xl mb-4">
                <Home className="w-7 h-7 text-stone-500" />
              </div>
              <h2 className="text-lg font-bold text-stone-900 mb-2">No Host or Guide Account Found</h2>
              <p className="text-sm text-stone-600 leading-relaxed mb-2">
                Your email <span className="font-semibold text-stone-900">{travelerUser?.email}</span> is not linked to any host or guide account.
              </p>
              <p className="text-xs text-stone-400 leading-relaxed mb-6">
                To become a host, a partner administrator must add you in the Partner Console. To become a guide, an institution administrator must add you.
              </p>
              <button
                onClick={() => setHostModalState('none')}
                className="w-full py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 active:scale-[0.98] transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
