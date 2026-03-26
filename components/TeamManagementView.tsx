import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Share,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS } from '@/lib/constants';
import { getGameLogoUrl, getRankImage } from '@/lib/game-assets';
import { supabase } from '@/lib/supabase';
import { TeamInitials } from '@/components/TeamInitials';
import TeamMemberRow from '@/components/team/TeamMemberRow';
import PlayerSearchModal from '@/components/team/PlayerSearchModal';
import type { Team, TeamMemberWithProfile, TeamRole } from '@/types/database';

const REGION_LABELS: Record<string, string> = {
  eu: 'EU',
  na: 'NA',
  apac: 'APAC',
  sa: 'SA',
  me: 'ME',
  oce: 'OCE',
};

interface TeamManagementViewProps {
  team: Team;
  members: TeamMemberWithProfile[];
  isCaptain: boolean;
  onRefresh: () => void;
}

export default function TeamManagementView({
  team,
  members,
  isCaptain,
  onRefresh,
}: TeamManagementViewProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const { user } = useAuthStore();
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = GAME_ACCENTS[selectedGame];
  const { ranks, rankUrl } = useGameAssets();

  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteLink = `skrim://invite/${team.invite_code}`;
  const gameConfig = GAME_ACCENTS[team.game as keyof typeof GAME_ACCENTS] ?? game;
  const rankImage = team.rank_tier ? getRankImage(team.rank_tier, ranks) : null;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareLink = async () => {
    await Share.share({ message: `Join ${team.name} on Scrim! ${inviteLink}` });
  };

  const recalculateRank = useCallback(async () => {
    try {
      const rankIds = ranks.map((r) => r.id);
      await supabase.rpc('recalculate_team_rank', {
        p_team_id: team.id,
        p_rank_order: rankIds,
      });
    } catch (err) {
      if (__DEV__) console.error('[Team] Rank recalc error:', err);
    }
  }, [team.id, ranks]);

  const handleChangeRole = async (userId: string, role: TeamRole) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role } as never)
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('[Team] Change role error:', err);
      Alert.alert('Error', 'Failed to change role.');
    }
  };

  const handleKick = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (error) throw error;
      await recalculateRank();
      onRefresh();
    } catch (err) {
      console.error('[Team] Kick error:', err);
      Alert.alert('Error', 'Failed to remove player.');
    }
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave team',
      `Are you sure you want to leave ${team.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('team_members')
                .delete()
                .eq('team_id', team.id)
                .eq('user_id', user?.id ?? '');

              if (error) throw error;
              await recalculateRank();
              onRefresh();
            } catch (err) {
              console.error('[Team] Leave error:', err);
              Alert.alert('Error', 'Failed to leave team.');
            }
          },
        },
      ],
    );
  };

  const handleDissolve = () => {
    Alert.alert(
      'Dissolve team',
      `This will permanently delete ${team.name} and remove all members. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dissolve',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', team.id);

              if (error) throw error;
              onRefresh();
            } catch (err) {
              console.error('[Team] Dissolve error:', err);
              Alert.alert('Error', 'Failed to dissolve team.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Team Header */}
      <View style={styles.headerSection}>
        {team.logo_url ? (
          <Image source={{ uri: team.logo_url }} style={styles.teamLogo} contentFit="cover" />
        ) : (
          <TeamInitials tag={team.tag} size={72} />
        )}

        <View style={styles.nameRow}>
          <Text style={[styles.teamName, { color: c.textPrimary }]}>{team.name}</Text>
          <Text style={[styles.teamTag, { color: c.textTertiary }]}>#{team.tag}</Text>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Image
              source={{ uri: getGameLogoUrl(gameConfig.logo) }}
              style={styles.badgeIcon}
              contentFit="contain"
            />
            <Text style={[styles.badgeText, { color: c.textSecondary }]}>{gameConfig.name}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Ionicons name="globe-outline" size={12} color={c.textSecondary} />
            <Text style={[styles.badgeText, { color: c.textSecondary }]}>
              {REGION_LABELS[team.region] ?? team.region.toUpperCase()}
            </Text>
          </View>

          {rankImage && (
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Image source={{ uri: rankUrl(rankImage) }} style={styles.rankBadgeIcon} contentFit="contain" />
              <Text style={[styles.badgeText, { color: c.textSecondary }]}>Avg Rank</Text>
            </View>
          )}
        </View>

        {team.description && (
          <Text style={[styles.description, { color: c.textSecondary }]}>{team.description}</Text>
        )}
      </View>

      {/* Invite Section (captain only) */}
      {isCaptain && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Invite Link</Text>

          <View
            style={[
              styles.inviteLinkCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <Ionicons name="link-outline" size={16} color={game.accent} />
            <Text
              style={[styles.inviteLinkText, { color: c.textPrimary }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {inviteLink}
            </Text>
          </View>

          <View style={styles.inviteActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCopyLink}
              style={[
                styles.inviteActionBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <Ionicons
                name={copiedLink ? 'checkmark' : 'copy-outline'}
                size={14}
                color={copiedLink ? '#38A169' : c.textSecondary}
              />
              <Text style={[styles.inviteActionText, { color: copiedLink ? '#38A169' : c.textSecondary }]}>
                {copiedLink ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleShareLink}
              style={[
                styles.inviteActionBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <Ionicons name="share-outline" size={14} color={c.textSecondary} />
              <Text style={[styles.inviteActionText, { color: c.textSecondary }]}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowPlayerSearch(true)}
              style={[styles.inviteActionBtn, { backgroundColor: game.accent, borderColor: game.accent }]}
            >
              <Ionicons name="person-add-outline" size={14} color="#FFFFFF" />
              <Text style={[styles.inviteActionText, { color: '#FFFFFF' }]}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Members Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
          Members ({members.length})
        </Text>

        <View
          style={[
            styles.membersList,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            },
          ]}
        >
          {members.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              isCaptainViewer={isCaptain}
              isSelf={member.user_id === user?.id}
              accent={game.accent}
              textPrimary={c.textPrimary}
              textSecondary={c.textSecondary}
              textTertiary={c.textTertiary}
              isDark={isDark}
              onChangeRole={handleChangeRole}
              onKick={handleKick}
            />
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        {isCaptain ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDissolve}
            style={[styles.dangerBtn, { borderColor: '#EF444440' }]}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.dangerBtnText}>Dissolve Team</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLeave}
            style={[styles.dangerBtn, { borderColor: '#EF444440' }]}
          >
            <Ionicons name="log-out-outline" size={16} color="#EF4444" />
            <Text style={styles.dangerBtnText}>Leave Team</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Player Search Modal */}
      <PlayerSearchModal
        visible={showPlayerSearch}
        teamId={team.id}
        existingMemberIds={members.map((m) => m.user_id)}
        onClose={() => setShowPlayerSearch(false)}
        onInviteSent={onRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  // Header
  headerSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  teamLogo: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 12,
  },
  teamName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  teamTag: {
    fontSize: 16,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeIcon: {
    width: 14,
    height: 14,
  },
  rankBadgeIcon: {
    width: 16,
    height: 16,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  // Sections
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Invite link
  inviteLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  inviteLinkText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  inviteActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  inviteActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Members
  membersList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Actions
  actionsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});
