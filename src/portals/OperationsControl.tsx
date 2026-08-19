import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Portal } from '../components/Portal';
import { DashboardLayout } from '../components/DashboardLayout';
import { Activity, AlertTriangle, Archive, FileText, Settings, Layers, DollarSign, BarChart3, Shield, Landmark, Wallet, UserPlus, Receipt, Home, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTicketCount } from '../lib/useTicketCount';
import { ControlRoomPage } from '../pages/operations/ControlRoomPage';

const BookingsPage = lazy(() => import('../pages/operations/BookingsPage').then(m => ({ default: m.BookingsPage })));
const CapacityPage = lazy(() => import('../pages/operations/CapacityPage').then(m => ({ default: m.CapacityPage })));
const CasesPage = lazy(() => import('../pages/operations/CasesPage').then(m => ({ default: m.CasesPage })));
const RulesPage = lazy(() => import('../pages/operations/RulesPage').then(m => ({ default: m.RulesPage })));
const AuditPage = lazy(() => import('../pages/operations/AuditPage').then(m => ({ default: m.AuditPage })));
const ManagePage = lazy(() => import('../pages/operations/ManagePage').then(m => ({ default: m.ManagePage })));
const LocalPage = lazy(() => import('../pages/operations/LocalPage').then(m => ({ default: m.LocalPage })));
const FinancesPage = lazy(() => import('../pages/operations/FinancesPage').then(m => ({ default: m.FinancesPage })));
const OperationsAnalyticsPage = lazy(() => import('../pages/operations/AnalyticsPage').then(m => ({ default: m.OperationsAnalyticsPage })));
const ModerationPage = lazy(() => import('../pages/operations/ModerationPage').then(m => ({ default: m.ModerationPage })));
const AttractionsPage = lazy(() => import('../pages/operations/AttractionsPage').then(m => ({ default: m.AttractionsPage })));
const WithdrawalsPage = lazy(() => import('../pages/operations/WithdrawalsPage').then(m => ({ default: m.WithdrawalsPage })));
const ApplicationsPage = lazy(() => import('../pages/operations/ApplicationsPage').then(m => ({ default: m.ApplicationsPage })));
const CustomQuoteList = lazy(() => import('../components/CustomQuoteList').then(m => ({ default: m.CustomQuoteList })));

type Tab = 'control' | 'bookings' | 'finances' | 'analytics' | 'manage' | 'local' | 'attractions' | 'applications' | 'quotes' | 'capacity' | 'cases' | 'rules' | 'audit' | 'moderation' | 'withdrawals';

const baseNavItems = [
  { id: 'control' as Tab, icon: Activity, label: 'Control Room' },
  { id: 'bookings' as Tab, icon: Calendar, label: 'Bookings' },
  { id: 'finances' as Tab, icon: DollarSign, label: 'Finances' },
  { id: 'withdrawals' as Tab, icon: Wallet, label: 'Withdrawals' },
  { id: 'analytics' as Tab, icon: BarChart3, label: 'Analytics' },
  { id: 'local' as Tab, icon: Home, label: 'Local' },
  { id: 'attractions' as Tab, icon: Landmark, label: 'Attractions' },
  { id: 'applications' as Tab, icon: UserPlus, label: 'Applications' },
  { id: 'quotes' as Tab, icon: Receipt, label: 'Custom Quotes' },
  { id: 'manage' as Tab, icon: Layers, label: 'Manage' },
  { id: 'moderation' as Tab, icon: Shield, label: 'Moderation' },
  { id: 'capacity' as Tab, icon: AlertTriangle, label: 'Overload & Capacity' },
  { id: 'cases' as Tab, icon: FileText, label: 'Cases & Support' },
  { id: 'rules' as Tab, icon: Settings, label: 'System Rules' },
  { id: 'audit' as Tab, icon: Archive, label: 'Audit Logs' },
];

export function OperationsControl() {
  const navigate = useNavigate();
  const { isPortalUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('control');
  const ticketCount = useTicketCount(undefined, 'all');
  const navItems = baseNavItems.map(item =>
    item.id === 'cases' ? { ...item, badge: ticketCount } : item
  );

  const handleLogout = () => {
    logout();
    navigate('/hq/operations-control-room/login');
  };

  useEffect(() => {
    if (!isPortalUser('operations')) {
      navigate('/hq/operations-control-room/login');
    }
  }, [isPortalUser, navigate]);

  if (!isPortalUser('operations')) {
    return null;
  }

  return (
    <Portal currentPortal="operations" hideFooter>
      <DashboardLayout
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
        onLogout={handleLogout}
        theme="slate"
      >
        <Suspense fallback={<div className="p-4 md:p-6 space-y-4"><div className="flex gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex-1 h-24 bg-neutral-100 rounded-lg skeleton-shimmer" />)}</div><div className="h-64 bg-neutral-100 rounded-lg skeleton-shimmer" /></div>}>
          {activeTab === 'control' && <ControlRoomPage />}
          {activeTab === 'bookings' && <BookingsPage />}
          {activeTab === 'finances' && <FinancesPage />}
          {activeTab === 'withdrawals' && <WithdrawalsPage />}
          {activeTab === 'analytics' && <OperationsAnalyticsPage />}
          {activeTab === 'manage' && <ManagePage />}
          {activeTab === 'local' && <LocalPage />}
          {activeTab === 'attractions' && <AttractionsPage />}
          {activeTab === 'applications' && <ApplicationsPage />}
          {activeTab === 'quotes' && <CustomQuoteList attribution={{}} canCreate />}
          {activeTab === 'capacity' && <CapacityPage />}
          {activeTab === 'cases' && <CasesPage />}
          {activeTab === 'rules' && <RulesPage />}
          {activeTab === 'audit' && <AuditPage />}
          {activeTab === 'moderation' && <ModerationPage />}
        </Suspense>
      </DashboardLayout>
    </Portal>
  );
}
