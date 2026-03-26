import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useGameAssets } from '@/hooks/useGameAssets';
import { getRankImage } from '@/lib/game-assets';
import type { MatchMemberWithProfile } from '@/types/database';

interface MemberRowProps {
  member: MatchMemberWithProfile;
  isCreator: boolean;
  isSelf: boolean;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  isDark: boolean;
  teamTag?: string | null;
  onKick?: () => void;
}

export default function MemberRow({
  member,
  isCreator,
  isSelf,
  accent,
  textPrimary,
  textSecondary,
  textTertiary,
  isDark,
  teamTag,
  onKick,
}: MemberRowProps) {
  const { ranks, rankUrl } = useGameAssets();
  const profile = member.profile;
  const rankImage = profile.current_rank ? getRankImage(profile.current_rank, ranks) : null;

  const handleKick = () => {
    Alert.alert(
      'Kick player',
      `Remove ${profile.username} from the match?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Kick', style: 'destructive', onPress: onKick },
      ],
    );
  };

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
          <Text numberOfLines={1} style={[styles.username, { color: textPrimary }]}>
            {profile.username}
          </Text>
          {teamTag && (
            <Text style={[styles.teamTagText, { color: textTertiary }]}>#{teamTag}</Text>
          )}
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

      {/* Ready status */}
      <View style={[styles.readyBadge, { backgroundColor: member.is_ready ? '#22C55E20' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
        <Ionicons
          name={member.is_ready ? 'checkmark-circle' : 'time-outline'}
          size={14}
          color={member.is_ready ? '#22C55E' : textTertiary}
        />
        <Text style={[styles.readyText, { color: member.is_ready ? '#22C55E' : textTertiary }]}>
          {member.is_ready ? 'Ready' : 'Not ready'}
        </Text>
      </View>

      {/* Kick button (creator only, not self) */}
      {isCreator && !isSelf && onKick && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleKick}
          style={styles.kickBtn}
        >
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
  teamTagText: {
    fontSize: 12,
    fontWeight: '500',
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
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  readyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  kickBtn: {
    padding: 4,
  },
});
