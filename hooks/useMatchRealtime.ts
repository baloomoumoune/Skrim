import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Subscribe to Supabase Realtime changes for a specific match.
 * Triggers the provided refresh callback when relevant events occur.
 */
export function useMatchRealtime(matchId: string | undefined, onRefresh: () => void) {
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`match-detail-${matchId}`)
      // Listen to match row changes
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
      // Listen to member changes for this match
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
      // Listen to request changes for this match
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_requests',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          if (__DEV__) console.log('[Realtime] Requests updated');
          onRefresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, onRefresh]);
}
