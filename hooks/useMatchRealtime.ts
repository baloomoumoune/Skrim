import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Subscribe to Supabase Realtime changes for a specific match.
 * Listens to match row + member changes (no more match_requests).
 */
export function useMatchRealtime(matchId: string | undefined, onRefresh: () => void) {
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`match-detail-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        () => {
          if (__DEV__) console.log('[Realtime] Match updated');
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
          if (__DEV__) console.log('[Realtime] Members updated');
          onRefresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, onRefresh]);
}
