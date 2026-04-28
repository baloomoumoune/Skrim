import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useUnseenEvents() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const [eventIds, setEventIds] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const refresh = async () => {
      const { data } = await supabase
        .from('lobby_events')
        .select('id')
        .eq('recipient_id', userId)
        .is('seen_at', null);
      if (!cancelled) setEventIds((data ?? []).map((e) => e.id));
    };
    refresh();

    const channel = supabase
      .channel(`unseen-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobby_events',
          filter: `recipient_id=eq.${userId}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markSeen = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await supabase.rpc('mark_events_seen', { p_event_ids: ids });
  }, []);

  return { count: eventIds.length, eventIds, markSeen };
}
