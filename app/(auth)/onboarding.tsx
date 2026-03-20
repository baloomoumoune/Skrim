import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useBaseColors } from '@/hooks/useThemeColors';
import { Region, GameEnum, Platform, Profile } from '@/types/database';
import { GAME_MULTIPLATFORM } from '@/lib/constants';
import {
  getAssetUrl,
  getDisabledRankIds,
  VALORANT_RANKS,
  VALORANT_AGENTS,
} from '@/lib/game-assets';
import type { RankMeta, AgentMeta } from '@/lib/game-assets';
import LoadingScreen from '@/components/LoadingScreen';

const REGIONS: { value: Region; label: string; flag: string }[] = [
  { value: 'eu', label: 'EU', flag: '🇪🇺' },
  { value: 'na', label: 'NA', flag: '🇺🇸' },
  { value: 'apac', label: 'APAC', flag: '🌏' },
  { value: 'sa', label: 'SA', flag: '🇧🇷' },
  { value: 'me', label: 'ME', flag: '🇸🇦' },
  { value: 'oce', label: 'OCE', flag: '🇦🇺' },
];

const GAMES: { value: GameEnum; label: string; color: string }[] = [
  { value: 'valorant', label: 'VALORANT', color: '#FF4655' },
  { value: 'cs2', label: 'CS2', color: '#DE9B35' },
];

// Assets per game (CS2 empty for now)
const RANKS_BY_GAME: Record<string, RankMeta[]> = {
  valorant: VALORANT_RANKS,
};

const AGENTS_BY_GAME: Record<string, AgentMeta[]> = {
  valorant: VALORANT_AGENTS,
};

const ROLE_LABELS: Record<string, string> = {
  duelist: 'Duelists',
  initiator: 'Initiators',
  controller: 'Controllers',
  sentinel: 'Sentinels',
};

/** Renders a 3-column rank grid with Radiant centered on its own row */
function RankGrid({
  label,
  ranks,
  selectedId,
  onSelect,
  cellWidth,
  gap,
  gameColor,
  game,
  isDark,
  textTertiary,
  disabledIds = [],
}: {
  label: string;
  ranks: RankMeta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  cellWidth: number;
  gap: number;
  gameColor: string;
  game: string;
  isDark: boolean;
  textTertiary: string;
  disabledIds?: string[];
}) {
  const unranked = ranks.find((r) => r.id === 'unranked') ?? null;
  const radiant = ranks.find((r) => r.id === 'radiant') ?? null;
  const tiered = ranks.filter((r) => r.id !== 'unranked' && r.id !== 'radiant');

  const renderSingleItem = (r: RankMeta) => {
    const isActive = selectedId === r.id;
    const isDisabled = disabledIds.includes(r.id);
    return (
      <View key={r.id} style={{ alignItems: 'center', marginVertical: gap / 2, opacity: isDisabled ? 0.3 : 1 }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onSelect(r.id)}
          disabled={isDisabled}
          style={{
            width: cellWidth,
            alignItems: 'center',
            paddingVertical: 8,
            borderRadius: 14,
            borderWidth: isActive ? 1.5 : 1,
            borderColor: isActive
              ? gameColor
              : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            backgroundColor: isActive
              ? `${gameColor}15`
              : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          }}
        >
          <Image
            source={{ uri: getAssetUrl(game, 'ranks', r.image) }}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
          <Text
            numberOfLines={1}
            style={{
              fontSize: 10,
              fontWeight: '600',
              marginTop: 3,
              color: isActive ? gameColor : textTertiary,
            }}
          >
            {r.name}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <Text
        className="text-[11px] font-bold uppercase tracking-[3px] mb-3 mt-8"
        style={{ color: textTertiary }}
      >
        {label}
      </Text>

      {/* Unranked — centered alone */}
      {unranked && renderSingleItem(unranked)}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {tiered.map((r) => {
          const isActive = selectedId === r.id;
          const isDisabled = disabledIds.includes(r.id);
          return (
            <TouchableOpacity
              key={r.id}
              activeOpacity={0.7}
              onPress={() => onSelect(r.id)}
              disabled={isDisabled}
              style={{
                width: cellWidth,
                alignItems: 'center',
                paddingVertical: 8,
                borderRadius: 14,
                opacity: isDisabled ? 0.3 : 1,
                borderWidth: isActive ? 1.5 : 1,
                borderColor: isActive
                  ? gameColor
                  : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                backgroundColor: isActive
                  ? `${gameColor}15`
                  : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <Image
                source={{ uri: getAssetUrl(game, 'ranks', r.image) }}
                style={{ width: 36, height: 36 }}
                resizeMode="contain"
              />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  marginTop: 3,
                  color: isActive ? gameColor : textTertiary,
                }}
              >
                {r.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Radiant — centered alone */}
      {radiant && renderSingleItem(radiant)}
    </>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, setProfile, signOut } = useAuthStore();
  const setSelectedGame = useGameStore((s) => s.setSelectedGame);

  const [username, setUsername] = useState('');
  const [region, setRegion] = useState<Region>('eu');
  const [game, setGame] = useState<GameEnum>('valorant');
  const [currentRank, setCurrentRank] = useState<string | null>(null);
  const [peakRank, setPeakRank] = useState<string | null>(null);
  const [mainAgent, setMainAgent] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedProfileRef = useRef<Profile | null>(null);

  const selectedGameColor = GAMES.find((g) => g.value === game)?.color ?? c.accent;
  const gameRanks = RANKS_BY_GAME[game] ?? [];
  const gameAgents = AGENTS_BY_GAME[game] ?? [];
  const hasGameAssets = gameRanks.length > 0;
  const isMultiplatform = GAME_MULTIPLATFORM[game] ?? false;

  // Group agents by role
  const agentGroups: { role: string; agents: AgentMeta[] }[] = [];
  if (gameAgents.length > 0) {
    const roleMap = new Map<string, AgentMeta[]>();
    for (const agent of gameAgents) {
      if (!roleMap.has(agent.role)) roleMap.set(agent.role, []);
      roleMap.get(agent.role)!.push(agent);
    }
    for (const [role, roleAgents] of roleMap) {
      agentGroups.push({ role, agents: roleAgents });
    }
  }

  // Ranks above peak rank are disabled for current rank selection
  const currentRankDisabledIds = peakRank === null
    ? gameRanks.map((r) => r.id)
    : getDisabledRankIds(peakRank, gameRanks);

  const handlePeakRankSelect = (id: string) => {
    setPeakRank(id);
    if (id === 'unranked') {
      setCurrentRank('unranked');
    } else if (currentRank && currentRank !== 'unranked') {
      const currentIdx = gameRanks.findIndex((r) => r.id === currentRank);
      const peakIdx = gameRanks.findIndex((r) => r.id === id);
      if (currentIdx > peakIdx) {
        setCurrentRank(null);
      }
    }
  };

  const canContinue =
    username.trim().length >= 3 &&
    (!hasGameAssets || (currentRank !== null && peakRank !== null && mainAgent !== null)) &&
    (!isMultiplatform || platform !== null);

  const handleGameChange = (newGame: GameEnum) => {
    setGame(newGame);
    // Reset selections when game changes since assets differ
    setCurrentRank(null);
    setPeakRank(null);
    setMainAgent(null);
    setPlatform(GAME_MULTIPLATFORM[newGame] ? null : null);
  };

  const onLoadingFinish = () => {
    if (savedProfileRef.current) {
      setProfile(savedProfileRef.current);
    }
  };

  const handleSave = async () => {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters.');
      return;
    }
    if (hasGameAssets && (!currentRank || !peakRank || !mainAgent)) {
      Alert.alert('Error', 'Please select your rank and main agent.');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const updatePayload: Partial<Profile> = {
        username: trimmed,
        region,
        preferred_game: game,
        timezone,
        current_rank: currentRank,
        peak_rank: peakRank,
        main_agent: mainAgent,
        platform: isMultiplatform ? platform : null,
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updatePayload as never)
        .eq('id', user.id)
        .select()
        .maybeSingle();

      if (__DEV__) console.log('[Onboarding] Update result:', { data, error });
      if (error) throw error;

      if (!data) {
        throw new Error(
          'Profile not found. This can happen if the database trigger failed. Please sign out and sign in again.'
        );
      }

      setSelectedGame(game);
      if (__DEV__) console.log('[Onboarding] Profile saved, showing loading...');

      setSaved(true);
      savedProfileRef.current = data;
    } catch (err) {
      console.error('[Onboarding] Save error:', err);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
      setSaving(false);
    }
  };

  if (saved) {
    return <LoadingScreen onFinish={onLoadingFinish} minDuration={1500} />;
  }

  // 3 columns with 8px gap, within 24px horizontal padding
  const CONTENT_WIDTH = Dimensions.get('window').width - 48;
  const COL_GAP = 8;
  const CELL_W = (CONTENT_WIDTH - COL_GAP * 2) / 3;

  return (
    <View className="flex-1" style={{ backgroundColor: c.background, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <View className="flex-row items-center gap-2 mb-6">
          <View className="h-1 flex-1 rounded-full" style={{ backgroundColor: selectedGameColor }} />
          <View
            className="h-1 flex-1 rounded-full"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
          />
        </View>

        <Text
          className="text-3xl font-bold tracking-tight mb-2"
          style={{ color: c.textPrimary }}
        >
          Your profile
        </Text>
        <Text className="text-[15px] mb-10" style={{ color: c.textSecondary }}>
          Set up your identity on SCRIM.
        </Text>

        {/* Username */}
        <Text
          className="text-[11px] font-bold uppercase tracking-[3px] mb-3"
          style={{ color: c.textTertiary }}
        >
          Username
        </Text>
        <TextInput
          className="rounded-xl h-14 px-4 text-[16px]"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            borderWidth: 1,
            borderColor: username.length > 0
              ? (username.length >= 3 ? selectedGameColor : '#FF4655')
              : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
            color: c.textPrimary,
          }}
          placeholder="Choose a username"
          placeholderTextColor={c.textTertiary}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={24}
        />
        {username.length > 0 && username.length < 3 && (
          <Text className="text-xs mt-1.5" style={{ color: '#FF4655' }}>
            Minimum 3 characters
          </Text>
        )}

        {/* Region */}
        <Text
          className="text-[11px] font-bold uppercase tracking-[3px] mb-3 mt-8"
          style={{ color: c.textTertiary }}
        >
          Region
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {REGIONS.map((r) => {
            const isActive = region === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                className="flex-row items-center gap-2 px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: isActive
                    ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')
                    : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                  borderWidth: 1,
                  borderColor: isActive
                    ? c.accent
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                }}
                onPress={() => setRegion(r.value)}
                activeOpacity={0.7}
              >
                <Text className="text-sm">{r.flag}</Text>
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: isActive ? c.textPrimary : c.textSecondary }}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Game */}
        <Text
          className="text-[11px] font-bold uppercase tracking-[3px] mb-3 mt-8"
          style={{ color: c.textTertiary }}
        >
          Main Game
        </Text>
        <View className="flex-row gap-3">
          {GAMES.map((g) => {
            const isActive = game === g.value;
            return (
              <TouchableOpacity
                key={g.value}
                className="flex-1 items-center py-4 rounded-xl"
                style={{
                  backgroundColor: isActive
                    ? `${g.color}15`
                    : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                  borderWidth: 1.5,
                  borderColor: isActive ? g.color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                }}
                onPress={() => handleGameChange(g.value)}
                activeOpacity={0.7}
              >
                <Text
                  className="text-[15px] font-bold tracking-wide"
                  style={{ color: isActive ? g.color : c.textSecondary }}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Platform (only for multiplatform games) */}
        {isMultiplatform && (
          <>
            <Text
              className="text-[11px] font-bold uppercase tracking-[3px] mb-3 mt-8"
              style={{ color: c.textTertiary }}
            >
              Platform
            </Text>
            <View className="flex-row gap-3">
              {([
                { value: 'pc' as Platform, label: 'PC', icon: 'desktop-outline' as const },
                { value: 'console' as Platform, label: 'Console', icon: 'game-controller-outline' as const },
              ]).map((p) => {
                const isActive = platform === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    className="flex-1 flex-row items-center justify-center gap-2 py-4 rounded-xl"
                    style={{
                      backgroundColor: isActive
                        ? `${selectedGameColor}15`
                        : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                      borderWidth: 1.5,
                      borderColor: isActive
                        ? selectedGameColor
                        : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                    }}
                    onPress={() => setPlatform(p.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={p.icon}
                      size={18}
                      color={isActive ? selectedGameColor : c.textSecondary}
                    />
                    <Text
                      className="text-[15px] font-bold tracking-wide"
                      style={{ color: isActive ? selectedGameColor : c.textSecondary }}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Ranks & Agent */}
        {hasGameAssets && (
          <>
            {/* Peak Rank (must be selected first) */}
            <RankGrid
              label="Peak Rank"
              ranks={gameRanks}
              selectedId={peakRank}
              onSelect={handlePeakRankSelect}
              cellWidth={CELL_W}
              gap={COL_GAP}
              gameColor={selectedGameColor}
              game={game}
              isDark={isDark}
              textTertiary={c.textTertiary}
            />

            {/* Current Rank (disabled ranks above peak) */}
            <RankGrid
              label="Current Rank"
              ranks={gameRanks}
              selectedId={currentRank}
              onSelect={setCurrentRank}
              cellWidth={CELL_W}
              gap={COL_GAP}
              gameColor={selectedGameColor}
              game={game}
              isDark={isDark}
              textTertiary={c.textTertiary}
              disabledIds={currentRankDisabledIds}
            />

            {/* Main Agent */}
            <Text
              className="text-[11px] font-bold uppercase tracking-[3px] mb-3 mt-8"
              style={{ color: c.textTertiary }}
            >
              Main Agent
            </Text>
            {agentGroups.map((group) => (
              <View key={group.role} className="mb-4">
                <Text
                  className="text-[10px] font-semibold uppercase tracking-[2px] mb-2"
                  style={{ color: c.textTertiary }}
                >
                  {ROLE_LABELS[group.role] ?? group.role}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: COL_GAP }}>
                  {group.agents.map((a) => {
                    const isActive = mainAgent === a.id;
                    return (
                      <TouchableOpacity
                        key={a.id}
                        activeOpacity={0.7}
                        onPress={() => setMainAgent(a.id)}
                        style={{
                          width: CELL_W,
                          alignItems: 'center',
                          paddingVertical: 8,
                          borderRadius: 14,
                          borderWidth: isActive ? 1.5 : 1,
                          borderColor: isActive
                            ? selectedGameColor
                            : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                          backgroundColor: isActive
                            ? `${selectedGameColor}15`
                            : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                        }}
                      >
                        <Image
                          source={{ uri: getAssetUrl(game, 'agents', a.image, a.role) }}
                          style={{ width: CELL_W * 0.6, height: CELL_W * 0.6 }}
                          resizeMode="contain"
                        />
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            marginTop: 4,
                            color: isActive ? selectedGameColor : c.textTertiary,
                          }}
                        >
                          {a.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Continue */}
        <TouchableOpacity
          className={`mt-12 h-14 rounded-2xl items-center justify-center ${saving || !canContinue ? 'opacity-50' : ''}`}
          style={{ backgroundColor: selectedGameColor }}
          onPress={handleSave}
          disabled={saving || !canContinue}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text className="text-[15px] font-bold tracking-wide" style={{ color: '#FFFFFF' }}>
              Continue
            </Text>
          )}
        </TouchableOpacity>

        {/* Sign out escape */}
        <TouchableOpacity
          className="mt-5 items-center py-2"
          onPress={() => signOut()}
          activeOpacity={0.6}
        >
          <Text className="text-[13px]" style={{ color: c.textTertiary }}>
            Sign out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
