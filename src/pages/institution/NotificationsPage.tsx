import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { NotificationsView } from '../../components/NotificationsView';

export function NotificationsPage({ onNavigateToTab }: { onNavigateToTab?: (tab: string) => void }) {
  const { user } = useAuth();
  const portalUser = user as PortalUser;

  function handleNavigate(action: string, _metadata: any) {
    if (!onNavigateToTab) return;
    if (action === 'view_profile' || action === 'edit_profile') {
      onNavigateToTab('profile');
    }
  }

  return (
    <NotificationsView
      portalUserId={portalUser?.id || ''}
      onNavigate={handleNavigate}
    />
  );
}
