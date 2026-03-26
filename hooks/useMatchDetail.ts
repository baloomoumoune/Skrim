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
      if (matchData && (matchData as Match).creator_id === userId) {
        const { data: reqData } = await supabase
          .from('match_requests')
          .select('*, profile:profiles(*)')
          .eq('match_id', matchId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        setRequests((reqData ?? []) as unknown as MatchRequestWithProfile[]);
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
    async (requestId: string, requestUserId: string) => {
      if (!match) return;

      // Update request status
      const { error: reqErr } = await supabase
        .from('match_requests')
        .update({ status: 'accepted' } as never)
        .eq('id', requestId);

      if (reqErr) {
        Alert.alert('Error', 'Failed to accept request.');
        return;
      }

      // Add as member
      const { error: memErr } = await supabase
        .from('match_members')
        .insert({ match_id: matchId, user_id: requestUserId, is_ready: false } as never);

      if (memErr) {
        if (__DEV__) console.error('[useMatchDetail] Member insert error:', memErr);
      }

      // Update player count + status
      const newCount = match.current_players + 1;
      const newStatus = newCount >= match.max_players ? 'full' : match.status;

      await supabase
        .from('matches')
        .update({ current_players: newCount, status: newStatus } as never)
        .eq('id', matchId);

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

      const { error: kickErr } = await supabase
        .from('match_members')
        .update({ kicked_at: new Date().toISOString() } as never)
        .eq('id', memberId);

      if (kickErr) {
        Alert.alert('Error', 'Failed to kick member.');
        return;
      }

      const newCount = Math.max(match.current_players - 1, 1);
      await supabase
        .from('matches')
        .update({ current_players: newCount, status: 'open' } as never)
        .eq('id', matchId);

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

    // Soft-delete membership
    const { error: leaveErr } = await supabase
      .from('match_members')
      .update({ kicked_at: new Date().toISOString() } as never)
      .eq('id', myMembership.id);

    if (leaveErr) {
      Alert.alert('Error', 'Failed to leave match.');
      return;
    }

    const newCount = Math.max(match.current_players - 1, 1);
    await supabase
      .from('matches')
      .update({
        current_players: newCount,
        status: newCount < match.max_players ? 'open' : match.status,
      } as never)
      .eq('id', matchId);

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
    myMembership,
    myRequest,
    isCreator,
    loading,
    refresh,
    actions,
  };
}
