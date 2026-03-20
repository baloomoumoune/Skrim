import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/authStore';
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS, GAME_MULTIPLATFORM, GameId } from '@/lib/constants';
import { getGameLogoUrl, getRankLabel } from '@/lib/game-assets';
import { supabase } from '@/lib/supabase';
import type { Match, Region, Platform } from '@/types/database';
import MatchCard from '@/components/MatchCard';

type ScrimTab = 'open' | 'mine';

const TABS: { value: ScrimTab; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'mine', label: 'Mine' },
];

const ALL_GAMES = Object.values(GAME_ACCENTS);

const REGIONS: { value: Region; label: string }[] = [
  { value: 'eu', label: 'EU' },
  { value: 'na', label: 'NA' },
  { value: 'apac', label: 'APAC' },
  { value: 'sa', label: 'SA' },
  { value: 'me', label: 'ME' },
  { value: 'oce', label: 'OCE' },
];

export default function ScrimsScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const selectedGame = useGameStore((s) => s.selectedGame);
  const setSelectedGame = useGameStore((s) => s.setSelectedGame);
  const game = GAME_ACCENTS[selectedGame];
  const { user, profile } = useAuthStore();
  const { ranks, rankUrl } = useGameAssets();
  const isMultiplatform = GAME_MULTIPLATFORM[selectedGame] ?? false;

  const [activeTab, setActiveTab] = useState<ScrimTab>('open');
  const [showGameDropdown, setShowGameDropdown] = useState(false);

  // Match list state
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentPlayers, setCurrentPlayers] = useState(2);
  const [rankMinIdx, setRankMinIdx] = useState(0);
  const [rankMaxIdx, setRankMaxIdx] = useState(0);
  const [rrPenalty, setRrPenalty] = useState(false);
  const [matchRegion, setMatchRegion] = useState<Region>(profile?.region ?? 'eu');
  const [matchPlatform, setMatchPlatform] = useState<Platform | null>(profile?.platform ?? null);
  const [discordLink, setDiscordLink] = useState('');
  const [notes, setNotes] = useState('');
  const [showRankMinPicker, setShowRankMinPicker] = useState(false);
  const [showRankMaxPicker, setShowRankMaxPicker] = useState(false);

  const HEADER_H = 60;

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('game', selectedGame)
        .in('status', ['open', 'full'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatches((data as Match[]) ?? []);
    } catch (err) {
      if (__DEV__) console.error('[Scrims] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGame]);

  useEffect(() => {
    setLoading(true);
    fetchMatches();
  }, [fetchMatches]);

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
    if (__DEV__) console.log('[Scrims] Match tapped:', match.id);
    // TODO: navigate to match detail
  };

  // Reset create modal state
  const openCreateModal = () => {
    setCurrentPlayers(2);
    // Default rank range: skip unranked (index 0), start at Iron 1 (index 1)
    const defaultIdx = ranks.length > 1 ? 1 : 0;
    setRankMinIdx(defaultIdx);
    setRankMaxIdx(defaultIdx);
    setRrPenalty(false);
    setMatchRegion(profile?.region ?? 'eu');
    setMatchPlatform(profile?.platform ?? null);
    setDiscordLink('');
    setNotes('');
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!user || !profile) return;
    if (rankMinIdx > rankMaxIdx) {
      Alert.alert('Invalid rank range', 'Min rank must be lower or equal to max rank.');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        game: selectedGame,
        creator_id: user.id,
        region: matchRegion,
        rank_min: ranks[rankMinIdx].id,
        rank_max: ranks[rankMaxIdx].id,
        rr_penalty: rrPenalty,
        current_players: currentPlayers,
        max_players: 5,
        status: 'open' as const,
        discord_link: discordLink.trim() || null,
        notes: notes.trim() || null,
        platform: isMultiplatform ? matchPlatform : null,
      };

      const { data, error } = await supabase
        .from('matches')
        .insert(payload as never)
        .select()
        .single();

      if (error) throw error;

      const matchId = (data as { id: string }).id;

      // Auto-add creator as member
      const { error: memberError } = await supabase
        .from('match_members')
        .insert({ match_id: matchId, user_id: user.id, is_ready: false } as never);

      if (memberError) console.error('[Scrims] Member insert error:', memberError);

      setShowCreateModal(false);
      fetchMatches();
      if (__DEV__) console.log('[Scrims] Match created:', matchId);
    } catch (err) {
      console.error('[Scrims] Create error:', err);
      Alert.alert('Error', 'Failed to create match.');
    } finally {
      setCreating(false);
    }
  };

  const cardStyle = {
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    borderWidth: 0.5 as const,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  };

  // Rank selectors for create modal — exclude unranked
  const selectableRanks = ranks.filter((r) => r.id !== 'unranked');

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
          Scrims
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

      {/* Segment Control */}
      <View
        style={[
          styles.segmentContainer,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.value)}
              style={[
                styles.segmentTab,
                {
                  backgroundColor: isActive
                    ? isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF'
                    : 'transparent',
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isActive ? c.textPrimary : c.textTertiary,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {activeTab === 'open' ? (
        loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={game.accent} />
          </View>
        ) : matches.length === 0 ? (
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
            data={matches}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MatchCard match={item} onPress={handleMatchPress} />
            )}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={game.accent}
              />
            }
          />
        )
      ) : (
        <View style={styles.centered}>
          <View
            style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
          >
            <Ionicons name="clipboard-outline" size={28} color={c.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>
            No scrims yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: c.textTertiary }]}>
            Your upcoming and past scrims{'\n'}will appear here.
          </Text>
        </View>
      )}

      {/* FAB — Create match */}
      {activeTab === 'open' && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={openCreateModal}
          style={[
            styles.fab,
            {
              backgroundColor: game.accent,
              bottom: 24 + insets.bottom,
            },
          ]}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

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

      {/* ── Create Match Modal ─────────────────────────── */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity
            style={{ height: 60 + insets.top }}
            onPress={() => setShowCreateModal(false)}
            activeOpacity={1}
          />
          <View
            style={{
              flex: 1,
              backgroundColor: c.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 16,
                borderBottomWidth: 0.5,
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.3 }}>
                Create Match
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 + insets.bottom }}
              showsVerticalScrollIndicator={false}
            >
              {/* Players in group */}
              <Text style={[styles.label, { color: c.textTertiary }]}>Players in your group</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                {[2, 3, 4].map((n) => {
                  const isActive = currentPlayers === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      activeOpacity={0.7}
                      onPress={() => setCurrentPlayers(n)}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                        borderWidth: isActive ? 2 : 1,
                        borderColor: isActive
                          ? game.accent
                          : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        backgroundColor: isActive
                          ? `${game.accent}15`
                          : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '700',
                          color: isActive ? game.accent : c.textPrimary,
                        }}
                      >
                        {n}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '500',
                          color: isActive ? game.accent : c.textTertiary,
                          marginTop: 2,
                        }}
                      >
                        {5 - n} spot{5 - n > 1 ? 's' : ''} left
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Rank Range */}
              <Text style={[styles.label, { color: c.textTertiary }]}>Rank range</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                {/* Min rank */}
                <TouchableOpacity
                  style={[styles.rankPickerBtn, cardStyle]}
                  activeOpacity={0.7}
                  onPress={() => setShowRankMinPicker(true)}
                >
                  <Text style={{ fontSize: 10, fontWeight: '600', color: c.textTertiary, marginBottom: 4 }}>MIN</Text>
                  {selectableRanks[rankMinIdx] && (
                    <Image
                      source={{ uri: rankUrl(selectableRanks[rankMinIdx].image) }}
                      style={{ width: 32, height: 32 }}
                      contentFit="contain"
                    />
                  )}
                  <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: c.textSecondary, marginTop: 4 }}>
                    {selectableRanks[rankMinIdx]?.name ?? '—'}
                  </Text>
                </TouchableOpacity>

                <View style={{ justifyContent: 'center' }}>
                  <Ionicons name="arrow-forward" size={16} color={c.textTertiary} />
                </View>

                {/* Max rank */}
                <TouchableOpacity
                  style={[styles.rankPickerBtn, cardStyle]}
                  activeOpacity={0.7}
                  onPress={() => setShowRankMaxPicker(true)}
                >
                  <Text style={{ fontSize: 10, fontWeight: '600', color: c.textTertiary, marginBottom: 4 }}>MAX</Text>
                  {selectableRanks[rankMaxIdx] && (
                    <Image
                      source={{ uri: rankUrl(selectableRanks[rankMaxIdx].image) }}
                      style={{ width: 32, height: 32 }}
                      contentFit="contain"
                    />
                  )}
                  <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: c.textSecondary, marginTop: 4 }}>
                    {selectableRanks[rankMaxIdx]?.name ?? '—'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* RR Penalty toggle */}
              <View
                style={[
                  styles.toggleRow,
                  cardStyle,
                  { marginBottom: 16 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: c.textPrimary }}>
                    Accept -25% RR
                  </Text>
                  <Text style={{ fontSize: 11, color: c.textTertiary, marginTop: 2 }}>
                    Allow players outside rank range
                  </Text>
                </View>
                <Switch
                  value={rrPenalty}
                  onValueChange={setRrPenalty}
                  trackColor={{ false: isDark ? '#333' : '#DDD', true: `${game.accent}80` }}
                  thumbColor={rrPenalty ? game.accent : isDark ? '#666' : '#FFF'}
                />
              </View>

              {/* Region */}
              <Text style={[styles.label, { color: c.textTertiary }]}>Region</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {REGIONS.map((r) => {
                  const isActive = matchRegion === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      activeOpacity={0.7}
                      onPress={() => setMatchRegion(r.value)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: isActive ? 2 : 1,
                        borderColor: isActive
                          ? game.accent
                          : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        backgroundColor: isActive
                          ? `${game.accent}15`
                          : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: isActive ? game.accent : c.textSecondary,
                        }}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Platform (multiplatform games only) */}
              {isMultiplatform && (
                <>
                  <Text style={[styles.label, { color: c.textTertiary }]}>Platform</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                    {([
                      { value: 'pc' as Platform, label: 'PC', icon: 'desktop-outline' as const },
                      { value: 'console' as Platform, label: 'Console', icon: 'game-controller-outline' as const },
                    ]).map((p) => {
                      const isActive = matchPlatform === p.value;
                      return (
                        <TouchableOpacity
                          key={p.value}
                          activeOpacity={0.7}
                          onPress={() => setMatchPlatform(p.value)}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: isActive ? 2 : 1,
                            borderColor: isActive
                              ? game.accent
                              : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            backgroundColor: isActive
                              ? `${game.accent}15`
                              : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                          }}
                        >
                          <Ionicons name={p.icon} size={16} color={isActive ? game.accent : c.textSecondary} />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? game.accent : c.textSecondary }}>
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Discord link */}
              <Text style={[styles.label, { color: c.textTertiary }]}>Discord link (optional)</Text>
              <TextInput
                value={discordLink}
                onChangeText={setDiscordLink}
                placeholder="discord.gg/..."
                placeholderTextColor={c.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.textInput,
                  cardStyle,
                  { color: c.textPrimary, marginBottom: 16 },
                ]}
              />

              {/* Notes */}
              <Text style={[styles.label, { color: c.textTertiary }]}>Notes (optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Looking for a duelist main..."
                placeholderTextColor={c.textTertiary}
                multiline
                numberOfLines={3}
                style={[
                  styles.textInput,
                  cardStyle,
                  { color: c.textPrimary, height: 80, textAlignVertical: 'top', marginBottom: 28 },
                ]}
              />

              {/* Create button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCreate}
                disabled={creating}
                style={[
                  styles.createButton,
                  { backgroundColor: game.accent, opacity: creating ? 0.6 : 1 },
                ]}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>
                    Create Match
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Rank Min Picker (simple scroll modal) ──── */}
      <Modal visible={showRankMinPicker} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowRankMinPicker(false)} activeOpacity={1} />
          <View
            style={{
              maxHeight: '60%',
              backgroundColor: c.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 20,
              paddingBottom: insets.bottom + 20,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.textPrimary, paddingHorizontal: 20, marginBottom: 12 }}>
              Min Rank
            </Text>
            <FlatList
              data={selectableRanks}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => {
                const isActive = index === rankMinIdx;
                return (
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => {
                      setRankMinIdx(index);
                      if (index > rankMaxIdx) setRankMaxIdx(index);
                      setShowRankMinPicker(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      backgroundColor: isActive ? `${game.accent}12` : 'transparent',
                    }}
                  >
                    <Image
                      source={{ uri: rankUrl(item.image) }}
                      style={{ width: 28, height: 28 }}
                      contentFit="contain"
                    />
                    <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600', color: isActive ? game.accent : c.textPrimary }}>
                      {item.name}
                    </Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={game.accent} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Rank Max Picker ──── */}
      <Modal visible={showRankMaxPicker} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowRankMaxPicker(false)} activeOpacity={1} />
          <View
            style={{
              maxHeight: '60%',
              backgroundColor: c.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 20,
              paddingBottom: insets.bottom + 20,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.textPrimary, paddingHorizontal: 20, marginBottom: 12 }}>
              Max Rank
            </Text>
            <FlatList
              data={selectableRanks}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => {
                const isActive = index === rankMaxIdx;
                const isDisabled = index < rankMinIdx;
                return (
                  <TouchableOpacity
                    activeOpacity={isDisabled ? 1 : 0.6}
                    disabled={isDisabled}
                    onPress={() => {
                      setRankMaxIdx(index);
                      setShowRankMaxPicker(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      opacity: isDisabled ? 0.3 : 1,
                      backgroundColor: isActive ? `${game.accent}12` : 'transparent',
                    }}
                  >
                    <Image
                      source={{ uri: rankUrl(item.image) }}
                      style={{ width: 28, height: 28 }}
                      contentFit="contain"
                    />
                    <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600', color: isActive ? game.accent : c.textPrimary }}>
                      {item.name}
                    </Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={game.accent} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
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
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
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
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 10,
  },
  rankPickerBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    fontSize: 14,
  },
  createButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
