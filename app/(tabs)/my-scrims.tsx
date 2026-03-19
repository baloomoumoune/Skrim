import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';

export default function MyScrimsScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-1" style={{ backgroundColor: c.background, paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="px-5 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
      >
        <Text className="text-xl font-bold tracking-tight" style={{ color: c.textPrimary }}>
          My Scrims
        </Text>
      </View>

      {/* Empty state */}
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="w-16 h-16 rounded-2xl items-center justify-center mb-5"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
        >
          <Ionicons name="clipboard-outline" size={28} color={c.textTertiary} />
        </View>
        <Text
          className="text-lg font-bold tracking-tight mb-2"
          style={{ color: c.textPrimary }}
        >
          No scrims yet
        </Text>
        <Text
          className="text-[14px] text-center leading-5"
          style={{ color: c.textTertiary }}
        >
          Your upcoming and past scrims{'\n'}will appear here.
        </Text>
      </View>
    </View>
  );
}
