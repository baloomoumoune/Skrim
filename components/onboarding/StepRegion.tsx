import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useBaseColors } from '@/hooks/useThemeColors';
import { VALORANT_REGIONS, type ValorantRegion } from '@/lib/valorant-regions';

interface StepRegionProps {
  value: ValorantRegion | null;
  onChange: (r: ValorantRegion) => void;
}

export default function StepRegion({ value, onChange }: StepRegionProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <Text style={[styles.helper, { color: c.textSecondary }]}>
        Pick the Riot region your account plays in.
      </Text>
      {VALORANT_REGIONS.map((r) => {
        const selected = value === r.id;
        return (
          <Pressable
            key={r.id}
            onPress={() => onChange(r.id)}
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
            <Text style={[styles.label, { color: selected ? '#FFFFFF' : c.textPrimary }]}>
              {r.label}
            </Text>
            <Text
              style={[
                styles.code,
                { color: selected ? 'rgba(255,255,255,0.85)' : c.textTertiary },
              ]}
            >
              {r.id}
            </Text>
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
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 16, fontWeight: '600' },
  code: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
