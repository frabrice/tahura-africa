import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Portal } from '../components/Portal';
import { DashboardLayout } from '../components/DashboardLayout';
import { Home, Layers, Calendar, DollarSign, MessageSquare, Settings, Users, BarChart3, LifeBuoy, Bell, Sparkles, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PortalUser } from '../lib/auth';
import { useNotificationCount } from '../lib/useNotificationCount';
import { useTicketCount } from '../lib/useTicketCount';
import { HomePage } from '../pages/partner/HomePage';
import type { SupportIdentity } from '../components/SupportChatWidget';

const SupportChatWidget = lazy(() => import('../components/SupportChatWidget').then(m => ({ default: m.SupportChatWidget })));

const ListingsPage = lazy(() => import('../pages/partner/ListingsPage').then(m => ({ default: m.ListingsPage })));
const CustomQuoteList = lazy(() => import('../components/CustomQuoteList').then(m => ({ default: m.CustomQuoteList })));
const BookingsPage = lazy(() => import('../pages/partner/BookingsPage').then(m => ({ default: m.BookingsPage })));
const EarningsPage = lazy(() => import('../pages/partner/EarningsPage').then(m => ({ default: m.EarningsPage })));
const MessagesPage = lazy(() => import('../pages/partner/MessagesPage').then(m => ({ default: m.MessagesPage })));
const SettingsPage = lazy(() => import('../pages/partner/SettingsPage').then(m => ({ default: m.SettingsPage })));
const HostsPage = lazy(() => import('../pages/partner/HostsPage').then(m => ({ default: m.HostsPage })));
const AnalyticsPage = lazy(() => import('../pages/partner/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SupportPage = lazy(() => import('../pages/partner/SupportPage').then(m => ({ default: m.SupportPage })));
const NotificationsPage = lazy(() => import('../pages/partner/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ContentStudioPage = lazy(() => import('../pages/partner/ContentStudioPage').then(m => ({ default: m.ContentStudioPage })));

type Tab = 'home' | 'listings' | 'hosts' | 'quotes' | 'bookings' | 'earnings' | 'messages' | 'notifications' | 'analytics' | 'content' | 'support' | 'settings';

const baseNavItems = [
  { id: 'home' as Tab, icon: Home, label: 'Home' },
  { id: 'listings' as Tab, icon: Layers, label: 'Listings' },
  { id: 'hosts' as Tab, icon: Users, label: 'Hosts' },
  { id: 'quotes' as Tab, icon: FileText, label: 'Custom Quotes' },
  { id: 'bookings' as Tab, icon: Calendar, label: 'Bookings' },
  { id: 'earnings' as Tab, icon: DollarSign, label: 'Earnings' },
  { id: 'messages' as Tab, icon: MessageSquare, label: 'Messages' },
  { id: 'notifications' as Tab, icon: Bell, label: 'Notifications' },
  { id: 'analytics' as Tab, icon: BarChart3, label: 'Analytics' },
  { id: 'content' as Tab, icon: Sparkles, label: 'Content Studio' },
  { id: 'support' as Tab, icon: LifeBuoy, label: 'Support' },
  { id: 'settings' as Tab, icon: Settings, label: 'Settings' },
];

export function PartnerConsole() {
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

  const handleLogout = () => {
    logout();
    navigate('/partner/login');
  };

  useEffect(() => {
    if (!isPortalUser('partner')) {
      navigate('/partner/login');
    }
  }, [isPortalUser, navigate]);

  if (!isPortalUser('partner')) {
    return null;
  }

  const supportIdentity: SupportIdentity | null = portalUser
    ? { role: 'partner', id: portalUser.id, name: portalUser.name || 'Partner', email: portalUser.email || '' }
    : null;

  return (
    <Portal currentPortal="partner" hideFooter>
      <DashboardLayout
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
        onLogout={handleLogout}
        theme="teal"
      >
        <Suspense fallback={<div className="p-4 md:p-6 space-y-4"><div className="flex gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex-1 h-24 bg-neutral-100 rounded-lg skeleton-shimmer" />)}</div><div className="h-64 bg-neutral-100 rounded-lg skeleton-shimmer" /></div>}>
          {activeTab === 'home' && <HomePage />}
          {activeTab === 'listings' && <ListingsPage />}
          {activeTab === 'hosts' && <HostsPage />}
          {activeTab === 'quotes' && <CustomQuoteList createdBy="partner" attribution={{ partnerId: portalUser?.id }} />}
          {activeTab === 'bookings' && <BookingsPage />}
          {activeTab === 'earnings' && <EarningsPage />}
          {activeTab === 'messages' && <MessagesPage />}
          {activeTab === 'notifications' && <NotificationsPage onNavigateToTab={(tab) => setActiveTab(tab as Tab)} />}
          {activeTab === 'analytics' && <AnalyticsPage />}
          {activeTab === 'content' && <ContentStudioPage />}
          {activeTab === 'support' && <SupportPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </Suspense>
      </DashboardLayout>

      <Suspense fallback={null}>
        <SupportChatWidget identity={supportIdentity} />
      </Suspense>
    </Portal>
  );
}
