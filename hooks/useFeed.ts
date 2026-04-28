import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { FeedSearcherListing, FeedLastListing } from '@/types/composites';

export type FeedRole = 'searcher' | 'last';

export function useFeed(role: FeedRole, filterOverrides: Record<string, unknown> = {}) {
  const qc = useQueryClient();
  const queryKey = ['feed', role, filterOverrides] as const;

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const rpcName = role === 'searcher' ? 'get_last_feed' : 'get_searcher_feed';
      const { data, error } = await supabase.rpc(rpcName, {
        p_filter_overrides: filterOverrides as never,
      });
      if (error) throw error;
      return (data ?? []) as unknown as (FeedSearcherListing | FeedLastListing)[];
    },
  });

  useEffect(() => {
    const target = role === 'searcher' ? 'last' : 'searcher';
    const channel = supabase
      .channel(`feed-${role}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings', filter: `kind=eq.${target}` },
        () => {
          qc.invalidateQueries({ queryKey: ['feed', role] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, qc]);

  return query;
}
