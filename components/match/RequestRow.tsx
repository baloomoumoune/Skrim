import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useGameAssets } from '@/hooks/useGameAssets';
import { getRankImage } from '@/lib/game-assets';
import type { MatchRequestWithProfile } from '@/types/database';

interface RequestRowProps {
  request: MatchRequestWithProfile;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  isDark: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export default function RequestRow({
  request,
  accent,
  textPrimary,
  textSecondary,
  textTertiary,
  isDark,
  onAccept,
  onReject,
}: RequestRowProps) {
  const { ranks, rankUrl } = useGameAssets();
  const profile = request.profile;
  const rankImage = profile.current_rank ? getRankImage(profile.current_rank, ranks) : null;

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
        <Text numberOfLines={1} style={[styles.username, { color: textPrimary }]}>
          {profile.username}
        </Text>
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

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onReject}
          style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
        >
          <Ionicons name="close" size={16} color={textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onAccept}
          style={[styles.actionBtn, { backgroundColor: `${accent}18` }]}
        >
          <Ionicons name="checkmark" size={16} color={accent} />
        </TouchableOpacity>
      </View>
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
  username: {
    fontSize: 14,
    fontWeight: '600',
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
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
