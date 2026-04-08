import { useEffect, useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useGameAssets } from '@/hooks/useGameAssets';
import type { TeamInviteWithTeam } from '@/types/composites';

export function useTeamInvites() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const selectedGame = useGameStore((s) => s.selectedGame);
  const { ranks } = useGameAssets();
  const [invites, setInvites] = useState<TeamInviteWithTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    if (!userId) {
      setInvites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('team_invites')
        .select('*, team:teams(*), inviter:profiles!team_invites_invited_by_fkey(*)')
        .eq('invited_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        if (__DEV__) console.error('[useTeamInvites] Error:', error);
        setInvites([]);
        return;
      }

      // Filter by selected game
      const allInvites = (data ?? []) as unknown as TeamInviteWithTeam[];
      const filtered = allInvites.filter((inv) => inv.team.game === selectedGame);
      setInvites(filtered);
    } catch (err) {
      if (__DEV__) console.error('[useTeamInvites] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedGame]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const accept = useCallback(async (inviteId: string) => {
    try {
      // Find the invite to get team_id before accepting
      const invite = invites.find((i) => i.id === inviteId);

      const { error } = await supabase.rpc('accept_team_invite', { p_invite_id: inviteId });
      if (error) throw error;

      // Recalculate team rank after member joined
      if (invite) {
        const rankIds = ranks.map((r) => r.id);
        await supabase.rpc('recalculate_team_rank', {
          p_team_id: invite.team_id,
          p_rank_order: rankIds,
        });
      }

      await fetchInvites();
    } catch (err) {
      if (__DEV__) console.error('[useTeamInvites] Accept error:', err);
      Alert.alert('Error', 'Failed to accept invite. Please try again.');
    }
  }, [fetchInvites, invites, ranks]);

  const reject = useCallback(async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('team_invites')
        .update({ status: 'rejected' })
        .eq('id', inviteId);
      if (error) throw error;
      await fetchInvites();
    } catch (err) {
      if (__DEV__) console.error('[useTeamInvites] Reject error:', err);
      Alert.alert('Error', 'Failed to reject invite. Please try again.');
    }
  }, [fetchInvites]);

  return { invites, loading, accept, reject, refresh: fetchInvites };
}
