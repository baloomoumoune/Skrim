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
import { VALORANT_RANKS } from '@/lib/game-assets';
import type { RankMeta, AgentMeta, AgentRole } from '@/lib/game-assets';
import { useValorantDataStore } from '@/stores/valorantDataStore';

import ProgressBar from '@/components/onboarding/ProgressBar';
import StepProfile from '@/components/onboarding/StepProfile';
import StepBirthdate from '@/components/onboarding/StepBirthdate';
import StepRegion from '@/components/onboarding/StepRegion';
import StepServers from '@/components/onboarding/StepServers';
import StepPlatform from '@/components/onboarding/StepPlatform';
import StepRank from '@/components/onboarding/StepRank';
import StepLanguages from '@/components/onboarding/StepLanguages';
import StepVoice from '@/components/onboarding/StepVoice';
import StepAgent from '@/components/onboarding/StepAgent';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';
import { useUsernameCheck } from '@/components/onboarding/useUsernameCheck';

type StepId =
  | 'profile'
  | 'birthdate'
  | 'region'
  | 'servers'
  | 'platform'
  | 'rank'
  | 'languages'
  | 'voice'
  | 'agent'
  | 'welcome';

const STEP_META: Record<StepId, { title: string; subtitle: string }> = {
  profile:   { title: 'Your profile',         subtitle: 'Set up your identity on SCRIM' },
  birthdate: { title: 'Your birthdate',       subtitle: 'You must be 13 or older' },
  region:    { title: 'Your region',          subtitle: 'Pick your Riot account region' },
  servers:   { title: 'Your servers',         subtitle: 'Where do you usually play?' },
  platform:  { title: 'Choose your platform', subtitle: 'How do you play?' },
  rank:      { title: 'Select your rank',     subtitle: 'Tell us about your competitive level' },
  languages: { title: 'Languages',            subtitle: 'Who can you play with in voice?' },
  voice:     { title: 'Voice chat',           subtitle: 'Do you use voice in scrims?' },
  agent:     { title: 'Pick your agent',      subtitle: 'Choose the character you main' },
  welcome:   { title: '',                     subtitle: '' },
};

const VALORANT_GAME: GameEnum = 'valorant';

const RANKS_BY_GAME: Record<string, RankMeta[]> = {
  valorant: VALORANT_RANKS,
};

function toAgentMeta(row: { uuid: string; display_name: string; role_name: string; display_icon: string | null }): AgentMeta {
  return {
    id: row.uuid,
    name: row.display_name,
    role: row.role_name.toLowerCase() as AgentRole,
    image: row.display_icon ?? '',
  };
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, setProfile, signOut } = useAuthStore();
  const setSelectedGame = useGameStore((s) => s.setSelectedGame);
  const storeAgents = useValorantDataStore((s) => s.agents);

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Profile
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Find Lasts fields
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [servers, setServers] = useState<string[]>([]);
  const [primaryLanguage, setPrimaryLanguage] = useState<string>('en');
  const [secondaryLanguages, setSecondaryLanguages] = useState<string[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean | null>(null);

  // Game-specific
  const game = VALORANT_GAME;
  const [platform, setPlatform] = useState<PlatformType | null>(null);
  const [currentRank, setCurrentRank] = useState<string | null>(null);
  const [mainAgent, setMainAgent] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const { status: usernameStatus, checkUsername } = useUsernameCheck();

  const isMultiplatform = GAME_MULTIPLATFORM[game] ?? false;
  const steps: StepId[] = useMemo(() => {
    const base: StepId[] = ['profile', 'birthdate', 'region', 'servers'];
    if (isMultiplatform) base.push('platform');
    base.push('rank', 'languages', 'voice', 'agent', 'welcome');
    return base;
  }, [isMultiplatform]);

  const currentStepId = steps[stepIndex];
  const totalSteps = steps.length;

  const gameRanks = RANKS_BY_GAME[game] ?? [];
  const gameAgents = game === 'valorant' ? storeAgents.map(toAgentMeta) : [];

  const handleUsernameChange = useCallback(
    (text: string) => {
      setUsername(text);
      checkUsername(text);
    },
    [checkUsername],
  );

  const handleRegionChange = useCallback((next: Region) => {
    setRegion(next);
    setServers([]);
  }, []);

  const ageOk = useMemo(() => {
    if (!birthdate) return false;
    const ageYears = (Date.now() - birthdate.getTime()) / (365.25 * 24 * 3600 * 1000);
    return ageYears >= 13;
  }, [birthdate]);

  const canContinue = (() => {
    switch (currentStepId) {
      case 'profile':   return username.trim().length >= 3 && usernameStatus === 'available';
      case 'birthdate': return ageOk;
      case 'region':    return region !== null;
      case 'servers':   return servers.length > 0;
      case 'platform':  return platform !== null;
      case 'rank':      return currentRank !== null;
      case 'languages': return primaryLanguage.length > 0;
      case 'voice':     return voiceEnabled !== null;
      case 'agent':     return mainAgent !== null;
      default:          return false;
    }
  })();

  const isSkippable = currentStepId === 'agent';

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
    if (currentStepId === 'agent') setMainAgent(null);
    goNext();
  };

  const handleSave = async () => {
    const trimmed = username.trim();
    if (trimmed.length < 3 || !user || !birthdate || !region || !currentRank) return;

    setSaving(true);
    try {
      let avatarUrl: string | null = null;

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

      const platformValue: PlatformType = isMultiplatform && platform ? platform : 'pc';

      const profilePayload = {
        id: user.id,
        username: trimmed,
        birthdate: birthdate.toISOString().slice(0, 10),
        region,
        preferred_game: game,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        current_rank: currentRank,
        main_agent: mainAgent,
        platform: platformValue,
        primary_language: primaryLanguage,
        secondary_languages: secondaryLanguages,
        voice_enabled: voiceEnabled ?? false,
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

      // Replace profile_servers selection
      await supabase.from('profile_servers').delete().eq('profile_id', user.id);
      if (servers.length > 0) {
        const rows = servers.map((server_id) => ({ profile_id: user.id, server_id }));
        const { error: serversErr } = await supabase.from('profile_servers').insert(rows);
        if (serversErr && __DEV__) console.error('[Onboarding] profile_servers insert error:', serversErr);
      }

      setSelectedGame(game);
      setProfile(data as Profile);
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
          region={region ?? 'EU'}
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
              <Text style={[styles.title, { color: c.textPrimary }]}>{meta.title}</Text>
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>{meta.subtitle}</Text>
            </MotiView>
          </AnimatePresence>
        </View>

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
                  avatarUri={avatarUri}
                  onAvatarPick={setAvatarUri}
                />
              </MotiView>
            )}

            {currentStepId === 'birthdate' && (
              <MotiView
                key="step-birthdate"
                from={{ opacity: 0, translateX: direction === 'forward' ? 30 : -30 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: direction === 'forward' ? -30 : 30 }}
                transition={{ type: 'timing', duration: 280 }}
              >
                <StepBirthdate value={birthdate} onChange={setBirthdate} />
              </MotiView>
            )}

            {currentStepId === 'region' && (
              <MotiView
                key="step-region"
                from={{ opacity: 0, translateX: direction === 'forward' ? 30 : -30 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: direction === 'forward' ? -30 : 30 }}
                transition={{ type: 'timing', duration: 280 }}
              >
                <StepRegion value={region} onChange={handleRegionChange} />
              </MotiView>
            )}

            {currentStepId === 'servers' && region && (
              <MotiView
                key="step-servers"
                from={{ opacity: 0, translateX: direction === 'forward' ? 30 : -30 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: direction === 'forward' ? -30 : 30 }}
                transition={{ type: 'timing', duration: 280 }}
              >
                <StepServers region={region} value={servers} onChange={setServers} />
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
                <StepPlatform selectedPlatform={platform} onSelectPlatform={setPlatform} />
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

            {currentStepId === 'languages' && (
              <MotiView
                key="step-languages"
                from={{ opacity: 0, translateX: direction === 'forward' ? 30 : -30 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: direction === 'forward' ? -30 : 30 }}
                transition={{ type: 'timing', duration: 280 }}
              >
                <StepLanguages
                  primary={primaryLanguage}
                  secondary={secondaryLanguages}
                  onPrimaryChange={setPrimaryLanguage}
                  onSecondaryChange={setSecondaryLanguages}
                />
              </MotiView>
            )}

            {currentStepId === 'voice' && (
              <MotiView
                key="step-voice"
                from={{ opacity: 0, translateX: direction === 'forward' ? 30 : -30 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: direction === 'forward' ? -30 : 30 }}
                transition={{ type: 'timing', duration: 280 }}
              >
                <StepVoice value={voiceEnabled} onChange={setVoiceEnabled} />
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
              <Text style={[styles.continueText, { color: c.background }]}>Continue</Text>
            </TouchableOpacity>
          </MotiView>

          {isSkippable && (
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.6}>
              <Text style={[styles.skipText, { color: c.textTertiary }]}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const CONTENT_PAD = 24;

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
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
