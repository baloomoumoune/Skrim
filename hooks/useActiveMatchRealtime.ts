import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useActiveMatchStore } from '@/stores/activeMatchStore';

/**
 * Subscribe to Supabase Realtime for the active match.
 * Replaces polling — triggers a refresh callback on any relevant change.
 */
export function useActiveMatchRealtime(onRefresh: () => void) {
  const activeMatch = useActiveMatchStore((s) => s.activeMatch);
  const matchId = activeMatch?.id;

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`active-match-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        () => {
          if (__DEV__) console.log('[Realtime:Active] Match updated');
          onRefresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_members',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          if (__DEV__) console.log('[Realtime:Active] Members updated');
          onRefresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, onRefresh]);
}
