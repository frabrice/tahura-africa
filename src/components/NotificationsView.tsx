import { useState, useEffect } from 'react';
import { BellOff, ChevronRight, ArrowLeft, Clock, Eye, Pencil } from 'lucide-react';
import { Card } from './Card';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

interface CTAButton {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface Props {
  portalUserId: string;
  onNavigate?: (action: string, metadata: any) => void;
}

export function NotificationsView({ portalUserId, onNavigate }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (portalUserId) loadNotifications();
  }, [portalUserId]);

  async function loadNotifications() {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_portal_user_id', portalUserId)
      .order('created_at', { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  function openNotification(notification: Notification) {
    if (!notification.is_read) markAsRead(notification.id);
    setSelectedNotification(notification);
  }

  function getCTAButtons(notification: Notification): CTAButton[] {
    const meta = notification.metadata || {};
    const buttons: CTAButton[] = [];

    if (notification.type === 'listing_flagged' || notification.type === 'listing_unflagged' || notification.type === 'listing_removed') {
      if (onNavigate) {
        buttons.push({
          label: 'View Listing',
          icon: Eye,
          action: () => onNavigate('view_listing', meta),
          variant: 'primary',
        });
        if (notification.type === 'listing_flagged') {
          buttons.push({
            label: 'Edit Listing',
            icon: Pencil,
            action: () => onNavigate('edit_listing', meta),
            variant: 'secondary',
          });
        }
      }
    }

    if (notification.type === 'attraction_flagged' || notification.type === 'attraction_unflagged' || notification.type === 'attraction_removed') {
      if (onNavigate) {
        buttons.push({
          label: 'View Profile',
          icon: Eye,
          action: () => onNavigate('view_profile', meta),
          variant: 'primary',
        });
        if (notification.type === 'attraction_flagged') {
          buttons.push({
            label: 'Edit Profile',
            icon: Pencil,
            action: () => onNavigate('edit_profile', meta),
            variant: 'secondary',
          });
        }
      }
    }

    return buttons;
  }

  function getTypeColor(type: string) {
    if (type.includes('flagged')) return 'border-l-red-500 bg-red-50/30';
    if (type.includes('unflagged')) return 'border-l-emerald-500 bg-emerald-50/30';
    if (type.includes('removed')) return 'border-l-neutral-500 bg-neutral-50/50';
    return 'border-l-blue-500 bg-blue-50/30';
  }

  function getTypeLabel(type: string) {
    if (type.includes('flagged') && !type.includes('unflagged')) return { label: 'Content Flagged', color: 'bg-red-100 text-red-700' };
    if (type.includes('unflagged')) return { label: 'Flag Resolved', color: 'bg-emerald-100 text-emerald-700' };
    if (type.includes('removed')) return { label: 'Content Removed', color: 'bg-neutral-200 text-neutral-700' };
    return { label: 'System', color: 'bg-blue-100 text-blue-700' };
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-neutral-900 mb-6">Notifications</h1>
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (selectedNotification) {
    const typeInfo = getTypeLabel(selectedNotification.type);
    const ctaButtons = getCTAButtons(selectedNotification);

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-neutral-900">Notifications</h1>
        </div>

        <button
          onClick={() => setSelectedNotification(null)}
          className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to all notifications
        </button>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              <span className="text-xs text-neutral-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(selectedNotification.created_at)}
              </span>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-neutral-900 mb-3">{selectedNotification.title}</h2>

          <div className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line mb-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            {selectedNotification.message}
          </div>

          {ctaButtons.length > 0 && (
            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
              {ctaButtons.map((btn, i) => {
                const Icon = btn.icon;
                const variantClasses = btn.variant === 'primary'
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                  : btn.variant === 'danger'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50';
                return (
                  <button
                    key={i}
                    onClick={btn.action}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-lg transition-colors ${variantClasses}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {btn.label}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-neutral-500 mt-0.5">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={async () => {
              const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
              for (const id of unreadIds) {
                await supabase.from('notifications').update({ is_read: true }).eq('id', id);
              }
              setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            }}
            className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <BellOff className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <div className="text-sm font-medium text-neutral-900 mb-1">No notifications</div>
          <div className="text-xs text-neutral-500">You're all caught up. New notifications will appear here.</div>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const typeInfo = getTypeLabel(n.type);
            return (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                className={`w-full text-left p-4 rounded-lg border-l-4 transition-all hover:shadow-sm ${getTypeColor(n.type)} ${
                  !n.is_read ? 'border border-neutral-200' : 'border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      {!n.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                      <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <div className={`text-xs mb-0.5 ${!n.is_read ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-700'}`}>
                      {n.title}
                    </div>
                    <div className="text-xs text-neutral-500 truncate max-w-[500px]">
                      {n.message.split('\n')[0]}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0 ml-3 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
