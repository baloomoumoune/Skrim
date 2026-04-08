import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useGameAssets } from '@/hooks/useGameAssets';
import { getRankLabel, getRankImage } from '@/lib/game-assets';
import type { Match, Profile } from '@/types/database';

export type MatchWithCreator = Match & { creator: Profile };

interface MatchCardProps {
  match: MatchWithCreator;
  onPress: (match: MatchWithCreator) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'now';
  if (diff < 60) return `${diff}m`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export default function MatchCard({ match, onPress }: MatchCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const { ranks, rankUrl } = useGameAssets();

  const isFull = match.status === 'full';
  const rankImage = getRankImage(match.rank_min, ranks);
  const rankLabel = getRankLabel(match.rank_min);
  const creator = match.creator;

  return (
    <TouchableOpacity
      activeOpacity={isFull ? 1 : 0.7}
      onPress={() => !isFull && onPress(match)}
      disabled={isFull}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
          opacity: isFull ? 0.45 : 1,
        },
      ]}
    >
      {/* Row 1: Creator + Rank */}
      <View style={styles.row1}>
        <View style={styles.creatorSection}>
          {creator.avatar_url ? (
            <Image
              source={{ uri: creator.avatar_url }}
              style={[styles.avatar, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <Text style={[styles.avatarInitials, { color: c.textSecondary }]}>
                {getInitials(creator.username)}
              </Text>
            </View>
          )}
          <Text numberOfLines={1} style={[styles.username, { color: c.textPrimary }]}>
            {creator.username}
          </Text>
        </View>

        <View style={styles.rankSection}>
          {rankImage && (
            <Image
              source={{ uri: rankUrl(rankImage) }}
              style={styles.rankIcon}
              contentFit="contain"
            />
          )}
          <Text style={[styles.rankLabel, { color: c.textSecondary }]}>
            {rankLabel}
          </Text>
        </View>
      </View>

      {/* Row 2: Slots + Meta */}
      <View style={styles.row2}>
        <View style={styles.slotsSection}>
          {Array.from({ length: match.max_players }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < match.current_players
                    ? c.accent
                    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
              ]}
            />
          ))}
          <Text style={[styles.slotsText, { color: c.textTertiary }]}>
            {match.current_players}/{match.max_players}
          </Text>
        </View>

        <Text style={[styles.timeText, { color: c.textTertiary }]}>
          {timeAgo(match.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  rankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankIcon: {
    width: 24,
    height: 24,
  },
  rankLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  slotsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  slotsText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
