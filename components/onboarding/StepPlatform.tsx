import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import type { Platform } from '@/types/database';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTENT_PAD = 24;
const GAP = 12;
const CARD_W = (SCREEN_WIDTH - CONTENT_PAD * 2 - GAP) / 2;

const PLATFORMS: { value: Platform; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; description: string }[] = [
  { value: 'pc', label: 'PC', icon: 'desktop-outline', description: 'Mouse & keyboard' },
  { value: 'console', label: 'Console', icon: 'game-controller-outline', description: 'Controller' },
];

interface StepPlatformProps {
  selectedPlatform: Platform | null;
  onSelectPlatform: (platform: Platform) => void;
}

export default function StepPlatform({ selectedPlatform, onSelectPlatform }: StepPlatformProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {PLATFORMS.map((p, i) => {
          const isActive = selectedPlatform === p.value;
          return (
            <MotiView
              key={p.value}
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'timing', duration: 250, delay: i * 80 }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onSelectPlatform(p.value)}
                style={[
                  styles.card,
                  {
                    width: CARD_W,
                    borderWidth: isActive ? 2 : 1,
                    borderColor: isActive
                      ? c.accent
                      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    backgroundColor: isActive
                      ? isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
                      : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  },
                ]}
              >
                <Ionicons
                  name={p.icon}
                  size={40}
                  color={isActive ? c.textPrimary : c.textTertiary}
                />
                <Text
                  style={[
                    styles.label,
                    { color: isActive ? c.textPrimary : c.textSecondary },
                  ]}
                >
                  {p.label}
                </Text>
                <Text
                  style={[
                    styles.description,
                    { color: isActive ? c.textSecondary : c.textTertiary },
                  ]}
                >
                  {p.description}
                </Text>
              </TouchableOpacity>
            </MotiView>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: 18,
    gap: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 12,
    fontWeight: '500',
  },
});
