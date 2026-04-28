import { useMemo, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useColorScheme } from 'nativewind';
import { useBaseColors } from '@/hooks/useThemeColors';

interface StepBirthdateProps {
  value: Date | null;
  onChange: (d: Date | null) => void;
}

const MIN_AGE = 13;

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function StepBirthdate({ value, onChange }: StepBirthdateProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [show, setShow] = useState(false);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_AGE);
    return d;
  }, []);

  const ageOk = useMemo(() => {
    if (!value) return false;
    const ageYears = (Date.now() - value.getTime()) / (365.25 * 24 * 3600 * 1000);
    return ageYears >= MIN_AGE;
  }, [value]);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    // On Android the dialog is modal — close it on either OK or Cancel.
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && date) onChange(date);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.helper, { color: c.textSecondary }]}>
        You must be at least {MIN_AGE} years old to use Skrim. This cannot be changed later.
      </Text>

      <Pressable
        onPress={() => setShow(true)}
        style={[
          styles.pickerRow,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            borderColor: value
              ? c.accent
              : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <Text style={[styles.pickerLabel, { color: c.textTertiary }]}>Birthdate</Text>
        <Text
          style={[
            styles.pickerValue,
            { color: value ? c.textPrimary : c.textTertiary },
          ]}
        >
          {value ? formatDate(value) : 'Tap to select'}
        </Text>
      </Pressable>

      {value && !ageOk && (
        <Text style={styles.error}>You must be at least {MIN_AGE} years old.</Text>
      )}

      {/* Android: render only while open. iOS: always rendered as inline spinner. */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={value ?? maxDate}
          mode="date"
          display="spinner"
          maximumDate={maxDate}
          onChange={handleChange}
        />
      )}
      {Platform.OS === 'ios' && (
        <View style={styles.iosPickerWrap}>
          <DateTimePicker
            value={value ?? maxDate}
            mode="date"
            display="spinner"
            maximumDate={maxDate}
            onChange={handleChange}
            textColor={c.textPrimary}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  helper: { fontSize: 14, marginBottom: 16 },
  pickerRow: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 6,
  },
  pickerValue: { fontSize: 17, fontWeight: '600' },
  error: { color: '#FF4655', marginTop: 12, fontSize: 13, fontWeight: '500' },
  iosPickerWrap: { marginTop: 16 },
});
