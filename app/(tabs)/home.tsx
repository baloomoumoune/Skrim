import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useThemeColors';
import { useMyLobby } from '@/hooks/useMyLobby';
import { useLobbyAsMember } from '@/hooks/useLobbyAsMember';
import { useUnseenEvents } from '@/hooks/useUnseenEvents';
import { supabase } from '@/lib/supabase';
import LobbySlot from '@/components/lobby/LobbySlot';
import LobbyHeader from '@/components/lobby/LobbyHeader';
import GroupCodeInput from '@/components/lobby/GroupCodeInput';

const TOTAL_SLOTS = 5;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { state: ownLobby, loading } = useMyLobby();
  const memberLobby = useLobbyAsMember();
  const { eventIds, markSeen } = useUnseenEvents();

  useEffect(() => {
    if (eventIds.length) markSeen(eventIds);
  }, [eventIds, markSeen]);

  const lobby = memberLobby ?? ownLobby;

  if (loading || !lobby) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: c.textPrimary,
            padding: 16,
          }}
        >
          Home
        </Text>
      </View>
    );
  }

  const isOwner = !memberLobby;
  const listing = lobby.listing;
  const externals = (listing?.group_composition as { rank: string }[] | null) ?? [];
  const filledCount = lobby.members.length + externals.length;
  const emptyCount = Math.max(0, TOTAL_SLOTS - filledCount);

  const launchEnabled =
    isOwner &&
    !!lobby.lobby.group_code &&
    filledCount === TOTAL_SLOTS &&
    lobby.lobby.status !== 'launched';

  const onLaunch = async () => {
    const { error } = await supabase.rpc('launch_lobby', { p_lobby_id: lobby.lobby.id });
    if (error) Alert.alert('Cannot launch', error.message);
  };

  const onLeave = async () => {
    const { error } = await supabase.rpc('leave_lobby', { p_lobby_id: lobby.lobby.id });
    if (error) Alert.alert('Error', error.message);
  };

  const onKick = async (targetUserId: string) => {
    const { error } = await supabase.rpc('remove_lobby_member', {
      p_lobby_id: lobby.lobby.id,
      p_target_user_id: targetUserId,
    });
    if (error) Alert.alert('Error', error.message);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ paddingTop: insets.top, padding: 16 }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: '700',
          color: c.textPrimary,
          marginBottom: 12,
        }}
      >
        Home
      </Text>
      <LobbyHeader state={lobby} />
      <View style={{ marginTop: 16, gap: 8 }}>
        {lobby.members.map(({ member, profile }) => (
          <LobbySlot
            key={member.id}
            state="filled"
            username={profile.username}
            rank={profile.current_rank}
            avatarUrl={profile.avatar_url}
            role={member.role}
            onKick={
              isOwner && member.role !== 'searcher' ? () => onKick(profile.id) : undefined
            }
          />
        ))}
        {externals.map((gc, idx) => (
          <LobbySlot
            key={`ext-${idx}`}
            state="filled"
            username="External co-player"
            rank={gc.rank}
            role="coplayer"
            external
          />
        ))}
        {Array.from({ length: emptyCount }).map((_, idx) => (
          <LobbySlot key={`empty-${idx}`} state="empty" />
        ))}
      </View>

      {isOwner && lobby.lobby.status !== 'launched' && (
        <View style={{ marginTop: 16, gap: 12 }}>
          <GroupCodeInput lobbyId={lobby.lobby.id} current={lobby.lobby.group_code} />
          {!listing && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => router.push('/publish/searcher')}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: c.accent,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Find lasts</Text>
              </Pressable>
              {lobby.members.length === 1 && (
                <Pressable
                  onPress={() => router.push('/publish/last')}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: c.surface,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: c.border,
                  }}
                >
                  <Text style={{ color: c.textPrimary, fontWeight: '600' }}>Be a last</Text>
                </Pressable>
              )}
            </View>
          )}
          {listing && (
            <Pressable
              onPress={onLaunch}
              disabled={!launchEnabled}
              style={{
                padding: 14,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: launchEnabled ? '#22C55E' : c.surface,
                opacity: launchEnabled ? 1 : 0.5,
              }}
            >
              <Text
                style={{
                  color: launchEnabled ? '#fff' : c.textSecondary,
                  fontWeight: '700',
                }}
              >
                {launchEnabled
                  ? 'Launch'
                  : lobby.lobby.group_code
                    ? `Need ${TOTAL_SLOTS - filledCount} more`
                    : 'Set group code first'}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {!isOwner && (
        <Pressable
          onPress={onLeave}
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Text style={{ color: c.textPrimary, fontWeight: '600' }}>Leave lobby</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
