import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { GAME_ACCENTS } from '@/lib/constants';
import { useMatchDetail } from '@/hooks/useMatchDetail';
import MatchCreatorView from '@/components/match/MatchCreatorView';
import MatchPlayerView from '@/components/match/MatchPlayerView';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();

  const {
    match,
    members,
    requests,
    myMembership,
    myRequest,
    isCreator,
    loading,
    refresh,
    actions,
  } = useMatchDetail(id ?? '');

  // Initial fetch
  useEffect(() => {
    if (id) refresh();
  }, [id, refresh]);

  const game = match ? GAME_ACCENTS[match.game] : null;
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading || !match || !game) {
    return (
      <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View style={styles.loadingHeader}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={c.textTertiary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text numberOfLines={1} style={[styles.headerTitle, { color: c.textPrimary }]}>
          {game.name} Match
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content — Creator or Player view */}
      {isCreator ? (
        <MatchCreatorView
          match={match}
          members={members}
          requests={requests}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onAcceptRequest={actions.acceptRequest}
          onRejectRequest={actions.rejectRequest}
          onKickMember={actions.kickMember}
          onUpdateMatch={actions.updateMatch}
          onDeleteMatch={actions.deleteMatch}
          onLaunchMatch={actions.launchMatch}
        />
      ) : (
        <MatchPlayerView
          match={match}
          members={members}
          myMembership={myMembership}
          myRequest={myRequest}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onRequestJoin={actions.requestJoin}
          onCancelRequest={actions.cancelRequest}
          onToggleReady={actions.toggleReady}
          onLeaveMatch={actions.leaveMatch}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
