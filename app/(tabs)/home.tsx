import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/authStore';
import { GAME_ACCENTS, GAME_MULTIPLATFORM, GameId } from '@/lib/constants';
import { getGameLogoUrl } from '@/lib/game-assets';
import { supabase } from '@/lib/supabase';
import type { Region } from '@/types/database';
import MatchCard, { type MatchWithCreator } from '@/components/MatchCard';
import CreateMatchModal from '@/components/CreateMatchModal';

const ALL_GAMES = Object.values(GAME_ACCENTS);
const REGIONS: Region[] = ['eu', 'na', 'apac', 'sa', 'me', 'oce'];
const REGION_LABELS: Record<Region, string> = {
  eu: 'EU',
  na: 'NA',
  apac: 'APAC',
  sa: 'SA',
  me: 'ME',
  oce: 'OCE',
};

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
  const [matches, setMatches] = useState<MatchWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region>(
    profile?.region ?? 'eu'
  );

  const HEADER_H = 56;

  // Fetch matches with creator profile joined
  const fetchMatches = useCallback(async () => {
    if (!profile) return;
    try {
      let query = supabase
        .from('matches')
        .select('*, creator:profiles!matches_creator_id_fkey(*)')
        .eq('game', selectedGame)
        .eq('region', selectedRegion)
        .in('status', ['open', 'full'])
        .order('created_at', { ascending: false });

      if (GAME_MULTIPLATFORM[selectedGame] && profile.platform) {
        query = query.eq('platform', profile.platform);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMatches((data as unknown as MatchWithCreator[]) ?? []);
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

  // Client-side filter: hide expired matches
  const filteredMatches = useMemo(() => {
    const now = Date.now();
    return matches.filter((m) => {
      if (m.expires_at) {
        return new Date(m.expires_at).getTime() > now;
      }
      // Legacy fallback: 1h after creation
      return new Date(m.created_at).getTime() + 3600000 > now;
    });
  }, [matches]);

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

  const handleMatchPress = (match: MatchWithCreator) => {
    router.push(`/match/${match.id}`);
  };

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
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
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

      {/* Region chips */}
      <View style={styles.regionRow}>
        {REGIONS.map((region) => {
          const isActive = region === selectedRegion;
          return (
            <TouchableOpacity
              key={region}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedRegion(region);
                setLoading(true);
              }}
              style={[
                styles.regionChip,
                {
                  backgroundColor: isActive
                    ? `${game.accent}18`
                    : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  borderColor: isActive
                    ? game.accent
                    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              <Text
                style={[
                  styles.regionChipText,
                  { color: isActive ? game.accent : c.textSecondary },
                ]}
              >
                {REGION_LABELS[region]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Match list */}
      <View style={styles.listFlex}>
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
            contentContainerStyle={styles.listContent}
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

      {/* Create Match CTA */}
      <View style={[styles.createWrapper, { paddingBottom: insets.bottom > 0 ? 8 : 16 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowCreateModal(true)}
          style={[styles.createBtn, { backgroundColor: game.accent }]}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create Match</Text>
        </TouchableOpacity>
      </View>

      {/* Game Dropdown Overlay */}
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

      {/* Create Match Modal */}
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
    paddingHorizontal: 24,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Region chips
  regionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 12,
  },
  regionChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  regionChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // List
  listFlex: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
  },
  // Create CTA
  createWrapper: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 27,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // Empty state
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
  // Dropdown
  dropdownCard: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: 'hidden',
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
});
