import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showError } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useTeamStore } from '@/stores/teamStore';
import type { Team } from '@/types/database';
import type { TeamMemberWithProfile } from '@/types/composites';

export function useTeam() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const selectedGame = useGameStore((s) => s.selectedGame);
  const { setCurrentTeam, clearTeam } = useTeamStore();
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async (signal?: { cancelled: boolean }) => {
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

      if (signal?.cancelled) return;

      if (!memberData || memberData.length === 0) {
        clearTeam();
        setLoading(false);
        return;
      }

      // Find the team for the selected game
      const entry = (memberData as { team_id: string; teams: Team }[])
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

      if (signal?.cancelled) return;

      const members = (membersData ?? []) as TeamMemberWithProfile[];
      setCurrentTeam(team, members);
    } catch (err) {
      if (__DEV__) console.error('[useTeam] Error:', err);
      showError('Connection error', 'Could not load team data.');
      if (!signal?.cancelled) clearTeam();
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, [userId, selectedGame, setCurrentTeam, clearTeam]);

  useEffect(() => {
    const signal = { cancelled: false };
    fetchTeam(signal);
    return () => { signal.cancelled = true; };
  }, [fetchTeam]);

  const team = useTeamStore((s) => s.currentTeam);
  const members = useTeamStore((s) => s.teamMembers);
  const isPresident = team?.president_id === userId;

  return { team, members, loading, isPresident, refresh: fetchTeam };
}
