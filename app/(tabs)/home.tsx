import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/authStore';
import { GAME_ACCENTS, GAME_MULTIPLATFORM, GameId } from '@/lib/constants';
import { getGameLogoUrl, getRankLabel, getGameModeById } from '@/lib/game-assets';
import type { ValorantGameModeId } from '@/lib/game-assets';
import { supabase } from '@/lib/supabase';
import type { Match, Region } from '@/types/database';
import MatchCard from '@/components/MatchCard';
import MatchFilters, { type RankTier, type TimingFilter } from '@/components/MatchFilters';
import CreateMatchModal from '@/components/CreateMatchModal';

const ALL_GAMES = Object.values(GAME_ACCENTS);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const selectedGame = useGameStore((s) => s.selectedGame);
  const setSelectedGame = useGameStore((s) => s.setSelectedGame);
  const game = GAME_ACCENTS[selectedGame];
  const { profile } = useAuthStore();

  const [showGameDropdown, setShowGameDropdown] = useState(false);

  // Match list state
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter state
  const defaultTier = profile?.current_rank
    ? getRankLabel(profile.current_rank) as RankTier
    : null;
  const [selectedTiers, setSelectedTiers] = useState<RankTier[]>(
    defaultTier ? [defaultTier] : []
  );
  const [showRrPenalty, setShowRrPenalty] = useState(false);
  const [timingFilter, setTimingFilter] = useState<TimingFilter>('now');

  // Game mode filter
  const [selectedMode, setSelectedMode] = useState<ValorantGameModeId | null>(null);

  // Region filter — defaults to profile region
  const [selectedRegion, setSelectedRegion] = useState<Region>(
    profile?.region ?? 'eu'
  );

  // Lasts filter
  const [selectedLasts, setSelectedLasts] = useState<number | null>(null);

  // Scheduled date filter
  const [scheduledFilterDate, setScheduledFilterDate] = useState<Date | null>(null);
  const [showScheduledDatePicker, setShowScheduledDatePicker] = useState(false);

  const HEADER_H = 60;

  // Fetch matches — filtered by selected region + platform
  const fetchMatches = useCallback(async () => {
    if (!profile) return;
    try {
      let query = supabase
        .from('matches')
        .select('*')
        .eq('game', selectedGame)
        .eq('region', selectedRegion)
        .in('status', ['open', 'full'])
        .order('created_at', { ascending: false });

      if (GAME_MULTIPLATFORM[selectedGame] && profile.platform) {
        query = query.eq('platform', profile.platform);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMatches((data as Match[]) ?? []);
    } catch (err) {
      if (__DEV__) console.error('[Home] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGame, profile, selectedRegion]);

  useEffect(() => {
    setLoading(true);
    fetchMatches();
  }, [fetchMatches]);

  // Client-side filtering: rank tier, RR, timing, expiration
  const filteredMatches = useMemo(() => {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    let result = matches;

    // Expiration filter — hide expired matches client-side
    result = result.filter((m) => {
      if (m.scheduled_at) {
        // Scheduled: visible until 1h after scheduled time
        return new Date(m.scheduled_at).getTime() + ONE_HOUR > now;
      }
      // Instant: visible for 1h after creation
      return new Date(m.created_at).getTime() + ONE_HOUR > now;
    });

    // Timing filter
    if (timingFilter === 'now') {
      result = result.filter((m) => !m.scheduled_at);
    } else {
      result = result.filter((m) => !!m.scheduled_at);
      // If a specific date is selected, filter to that day only
      if (scheduledFilterDate) {
        const filterStart = new Date(scheduledFilterDate);
        filterStart.setHours(0, 0, 0, 0);
        const filterEnd = new Date(scheduledFilterDate);
        filterEnd.setHours(23, 59, 59, 999);
        result = result.filter((m) => {
          const matchDate = new Date(m.scheduled_at!).getTime();
          return matchDate >= filterStart.getTime() && matchDate <= filterEnd.getTime();
        });
      }
    }

    // Game mode filter
    if (selectedMode) {
      result = result.filter((m) => m.game_mode === selectedMode);
    }

    // Resolve active mode config for conditional filtering
    const activeModeConfig = selectedMode ? getGameModeById(selectedMode) : null;

    // Rank tier filter — skip when mode has no rank
    if (selectedTiers.length > 0 && (!activeModeConfig || activeModeConfig.hasRank)) {
      result = result.filter((m) => {
        const minTier = getRankLabel(m.rank_min);
        const maxTier = getRankLabel(m.rank_max);
        return selectedTiers.some(
          (t) => t === minTier || t === maxTier
        );
      });
    }

    // RR penalty filter — skip when mode has no RR
    if (showRrPenalty && (!activeModeConfig || activeModeConfig.hasRrPenalty)) {
      result = result.filter((m) => m.rr_penalty);
    }

    // Lasts filter — number of spots needed
    if (selectedLasts !== null) {
      result = result.filter((m) => {
        const spotsNeeded = m.max_players - m.current_players;
        return spotsNeeded === selectedLasts;
      });
    }

    return result;
  }, [matches, selectedTiers, showRrPenalty, timingFilter, scheduledFilterDate, selectedMode, selectedLasts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const handleSelectGame = useCallback((gameId: GameId) => {
    const target = GAME_ACCENTS[gameId];
    if ('disabled' in target && target.disabled) return;
    setSelectedGame(gameId);
    setShowGameDropdown(false);
  }, [setSelectedGame]);

  const handleMatchPress = (match: Match) => {
    router.push(`/match/${match.id}`);
  };

  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            height: HEADER_H,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.5 }}>
          Home
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowGameDropdown((v) => !v)}
          style={styles.gameSelector}
        >
          <Image
            source={{ uri: getGameLogoUrl(game.logo) }}
            style={styles.headerLogo}
            contentFit="contain"
          />
          <Text style={[styles.gameName, { color: c.textPrimary }]}>
            {game.name}
          </Text>
          <Ionicons
            name={showGameDropdown ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={c.textTertiary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.bellButton,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color={c.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.contentFlex}>
        {/* ── Primary timing toggle: Now / Scheduled ── */}
        <View style={styles.timingRow}>
          {/* Now button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setTimingFilter('now');
              setScheduledFilterDate(null);
            }}
            style={[
              styles.timingChip,
              {
                backgroundColor: timingFilter === 'now'
                  ? `${game.accent}18`
                  : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderColor: timingFilter === 'now'
                  ? game.accent
                  : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <Ionicons
              name="flash"
              size={14}
              color={timingFilter === 'now' ? game.accent : c.textTertiary}
            />
            <Text
              style={[
                styles.timingChipText,
                { color: timingFilter === 'now' ? game.accent : c.textSecondary },
              ]}
            >
              Now
            </Text>
          </TouchableOpacity>

          {/* Scheduled button — opens date picker directly */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (timingFilter === 'scheduled') {
                setShowScheduledDatePicker(true);
              } else {
                setTimingFilter('scheduled');
                setShowScheduledDatePicker(true);
              }
            }}
            style={[
              styles.timingChip,
              {
                backgroundColor: timingFilter === 'scheduled'
                  ? `${game.accent}18`
                  : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderColor: timingFilter === 'scheduled'
                  ? game.accent
                  : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={timingFilter === 'scheduled' ? game.accent : c.textTertiary}
            />
            <Text
              style={[
                styles.timingChipText,
                { color: timingFilter === 'scheduled' ? game.accent : c.textSecondary },
              ]}
              numberOfLines={1}
            >
              {timingFilter === 'scheduled' && scheduledFilterDate
                ? scheduledFilterDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Scheduled'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Match list with bordered container ── */}
        <View
          style={[
            styles.listContainer,
            { borderColor },
          ]}
        >
          {/* ── Secondary filters inside list border ── */}
          <View style={[styles.innerFilters, { borderBottomColor: borderColor }]}>
            <MatchFilters
              selectedTiers={selectedTiers}
              onTiersChange={setSelectedTiers}
              showRrPenalty={showRrPenalty}
              onRrPenaltyChange={setShowRrPenalty}
              selectedMode={selectedMode}
              onModeChange={setSelectedMode}
              selectedRegion={selectedRegion}
              onRegionChange={(region) => {
                setSelectedRegion(region);
                setLoading(true);
              }}
              selectedLasts={selectedLasts}
              onLastsChange={setSelectedLasts}
            />
          </View>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={game.accent} />
            </View>
          ) : filteredMatches.length === 0 ? (
            <View style={styles.centered}>
              <View
                style={[styles.emptyIcon, { backgroundColor: `${game.accent}12` }]}
              >
                <Ionicons name="search" size={28} color={game.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>
                No matches yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: c.textTertiary }]}>
                Be the first to create a match{'\n'}and find players.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredMatches}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MatchCard match={item} onPress={handleMatchPress} />
              )}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={game.accent}
                />
              }
            />
          )}
        </View>

        {/* ── Create Match CTA — static at bottom ── */}
        <View style={styles.createWrapper}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowCreateModal(true)}
            style={[styles.createBtn, { backgroundColor: game.accent }]}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create Match</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Floating Game Dropdown Overlay ──────────────── */}
      {showGameDropdown && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { top: insets.top + HEADER_H, zIndex: 50 },
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowGameDropdown(false)}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
          </Pressable>

          <View
            style={[
              styles.dropdownCard,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            {ALL_GAMES.map((g, index) => {
              const isActive = g.id === selectedGame;
              const isDisabled = 'disabled' in g && g.disabled;
              const isLast = index === ALL_GAMES.length - 1;

              return (
                <TouchableOpacity
                  key={g.id}
                  activeOpacity={isDisabled ? 1 : 0.6}
                  onPress={() => handleSelectGame(g.id as GameId)}
                  disabled={isDisabled}
                  style={[
                    styles.dropdownRow,
                    {
                      opacity: isDisabled ? 0.35 : 1,
                      borderBottomWidth: isLast ? 0 : 0.5,
                      borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  <Image
                    source={{ uri: getGameLogoUrl(g.logo) }}
                    style={styles.dropdownLogo}
                    contentFit="contain"
                  />
                  <Text
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      fontSize: 15,
                      fontWeight: '600',
                      color: isActive ? game.accent : c.textPrimary,
                    }}
                  >
                    {g.name}
                  </Text>
                  {isDisabled && (
                    <Text style={[styles.comingSoon, { color: c.textTertiary }]}>
                      Coming soon
                    </Text>
                  )}
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={20} color={game.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Scheduled date picker ─────────────────────── */}
      {showScheduledDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={scheduledFilterDate ?? new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={(_e: DateTimePickerEvent, date?: Date) => {
            setShowScheduledDatePicker(false);
            if (date) setScheduledFilterDate(date);
          }}
        />
      )}
      {showScheduledDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade">
          <View style={styles.iosPickerOverlay}>
            <View
              style={[
                styles.iosPickerContainer,
                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
              ]}
            >
              <View style={styles.iosPickerHeader}>
                <Text style={[styles.iosPickerTitle, { color: c.textPrimary }]}>
                  Filter by date
                </Text>
                <TouchableOpacity onPress={() => setShowScheduledDatePicker(false)}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: game.accent }}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={scheduledFilterDate ?? new Date()}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_e: DateTimePickerEvent, date?: Date) => {
                  if (date) setScheduledFilterDate(date);
                }}
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* ── Create Match Modal ─────────────────────────── */}
      <CreateMatchModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchMatches}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  gameSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  gameName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentFlex: {
    flex: 1,
  },
  // ── Timing toggle row ──
  timingRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
  },
  timingChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  timingChipText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  // ── Filters inside list ──
  innerFilters: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
  },
  // ── List container ──
  listContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 0.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  // ── Create CTA ──
  createWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  // ── Empty / loading ──
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
  // ── Dropdown ──
  dropdownCard: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  comingSoon: {
    fontSize: 11,
    fontWeight: '500',
    marginRight: 8,
  },
  // ── iOS Date Picker ──
  iosPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosPickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
