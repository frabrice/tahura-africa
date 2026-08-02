import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

interface UnreadResult {
  totalUnread: number;
  unreadByConversation: Record<string, number>;
  displayCount: string;
  refresh: () => void;
}

export function useUnreadMessages(
  userType: 'host' | 'guide',
  userId: string | null | undefined
): UnreadResult {
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});

  const fetchUnread = useCallback(async () => {
    if (!userId) return;

    const idField = userType === 'host' ? 'host_id' : 'guide_id';

    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .eq(idField, userId);

    if (!convs || convs.length === 0) {
      setTotalUnread(0);
      setUnreadByConversation({});
      return;
    }

    const convIds = convs.map(c => c.id);

    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .eq('is_read', false)
      .neq('sender_type', userType);

    if (!msgs || msgs.length === 0) {
      setTotalUnread(0);
      setUnreadByConversation({});
      return;
    }

    const byConv: Record<string, number> = {};
    msgs.forEach(m => {
      byConv[m.conversation_id] = (byConv[m.conversation_id] || 0) + 1;
    });

    setUnreadByConversation(byConv);
    setTotalUnread(msgs.length);
  }, [userId, userType]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  const displayCount = totalUnread === 0 ? '' : totalUnread > 9 ? '9+' : totalUnread.toString();

  return { totalUnread, unreadByConversation, displayCount, refresh: fetchUnread };
}
