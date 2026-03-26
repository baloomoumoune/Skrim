import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useTeamStore } from '@/stores/teamStore';
import type { Team, TeamMemberWithProfile } from '@/types/database';

export function useTeam() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const selectedGame = useGameStore((s) => s.selectedGame);
  const { setCurrentTeam, clearTeam } = useTeamStore();
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    if (!userId) {
      clearTeam();
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Find user's team membership, join with teams filtered by game
      const { data: memberData } = await supabase
        .from('team_members')
        .select('team_id, teams(*)')
        .eq('user_id', userId);

      if (!memberData || memberData.length === 0) {
        clearTeam();
        setLoading(false);
        return;
      }

      // Find the team for the selected game
      const entry = (memberData as unknown as { team_id: string; teams: Team }[])
        .find((m) => m.teams.game === selectedGame);

      if (!entry) {
        clearTeam();
        setLoading(false);
        return;
      }

      const team = entry.teams;

      // Fetch all members with profiles
      const { data: membersData } = await supabase
        .from('team_members')
        .select('*, profile:profiles(*)')
        .eq('team_id', team.id)
        .order('joined_at', { ascending: true });

      const members = (membersData ?? []) as unknown as TeamMemberWithProfile[];
      setCurrentTeam(team, members);
    } catch (err) {
      if (__DEV__) console.error('[useTeam] Error:', err);
      clearTeam();
    } finally {
      setLoading(false);
    }
  }, [userId, selectedGame, setCurrentTeam, clearTeam]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const team = useTeamStore((s) => s.currentTeam);
  const members = useTeamStore((s) => s.teamMembers);
  const isCaptain = team?.captain_id === userId;

  return { team, members, loading, isCaptain, refresh: fetchTeam };
}
