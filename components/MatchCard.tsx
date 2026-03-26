import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useGameStore } from '@/stores/gameStore';
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS } from '@/lib/constants';
import { getRankLabel, getRankImage, getGameModeById } from '@/lib/game-assets';
import type { Match } from '@/types/database';

interface MatchCardProps {
  match: Match;
  onPress: (match: Match) => void;
}

function formatScheduled(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (isToday) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
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

  const modeConfig = getGameModeById(match.game_mode);
  const hasRank = modeConfig?.hasRank ?? true;

  const isFull = match.status === 'full';
  const spotsLeft = match.max_players - match.current_players;
  const rankMinImage = hasRank ? getRankImage(match.rank_min, ranks) : null;
  const rankMaxImage = hasRank ? getRankImage(match.rank_max, ranks) : null;
  const rankMinLabel = hasRank ? getRankLabel(match.rank_min) : '';
  const rankMaxLabel = hasRank ? getRankLabel(match.rank_max) : '';
  const isSameRank = rankMinLabel === rankMaxLabel;

  // Player slot indicators
  const slots: boolean[] = [];
  for (let i = 0; i < match.max_players; i++) {
    slots.push(i < match.current_players);
  }

  return (
    <TouchableOpacity
      activeOpacity={isFull ? 0.9 : 0.6}
      onPress={() => onPress(match)}
      disabled={isFull}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderColor: isDark
            ? `rgba(255,255,255,0.07)`
            : `rgba(0,0,0,0.06)`,
          opacity: isFull ? 0.45 : 1,
        },
      ]}
    >
      {/* Accent left edge */}
      <View
        style={[
          styles.accentEdge,
          { backgroundColor: isFull ? (isDark ? '#444' : '#BBB') : game.accent },
        ]}
      />

      {/* Subtle accent gradient overlay */}
      <View
        style={[
          styles.accentGlow,
          { backgroundColor: isFull ? 'transparent' : `${game.accent}08` },
        ]}
      />

      {/* Card content */}
      <View style={styles.content}>
        {/* Top row: rank info + badges */}
        <View style={styles.topRow}>
          {/* Rank section or mode label when no rank */}
          <View style={styles.rankSection}>
            {hasRank ? (
              <>
                <View style={styles.rankIcons}>
                  {rankMinImage ? (
                    <Image
                      source={{ uri: rankUrl(rankMinImage) }}
                      style={styles.rankIcon}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={[styles.rankIcon, styles.rankPlaceholder]}>
                      <Ionicons name="shield-outline" size={18} color={c.textTertiary} />
                    </View>
                  )}
                  {!isSameRank && rankMaxImage && (
                    <>
                      <Text style={[styles.rankSeparator, { color: c.textTertiary }]}>›</Text>
                      <Image
                        source={{ uri: rankUrl(rankMaxImage) }}
                        style={styles.rankIcon}
                        contentFit="contain"
                      />
                    </>
                  )}
                </View>
                <Text numberOfLines={1} style={[styles.rankLabel, { color: c.textPrimary }]}>
                  {isSameRank ? rankMinLabel : `${rankMinLabel} — ${rankMaxLabel}`}
                </Text>
              </>
            ) : (
              <>
                {modeConfig && (
                  <Ionicons
                    name={modeConfig.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={c.textPrimary}
                  />
                )}
                <Text numberOfLines={1} style={[styles.rankLabel, { color: c.textPrimary }]}>
                  {modeConfig?.label ?? match.game_mode}
                </Text>
              </>
            )}
          </View>

          {/* Badges */}
          <View style={styles.badgeRow}>
            {/* Mode badge (shown when rank is visible, to distinguish mode) */}
            {hasRank && modeConfig && modeConfig.id !== 'competitive' && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: `${game.accent}12` },
                ]}
              >
                <Ionicons
                  name={modeConfig.icon as keyof typeof Ionicons.glyphMap}
                  size={10}
                  color={game.accent}
                />
                <Text style={[styles.badgeText, { color: game.accent, marginLeft: 3 }]}>
                  {modeConfig.label}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.badge,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' },
              ]}
            >
              <Text style={[styles.badgeText, { color: c.textSecondary }]}>
                {match.region.toUpperCase()}
              </Text>
            </View>
            {match.discord_link && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: 'rgba(88,101,242,0.12)' },
                ]}
              >
                <Ionicons name="logo-discord" size={10} color="#5865F2" />
              </View>
            )}
          </View>
        </View>

        {/* Bottom row: player slots + meta */}
        <View style={styles.bottomRow}>
          {/* Player slots */}
          <View style={styles.slotsSection}>
            <View style={styles.slotsRow}>
              {slots.map((filled, i) => (
                <View
                  key={i}
                  style={[
                    styles.slot,
                    {
                      backgroundColor: filled
                        ? game.accent
                        : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      borderColor: filled
                        ? game.accent
                        : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                    },
                  ]}
                />
              ))}
            </View>
            {isFull ? (
              <Text style={[styles.spotsText, { color: c.textTertiary, fontWeight: '700' }]}>
                FULL
              </Text>
            ) : (
              <Text style={[styles.spotsText, { color: c.textSecondary }]}>
                {spotsLeft} last{spotsLeft > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {/* RR penalty badge */}
          {match.rr_penalty && (
            <View style={[styles.badge, { backgroundColor: `${game.accent}18` }]}>
              <Text style={[styles.badgeText, { color: game.accent }]}>-25%</Text>
            </View>
          )}

          {/* Notes preview */}
          {match.notes && (
            <Text
              numberOfLines={1}
              style={[styles.notesPreview, { color: c.textTertiary }]}
            >
              {match.notes}
            </Text>
          )}

          {/* Time / Schedule indicator */}
          {match.scheduled_at ? (
            <View style={styles.scheduleWrap}>
              <Ionicons name="calendar-outline" size={10} color={c.textTertiary} />
              <Text style={[styles.timeText, { color: c.textTertiary }]}>
                {formatScheduled(match.scheduled_at)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.timeText, { color: c.textTertiary }]}>
              {timeAgo(match.created_at)}
            </Text>
          )}
        </View>
      </View>

      {/* Decorative corner slash */}
      <View
        style={[
          styles.cornerSlash,
          {
            borderColor: isDark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(0,0,0,0.03)',
          },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accentEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2.5,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  accentGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '40%',
  },
  content: {
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rankIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rankIcon: {
    width: 34,
    height: 34,
  },
  rankPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankSeparator: {
    fontSize: 16,
    fontWeight: '300',
    marginHorizontal: 1,
  },
  rankLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  slotsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  slot: {
    width: 18,
    height: 6,
    borderRadius: 2,
    borderWidth: 0.5,
  },
  spotsText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  notesPreview: {
    flex: 1,
    fontSize: 11,
    fontStyle: 'italic',
  },
  scheduleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 'auto',
  },
  cornerSlash: {
    position: 'absolute',
    top: -8,
    right: 8,
    width: 16,
    height: 16,
    borderBottomWidth: 0.5,
    transform: [{ rotate: '45deg' }],
  },
});
