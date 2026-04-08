import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useActiveMatchStore } from '@/stores/activeMatchStore';
import { useActiveMatchRealtime } from './useActiveMatchRealtime';
import type { Match } from '@/types/database';
import type { MatchMemberWithProfile } from '@/types/composites';

export function useActiveMatch() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const setActiveMatch = useActiveMatchStore((s) => s.setActiveMatch);
  const clearActiveMatch = useActiveMatchStore((s) => s.clearActiveMatch);

  const fetchActiveMatch = useCallback(async () => {
    if (!userId) {
      clearActiveMatch();
      return;
    }

    try {
      // Find user's active membership (not kicked) in an active match
      const { data: memberData } = await supabase
        .from('match_members')
        .select('match_id')
        .eq('user_id', userId)
        .is('kicked_at' as string, null)
        .limit(10);

      if (!memberData || memberData.length === 0) {
        clearActiveMatch();
        return;
      }

      const matchIds = (memberData as { match_id: string }[]).map((m) => m.match_id);

      // Find the active match among those
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .in('id', matchIds)
        .in('status', ['open', 'full', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!matchData) {
        clearActiveMatch();
        return;
      }

      const match = matchData as Match;

      // Fetch members for this match
      const { data: membersData } = await supabase
        .from('match_members')
        .select('*, profile:profiles(*)')
        .eq('match_id', match.id)
        .is('kicked_at' as string, null)
        .order('joined_at', { ascending: true });

      const members = (membersData ?? []) as unknown as MatchMemberWithProfile[];
      setActiveMatch(match, members);
    } catch (err) {
      if (__DEV__) console.error('[useActiveMatch] Error:', err);
    }
  }, [userId, setActiveMatch, clearActiveMatch]);

  // Initial fetch
  useEffect(() => {
    fetchActiveMatch();
  }, [fetchActiveMatch]);

  // Subscribe to realtime updates (replaces polling)
  useActiveMatchRealtime(fetchActiveMatch);

  return { refresh: fetchActiveMatch };
}
