import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';
import { useGameStore } from '@/stores/gameStore';
import { useGameAssets } from '@/hooks/useGameAssets';
import { GAME_ACCENTS } from '@/lib/constants';
import { VALORANT_GAME_MODES, getGameModeById } from '@/lib/game-assets';
import type { ValorantGameModeId } from '@/lib/game-assets';
import type { Region } from '@/types/database';

/** Rank tiers in Valorant order (no Unranked) */
const RANK_TIERS = [
  'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum',
  'Diamond', 'Ascendant', 'Immortal', 'Radiant',
] as const;

export type RankTier = (typeof RANK_TIERS)[number];
export type TimingFilter = 'now' | 'scheduled';

const REGIONS: { id: Region; label: string }[] = [
  { id: 'eu', label: 'EU' },
  { id: 'na', label: 'NA' },
  { id: 'apac', label: 'APAC' },
  { id: 'sa', label: 'SA' },
  { id: 'me', label: 'ME' },
  { id: 'oce', label: 'OCE' },
];

const LASTS_OPTIONS = [1, 2, 3] as const;

interface MatchFiltersProps {
  selectedTiers: RankTier[];
  onTiersChange: (tiers: RankTier[]) => void;
  showRrPenalty: boolean;
  onRrPenaltyChange: (value: boolean) => void;
  selectedMode: ValorantGameModeId | null;
  onModeChange: (mode: ValorantGameModeId | null) => void;
  selectedRegion: Region;
  onRegionChange: (region: Region) => void;
  selectedLasts: number | null;
  onLastsChange: (lasts: number | null) => void;
}

export default function MatchFilters({
  selectedTiers,
  onTiersChange,
  showRrPenalty,
  onRrPenaltyChange,
  selectedMode,
  onModeChange,
  selectedRegion,
  onRegionChange,
  selectedLasts,
  onLastsChange,
}: MatchFiltersProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useColors();
  const game = GAME_ACCENTS[useGameStore((s) => s.selectedGame)];
  const { ranks, rankUrl } = useGameAssets();

  // Dropdown states
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [modeBtnLayout, setModeBtnLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const modeBtnRef = useRef<View>(null);

  const [rankDropdownOpen, setRankDropdownOpen] = useState(false);
  const [rankBtnLayout, setRankBtnLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const rankBtnRef = useRef<View>(null);

  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [regionBtnLayout, setRegionBtnLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const regionBtnRef = useRef<View>(null);

  const [lastsDropdownOpen, setLastsDropdownOpen] = useState(false);
  const [lastsBtnLayout, setLastsBtnLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const lastsBtnRef = useRef<View>(null);

  const isAllTiers = selectedTiers.length === 0;
  const isAllModes = selectedMode === null;
  const isAllLasts = selectedLasts === null;

  // Resolve mode meta for conditional visibility
  const activeModeConfig = selectedMode ? getGameModeById(selectedMode) : null;
  const showRankFilter = !activeModeConfig || activeModeConfig.hasRank;
  const showRrFilter = !activeModeConfig || activeModeConfig.hasRrPenalty;

  const handleTierPress = (tier: RankTier) => {
    if (selectedTiers.includes(tier)) {
      onTiersChange([]);
    } else {
      onTiersChange([tier]);
    }
    setRankDropdownOpen(false);
  };

  const handleAllTiersPress = () => {
    onTiersChange([]);
    setRankDropdownOpen(false);
  };

  const openDropdown = (
    ref: React.RefObject<View | null>,
    setLayout: (l: { x: number; y: number; width: number; height: number }) => void,
    setOpen: (v: boolean) => void,
  ) => {
    ref.current?.measureInWindow((x, y, width, height) => {
      setLayout({ x, y, width, height });
      setOpen(true);
    });
  };

  // Get the first rank image for a tier
  const getTierImage = (tier: string): string | null => {
    const tierLower = tier.toLowerCase();
    const rank = ranks.find(
      (r) => r.id === tierLower || r.id === `${tierLower}_1`
    );
    return rank?.image ?? null;
  };

  // Labels
  const rankButtonLabel = isAllTiers ? 'All ranks' : selectedTiers[0];
  const rankButtonImage = isAllTiers ? null : getTierImage(selectedTiers[0]);

  const modeButtonLabel = isAllModes ? 'All modes' : (activeModeConfig?.label ?? 'All modes');
  const modeButtonIcon = isAllModes ? 'grid-outline' : (activeModeConfig?.icon ?? 'grid-outline');

  const regionLabel = REGIONS.find((r) => r.id === selectedRegion)?.label ?? selectedRegion.toUpperCase();

  const lastsButtonLabel = isAllLasts ? 'All lasts' : `${selectedLasts} last${selectedLasts! > 1 ? 's' : ''}`;

  // Shared dropdown btn style helper
  const btnStyle = (isActive: boolean) => [
    styles.dropdownBtn,
    {
      backgroundColor: isActive
        ? `${game.accent}15`
        : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      borderColor: isActive
        ? game.accent
        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Row 1: Mode, Region, Lasts */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        bounces={false}
      >
        {/* Mode */}
        <View ref={modeBtnRef} collapsable={false}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => openDropdown(modeBtnRef, setModeBtnLayout, setModeDropdownOpen)}
            style={btnStyle(!isAllModes)}
          >
            <Ionicons
              name={modeButtonIcon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={isAllModes ? c.textTertiary : game.accent}
            />
            <Text style={[styles.btnText, { color: isAllModes ? c.textSecondary : game.accent }]}>
              {modeButtonLabel}
            </Text>
            <Ionicons name="chevron-down" size={12} color={isAllModes ? c.textTertiary : game.accent} />
          </TouchableOpacity>
        </View>

        {/* Region */}
        <View ref={regionBtnRef} collapsable={false}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => openDropdown(regionBtnRef, setRegionBtnLayout, setRegionDropdownOpen)}
            style={btnStyle(true)}
          >
            <Ionicons name="globe-outline" size={14} color={game.accent} />
            <Text style={[styles.btnText, { color: game.accent }]}>{regionLabel}</Text>
            <Ionicons name="chevron-down" size={12} color={game.accent} />
          </TouchableOpacity>
        </View>

        {/* Lasts */}
        <View ref={lastsBtnRef} collapsable={false}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => openDropdown(lastsBtnRef, setLastsBtnLayout, setLastsDropdownOpen)}
            style={btnStyle(!isAllLasts)}
          >
            <Ionicons
              name="people-outline"
              size={14}
              color={isAllLasts ? c.textTertiary : game.accent}
            />
            <Text style={[styles.btnText, { color: isAllLasts ? c.textSecondary : game.accent }]}>
              {lastsButtonLabel}
            </Text>
            <Ionicons name="chevron-down" size={12} color={isAllLasts ? c.textTertiary : game.accent} />
          </TouchableOpacity>
        </View>

        {/* RR penalty chip */}
        {showRrFilter && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onRrPenaltyChange(!showRrPenalty)}
            style={[
              styles.chip,
              showRrPenalty
                ? { backgroundColor: `${game.accent}18`, borderColor: game.accent }
                : {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  },
            ]}
          >
            <Text
              style={[styles.chipText, { color: showRrPenalty ? game.accent : c.textSecondary }]}
            >
              -25% RR
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Row 2: Rank (conditional on mode) */}
      {showRankFilter && (
        <View style={styles.row2}>
          <View ref={rankBtnRef} collapsable={false}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => openDropdown(rankBtnRef, setRankBtnLayout, setRankDropdownOpen)}
              style={btnStyle(!isAllTiers)}
            >
              {rankButtonImage && (
                <Image
                  source={{ uri: rankUrl(rankButtonImage) }}
                  style={styles.btnIcon}
                  contentFit="contain"
                />
              )}
              <Text style={[styles.btnText, { color: isAllTiers ? c.textSecondary : game.accent }]}>
                {rankButtonLabel}
              </Text>
              <Ionicons name="chevron-down" size={12} color={isAllTiers ? c.textTertiary : game.accent} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Mode dropdown ─── */}
      <Modal
        visible={modeDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModeDropdownOpen(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setModeDropdownOpen(false)}>
          <View style={StyleSheet.absoluteFill} />
        </Pressable>
        <View
          style={[
            styles.dropdown,
            {
              top: modeBtnLayout.y + modeBtnLayout.height + 6,
              left: 16,
              right: 16,
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false} bounces={false} nestedScrollEnabled>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => { onModeChange(null); setModeDropdownOpen(false); }}
              style={[styles.dropdownItem, {
                backgroundColor: isAllModes ? `${game.accent}12` : 'transparent',
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              }]}
            >
              <View style={styles.dropdownItemLeft}>
                <Ionicons name="grid-outline" size={18} color={isAllModes ? game.accent : c.textTertiary} />
                <Text style={[styles.dropdownItemText, { color: isAllModes ? game.accent : c.textPrimary }]}>All modes</Text>
              </View>
              {isAllModes && <Ionicons name="checkmark" size={18} color={game.accent} />}
            </TouchableOpacity>

            {VALORANT_GAME_MODES.map((mode, index) => {
              const isActive = selectedMode === mode.id;
              const isLast = index === VALORANT_GAME_MODES.length - 1;
              return (
                <TouchableOpacity
                  key={mode.id}
                  activeOpacity={0.6}
                  onPress={() => { onModeChange(mode.id); setModeDropdownOpen(false); }}
                  style={[styles.dropdownItem, {
                    backgroundColor: isActive ? `${game.accent}12` : 'transparent',
                    borderBottomColor: isLast ? 'transparent' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }]}
                >
                  <View style={styles.dropdownItemLeft}>
                    <Ionicons name={mode.icon as keyof typeof Ionicons.glyphMap} size={18} color={isActive ? game.accent : c.textTertiary} />
                    <View>
                      <Text style={[styles.dropdownItemText, { color: isActive ? game.accent : c.textPrimary }]}>{mode.label}</Text>
                      <Text style={[styles.dropdownItemDesc, { color: isActive ? game.accent : c.textTertiary }]}>{mode.description}</Text>
                    </View>
                  </View>
                  {isActive && <Ionicons name="checkmark" size={18} color={game.accent} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Region dropdown ─── */}
      <Modal
        visible={regionDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRegionDropdownOpen(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setRegionDropdownOpen(false)}>
          <View style={StyleSheet.absoluteFill} />
        </Pressable>
        <View
          style={[
            styles.dropdown,
            {
              top: regionBtnLayout.y + regionBtnLayout.height + 6,
              left: regionBtnLayout.x,
              minWidth: 160,
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false} bounces={false} nestedScrollEnabled>
            {REGIONS.map((region, index) => {
              const isActive = selectedRegion === region.id;
              const isLast = index === REGIONS.length - 1;
              return (
                <TouchableOpacity
                  key={region.id}
                  activeOpacity={0.6}
                  onPress={() => { onRegionChange(region.id); setRegionDropdownOpen(false); }}
                  style={[styles.dropdownItem, {
                    backgroundColor: isActive ? `${game.accent}12` : 'transparent',
                    borderBottomColor: isLast ? 'transparent' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }]}
                >
                  <View style={styles.dropdownItemLeft}>
                    <Ionicons name="globe-outline" size={18} color={isActive ? game.accent : c.textTertiary} />
                    <Text style={[styles.dropdownItemText, { color: isActive ? game.accent : c.textPrimary }]}>{region.label}</Text>
                  </View>
                  {isActive && <Ionicons name="checkmark" size={18} color={game.accent} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Lasts dropdown ─── */}
      <Modal
        visible={lastsDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLastsDropdownOpen(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setLastsDropdownOpen(false)}>
          <View style={StyleSheet.absoluteFill} />
        </Pressable>
        <View
          style={[
            styles.dropdown,
            {
              top: lastsBtnLayout.y + lastsBtnLayout.height + 6,
              left: lastsBtnLayout.x,
              minWidth: 160,
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false} bounces={false} nestedScrollEnabled>
            {/* All lasts */}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => { onLastsChange(null); setLastsDropdownOpen(false); }}
              style={[styles.dropdownItem, {
                backgroundColor: isAllLasts ? `${game.accent}12` : 'transparent',
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              }]}
            >
              <View style={styles.dropdownItemLeft}>
                <Ionicons name="people-outline" size={18} color={isAllLasts ? game.accent : c.textTertiary} />
                <Text style={[styles.dropdownItemText, { color: isAllLasts ? game.accent : c.textPrimary }]}>All lasts</Text>
              </View>
              {isAllLasts && <Ionicons name="checkmark" size={18} color={game.accent} />}
            </TouchableOpacity>

            {/* 1, 2, 3 lasts */}
            {LASTS_OPTIONS.map((n, index) => {
              const isActive = selectedLasts === n;
              const isLast = index === LASTS_OPTIONS.length - 1;
              return (
                <TouchableOpacity
                  key={n}
                  activeOpacity={0.6}
                  onPress={() => { onLastsChange(n); setLastsDropdownOpen(false); }}
                  style={[styles.dropdownItem, {
                    backgroundColor: isActive ? `${game.accent}12` : 'transparent',
                    borderBottomColor: isLast ? 'transparent' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }]}
                >
                  <View style={styles.dropdownItemLeft}>
                    <Text style={[styles.lastsNumber, { color: isActive ? game.accent : c.textPrimary }]}>{n}</Text>
                    <Text style={[styles.dropdownItemText, { color: isActive ? game.accent : c.textPrimary }]}>
                      {n} last{n > 1 ? 's' : ''} needed
                    </Text>
                  </View>
                  {isActive && <Ionicons name="checkmark" size={18} color={game.accent} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Rank dropdown ─── */}
      <Modal
        visible={rankDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRankDropdownOpen(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setRankDropdownOpen(false)}>
          <View style={StyleSheet.absoluteFill} />
        </Pressable>
        <View
          style={[
            styles.dropdown,
            {
              top: rankBtnLayout.y + rankBtnLayout.height + 6,
              left: rankBtnLayout.x,
              right: 20,
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false} bounces={false} nestedScrollEnabled>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={handleAllTiersPress}
              style={[styles.dropdownItem, {
                backgroundColor: isAllTiers ? `${game.accent}12` : 'transparent',
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              }]}
            >
              <View style={styles.dropdownItemLeft}>
                <Ionicons name="layers-outline" size={18} color={isAllTiers ? game.accent : c.textTertiary} />
                <Text style={[styles.dropdownItemText, { color: isAllTiers ? game.accent : c.textPrimary }]}>All ranks</Text>
              </View>
              {isAllTiers && <Ionicons name="checkmark" size={18} color={game.accent} />}
            </TouchableOpacity>

            {RANK_TIERS.map((tier, index) => {
              const isActive = selectedTiers.includes(tier);
              const tierImage = getTierImage(tier);
              const isLast = index === RANK_TIERS.length - 1;
              return (
                <TouchableOpacity
                  key={tier}
                  activeOpacity={0.6}
                  onPress={() => handleTierPress(tier)}
                  style={[styles.dropdownItem, {
                    backgroundColor: isActive ? `${game.accent}12` : 'transparent',
                    borderBottomColor: isLast ? 'transparent' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }]}
                >
                  <View style={styles.dropdownItemLeft}>
                    {tierImage ? (
                      <Image source={{ uri: rankUrl(tierImage) }} style={styles.dropdownItemIcon} contentFit="contain" />
                    ) : (
                      <View style={styles.dropdownItemIcon} />
                    )}
                    <Text style={[styles.dropdownItemText, { color: isActive ? game.accent : c.textPrimary }]}>{tier}</Text>
                  </View>
                  {isActive && <Ionicons name="checkmark" size={18} color={game.accent} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export { RANK_TIERS };

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnIcon: {
    width: 18,
    height: 18,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropdown: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  dropdownScroll: {
    maxHeight: 380,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dropdownItemIcon: {
    width: 24,
    height: 24,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownItemDesc: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
  lastsNumber: {
    fontSize: 16,
    fontWeight: '800',
    width: 20,
    textAlign: 'center',
  },
});
