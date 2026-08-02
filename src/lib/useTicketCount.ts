import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useTicketCount(portalUserId: string | undefined, mode: 'portal' | 'all') {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (mode === 'portal' && !portalUserId) return;

    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);

    async function loadCount() {
      let query = supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');

      if (mode === 'portal') {
        query = query.eq('created_by_portal_id', portalUserId!);
      }

      const { count: c } = await query;
      setCount(c || 0);
    }
  }, [portalUserId, mode]);

  return count;
}
