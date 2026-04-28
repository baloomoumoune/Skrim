import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useBaseColors } from '@/hooks/useThemeColors';
import { LANGUAGES } from '@/lib/languages';

interface StepLanguagesProps {
  primary: string;
  secondary: string[];
  onPrimaryChange: (code: string) => void;
  onSecondaryChange: (codes: string[]) => void;
}

const MAX_SECONDARY = 4;

export default function StepLanguages({
  primary,
  secondary,
  onPrimaryChange,
  onSecondaryChange,
}: StepLanguagesProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handlePrimary = (code: string) => {
    onPrimaryChange(code);
    if (secondary.includes(code)) onSecondaryChange(secondary.filter((x) => x !== code));
  };

  const toggleSecondary = (code: string) => {
    if (code === primary) return;
    if (secondary.includes(code)) {
      onSecondaryChange(secondary.filter((x) => x !== code));
    } else {
      if (secondary.length >= MAX_SECONDARY) return;
      onSecondaryChange([...secondary, code]);
    }
  };

  const chipBg = (active: boolean) =>
    active ? c.accent : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const chipBorder = (active: boolean) =>
    active ? c.accent : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>Primary language</Text>
      <Text style={[styles.helper, { color: c.textSecondary }]}>
        Pick the language you speak most fluently in voice chat.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {LANGUAGES.map((l) => {
          const active = primary === l.code;
          return (
            <Pressable
              key={`p-${l.code}`}
              onPress={() => handlePrimary(l.code)}
              style={[
                styles.chip,
                { backgroundColor: chipBg(active), borderColor: chipBorder(active) },
              ]}
            >
              <Text style={[styles.chipNative, { color: active ? '#FFFFFF' : c.textPrimary }]}>
                {l.native}
              </Text>
              <Text
                style={[
                  styles.chipEnglish,
                  { color: active ? 'rgba(255,255,255,0.8)' : c.textTertiary },
                ]}
              >
                {l.english}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.sectionLabel, { color: c.textTertiary, marginTop: 24 }]}>
        Other languages (optional)
      </Text>
      <Text style={[styles.helper, { color: c.textSecondary }]}>
        Select up to {MAX_SECONDARY} other languages you can play in.
      </Text>
      <View style={styles.grid}>
        {LANGUAGES.filter((l) => l.code !== primary).map((l) => {
          const active = secondary.includes(l.code);
          const disabled = !active && secondary.length >= MAX_SECONDARY;
          return (
            <Pressable
              key={`s-${l.code}`}
              onPress={() => toggleSecondary(l.code)}
              disabled={disabled}
              style={[
                styles.chip,
                {
                  backgroundColor: chipBg(active),
                  borderColor: chipBorder(active),
                  opacity: disabled ? 0.4 : 1,
                },
              ]}
            >
              <Text style={[styles.chipNative, { color: active ? '#FFFFFF' : c.textPrimary }]}>
                {l.native}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 6,
  },
  helper: { fontSize: 13, marginBottom: 12 },
  row: { gap: 8, paddingRight: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipNative: { fontSize: 14, fontWeight: '600' },
  chipEnglish: { fontSize: 11, marginTop: 2 },
});
