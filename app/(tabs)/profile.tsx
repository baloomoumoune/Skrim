import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, ThemePreference } from '@/stores/themeStore';
import { useColors } from '@/hooks/useThemeColors';
import { useGameStore } from '@/stores/gameStore';
import { GAME_ACCENTS } from '@/lib/constants';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'system', label: 'Auto', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, signOut } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const { preference, setPreference } = useThemeStore();
  const c = useColors();
  const isDark = colorScheme === 'dark';
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = GAME_ACCENTS[selectedGame];

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (__DEV__) console.log('[Profile] Signing out...');
          await signOut();
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: c.background, paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="px-5 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
      >
        <Text className="text-xl font-bold tracking-tight" style={{ color: c.textPrimary }}>
          Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name */}
        <View className="flex-row items-center gap-4 mb-8">
          <View
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: `${game.accent}18` }}
          >
            <Text className="text-xl font-bold" style={{ color: game.accent }}>
              {(profile?.username?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[17px] font-bold" style={{ color: c.textPrimary }}>
              {profile?.username ?? 'Unknown'}
            </Text>
            <Text className="text-[13px] mt-0.5" style={{ color: c.textSecondary }}>
              {user?.email ?? user?.id}
            </Text>
          </View>
        </View>

        {/* Section: Appearance */}
        <Text
          className="text-[11px] font-bold uppercase tracking-[3px] mb-3"
          style={{ color: c.textTertiary }}
        >
          Appearance
        </Text>
        <View
          className="rounded-2xl overflow-hidden mb-8"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderWidth: 0.5,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          }}
        >
          <View className="flex-row">
            {THEME_OPTIONS.map((opt) => {
              const isActive = preference === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3.5"
                  style={{
                    backgroundColor: isActive
                      ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')
                      : 'transparent',
                  }}
                  onPress={() => setPreference(opt.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.icon}
                    size={15}
                    color={isActive ? c.textPrimary : c.textTertiary}
                  />
                  <Text
                    className="text-[13px] font-semibold"
                    style={{ color: isActive ? c.textPrimary : c.textTertiary }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section: Account */}
        <Text
          className="text-[11px] font-bold uppercase tracking-[3px] mb-3"
          style={{ color: c.textTertiary }}
        >
          Account
        </Text>
        <View
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderWidth: 0.5,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          }}
        >
          {/* Region */}
          <View
            className="flex-row items-center justify-between px-4 py-3.5"
            style={{ borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="globe-outline" size={18} color={c.textSecondary} />
              <Text className="text-[14px]" style={{ color: c.textPrimary }}>Region</Text>
            </View>
            <Text className="text-[13px] font-medium" style={{ color: c.textSecondary }}>
              {profile?.region?.toUpperCase() ?? '—'}
            </Text>
          </View>

          {/* Game */}
          <View
            className="flex-row items-center justify-between px-4 py-3.5"
            style={{ borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="game-controller-outline" size={18} color={c.textSecondary} />
              <Text className="text-[14px]" style={{ color: c.textPrimary }}>Game</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: game.accent }} />
              <Text className="text-[13px] font-medium" style={{ color: c.textSecondary }}>
                {game.name}
              </Text>
            </View>
          </View>

          {/* Sign out */}
          <TouchableOpacity
            className="flex-row items-center gap-3 px-4 py-3.5"
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color="#FF4655" />
            <Text className="text-[14px] font-medium" style={{ color: '#FF4655' }}>
              Sign out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
