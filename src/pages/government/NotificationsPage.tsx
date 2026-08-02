import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import { NotificationsView } from '../../components/NotificationsView';

export function NotificationsPage() {
  const { user } = useAuth();
  const portalUser = user as PortalUser;

  return (
    <NotificationsView
      portalUserId={portalUser?.id || ''}
    />
  );
}
