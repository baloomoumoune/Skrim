import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useBaseColors } from '@/hooks/useThemeColors';
import { serversInRegion } from '@/lib/valorant-servers';
import { getRegionLabel, type ValorantRegion } from '@/lib/valorant-regions';

interface StepServersProps {
  region: ValorantRegion;
  value: string[];
  onChange: (ids: string[]) => void;
}

export default function StepServers({ region, value, onChange }: StepServersProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const servers = useMemo(() => serversInRegion(region), [region]);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.helper, { color: c.textSecondary }]}>
        Select at least one server in {getRegionLabel(region)}.
      </Text>
      {servers.map((s) => {
        const selected = value.includes(s.id);
        return (
          <Pressable
            key={s.id}
            onPress={() => toggle(s.id)}
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
              {s.displayName}
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
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
  },
  label: { fontSize: 15, fontWeight: '600' },
});
