import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useMatchRealtime } from './useMatchRealtime';
import type { Match, MatchMember } from '@/types/database';
import type { MatchMemberWithProfile } from '@/types/composites';

interface UseMatchDetailReturn {
  match: Match | null;
  members: MatchMemberWithProfile[];
  myMembership: MatchMember | null;
  isCreator: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  actions: {
    joinMatch: () => Promise<void>;
    kickMember: (memberId: string) => Promise<void>;
    toggleReady: () => Promise<void>;
    deleteMatch: () => Promise<void>;
    launchMatch: () => Promise<void>;
    leaveMatch: () => Promise<void>;
    renewMatch: () => Promise<void>;
    completeMatch: () => Promise<void>;
  };
}

export function useMatchDetail(matchId: string): UseMatchDetailReturn {
  const { user } = useAuthStore();
  const router = useRouter();
  const userId = user?.id ?? '';

  const [match, setMatch] = useState<Match | null>(null);
  const [members, setMembers] = useState<MatchMemberWithProfile[]>([]);
  const [myMembership, setMyMembership] = useState<MatchMember | null>(null);
  const [loading, setLoading] = useState(true);

  const isCreator = match?.creator_id === userId;

  const refresh = useCallback(async () => {
    if (!userId || !matchId) return;

    try {
      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchErr) throw matchErr;
      setMatch(matchData as Match);

      const { data: membersData } = await supabase
        .from('match_members')
        .select('*, profile:profiles(*)')
        .eq('match_id', matchId)
        .is('kicked_at' as string, null)
        .order('joined_at', { ascending: true });

      const typedMembers = (membersData ?? []) as unknown as MatchMemberWithProfile[];
      setMembers(typedMembers);

      const mine = typedMembers.find((m) => m.user_id === userId) ?? null;
      setMyMembership(mine as MatchMember | null);
    } catch (err) {
      if (__DEV__) console.error('[useMatchDetail] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [matchId, userId]);

  useMatchRealtime(matchId, refresh);

  // ── Actions ──

  const joinMatch = useCallback(async () => {
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
      Alert.alert('Cooldown', 'You were recently kicked from this match. Please wait.');
      return;
    }

    // Direct join — INSERT into match_members
    const { error } = await supabase
      .from('match_members')
      .insert({ match_id: matchId, user_id: userId, is_ready: false });

    if (error) {
      if (__DEV__) console.error('[useMatchDetail] Join error:', error);
      const msg = error.message?.includes('active match')
        ? 'You already have an active match.'
        : 'Failed to join match.';
      Alert.alert('Error', msg);
      return;
    }

    await refresh();
  }, [matchId, userId, refresh]);

  const kickMember = useCallback(
    async (memberId: string) => {
      if (!match || match.status === 'in_progress') return;

      const { error } = await supabase
        .from('match_members')
        .update({ kicked_at: new Date().toISOString() })
        .eq('id', memberId);

      if (error) {
        Alert.alert('Error', 'Failed to kick member.');
        return;
      }

      await refresh();
    },
    [match, refresh],
  );

  const toggleReady = useCallback(async () => {
    if (!myMembership) return;

    const { error } = await supabase
      .from('match_members')
      .update({ is_ready: !myMembership.is_ready })
      .eq('id', myMembership.id);

    if (error) {
      Alert.alert('Error', 'Failed to update ready status.');
      return;
    }

    await refresh();
  }, [myMembership, refresh]);

  const deleteMatch = useCallback(async () => {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'cancelled' })
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
      .update({ status: 'in_progress', launched_at: new Date().toISOString() })
      .eq('id', matchId);

    if (error) {
      Alert.alert('Error', 'Failed to launch match.');
      return;
    }

    await refresh();
  }, [matchId, refresh]);

  const leaveMatch = useCallback(async () => {
    if (!myMembership || !match) return;
    if (match.status === 'in_progress') {
      Alert.alert('Cannot leave', 'You cannot leave a match in progress.');
      return;
    }

    const { error } = await supabase
      .from('match_members')
      .update({ kicked_at: new Date().toISOString() })
      .eq('id', myMembership.id);

    if (error) {
      Alert.alert('Error', 'Failed to leave match.');
      return;
    }

    router.back();
  }, [myMembership, match, router]);

  const renewMatch = useCallback(async () => {
    const { error } = await (supabase.rpc as Function)('renew_match', {
      p_match_id: matchId,
    });

    if (error) {
      Alert.alert('Error', 'Failed to renew match.');
      return;
    }

    await refresh();
  }, [matchId, refresh]);

  const completeMatch = useCallback(async () => {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'completed' })
      .eq('id', matchId);

    if (error) {
      Alert.alert('Error', 'Failed to complete match.');
      return;
    }

    router.back();
  }, [matchId, router]);

  const actions = useMemo(
    () => ({
      joinMatch,
      kickMember,
      toggleReady,
      deleteMatch,
      launchMatch,
      leaveMatch,
      renewMatch,
      completeMatch,
    }),
    [joinMatch, kickMember, toggleReady, deleteMatch, launchMatch, leaveMatch, renewMatch, completeMatch],
  );

  return {
    match,
    members,
    myMembership,
    isCreator,
    loading,
    refresh,
    actions,
  };
}
