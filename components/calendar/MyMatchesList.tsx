import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS } from '@/lib/constants';
import { getGameModeById, getRankImage, getRankLabel } from '@/lib/game-assets';
import { supabase } from '@/lib/supabase';
import type { Match } from '@/types/database';

type MatchSection = {
  title: string;
  icon: string;
  color: string;
  data: Match[];
};

export default function MyMatchesList() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const router = useRouter();
  const { user } = useAuthStore();
  const { ranks, rankUrl } = useGameAssets();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyMatches = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get all match IDs where user is a member (not kicked)
      const { data: memberData } = await supabase
        .from('match_members')
        .select('match_id')
        .eq('user_id', user.id)
        .is('kicked_at' as string, null);

      if (!memberData || memberData.length === 0) {
        setMatches([]);
        return;
      }

      const matchIds = (memberData as { match_id: string }[]).map((m) => m.match_id);

      // Also get matches user created
      const { data: createdData } = await supabase
        .from('matches')
        .select('*')
        .eq('creator_id', user.id)
        .not('status', 'eq', 'cancelled');

      // Get matches where user is member
      const { data: memberMatchData } = await supabase
        .from('matches')
        .select('*')
        .in('id', matchIds)
        .not('status', 'eq', 'cancelled');

      // Merge and deduplicate
      const allMatches = [...(createdData ?? []), ...(memberMatchData ?? [])] as Match[];
      const seen = new Set<string>();
      const unique = allMatches.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

      setMatches(unique);
    } catch (err) {
      if (__DEV__) console.error('[MyMatchesList] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMyMatches();
  }, [fetchMyMatches]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMyMatches();
  };

  const sections = useMemo<MatchSection[]>(() => {
    const now = Date.now();

    const active: Match[] = [];
    const upcoming: Match[] = [];
    const past: Match[] = [];

    for (const m of matches) {
      if (m.status === 'in_progress' || m.status === 'open' || m.status === 'full') {
        if (m.scheduled_at && new Date(m.scheduled_at).getTime() > now) {
          upcoming.push(m);
        } else {
          active.push(m);
        }
      } else {
        past.push(m);
      }
    }

    // Sort upcoming by schedule date
    upcoming.sort((a, b) => {
      const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return aTime - bTime;
    });

    // Sort past by created_at descending
    past.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const result: MatchSection[] = [];
    if (active.length > 0) result.push({ title: 'Active', icon: 'flash', color: '#22C55E', data: active });
    if (upcoming.length > 0) result.push({ title: 'Upcoming', icon: 'calendar', color: '#3B82F6', data: upcoming });
    if (past.length > 0) result.push({ title: 'Past', icon: 'time', color: isDark ? '#666' : '#999', data: past });
    return result;
  }, [matches, isDark]);

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={c.textTertiary} />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
          <Ionicons name="calendar-outline" size={28} color={c.textTertiary} />
        </View>
        <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No matches yet</Text>
        <Text style={[styles.emptySubtitle, { color: c.textTertiary }]}>
          Join or create a match{'\n'}to see it here.
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Match }) => {
    const game = GAME_ACCENTS[item.game];
    const modeConfig = getGameModeById(item.game_mode);
    const hasRank = modeConfig?.hasRank ?? true;
    const rankMinImage = hasRank && item.rank_min ? getRankImage(item.rank_min, ranks) : null;
    const isPast = item.status === 'completed';

    const statusColor =
      item.status === 'in_progress' ? '#F59E0B' :
      item.status === 'full' ? '#22C55E' :
      item.status === 'completed' ? (isDark ? '#666' : '#999') : game.accent;

    const statusLabel =
      item.status === 'in_progress' ? 'In Progress' :
      item.status === 'full' ? 'Full' :
      item.status === 'completed' ? 'Completed' : 'Open';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/match/${item.id}`)}
        style={[
          styles.matchCard,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            opacity: isPast ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.matchCardTop}>
          <View style={styles.matchCardLeft}>
            {/* Mode icon */}
            <View style={[styles.modeIconBg, { backgroundColor: `${game.accent}15` }]}>
              {modeConfig ? (
                <Ionicons name={modeConfig.icon as keyof typeof Ionicons.glyphMap} size={16} color={game.accent} />
              ) : (
                <Ionicons name="game-controller" size={16} color={game.accent} />
              )}
            </View>
            <View style={styles.matchInfo}>
              <Text numberOfLines={1} style={[styles.matchMode, { color: c.textPrimary }]}>
                {modeConfig?.label ?? item.game_mode}
              </Text>
              <View style={styles.matchMeta}>
                {rankMinImage && (
                  <Image source={{ uri: rankUrl(rankMinImage) }} style={styles.rankIcon} contentFit="contain" />
                )}
                <Text style={[styles.matchMetaText, { color: c.textTertiary }]}>
                  {item.current_players}/{item.max_players} · {item.region.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Schedule info */}
        {item.scheduled_at && (
          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={12} color={c.textTertiary} />
            <Text style={[styles.scheduleText, { color: c.textTertiary }]}>
              {new Date(item.scheduled_at).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              {' '}
              {new Date(item.scheduled_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Ionicons name={section.icon as keyof typeof Ionicons.glyphMap} size={14} color={section.color} />
          <Text style={[styles.sectionTitle, { color: section.color }]}>
            {section.title} ({section.data.length})
          </Text>
        </View>
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.textTertiary} />
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 20,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  matchCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modeIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchInfo: {
    flex: 1,
    gap: 2,
  },
  matchMode: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  matchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rankIcon: {
    width: 16,
    height: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 46,
  },
  scheduleText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
