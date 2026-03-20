import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useGameStore } from '@/stores/gameStore';
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS } from '@/lib/constants';
import { getRankLabel, getRankImage } from '@/lib/game-assets';
import type { Match } from '@/types/database';

interface MatchCardProps {
  match: Match;
  onPress: (match: Match) => void;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
}

export default function MatchCard({ match, onPress }: MatchCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const game = GAME_ACCENTS[useGameStore((s) => s.selectedGame)];
  const { ranks, rankUrl } = useGameAssets();

  const isFull = match.status === 'full';
  const spotsLeft = match.max_players - match.current_players;
  const rankImage = getRankImage(match.rank_min, ranks);
  const rankLabel = getRankLabel(match.rank_min);
  const rankMaxLabel = getRankLabel(match.rank_max);
  const isSameRank = rankLabel === rankMaxLabel;

  // Player dots
  const dots = [];
  for (let i = 0; i < match.max_players; i++) {
    dots.push(i < match.current_players);
  }

  return (
    <TouchableOpacity
      activeOpacity={isFull ? 0.9 : 0.6}
      onPress={() => onPress(match)}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          opacity: isFull ? 0.5 : 1,
        },
      ]}
    >
      {/* Left: Rank icon + label */}
      <View style={styles.rankSection}>
        {rankImage ? (
          <Image
            source={{ uri: rankUrl(rankImage) }}
            style={styles.rankIcon}
            contentFit="contain"
          />
        ) : (
          <View style={[styles.rankIcon, styles.rankPlaceholder]}>
            <Ionicons name="shield-outline" size={20} color={c.textTertiary} />
          </View>
        )}
        <Text numberOfLines={1} style={[styles.rankText, { color: c.textPrimary }]}>
          {isSameRank ? rankLabel : `${rankLabel} - ${rankMaxLabel}`}
        </Text>
      </View>

      {/* Center: Players + dots */}
      <View style={styles.centerSection}>
        <Text style={[styles.playerCount, { color: c.textPrimary }]}>
          {match.current_players}/{match.max_players}
        </Text>
        <View style={styles.dotsRow}>
          {dots.map((filled, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: filled
                    ? game.accent
                    : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                },
              ]}
            />
          ))}
        </View>
        {!isFull && (
          <Text style={[styles.spotsText, { color: c.textTertiary }]}>
            {spotsLeft} spot{spotsLeft > 1 ? 's' : ''} left
          </Text>
        )}
      </View>

      {/* Right: Badges + time */}
      <View style={styles.rightSection}>
        {/* Region */}
        <View
          style={[
            styles.badge,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
          ]}
        >
          <Text style={[styles.badgeText, { color: c.textSecondary }]}>
            {match.region.toUpperCase()}
          </Text>
        </View>

        {/* RR penalty */}
        {match.rr_penalty && (
          <View
            style={[
              styles.badge,
              { backgroundColor: 'rgba(255,59,48,0.12)' },
            ]}
          >
            <Text style={[styles.badgeText, { color: '#FF3B30' }]}>
              -25% RR
            </Text>
          </View>
        )}

        {/* Time ago */}
        <Text style={[styles.timeText, { color: c.textTertiary }]}>
          {timeAgo(match.created_at)}
        </Text>

        {/* Full badge */}
        {isFull && (
          <View
            style={[
              styles.badge,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
            ]}
          >
            <Text style={[styles.badgeText, { color: c.textSecondary, fontWeight: '700' }]}>
              FULL
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 0.5,
    marginBottom: 10,
  },
  rankSection: {
    alignItems: 'center',
    width: 70,
  },
  rankIcon: {
    width: 36,
    height: 36,
  },
  rankPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  playerCount: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  spotsText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
