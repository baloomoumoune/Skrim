import { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useBaseColors } from '@/hooks/useThemeColors';
import { Region, GameEnum, Profile } from '@/types/database';
import type { Platform as PlatformType } from '@/types/database';
import { GAME_MULTIPLATFORM } from '@/lib/constants';
import {
  VALORANT_RANKS,
  VALORANT_AGENTS,
} from '@/lib/game-assets';
import type { RankMeta, AgentMeta } from '@/lib/game-assets';

import ProgressBar from '@/components/onboarding/ProgressBar';
import StepProfile from '@/components/onboarding/StepProfile';
import StepGame from '@/components/onboarding/StepGame';
import StepPlatform from '@/components/onboarding/StepPlatform';
import StepRank from '@/components/onboarding/StepRank';
import StepAgent from '@/components/onboarding/StepAgent';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';
import { useUsernameCheck } from '@/components/onboarding/useUsernameCheck';

type StepId = 'profile' | 'game' | 'platform' | 'rank' | 'agent' | 'welcome';

const STEP_META: Record<StepId, { title: string; subtitle: string }> = {
  profile: { title: 'Your profile', subtitle: 'Set up your identity on SCRIM' },
  game: { title: 'Choose your game', subtitle: 'Select the game you play the most' },
  platform: { title: 'Choose your platform', subtitle: 'How do you play?' },
  rank: { title: 'Select your rank', subtitle: 'Tell us about your competitive level' },
  agent: { title: 'Pick your agent', subtitle: 'Choose the character you main' },
  welcome: { title: '', subtitle: '' },
};

const RANKS_BY_GAME: Record<string, RankMeta[]> = {
  valorant: VALORANT_RANKS,
};

const AGENTS_BY_GAME: Record<string, AgentMeta[]> = {
  valorant: VALORANT_AGENTS,
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, setProfile, signOut } = useAuthStore();
  const setSelectedGame = useGameStore((s) => s.setSelectedGame);

  // State
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [username, setUsername] = useState('');
  const [region, setRegion] = useState<Region>('eu');
  const [game, setGame] = useState<GameEnum>('valorant');
  const [platform, setPlatform] = useState<PlatformType | null>(null);
  const [currentRank, setCurrentRank] = useState<string | null>(null);
  const [mainAgent, setMainAgent] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const { status: usernameStatus, checkUsername } = useUsernameCheck();

  // Dynamic steps based on game multiplatform support
  const isMultiplatform = GAME_MULTIPLATFORM[game] ?? false;
  const steps: StepId[] = useMemo(() => {
    const base: StepId[] = ['profile', 'game'];
    if (isMultiplatform) base.push('platform');
    base.push('rank', 'agent', 'welcome');
    return base;
  }, [isMultiplatform]);

  const currentStepId = steps[stepIndex];
  const totalSteps = steps.length;

  // Derived data
  const gameRanks = RANKS_BY_GAME[game] ?? [];
  const gameAgents = AGENTS_BY_GAME[game] ?? [];

  // Username handler
  const handleUsernameChange = useCallback(
    (text: string) => {
      setUsername(text);
      checkUsername(text);
    },
    [checkUsername],
  );

  const handleGameChange = useCallback((newGame: GameEnum) => {
    setGame(newGame);
    setCurrentRank(null);
    setMainAgent(null);
    setPlatform(null);
  }, []);

  // Step validation
  const canContinue = (() => {
    switch (currentStepId) {
      case 'profile':
        return username.trim().length >= 3 && usernameStatus === 'available';
      case 'game':
        return true;
      case 'platform':
        return platform !== null;
      case 'rank':
        return currentRank !== null;
      case 'agent':
        return mainAgent !== null;
      default:
        return false;
    }
  })();

  const isSkippable = currentStepId === 'rank' || currentStepId === 'agent';

  // Navigation
  const goNext = () => {
    if (stepIndex < totalSteps - 1) {
      setDirection('forward');
      setStepIndex(stepIndex + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setDirection('back');
      setStepIndex(stepIndex - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const handleSkip = () => {
    if (currentStepId === 'rank') {
      setCurrentRank(null);
    } else if (currentStepId === 'agent') {
      setMainAgent(null);
    }
    goNext();
  };

  // Save
  const handleSave = async () => {
    const trimmed = username.trim();
    if (trimmed.length < 3 || !user) return;

    setSaving(true);
    try {
      let avatarUrl: string | null = null;

      // Upload avatar if picked
      if (avatarUri) {
        try {
          const ext = avatarUri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
          const filePath = `${user.id}.${ext}`;
          const response = await fetch(avatarUri);
          const blob = await response.blob();
          const arrayBuffer = await new Response(blob).arrayBuffer();

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, arrayBuffer, {
              upsert: true,
              contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            });

          if (uploadError) {
            if (__DEV__) console.error('[Onboarding] Avatar upload error:', uploadError);
          } else {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
          }
        } catch (err) {
          if (__DEV__) console.error('[Onboarding] Avatar upload failed:', err);
        }
      }

      // Upsert profile
      const profilePayload = {
        id: user.id,
        username: trimmed,
        region,
        preferred_game: game,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        current_rank: currentRank,
        main_agent: mainAgent,
        platform: isMultiplatform ? platform : null,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      };

      if (__DEV__) console.log('[Onboarding] Saving profile:', profilePayload);

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select()
        .single();

      if (__DEV__) console.log('[Onboarding] Save result:', { data, error });

      if (error) throw error;

      setSelectedGame(game);
      setProfile(data as unknown as Profile);
    } catch (err: any) {
      console.error('[Onboarding] Save error:', err);
      if (err?.code === '23503') {
        Alert.alert(
          'Session expired',
          'Your account was not found. Please sign in again.',
          [{ text: 'OK', onPress: () => signOut() }],
        );
      } else {
        Alert.alert('Error', 'Failed to save profile. Please try again.');
      }
      setSaving(false);
    }
  };

  // Welcome screen — no header/footer
  if (currentStepId === 'welcome') {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: c.background,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <WelcomeScreen
          username={username}
          avatarUri={avatarUri}
          region={region}
          game={game}
          currentRank={currentRank}
          mainAgent={mainAgent}
          platform={isMultiplatform ? platform : null}
          agents={gameAgents}
          ranks={gameRanks}
          onFinish={handleSave}
          saving={saving}
        />
      </View>
    );
  }

  const meta = STEP_META[currentStepId];

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Fixed header */}
        <View style={styles.headerFixed}>
          <ProgressBar currentStep={stepIndex} totalSteps={totalSteps} />

          <View style={styles.headerRow}>
            {stepIndex > 0 ? (
              <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtn} />
            )}
            <View style={styles.headerCenter}>
              <Text style={[styles.stepIndicator, { color: c.textTertiary }]}>
                Step {stepIndex + 1} of {totalSteps}
              </Text>
            </View>
            <View style={styles.backBtn} />
          </View>

          <AnimatePresence exitBeforeEnter>
            <MotiView
              key={`title-${currentStepId}`}
              from={{ opacity: 0, translateX: direction === 'forward' ? 20 : -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: direction === 'forward' ? -20 : 20 }}
              transition={{ type: 'timing', duration: 250 }}
              style={styles.titleBlock}
            >
              <Text style={[styles.title, { color: c.textPrimary }]}>
                {meta.title}
              </Text>
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                {meta.subtitle}
              </Text>
            </MotiView>
          </AnimatePresence>
        </View>

        {/* Scrollable content */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AnimatePresence exitBeforeEnter>
            {currentStepId === 'profile' && (
              <MotiView
                key="step-profile"
                from={{ opacity: 0, translateX: direction === 'forward' ? 30 : -30 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: direction === 'forward' ? -30 : 30 }}
                transition={{ type: 'timing', duration: 280 }}
              >
                <StepProfile
                  username={username}
                  onUsernameChange={handleUsernameChange}
                  usernameStatus={usernameStatus}
                  region={region}
                  onRegionChange={setRegion}
                  avatarUri={avatarUri}
                  onAvatarPick={setAvatarUri}
                />
              </MotiView>
            )}

            {currentStepId === 'game' && (
              <MotiView
                key="step-game"
                from={{ opacity: 0, translateX: direction === 'forward' ? 30 : -30 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: direction === 'forward' ? -30 : 30 }}
                transition={{ type: 'timing', duration: 280 }}
              >
                <StepGame
                  selectedGame={game}
                  onSelectGame={handleGameChange}
                />
              </MotiView>
            )}

            {currentStepId === 'platform' && (
              <MotiView
                key="step-platform"
                from={{ opacity: 0, translateX: direction === 'forward' ? 30 : -30 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: direction === 'forward' ? -30 : 30 }}
                transition={{ type: 'timing', duration: 280 }}
              >
                <StepPlatform
                  selectedPlatform={platform}
                  onSelectPlatform={setPlatform}
                />
              </MotiView>
            )}

            {currentStepId === 'rank' && (
              <MotiView
                key="step-rank"
                from={{ opacity: 0, translateX: direction === 'forward' ? 30 : -30 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: direction === 'forward' ? -30 : 30 }}
                transition={{ type: 'timing', duration: 280 }}
              >
                <StepRank
                  currentRank={currentRank}
                  onCurrentRankChange={setCurrentRank}
                  game={game}
                  ranks={gameRanks}
                />
              </MotiView>
            )}

            {currentStepId === 'agent' && (
              <MotiView
                key="step-agent"
                from={{ opacity: 0, translateX: direction === 'forward' ? 30 : -30 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: direction === 'forward' ? -30 : 30 }}
                transition={{ type: 'timing', duration: 280 }}
              >
                <StepAgent
                  selectedAgent={mainAgent}
                  onSelectAgent={setMainAgent}
                  game={game}
                  agents={gameAgents}
                />
              </MotiView>
            )}
          </AnimatePresence>
        </ScrollView>

        {/* Fixed bottom */}
        <View
          style={[
            styles.bottomFixed,
            {
              paddingBottom: insets.bottom + 12,
              borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            },
          ]}
        >
          <MotiView
            animate={{ opacity: canContinue ? 1 : 0.4 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: c.accent }]}
              onPress={goNext}
              disabled={!canContinue}
              activeOpacity={0.85}
            >
              <Text style={[styles.continueText, { color: c.background }]}>
                Continue
              </Text>
            </TouchableOpacity>
          </MotiView>

          {isSkippable && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              activeOpacity={0.6}
            >
              <Text style={[styles.skipText, { color: c.textTertiary }]}>
                Skip for now
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const CONTENT_PAD = 24;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerFixed: {
    paddingHorizontal: CONTENT_PAD,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titleBlock: {
    marginTop: 4,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: CONTENT_PAD,
    paddingTop: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  bottomFixed: {
    paddingHorizontal: CONTENT_PAD,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  continueButton: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
