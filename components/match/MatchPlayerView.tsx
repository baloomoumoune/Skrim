import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useGameAssets } from '@/hooks/useGameAssets';
import { useAuthStore } from '@/stores/authStore';
import { GAME_ACCENTS } from '@/lib/constants';
import { getGameModeById, getRankImage, getRankLabel } from '@/lib/game-assets';
import type {
  Match,
  MatchMember,
  MatchRequest,
  MatchMemberWithProfile,
} from '@/types/database';
import MemberRow from './MemberRow';

interface MatchPlayerViewProps {
  match: Match;
  members: MatchMemberWithProfile[];
  teamTags: Record<string, string>;
  myMembership: MatchMember | null;
  myRequest: MatchRequest | null;
  refreshing: boolean;
  onRefresh: () => void;
  onRequestJoin: () => Promise<void>;
  onCancelRequest: () => Promise<void>;
  onToggleReady: () => Promise<void>;
  onLeaveMatch: () => Promise<void>;
}

export default function MatchPlayerView({
  match,
  members,
  teamTags,
  myMembership,
  myRequest,
  refreshing,
  onRefresh,
  onRequestJoin,
  onCancelRequest,
  onToggleReady,
  onLeaveMatch,
}: MatchPlayerViewProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const { user } = useAuthStore();
  const { ranks, rankUrl } = useGameAssets();
  const game = GAME_ACCENTS[match.game];
  const modeConfig = getGameModeById(match.game_mode);

  const rankMinImage = match.rank_min ? getRankImage(match.rank_min, ranks) : null;
  const rankMaxImage = match.rank_max ? getRankImage(match.rank_max, ranks) : null;
  const rankMinLabel = getRankLabel(match.rank_min);
  const rankMaxLabel = getRankLabel(match.rank_max);
  const isSameRank = rankMinLabel === rankMaxLabel;
  const hasRank = modeConfig?.hasRank ?? true;

  const readyCount = members.filter((m) => m.is_ready).length;
  const isMember = !!myMembership;
  const hasPendingRequest = myRequest?.status === 'pending';
  const wasRejected = myRequest?.status === 'rejected';
  const isFull = match.status === 'full';
  const isCancelled = match.status === 'cancelled';
  const isCompleted = match.status === 'completed';
  const isInProgress = match.status === 'in_progress';

  const [joining, setJoining] = useState(false);

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const sectionBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const handleJoin = async () => {
    setJoining(true);
    try {
      await onRequestJoin();
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => {
    Alert.alert('Leave match', 'Are you sure you want to leave this match?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: onLeaveMatch },
    ]);
  };

  const statusLabel =
    isInProgress ? 'In Progress' :
    isFull ? 'Full' :
    isCancelled ? 'Cancelled' :
    isCompleted ? 'Completed' : 'Open';

  const statusColor =
    isInProgress ? '#F59E0B' :
    isFull ? '#22C55E' :
    isCancelled ? '#EF4444' : game.accent;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={game.accent} />}
    >
      {/* ── Match Info Card ── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.infoHeader}>
          <View style={styles.modeRow}>
            {modeConfig && (
              <Ionicons name={modeConfig.icon as keyof typeof Ionicons.glyphMap} size={18} color={game.accent} />
            )}
            <Text style={[styles.modeLabel, { color: c.textPrimary }]}>
              {modeConfig?.label ?? match.game_mode}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {hasRank && (
          <View style={styles.rankRow}>
            {rankMinImage && (
              <Image source={{ uri: rankUrl(rankMinImage) }} style={styles.rankIcon} contentFit="contain" />
            )}
            <Text style={[styles.rankText, { color: c.textSecondary }]}>
              {isSameRank ? rankMinLabel : `${rankMinLabel} — ${rankMaxLabel}`}
            </Text>
            {!isSameRank && rankMaxImage && (
              <Image source={{ uri: rankUrl(rankMaxImage) }} style={styles.rankIcon} contentFit="contain" />
            )}
            {match.rr_penalty && (
              <View style={[styles.rrBadge, { backgroundColor: `${game.accent}15` }]}>
                <Text style={[styles.rrText, { color: game.accent }]}>-25% RR</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.detailsRow}>
          <View style={styles.detailChip}>
            <Ionicons name="globe-outline" size={12} color={c.textTertiary} />
            <Text style={[styles.detailText, { color: c.textTertiary }]}>{match.region.toUpperCase()}</Text>
          </View>
          <View style={styles.detailChip}>
            <Ionicons name="people-outline" size={12} color={c.textTertiary} />
            <Text style={[styles.detailText, { color: c.textTertiary }]}>
              {match.current_players}/{match.max_players}
            </Text>
          </View>
          {match.scheduled_at && (
            <View style={styles.detailChip}>
              <Ionicons name="calendar-outline" size={12} color={c.textTertiary} />
              <Text style={[styles.detailText, { color: c.textTertiary }]}>
                {new Date(match.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' '}
                {new Date(match.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </Text>
            </View>
          )}
        </View>

        {match.discord_link && (
          <View style={styles.infoRow}>
            <Ionicons name="logo-discord" size={14} color="#5865F2" />
            <Text numberOfLines={1} style={[styles.infoText, { color: c.textSecondary }]}>{match.discord_link}</Text>
          </View>
        )}
        {match.notes && (
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={14} color={c.textTertiary} />
            <Text numberOfLines={3} style={[styles.infoText, { color: c.textSecondary }]}>{match.notes}</Text>
          </View>
        )}
      </View>

      {/* ── Members Section ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
            Members ({members.length}/{match.max_players})
          </Text>
          <Text style={[styles.readyCounter, { color: c.textTertiary }]}>
            {readyCount} ready
          </Text>
        </View>
        <View style={[styles.sectionBody, { borderColor: sectionBorder }]}>
          {members.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>No members yet</Text>
            </View>
          ) : (
            members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isCreator={false}
                isSelf={member.user_id === user?.id}
                accent={game.accent}
                textPrimary={c.textPrimary}
                textSecondary={c.textSecondary}
                textTertiary={c.textTertiary}
                isDark={isDark}
                teamTag={teamTags[member.user_id]}
              />
            ))
          )}
        </View>
      </View>

      {/* ── Action Area ── */}
      <View style={styles.actionArea}>
        {/* Not a member, no pending request */}
        {!isMember && !hasPendingRequest && !isCancelled && !isCompleted && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleJoin}
            disabled={joining || isFull}
            style={[
              styles.primaryBtn,
              { backgroundColor: game.accent, opacity: joining || isFull ? 0.5 : 1 },
            ]}
          >
            {joining ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="enter-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>
                  {isFull ? 'Match is Full' : 'Request to Join'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Pending request */}
        {hasPendingRequest && (
          <View style={styles.pendingArea}>
            <View style={[styles.pendingBanner, { backgroundColor: `${game.accent}12`, borderColor: `${game.accent}30` }]}>
              <Ionicons name="hourglass-outline" size={16} color={game.accent} />
              <Text style={[styles.pendingText, { color: game.accent }]}>Request pending...</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onCancelRequest}
              style={[styles.secondaryBtn, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}
            >
              <Text style={[styles.secondaryBtnText, { color: c.textSecondary }]}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rejected */}
        {wasRejected && !isMember && !hasPendingRequest && (
          <View style={[styles.pendingBanner, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }]}>
            <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
            <Text style={[styles.pendingText, { color: '#EF4444' }]}>Your request was declined</Text>
          </View>
        )}

        {/* Member: Ready toggle + Leave */}
        {isMember && !isCancelled && !isCompleted && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onToggleReady}
              style={[
                styles.readyBtn,
                {
                  backgroundColor: myMembership?.is_ready ? '#22C55E' : cardBg,
                  borderColor: myMembership?.is_ready ? '#22C55E' : cardBorder,
                },
              ]}
            >
              <Ionicons
                name={myMembership?.is_ready ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={myMembership?.is_ready ? '#FFFFFF' : c.textSecondary}
              />
              <Text style={[styles.readyBtnText, { color: myMembership?.is_ready ? '#FFFFFF' : c.textPrimary }]}>
                {myMembership?.is_ready ? 'Ready!' : 'Mark as Ready'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLeave}
              style={[styles.dangerBtn, { borderColor: '#EF4444' }]}
            >
              <Ionicons name="exit-outline" size={16} color="#EF4444" />
              <Text style={styles.dangerBtnText}>Leave Match</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* In progress banner */}
        {isInProgress && isMember && (
          <View style={[styles.pendingBanner, { backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }]}>
            <Ionicons name="game-controller" size={16} color="#F59E0B" />
            <Text style={[styles.pendingText, { color: '#F59E0B' }]}>Match in progress</Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, gap: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeLabel: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankIcon: { width: 22, height: 22 },
  rankText: { fontSize: 13, fontWeight: '600' },
  rrBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
  rrText: { fontSize: 11, fontWeight: '700' },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, fontWeight: '500' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 2 },
  infoText: { flex: 1, fontSize: 13, fontWeight: '500' },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  readyCounter: { fontSize: 12, fontWeight: '500' },
  sectionBody: { borderRadius: 14, borderWidth: 0.5, overflow: 'hidden' },
  emptyRow: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, fontWeight: '500' },
  actionArea: { gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12 },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  pendingArea: { gap: 10 },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  pendingText: { fontSize: 13, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 10, borderWidth: 1 },
  secondaryBtnText: { fontSize: 13, fontWeight: '600' },
  memberActions: { gap: 10 },
  readyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, borderWidth: 1 },
  readyBtnText: { fontSize: 15, fontWeight: '700' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, borderWidth: 1 },
  dangerBtnText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
});
