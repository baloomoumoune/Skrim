import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-1" style={{ backgroundColor: c.background, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          height: 60,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          borderBottomWidth: 0.5,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.5 }}>
          Calendar
        </Text>
      </View>

      {/* Empty state */}
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="w-16 h-16 rounded-2xl items-center justify-center mb-5"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
        >
          <Ionicons name="calendar-outline" size={28} color={c.textTertiary} />
        </View>
        <Text
          className="text-lg font-bold tracking-tight mb-2"
          style={{ color: c.textPrimary }}
        >
          Nothing scheduled
        </Text>
        <Text
          className="text-[14px] text-center leading-5"
          style={{ color: c.textTertiary }}
        >
          Your team's availability and{'\n'}scheduled scrims will show here.
        </Text>
      </View>
    </View>
  );
}
