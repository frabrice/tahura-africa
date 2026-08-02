import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Portal } from '../components/Portal';
import { DashboardLayout } from '../components/DashboardLayout';
import { Home, Package, Users, User, Calendar, FileText, BarChart3, Settings, AlertTriangle, LifeBuoy, Wallet, X, Bell } from 'lucide-react';
const AnalyticsPage = lazy(() => import('../pages/institution/AnalyticsPage').then(m => ({ default: m.InstitutionAnalyticsPage })));
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PortalUser } from '../lib/auth';
import { useNotificationCount } from '../lib/useNotificationCount';
import { useTicketCount } from '../lib/useTicketCount';
import { HomePage } from '../pages/institution/HomePage';

const ProgramsPage = lazy(() => import('../pages/institution/ProgramsPage').then(m => ({ default: m.ProgramsPage })));
const GuidesPage = lazy(() => import('../pages/institution/GuidesPage').then(m => ({ default: m.GuidesPage })));
const SchedulePage = lazy(() => import('../pages/institution/SchedulePage').then(m => ({ default: m.SchedulePage })));
const BookingsPage = lazy(() => import('../pages/institution/BookingsPage').then(m => ({ default: m.BookingsPage })));
const ReportsPage = lazy(() => import('../pages/institution/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('../pages/institution/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('../pages/institution/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SupportPage = lazy(() => import('../pages/institution/SupportPage').then(m => ({ default: m.SupportPage })));
const TipsAndPaymentsPage = lazy(() => import('../pages/institution/TipsAndPaymentsPage').then(m => ({ default: m.TipsAndPaymentsPage })));
const NotificationsPage = lazy(() => import('../pages/institution/NotificationsPage').then(m => ({ default: m.NotificationsPage })));

type Tab = 'home' | 'programs' | 'guides' | 'tips' | 'schedule' | 'bookings' | 'notifications' | 'reports' | 'analytics' | 'support' | 'settings' | 'profile';

const baseNavItems = [
  { id: 'home' as Tab, icon: Home, label: 'Home' },
  { id: 'programs' as Tab, icon: Package, label: 'Programs & Packages' },
  { id: 'guides' as Tab, icon: Users, label: 'Guides & Staff' },
  { id: 'tips' as Tab, icon: Wallet, label: 'Tips & Payments' },
  { id: 'profile' as Tab, icon: User, label: 'Profile' },
  { id: 'schedule' as Tab, icon: Calendar, label: 'Schedule & Capacity' },
  { id: 'bookings' as Tab, icon: FileText, label: 'Bookings' },
  { id: 'notifications' as Tab, icon: Bell, label: 'Notifications' },
  { id: 'analytics' as Tab, icon: BarChart3, label: 'Analytics' },
  { id: 'reports' as Tab, icon: BarChart3, label: 'Reports' },
  { id: 'support' as Tab, icon: LifeBuoy, label: 'Support' },
  { id: 'settings' as Tab, icon: Settings, label: 'Settings' },
];

export function InstitutionsPlatform() {
  const navigate = useNavigate();
  const { isPortalUser, logout, user } = useAuth();
  const portalUser = user as PortalUser | null;
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const notifCount = useNotificationCount(portalUser?.id);
  const ticketCount = useTicketCount(portalUser?.id, 'portal');
  const navItems = baseNavItems.map(item => {
    if (item.id === 'notifications') return { ...item, badge: notifCount };
    if (item.id === 'support') return { ...item, badge: ticketCount };
    return item;
  });
  const [profilePublished, setProfilePublished] = useState<boolean | null>(null);
  const [profileName, setProfileName] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (portalUser?.id) loadProfileStatus();
  }, [portalUser?.id, activeTab]);

  async function loadProfileStatus() {
    if (!portalUser?.id) return;
    const { data } = await supabase
      .from('institution_profiles')
      .select('published, name')
      .eq('portal_user_id', portalUser.id)
      .maybeSingle();
    setProfilePublished(data?.published ?? false);
    setProfileName(data?.name || '');
  }

  const handleLogout = () => {
    logout();
    navigate('/institution/login');
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    if (!isPortalUser('institution')) {
      navigate('/institution/login');
    }
  }, [isPortalUser, navigate]);

  if (!isPortalUser('institution')) {
    return null;
  }

  const profileBanner = !bannerDismissed && profilePublished === false ? (
    <div className="flex items-center gap-3 mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-amber-800">
          {profileName ? `${profileName} is not yet visible` : 'Profile not published'} — your institution is not listed under Attractions.
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          Complete your profile and enable publishing to appear on the traveler platform.
        </p>
      </div>
      <button
        onClick={() => handleTabChange('profile')}
        className="flex-shrink-0 text-xs font-medium text-amber-800 underline hover:text-amber-900"
      >
        Complete Profile
      </button>
      <button
        onClick={() => setBannerDismissed(true)}
        className="flex-shrink-0 text-neutral-400 hover:text-neutral-600"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  return (
    <Portal currentPortal="institution" hideFooter>
      <DashboardLayout
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={(id) => handleTabChange(id as Tab)}
        onLogout={handleLogout}
        banner={profileBanner}
        theme="amber"
      >
        <Suspense fallback={<div className="p-4 md:p-6 space-y-4"><div className="flex gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex-1 h-24 bg-neutral-100 rounded-lg skeleton-shimmer" />)}</div><div className="h-64 bg-neutral-100 rounded-lg skeleton-shimmer" /></div>}>
          {activeTab === 'home' && <HomePage />}
          {activeTab === 'programs' && <ProgramsPage />}
          {activeTab === 'guides' && <GuidesPage />}
          {activeTab === 'schedule' && <SchedulePage />}
          {activeTab === 'bookings' && <BookingsPage />}
          {activeTab === 'tips' && <TipsAndPaymentsPage />}
          {activeTab === 'notifications' && <NotificationsPage onNavigateToTab={(tab) => handleTabChange(tab as Tab)} />}
          {activeTab === 'analytics' && <AnalyticsPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'support' && <SupportPage />}
          {activeTab === 'settings' && <SettingsPage />}
          {activeTab === 'profile' && <ProfilePage />}
        </Suspense>
      </DashboardLayout>
    </Portal>
  );
}
