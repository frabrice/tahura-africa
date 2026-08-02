import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Portal } from '../components/Portal';
import { DashboardLayout } from '../components/DashboardLayout';
import { BarChart3, TrendingUp, Building2, DollarSign, Map, FileText, Compass, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PortalUser } from '../lib/auth';
import { useNotificationCount } from '../lib/useNotificationCount';
import { OverviewPage } from '../pages/government/OverviewPage';

const TourismActivityPage = lazy(() => import('../pages/government/TourismActivityPage').then(m => ({ default: m.TourismActivityPage })));
const AttractionUsagePage = lazy(() => import('../pages/government/AttractionUsagePage').then(m => ({ default: m.AttractionUsagePage })));
const EconomicSignalsPage = lazy(() => import('../pages/government/EconomicSignalsPage').then(m => ({ default: m.EconomicSignalsPage })));
const RegionalInsightsPage = lazy(() => import('../pages/government/RegionalInsightsPage').then(m => ({ default: m.RegionalInsightsPage })));
const ReportsPage = lazy(() => import('../pages/government/ReportsPage').then(m => ({ default: m.ReportsPage })));
const PolicyPage = lazy(() => import('../pages/government/PolicyPage').then(m => ({ default: m.PolicyPage })));
const NotificationsPage = lazy(() => import('../pages/government/NotificationsPage').then(m => ({ default: m.NotificationsPage })));

type Tab = 'overview' | 'activity' | 'attractions' | 'economic' | 'regional' | 'policy' | 'notifications' | 'reports';

const baseNavItems = [
  { id: 'overview' as Tab, icon: BarChart3, label: 'Overview' },
  { id: 'activity' as Tab, icon: TrendingUp, label: 'Tourism Activity' },
  { id: 'attractions' as Tab, icon: Building2, label: 'Attraction Usage' },
  { id: 'economic' as Tab, icon: DollarSign, label: 'Economic Signals' },
  { id: 'regional' as Tab, icon: Map, label: 'Regional Insights' },
  { id: 'policy' as Tab, icon: Compass, label: 'Policy & Direction' },
  { id: 'notifications' as Tab, icon: Bell, label: 'Notifications' },
  { id: 'reports' as Tab, icon: FileText, label: 'Reports & Exports' },
];

export function GovernmentPortal() {
  const navigate = useNavigate();
  const { isPortalUser, logout, user } = useAuth();
  const portalUser = user as PortalUser | null;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const notifCount = useNotificationCount(portalUser?.id);
  const navItems = baseNavItems.map(item =>
    item.id === 'notifications' ? { ...item, badge: notifCount } : item
  );

  const handleLogout = () => {
    logout();
    navigate('/government/login');
  };

  useEffect(() => {
    if (!isPortalUser('government')) {
      navigate('/government/login');
    }
  }, [isPortalUser, navigate]);

  if (!isPortalUser('government')) {
    return null;
  }

  return (
    <Portal currentPortal="government" hideFooter>
      <DashboardLayout
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
        onLogout={handleLogout}
        theme="sky"
      >
        <Suspense fallback={<div className="p-4 md:p-6 space-y-4"><div className="flex gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex-1 h-24 bg-neutral-100 rounded-lg skeleton-shimmer" />)}</div><div className="h-64 bg-neutral-100 rounded-lg skeleton-shimmer" /></div>}>
          {activeTab === 'overview' && <OverviewPage />}
          {activeTab === 'activity' && <TourismActivityPage />}
          {activeTab === 'attractions' && <AttractionUsagePage />}
          {activeTab === 'economic' && <EconomicSignalsPage />}
          {activeTab === 'regional' && <RegionalInsightsPage />}
          {activeTab === 'policy' && <PolicyPage />}
          {activeTab === 'notifications' && <NotificationsPage />}
          {activeTab === 'reports' && <ReportsPage />}
        </Suspense>
      </DashboardLayout>
    </Portal>
  );
}
