import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import { useGameStore } from '@/stores/gameStore';
import { GAME_ACCENTS } from '@/lib/constants';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = GAME_ACCENTS[selectedGame];

  return (
    <View className="flex-1" style={{ backgroundColor: c.background, paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
      >
        <View className="flex-row items-center gap-3">
          <Image
            source={require('@/assets/images/skrim-logo.png')}
            style={{ width: 28, height: 28 }}
            contentFit="contain"
          />
          <View
            className="px-2.5 py-1 rounded-md"
            style={{ backgroundColor: `${game.accent}18` }}
          >
            <Text
              className="text-[11px] font-bold tracking-wider"
              style={{ color: game.accent }}
            >
              {game.name}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={18} color={c.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="w-16 h-16 rounded-2xl items-center justify-center mb-5"
          style={{ backgroundColor: `${game.accent}12` }}
        >
          <Ionicons name="search" size={28} color={game.accent} />
        </View>
        <Text
          className="text-lg font-bold tracking-tight mb-2"
          style={{ color: c.textPrimary }}
        >
          Find scrims
        </Text>
        <Text
          className="text-[14px] text-center leading-5"
          style={{ color: c.textTertiary }}
        >
          Browse open scrims from teams{'\n'}looking for a match.
        </Text>
      </View>
    </View>
  );
}
