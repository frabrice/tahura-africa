import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowRightLeft, LogOut, Phone, Mail, Briefcase, Languages, BookOpen } from 'lucide-react';
import { useGuideRecord, useGuidePrograms, getGuideContext } from '../../lib/useGuideData';
import { supabase } from '../../lib/supabase';

type Tab = 'personal' | 'account';

export function GuideProfilePage() {
  const navigate = useNavigate();
  const ctx = getGuideContext();
  const { guide, loading } = useGuideRecord();
  const { programs } = useGuidePrograms(ctx?.id);
  const [activeTab, setActiveTab] = useState<Tab>('personal');

  const handleSwitchToTraveler = () => navigate('/profile');

  const handleSignOut = async () => {
    localStorage.removeItem('guideContext');
    localStorage.removeItem('currentUser');
    await supabase.auth.signOut();
    navigate('/');
  };

  const activePrograms = programs.filter(p => p.active).length;

  return (
    <div className="px-4 md:px-8 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Profile</h1>
        <p className="text-sm text-neutral-500 mt-1">Your guide profile and account settings</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-neutral-900">{loading ? '—' : (guide?.name || ctx?.name || 'Guide')}</h2>
            <p className="text-sm text-neutral-500 mt-0.5">{guide?.email || '—'}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                {guide?.available ? 'Available' : 'Off Duty'}
              </span>
              <span className="text-xs text-neutral-500">{activePrograms} active program{activePrograms !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button
            onClick={handleSwitchToTraveler}
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 border border-neutral-200 px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors whitespace-nowrap flex-shrink-0"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Traveler Mode
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-6 w-fit">
        {([
          { key: 'personal', label: 'Personal Info' },
          { key: 'account', label: 'Account' },
        ] as { key: Tab; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === tab.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'personal' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-neutral-500">Full Name</p>
                      <p className="text-sm font-medium text-neutral-900 mt-0.5">{guide?.name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-neutral-500">Email Address</p>
                      <p className="text-sm font-medium text-neutral-900 mt-0.5">{guide?.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-neutral-500">Phone Number</p>
                      <p className="text-sm font-medium text-neutral-900 mt-0.5">{guide?.phone || '—'}</p>
                    </div>
                  </div>
                  {(guide?.experience_years ?? 0) > 0 && (
                    <div className="flex items-start gap-3">
                      <Briefcase className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-neutral-500">Years of Experience</p>
                        <p className="text-sm font-medium text-neutral-900 mt-0.5">{guide!.experience_years} years</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4">Bio</h3>
                {guide?.bio ? (
                  <p className="text-sm text-neutral-700 leading-relaxed">{guide.bio}</p>
                ) : (
                  <p className="text-sm text-neutral-400 italic">No bio provided</p>
                )}
              </div>

              {(guide?.languages?.length ?? 0) > 0 && (
                <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Languages className="w-4 h-4 text-neutral-500" />
                    <h3 className="text-sm font-semibold text-neutral-900">Languages Spoken</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {guide!.languages.map(lang => (
                      <span key={lang} className="text-xs px-3 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-full">{lang}</span>
                    ))}
                  </div>
                </div>
              )}

              {(guide?.specializations?.length ?? 0) > 0 && (
                <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-4 h-4 text-neutral-500" />
                    <h3 className="text-sm font-semibold text-neutral-900">Specializations</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {guide!.specializations.map(s => (
                      <span key={s} className="text-xs px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-neutral-500" />
                  <h3 className="text-sm font-semibold text-neutral-900">Assigned Programs</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-neutral-50 rounded-xl">
                    <p className="text-xl font-bold text-neutral-900">{programs.length}</p>
                    <p className="text-xs text-neutral-500">Total</p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-xl">
                    <p className="text-xl font-bold text-emerald-700">{activePrograms}</p>
                    <p className="text-xs text-emerald-600">Active</p>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 rounded-xl">
                    <p className="text-xl font-bold text-neutral-700">{programs.length - activePrograms}</p>
                    <p className="text-xs text-neutral-500">Inactive</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <button
              onClick={handleSwitchToTraveler}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors text-left"
            >
              <ArrowRightLeft className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-neutral-900">Switch to Traveler Mode</p>
                <p className="text-xs text-neutral-400 mt-0.5">Go back to your traveler account</p>
              </div>
            </button>
          </div>

          <div className="bg-white border border-red-100 rounded-2xl overflow-hidden">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-600">Sign Out</p>
                <p className="text-xs text-neutral-400 mt-0.5">Sign out of your guide account</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
