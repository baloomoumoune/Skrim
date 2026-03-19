import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useBaseColors } from '@/hooks/useThemeColors';
import { Region, GameEnum, Profile } from '@/types/database';
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedProfileRef = useRef<Profile | null>(null);

  const selectedGameColor = GAMES.find((g) => g.value === game)?.color ?? c.accent;

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
    if (!user) return;

    setSaving(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const updatePayload: Partial<Profile> = {
        username: trimmed,
        region,
        preferred_game: game,
        timezone,
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
                onPress={() => setGame(g.value)}
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

        {/* Continue */}
        <TouchableOpacity
          className={`mt-12 h-14 rounded-2xl items-center justify-center ${saving ? 'opacity-50' : ''}`}
          style={{ backgroundColor: selectedGameColor }}
          onPress={handleSave}
          disabled={saving}
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
