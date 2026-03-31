import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
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
import TeamSlotGrid, { SlotType } from '@/components/team/TeamSlotGrid';
import InviteModal from '@/components/team/InviteModal';
import TeamSettingsModal from '@/components/team/TeamSettingsModal';
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
  isPresident: boolean;
  onRefresh: () => void;
}

export default function TeamManagementView({
  team,
  members,
  isPresident,
  onRefresh,
}: TeamManagementViewProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const { user } = useAuthStore();
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = GAME_ACCENTS[selectedGame];
  const { ranks, rankUrl } = useGameAssets();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const gameConfig = GAME_ACCENTS[team.game as keyof typeof GAME_ACCENTS] ?? game;
  const rankImage = team.rank_tier ? getRankImage(team.rank_tier, ranks) : null;

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

  const handleSlotPress = (
    slotType: SlotType,
    slotIndex: number,
    member: TeamMemberWithProfile | null
  ) => {
    if (!member) {
      // Empty slot - open invite modal (president only, handled by slot disabled state)
      if (isPresident) {
        setShowInviteModal(true);
      }
      return;
    }

    // Filled slot - show member actions (president only)
    if (isPresident && member.user_id !== user?.id) {
      showMemberActions(member);
    }
  };

  const showMemberActions = (member: TeamMemberWithProfile) => {
    const actions: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];

    // Toggle captain badge
    if (member.role === 'player' || member.role === 'sub') {
      actions.push({
        text: member.is_captain ? 'Remove Captain Badge' : 'Give Captain Badge',
        onPress: () => toggleCaptain(member),
      });
    }

    // Change role/slot
    actions.push({
      text: 'Change Role',
      onPress: () => showRoleOptions(member),
    });

    // Kick
    actions.push({
      text: 'Remove from Team',
      style: 'destructive',
      onPress: () => confirmKick(member),
    });

    actions.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(member.profile.username, undefined, actions);
  };

  const toggleCaptain = async (member: TeamMemberWithProfile) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_captain: !member.is_captain } as never)
        .eq('id', member.id);

      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('[Team] Toggle captain error:', err);
      Alert.alert('Error', 'Failed to update captain status.');
    }
  };

  const showRoleOptions = (member: TeamMemberWithProfile) => {
    const roles: { id: TeamRole; label: string }[] = [
      { id: 'coach', label: 'Coach' },
      { id: 'player', label: 'Player' },
      { id: 'sub', label: 'Substitute' },
    ];

    Alert.alert(
      'Change Role',
      `Set role for ${member.profile.username}`,
      [
        ...roles.map((r) => ({
          text: r.label + (member.role === r.id ? ' (current)' : ''),
          onPress: async () => {
            if (member.role !== r.id) {
              try {
                const { error } = await supabase
                  .from('team_members')
                  .update({ role: r.id, slot_index: null } as never)
                  .eq('id', member.id);

                if (error) throw error;
                onRefresh();
              } catch (err) {
                console.error('[Team] Change role error:', err);
                Alert.alert('Error', 'Failed to change role.');
              }
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const confirmKick = (member: TeamMemberWithProfile) => {
    Alert.alert(
      'Remove player',
      `Remove ${member.profile.username} from the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('team_members')
                .delete()
                .eq('id', member.id);

              if (error) throw error;
              await recalculateRank();
              onRefresh();
            } catch (err) {
              console.error('[Team] Kick error:', err);
              Alert.alert('Error', 'Failed to remove player.');
            }
          },
        },
      ],
    );
  };

  const handleMemberLongPress = (member: TeamMemberWithProfile) => {
    if (isPresident && member.user_id !== user?.id) {
      showMemberActions(member);
    }
  };

  return (
    <View style={styles.container}>
      {/* Team Header - Compact */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          {team.logo_url ? (
            <Image source={{ uri: team.logo_url }} style={styles.teamLogo} contentFit="cover" />
          ) : (
            <TeamInitials tag={team.tag} size={50} />
          )}

          <View style={styles.headerInfo}>
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
                <Ionicons name="globe-outline" size={10} color={c.textSecondary} />
                <Text style={[styles.badgeText, { color: c.textSecondary }]}>
                  {REGION_LABELS[team.region] ?? team.region.toUpperCase()}
                </Text>
              </View>

              {rankImage && (
                <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                  <Image source={{ uri: rankUrl(rankImage) }} style={styles.rankBadgeIcon} contentFit="contain" />
                </View>
              )}
            </View>
          </View>

          {/* Settings button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowSettingsModal(true)}
            style={[
              styles.settingsBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
            ]}
          >
            <Ionicons name="settings-outline" size={18} color={c.textSecondary} />
          </TouchableOpacity>
        </View>

        {team.description && (
          <Text style={[styles.description, { color: c.textSecondary }]}>{team.description}</Text>
        )}
      </View>

      {/* Slot Grid */}
      <View style={styles.gridSection}>
        <TeamSlotGrid
          members={members}
          presidentId={team.president_id}
          currentUserId={user?.id}
          isPresident={isPresident}
          accent={game.accent}
          textPrimary={c.textPrimary}
          textSecondary={c.textSecondary}
          textTertiary={c.textTertiary}
          isDark={isDark}
          onSlotPress={handleSlotPress}
          onMemberLongPress={handleMemberLongPress}
        />
      </View>

      {/* Invite Button (president only) */}
      {isPresident && (
        <View style={styles.inviteSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowInviteModal(true)}
            style={[styles.inviteBtn, { backgroundColor: game.accent }]}
          >
            <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
            <Text style={styles.inviteBtnText}>Invite</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      <InviteModal
        visible={showInviteModal}
        teamId={team.id}
        inviteCode={team.invite_code}
        teamName={team.name}
        existingMemberIds={members.map((m) => m.user_id)}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={onRefresh}
      />

      <TeamSettingsModal
        visible={showSettingsModal}
        team={team}
        members={members}
        isPresident={isPresident}
        onClose={() => setShowSettingsModal(false)}
        onTeamUpdated={onRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  // Header - Compact
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  teamTag: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgeIcon: {
    width: 12,
    height: 12,
  },
  rankBadgeIcon: {
    width: 14,
    height: 14,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 10,
  },
  // Grid
  gridSection: {
    paddingHorizontal: 20,
  },
  // Invite
  inviteSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  inviteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
