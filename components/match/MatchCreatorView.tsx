import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
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
  MatchMemberWithProfile,
  MatchRequestWithProfile,
} from '@/types/database';
import MemberRow from './MemberRow';
import RequestRow from './RequestRow';
import EditMatchModal from './EditMatchModal';

interface MatchCreatorViewProps {
  match: Match;
  members: MatchMemberWithProfile[];
  requests: MatchRequestWithProfile[];
  refreshing: boolean;
  onRefresh: () => void;
  onAcceptRequest: (requestId: string, userId: string) => Promise<void>;
  onRejectRequest: (requestId: string) => Promise<void>;
  onKickMember: (memberId: string) => Promise<void>;
  onUpdateMatch: (fields: Partial<Match>) => Promise<void>;
  onDeleteMatch: () => Promise<void>;
  onLaunchMatch: () => Promise<void>;
}

export default function MatchCreatorView({
  match,
  members,
  requests,
  refreshing,
  onRefresh,
  onAcceptRequest,
  onRejectRequest,
  onKickMember,
  onUpdateMatch,
  onDeleteMatch,
  onLaunchMatch,
}: MatchCreatorViewProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const { user } = useAuthStore();
  const { ranks, rankUrl } = useGameAssets();
  const game = GAME_ACCENTS[match.game];
  const modeConfig = getGameModeById(match.game_mode);

  const [showEditModal, setShowEditModal] = useState(false);

  const rankMinImage = match.rank_min ? getRankImage(match.rank_min, ranks) : null;
  const rankMaxImage = match.rank_max ? getRankImage(match.rank_max, ranks) : null;
  const rankMinLabel = getRankLabel(match.rank_min);
  const rankMaxLabel = getRankLabel(match.rank_max);
  const isSameRank = rankMinLabel === rankMaxLabel;
  const hasRank = modeConfig?.hasRank ?? true;

  const readyCount = members.filter((m) => m.is_ready).length;
  const isMatchActive = match.status === 'open' || match.status === 'full';
  const canLaunch = match.status === 'full' || match.status === 'open';

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const sectionBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const handleDelete = () => {
    const memberCount = members.filter((m) => m.user_id !== user?.id).length;
    Alert.alert(
      'Delete match',
      memberCount > 0
        ? `${memberCount} player${memberCount > 1 ? 's' : ''} will be removed. This cannot be undone.`
        : 'Are you sure you want to delete this match?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDeleteMatch },
      ],
    );
  };

  const handleLaunch = () => {
    Alert.alert('Launch match', 'Set this match as in progress?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Launch', onPress: onLaunchMatch },
    ]);
  };

  const statusLabel =
    match.status === 'in_progress' ? 'In Progress' :
    match.status === 'full' ? 'Full' :
    match.status === 'cancelled' ? 'Cancelled' :
    match.status === 'completed' ? 'Completed' : 'Open';

  const statusColor =
    match.status === 'in_progress' ? '#F59E0B' :
    match.status === 'full' ? '#22C55E' :
    match.status === 'cancelled' ? '#EF4444' : game.accent;

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={game.accent} />}
      >
        {/* ── Match Info Card ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {/* Status + Mode */}
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

          {/* Rank range */}
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

          {/* Details row */}
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

          {/* Discord + Notes */}
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

          {/* Edit button */}
          {isMatchActive && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowEditModal(true)}
              style={[styles.editBtn, { borderColor: game.accent }]}
            >
              <Ionicons name="create-outline" size={16} color={game.accent} />
              <Text style={[styles.editBtnText, { color: game.accent }]}>Edit Match</Text>
            </TouchableOpacity>
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
                  isCreator={true}
                  isSelf={member.user_id === user?.id}
                  accent={game.accent}
                  textPrimary={c.textPrimary}
                  textSecondary={c.textSecondary}
                  textTertiary={c.textTertiary}
                  isDark={isDark}
                  onKick={member.user_id !== user?.id ? () => onKickMember(member.id) : undefined}
                />
              ))
            )}
          </View>
        </View>

        {/* ── Requests Section ── */}
        {requests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
                Join Requests ({requests.length})
              </Text>
            </View>
            <View style={[styles.sectionBody, { borderColor: sectionBorder }]}>
              {requests.map((req) => (
                <RequestRow
                  key={req.id}
                  request={req}
                  accent={game.accent}
                  textPrimary={c.textPrimary}
                  textSecondary={c.textSecondary}
                  textTertiary={c.textTertiary}
                  isDark={isDark}
                  onAccept={() => onAcceptRequest(req.id, req.user_id)}
                  onReject={() => onRejectRequest(req.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Action Buttons ── */}
        {isMatchActive && (
          <View style={styles.actionArea}>
            {canLaunch && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleLaunch}
                style={[styles.primaryBtn, { backgroundColor: game.accent }]}
              >
                <Ionicons name="play" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Launch Match</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDelete}
              style={[styles.dangerBtn, { borderColor: '#EF4444' }]}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={styles.dangerBtnText}>Delete Match</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <EditMatchModal
        visible={showEditModal}
        match={match}
        onClose={() => setShowEditModal(false)}
        onUpdated={async (fields) => {
          await onUpdateMatch(fields);
          setShowEditModal(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  // ── Card ──
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankIcon: {
    width: 22,
    height: 22,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rrBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  rrText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Sections ──
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  readyCounter: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionBody: {
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  emptyRow: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // ── Actions ──
  actionArea: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
});
