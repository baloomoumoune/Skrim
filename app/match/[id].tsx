import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  StyleSheet,
  Clipboard,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS } from '@/lib/constants';
import { getRankLabel, getRankImage } from '@/lib/game-assets';
import { useMatchDetail } from '@/hooks/useMatchDetail';
import type { MatchMemberWithProfile } from '@/types/composites';

function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const { ranks, rankUrl } = useGameAssets();

  const {
    match,
    members,
    myMembership,
    isCreator,
    loading,
    refresh,
    actions,
  } = useMatchDetail(id ?? '');

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

  // Timer for in_progress matches
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!match?.launched_at || match.status !== 'in_progress') {
      setElapsed(0);
      return;
    }
    const launchedMs = new Date(match.launched_at).getTime();
    const tick = () => setElapsed(Date.now() - launchedMs);
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [match?.launched_at, match?.status]);

  // TTL countdown for open/full matches
  const [ttlRemaining, setTtlRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!match?.expires_at || match.status === 'in_progress' || match.status === 'completed' || match.status === 'cancelled') {
      setTtlRemaining(null);
      return;
    }
    const expiresMs = new Date(match.expires_at).getTime();
    const tick = () => {
      const remaining = expiresMs - Date.now();
      setTtlRemaining(remaining > 0 ? remaining : 0);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [match?.expires_at, match?.status]);

  // Group code reveal animation
  const codeRevealAnim = useRef(new Animated.Value(0)).current;
  const [codeRevealed, setCodeRevealed] = useState(false);
  const prevReadyRef = useRef(false);

  useEffect(() => {
    if (!myMembership || isCreator) return;
    const wasReady = prevReadyRef.current;
    const isReady = myMembership.is_ready;
    prevReadyRef.current = isReady;

    if (isReady && !wasReady && !codeRevealed) {
      setCodeRevealed(true);
      Animated.timing(codeRevealAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } else if (isReady && !codeRevealed) {
      // Already ready on mount
      setCodeRevealed(true);
      codeRevealAnim.setValue(1);
    }
  }, [myMembership?.is_ready, isCreator, codeRevealed, codeRevealAnim]);

  const canSeeCode = isCreator || (myMembership?.is_ready ?? false);
  const isMember = !!myMembership;
  const isInProgress = match?.status === 'in_progress';
  const readyCount = members.filter((m) => m.is_ready).length;
  const allReady = readyCount === members.length && members.length > 0;

  const handleCopyCode = () => {
    if (match?.group_code) {
      Clipboard.setString(match.group_code);
      Alert.alert('Copied', 'Group code copied to clipboard.');
    }
  };

  const handleKick = (member: MatchMemberWithProfile) => {
    Alert.alert(
      'Kick player',
      `Remove ${member.profile.username} from the match?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Kick', style: 'destructive', onPress: () => actions.kickMember(member.id) },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Cancel match',
      'This will cancel the match for all players.',
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel match', style: 'destructive', onPress: actions.deleteMatch },
      ],
    );
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave match',
      'Are you sure you want to leave?',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: actions.leaveMatch },
      ],
    );
  };

  const handleLaunch = () => {
    if (!allReady) {
      Alert.alert('Not ready', 'All players must be ready before launching.');
      return;
    }
    actions.launchMatch();
  };

  const handleComplete = () => {
    Alert.alert(
      'End match',
      'Mark this match as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End match', onPress: actions.completeMatch },
      ],
    );
  };

  if (loading || !match || !game) {
    return (
      <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
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

  const matchRankImage = getRankImage(match.rank_min, ranks);
  const matchRankLabel = getRankLabel(match.rank_min);

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.headerRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text numberOfLines={1} style={[styles.headerTitle, { color: c.textPrimary }]}>
          Match
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={game.accent} />
        }
      >
        {/* Match info card */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
            },
          ]}
        >
          {/* Status + timer row */}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${game.accent}18` }]}>
              <Text style={[styles.statusText, { color: game.accent }]}>
                {isInProgress ? 'In Progress' : match.status === 'full' ? 'Full' : 'Open'}
              </Text>
            </View>

            {isInProgress && (
              <Text style={[styles.timerText, { color: c.textSecondary }]}>
                {formatTimer(elapsed)}
              </Text>
            )}

            {!isInProgress && ttlRemaining !== null && (
              <Text style={[styles.ttlText, { color: ttlRemaining < 120000 ? game.accent : c.textTertiary }]}>
                {formatTimer(ttlRemaining)}
              </Text>
            )}
          </View>

          {/* Rank + Region + Players */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              {matchRankImage && (
                <Image source={{ uri: rankUrl(matchRankImage) }} style={styles.infoRankIcon} contentFit="contain" />
              )}
              <Text style={[styles.infoValue, { color: c.textPrimary }]}>{matchRankLabel}</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
            <View style={styles.infoItem}>
              <Ionicons name="globe-outline" size={16} color={c.textSecondary} />
              <Text style={[styles.infoValue, { color: c.textPrimary }]}>{match.region.toUpperCase()}</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={16} color={c.textSecondary} />
              <Text style={[styles.infoValue, { color: c.textPrimary }]}>{match.current_players}/{match.max_players}</Text>
            </View>
          </View>

          {/* Ready count */}
          <View style={styles.readyRow}>
            <Text style={[styles.readyLabel, { color: c.textTertiary }]}>Ready</Text>
            <Text style={[styles.readyCount, { color: allReady ? '#22C55E' : c.textSecondary }]}>
              {readyCount}/{members.length}
            </Text>
          </View>
        </View>

        {/* Group code section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>GROUP CODE</Text>
          {canSeeCode ? (
            <Animated.View
              style={[
                styles.codeBox,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
                  borderColor: game.accent,
                  opacity: isCreator ? 1 : codeRevealAnim,
                  transform: isCreator ? [] : [
                    { scale: codeRevealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                  ],
                },
              ]}
            >
              <Text style={[styles.codeText, { color: c.textPrimary }]}>
                {match.group_code?.split('').join(' ')}
              </Text>
              <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={18} color={game.accent} />
              </TouchableOpacity>
            </Animated.View>
          ) : isMember ? (
            <View
              style={[
                styles.codeBox,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                },
              ]}
            >
              <Text style={[styles.codeHidden, { color: c.textTertiary }]}>
                Toggle Ready to reveal code
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.codeBox,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                },
              ]}
            >
              <Text style={[styles.codeHidden, { color: c.textTertiary }]}>
                Join the match to see the code
              </Text>
            </View>
          )}
        </View>

        {/* Members list */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>
            PLAYERS ({members.length}/{match.max_players})
          </Text>
          {members.map((member) => {
            const memberRankImage = member.profile.current_rank
              ? getRankImage(member.profile.current_rank, ranks)
              : null;
            const memberRankLabel = member.profile.current_rank
              ? getRankLabel(member.profile.current_rank)
              : 'Unranked';

            return (
              <TouchableOpacity
                key={member.id}
                activeOpacity={isCreator && !isInProgress && member.user_id !== match.creator_id ? 0.7 : 1}
                onLongPress={() => {
                  if (isCreator && !isInProgress && member.user_id !== match.creator_id) {
                    handleKick(member);
                  }
                }}
                style={[
                  styles.memberRow,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  },
                ]}
              >
                {/* Avatar */}
                {member.profile.avatar_url ? (
                  <Image source={{ uri: member.profile.avatar_url }} style={styles.memberAvatar} />
                ) : (
                  <View
                    style={[
                      styles.memberAvatar,
                      styles.memberAvatarFallback,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                    ]}
                  >
                    <Text style={[styles.memberInitials, { color: c.textSecondary }]}>
                      {getInitials(member.profile.username)}
                    </Text>
                  </View>
                )}

                {/* Name + rank */}
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text numberOfLines={1} style={[styles.memberName, { color: c.textPrimary }]}>
                      {member.profile.username}
                    </Text>
                    {member.user_id === match.creator_id && (
                      <View style={[styles.crownBadge, { backgroundColor: `${game.accent}18` }]}>
                        <Ionicons name="star" size={10} color={game.accent} />
                      </View>
                    )}
                  </View>
                  <View style={styles.memberRankRow}>
                    {memberRankImage && (
                      <Image source={{ uri: rankUrl(memberRankImage) }} style={styles.memberRankIcon} contentFit="contain" />
                    )}
                    <Text style={[styles.memberRankText, { color: c.textTertiary }]}>
                      {memberRankLabel}
                    </Text>
                  </View>
                </View>

                {/* Ready indicator */}
                <Ionicons
                  name={member.is_ready ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={member.is_ready ? '#22C55E' : c.textTertiary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View
        style={[
          styles.actionsBar,
          {
            paddingBottom: insets.bottom + 8,
            borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        {!isMember && match.status === 'open' && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={actions.joinMatch}
            style={[styles.primaryBtn, { backgroundColor: game.accent }]}
          >
            <Ionicons name="enter-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Join Match</Text>
          </TouchableOpacity>
        )}

        {isMember && !isInProgress && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={actions.toggleReady}
              style={[
                styles.readyBtn,
                {
                  backgroundColor: myMembership?.is_ready ? '#22C55E' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: myMembership?.is_ready ? '#22C55E' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <Ionicons
                name={myMembership?.is_ready ? 'checkmark' : 'hand-right-outline'}
                size={18}
                color={myMembership?.is_ready ? '#FFFFFF' : c.textPrimary}
              />
              <Text
                style={[
                  styles.readyBtnText,
                  { color: myMembership?.is_ready ? '#FFFFFF' : c.textPrimary },
                ]}
              >
                {myMembership?.is_ready ? 'Ready' : 'Ready up'}
              </Text>
            </TouchableOpacity>

            {isCreator ? (
              <View style={styles.creatorBtns}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleLaunch}
                  disabled={!allReady}
                  style={[
                    styles.launchBtn,
                    {
                      backgroundColor: game.accent,
                      opacity: allReady ? 1 : 0.4,
                    },
                  ]}
                >
                  <Ionicons name="play" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Launch</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleDelete}
                  style={styles.cancelBtn}
                >
                  <Ionicons name="close" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleLeave}
                style={[
                  styles.leaveBtn,
                  {
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <Ionicons name="exit-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {isMember && isInProgress && isCreator && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleComplete}
            style={[styles.primaryBtn, { backgroundColor: game.accent }]}
          >
            <Ionicons name="flag" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>End Match</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  // Info card
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  ttlText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoRankIcon: {
    width: 28,
    height: 28,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoDivider: {
    width: 1,
    height: 20,
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  readyLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  readyCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Group code
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },
  codeHidden: {
    fontSize: 14,
    fontWeight: '500',
  },
  copyBtn: {
    padding: 6,
  },
  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  memberAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitials: {
    fontSize: 13,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  crownBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  memberRankIcon: {
    width: 16,
    height: 16,
  },
  memberRankText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Actions
  actionsBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 27,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  readyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
  },
  readyBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  creatorBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  cancelBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  leaveBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
