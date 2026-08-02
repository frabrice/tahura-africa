import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useNotificationCount(portalUserId: string | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!portalUserId) return;

    loadCount();
    const interval = setInterval(loadCount, 30000);

    // Supabase Realtime: subscribe to new notifications
    const channel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_portal_user_id=eq.${portalUserId}` },
        () => { loadCount(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_portal_user_id=eq.${portalUserId}` },
        () => { loadCount(); }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };

    async function loadCount() {
      const { count: c } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_portal_user_id', portalUserId!)
        .eq('is_read', false);
      setCount(c || 0);
    }
  }, [portalUserId]);

  return count;
}
