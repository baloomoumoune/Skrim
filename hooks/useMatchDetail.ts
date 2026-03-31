import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useMatchRealtime } from './useMatchRealtime';
import type {
  Match,
  MatchMember,
  MatchRequest,
  MatchMemberWithProfile,
  MatchRequestWithProfile,
} from '@/types/database';

interface UseMatchDetailReturn {
  match: Match | null;
  members: MatchMemberWithProfile[];
  requests: MatchRequestWithProfile[];
  teamTags: Record<string, string>;
  myMembership: MatchMember | null;
  myRequest: MatchRequest | null;
  isCreator: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  actions: {
    requestJoin: () => Promise<void>;
    cancelRequest: () => Promise<void>;
    acceptRequest: (requestId: string, userId: string) => Promise<void>;
    rejectRequest: (requestId: string) => Promise<void>;
    kickMember: (memberId: string) => Promise<void>;
    toggleReady: () => Promise<void>;
    updateMatch: (fields: Partial<Match>) => Promise<void>;
    deleteMatch: () => Promise<void>;
    launchMatch: () => Promise<void>;
    leaveMatch: () => Promise<void>;
  };
}

export function useMatchDetail(matchId: string): UseMatchDetailReturn {
  const { user } = useAuthStore();
  const router = useRouter();
  const userId = user?.id ?? '';

  const [match, setMatch] = useState<Match | null>(null);
  const [members, setMembers] = useState<MatchMemberWithProfile[]>([]);
  const [requests, setRequests] = useState<MatchRequestWithProfile[]>([]);
  const [myMembership, setMyMembership] = useState<MatchMember | null>(null);
  const [myRequest, setMyRequest] = useState<MatchRequest | null>(null);
  const [teamTags, setTeamTags] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const isCreator = match?.creator_id === userId;

  const refresh = useCallback(async () => {
    if (!userId || !matchId) return;

    try {
      // Fetch match
      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchErr) throw matchErr;
      setMatch(matchData as Match);

      // Fetch active members with profiles
      const { data: membersData } = await supabase
        .from('match_members')
        .select('*, profile:profiles(*)')
        .eq('match_id', matchId)
        .is('kicked_at' as string, null)
        .order('joined_at', { ascending: true });

      const typedMembers = (membersData ?? []) as unknown as MatchMemberWithProfile[];
      setMembers(typedMembers);

      // Find my membership
      const mine = typedMembers.find((m) => m.user_id === userId) ?? null;
      setMyMembership(mine as MatchMember | null);

      // If creator, fetch pending requests
      let typedRequests: MatchRequestWithProfile[] = [];
      if (matchData && (matchData as Match).creator_id === userId) {
        const { data: reqData } = await supabase
          .from('match_requests')
          .select('*, profile:profiles(*)')
          .eq('match_id', matchId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        typedRequests = (reqData ?? []) as unknown as MatchRequestWithProfile[];
        setRequests(typedRequests);
      } else {
        setRequests([]);
      }

      // If not creator, fetch my latest request
      if (matchData && (matchData as Match).creator_id !== userId) {
        const { data: myReqData } = await supabase
          .from('match_requests')
          .select('*')
          .eq('match_id', matchId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setMyRequest((myReqData as MatchRequest | null) ?? null);
      } else {
        setMyRequest(null);
      }

      // Fetch team tags for all users in match
      const allUserIds = [
        ...typedMembers.map((m) => m.user_id),
        ...typedRequests.map((r) => r.user_id),
      ];
      if (allUserIds.length > 0) {
        const { data: teamData } = await supabase
          .from('team_members')
          .select('user_id, team:teams(tag, game)')
          .in('user_id', allUserIds);

        const matchGame = (matchData as Match).game;
        const tags: Record<string, string> = {};
        for (const row of (teamData ?? []) as unknown as { user_id: string; team: { tag: string; game: string } }[]) {
          if (row.team && row.team.game === matchGame) {
            tags[row.user_id] = row.team.tag;
          }
        }
        setTeamTags(tags);
      } else {
        setTeamTags({});
      }
    } catch (err) {
      if (__DEV__) console.error('[useMatchDetail] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [matchId, userId]);

  // Subscribe to realtime updates
  useMatchRealtime(matchId, refresh);

  // ── Actions ──

  const requestJoin = useCallback(async () => {
    if (!userId || !matchId) return;

    // Check multi-match guard
    const { data: hasActive } = await (supabase.rpc as Function)('check_active_match', {
      p_user_id: userId,
    });
    if (hasActive) {
      Alert.alert('Active match', 'You already have an active match. Leave it first.');
      return;
    }

    // Check kick cooldown
    const { data: onCooldown } = await (supabase.rpc as Function)('check_kick_cooldown', {
      p_user_id: userId,
      p_match_id: matchId,
    });
    if (onCooldown) {
      Alert.alert('Cooldown', 'You were recently kicked from this match. Please wait before requesting again.');
      return;
    }

    const { error } = await supabase
      .from('match_requests')
      .insert({ match_id: matchId, user_id: userId, status: 'pending' } as never);

    if (error) {
      if (__DEV__) console.error('[useMatchDetail] Request join error:', error);
      Alert.alert('Error', 'Failed to send join request.');
      return;
    }

    await refresh();
  }, [matchId, userId, refresh]);

  const cancelRequest = useCallback(async () => {
    if (!myRequest) return;

    const { error } = await supabase
      .from('match_requests')
      .delete()
      .eq('id', myRequest.id);

    if (error) {
      Alert.alert('Error', 'Failed to cancel request.');
      return;
    }

    await refresh();
  }, [myRequest, refresh]);

  const acceptRequest = useCallback(
    async (requestId: string, _requestUserId: string) => {
      if (!match) return;

      // Atomic accept: updates request, inserts member, recalculates count via trigger
      const { error } = await (supabase.rpc as Function)('accept_match_request', {
        p_request_id: requestId,
        p_match_id: matchId,
      });

      if (error) {
        if (__DEV__) console.error('[useMatchDetail] Accept request error:', error);
        Alert.alert('Error', error.message ?? 'Failed to accept request.');
        return;
      }

      await refresh();
    },
    [match, matchId, refresh],
  );

  const rejectRequest = useCallback(
    async (requestId: string) => {
      const { error } = await supabase
        .from('match_requests')
        .update({ status: 'rejected' } as never)
        .eq('id', requestId);

      if (error) {
        Alert.alert('Error', 'Failed to reject request.');
        return;
      }

      await refresh();
    },
    [refresh],
  );

  const kickMember = useCallback(
    async (memberId: string) => {
      if (!match) return;

      // Set kicked_at — the DB trigger auto-recalculates current_players and status
      const { error: kickErr } = await supabase
        .from('match_members')
        .update({ kicked_at: new Date().toISOString() } as never)
        .eq('id', memberId);

      if (kickErr) {
        Alert.alert('Error', 'Failed to kick member.');
        return;
      }

      await refresh();
    },
    [match, matchId, refresh],
  );

  const toggleReady = useCallback(async () => {
    if (!myMembership) return;

    const { error } = await supabase
      .from('match_members')
      .update({ is_ready: !myMembership.is_ready } as never)
      .eq('id', myMembership.id);

    if (error) {
      Alert.alert('Error', 'Failed to update ready status.');
      return;
    }

    await refresh();
  }, [myMembership, refresh]);

  const updateMatch = useCallback(
    async (fields: Partial<Match>) => {
      const { error } = await supabase
        .from('matches')
        .update(fields as never)
        .eq('id', matchId);

      if (error) {
        Alert.alert('Error', 'Failed to update match.');
        return;
      }

      await refresh();
    },
    [matchId, refresh],
  );

  const deleteMatch = useCallback(async () => {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'cancelled' } as never)
      .eq('id', matchId);

    if (error) {
      Alert.alert('Error', 'Failed to cancel match.');
      return;
    }

    router.back();
  }, [matchId, router]);

  const launchMatch = useCallback(async () => {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'in_progress' } as never)
      .eq('id', matchId);

    if (error) {
      Alert.alert('Error', 'Failed to launch match.');
      return;
    }

    await refresh();
  }, [matchId, refresh]);

  const leaveMatch = useCallback(async () => {
    if (!myMembership || !match) return;

    // Soft-delete membership — the DB trigger auto-recalculates current_players and status
    const { error: leaveErr } = await supabase
      .from('match_members')
      .update({ kicked_at: new Date().toISOString() } as never)
      .eq('id', myMembership.id);

    if (leaveErr) {
      Alert.alert('Error', 'Failed to leave match.');
      return;
    }

    router.back();
  }, [myMembership, match, matchId, router]);

  const actions = useMemo(
    () => ({
      requestJoin,
      cancelRequest,
      acceptRequest,
      rejectRequest,
      kickMember,
      toggleReady,
      updateMatch,
      deleteMatch,
      launchMatch,
      leaveMatch,
    }),
    [
      requestJoin,
      cancelRequest,
      acceptRequest,
      rejectRequest,
      kickMember,
      toggleReady,
      updateMatch,
      deleteMatch,
      launchMatch,
      leaveMatch,
    ],
  );

  return {
    match,
    members,
    requests,
    teamTags,
    myMembership,
    myRequest,
    isCreator,
    loading,
    refresh,
    actions,
  };
}
