import { View, Dimensions, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';

const TRACK_WIDTH = Dimensions.get('window').width - 48; // 24px padding each side

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const fillWidth = Math.round(TRACK_WIDTH * Math.min((currentStep + 1) / totalSteps, 1));

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <MotiView
        animate={{ width: fillWidth }}
        transition={{ type: 'spring', damping: 20, stiffness: 180 }}
        style={[styles.fill, { backgroundColor: c.accent }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
