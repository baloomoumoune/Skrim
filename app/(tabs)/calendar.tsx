import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import MyMatchesList from '@/components/calendar/MyMatchesList';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
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
          My Matches
        </Text>
      </View>

      {/* Match list */}
      <MyMatchesList />
    </View>
  );
}
