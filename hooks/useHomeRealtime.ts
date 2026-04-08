import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Subscribe to Supabase Realtime for all match changes.
 * No server-side filter — we refetch on any match table change.
 * The refetch applies game/region/status filters server-side.
 */
export function useHomeRealtime(onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const channel = supabase
      .channel('home-matches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        () => {
          if (__DEV__) console.log('[Realtime:Home] Matches updated');
          onRefreshRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
