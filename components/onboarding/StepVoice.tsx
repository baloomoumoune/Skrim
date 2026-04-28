import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useBaseColors } from '@/hooks/useThemeColors';

interface StepVoiceProps {
  value: boolean | null;
  onChange: (v: boolean) => void;
}

export default function StepVoice({ value, onChange }: StepVoiceProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const options: { val: boolean; label: string; sub: string; icon: 'mic' | 'mic-off' }[] = [
    { val: true,  label: 'Yes',  sub: 'I use voice chat in matches', icon: 'mic' },
    { val: false, label: 'No',   sub: 'I prefer text-only',          icon: 'mic-off' },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.helper, { color: c.textSecondary }]}>
        Voice helps coordinate during scrims. You can change this anytime in your profile.
      </Text>
      {options.map((o) => {
        const selected = value === o.val;
        return (
          <Pressable
            key={String(o.val)}
            onPress={() => onChange(o.val)}
            style={[
              styles.row,
              {
                backgroundColor: selected
                  ? c.accent
                  : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderColor: selected
                  ? c.accent
                  : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <Ionicons
              name={o.icon}
              size={22}
              color={selected ? '#FFFFFF' : c.textSecondary}
            />
            <View style={styles.textBlock}>
              <Text style={[styles.label, { color: selected ? '#FFFFFF' : c.textPrimary }]}>
                {o.label}
              </Text>
              <Text
                style={[
                  styles.sub,
                  { color: selected ? 'rgba(255,255,255,0.85)' : c.textTertiary },
                ]}
              >
                {o.sub}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 4 },
  helper: { fontSize: 14, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  textBlock: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
});
