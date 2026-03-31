import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useGameAssets } from '@/hooks/useGameAssets';
import { getRankImage } from '@/lib/game-assets';
import type { TeamMemberWithProfile, TeamRole } from '@/types/database';

const ROLE_LABELS: Record<TeamRole, string> = {
  president: 'President',
  captain: 'Captain',
  player: 'Player',
  sub: 'Sub',
  coach: 'Coach',
};

const ROLE_COLORS: Record<TeamRole, string> = {
  president: '#F59E0B',
  captain: '#F59E0B',
  player: '#3B82F6',
  sub: '#8B5CF6',
  coach: '#10B981',
};

const ASSIGNABLE_ROLES: { id: TeamRole; label: string }[] = [
  { id: 'player', label: 'Player' },
  { id: 'sub', label: 'Sub' },
  { id: 'coach', label: 'Coach' },
];

interface TeamMemberRowProps {
  member: TeamMemberWithProfile;
  isPresidentViewer: boolean;
  isSelf: boolean;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  isDark: boolean;
  onChangeRole?: (userId: string, role: TeamRole) => void;
  onKick?: (userId: string) => void;
}

export default function TeamMemberRow({
  member,
  isPresidentViewer,
  isSelf,
  accent,
  textPrimary,
  textSecondary,
  textTertiary,
  isDark,
  onChangeRole,
  onKick,
}: TeamMemberRowProps) {
  const { ranks, rankUrl } = useGameAssets();
  const profile = member.profile;
  const rankImage = profile.current_rank ? getRankImage(profile.current_rank, ranks) : null;
  const isPresidentMember = member.role === 'president';

  const handleKick = () => {
    Alert.alert(
      'Remove player',
      `Remove ${profile.username} from the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onKick?.(member.user_id) },
      ],
    );
  };

  const handleChangeRole = () => {
    Alert.alert(
      'Change role',
      `Set role for ${profile.username}`,
      [
        ...ASSIGNABLE_ROLES.map((r) => ({
          text: r.label + (member.role === r.id ? ' (current)' : ''),
          onPress: () => {
            if (member.role !== r.id) onChangeRole?.(member.user_id, r.id);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const roleColor = ROLE_COLORS[member.role];

  return (
    <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
      {/* Avatar */}
      {profile.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: `${accent}20` }]}>
          <Ionicons name="person" size={16} color={accent} />
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          {isPresidentMember && (
            <Ionicons name="shield" size={12} color="#F59E0B" style={{ marginRight: 3 }} />
          )}
          <Text numberOfLines={1} style={[styles.username, { color: textPrimary }]}>
            {profile.username}
          </Text>
          {isSelf && (
            <Text style={[styles.youBadge, { color: accent }]}>(you)</Text>
          )}
        </View>
        <View style={styles.detailsRow}>
          {rankImage && (
            <Image source={{ uri: rankUrl(rankImage) }} style={styles.rankIcon} contentFit="contain" />
          )}
          {profile.main_agent && (
            <Text numberOfLines={1} style={[styles.detail, { color: textTertiary }]}>
              {profile.main_agent.charAt(0).toUpperCase() + profile.main_agent.slice(1)}
            </Text>
          )}
        </View>
      </View>

      {/* Role badge */}
      <TouchableOpacity
        activeOpacity={isPresidentViewer && !isPresidentMember ? 0.7 : 1}
        onPress={isPresidentViewer && !isPresidentMember ? handleChangeRole : undefined}
        disabled={!isPresidentViewer || isPresidentMember}
        style={[styles.roleBadge, { backgroundColor: `${roleColor}15` }]}
      >
        <Text style={[styles.roleText, { color: roleColor }]}>
          {ROLE_LABELS[member.role]}
        </Text>
        {isPresidentViewer && !isPresidentMember && (
          <Ionicons name="chevron-down" size={10} color={roleColor} />
        )}
      </TouchableOpacity>

      {/* Kick button */}
      {isPresidentViewer && !isSelf && !isPresidentMember && onKick && (
        <TouchableOpacity activeOpacity={0.7} onPress={handleKick} style={styles.kickBtn}>
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
  },
  youBadge: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankIcon: {
    width: 16,
    height: 16,
  },
  detail: {
    fontSize: 11,
    fontWeight: '500',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  kickBtn: {
    padding: 4,
  },
});
