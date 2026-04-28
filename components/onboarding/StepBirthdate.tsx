import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useBaseColors } from '@/hooks/useThemeColors';

interface StepBirthdateProps {
  value: Date | null;
  onChange: (d: Date | null) => void;
}

const MIN_AGE = 13;

export default function StepBirthdate({ value, onChange }: StepBirthdateProps) {
  const c = useBaseColors();

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_AGE);
    return d;
  }, []);

  const ageOk = useMemo(() => {
    if (!value) return false;
    const ageMs = Date.now() - value.getTime();
    const ageYears = ageMs / (365.25 * 24 * 3600 * 1000);
    return ageYears >= MIN_AGE;
  }, [value]);

  const handleChange = (_: DateTimePickerEvent, date?: Date) => {
    if (date) onChange(date);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.helper, { color: c.textSecondary }]}>
        You must be at least {MIN_AGE} years old to use Skrim. This cannot be changed later.
      </Text>
      <DateTimePicker
        value={value ?? maxDate}
        mode="date"
        display="spinner"
        maximumDate={maxDate}
        onChange={handleChange}
        textColor={c.textPrimary}
      />
      {value && !ageOk && (
        <Text style={styles.error}>You must be at least {MIN_AGE} years old.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  helper: { fontSize: 14, marginBottom: 16 },
  error: { color: '#FF4655', marginTop: 12, fontSize: 13, fontWeight: '500' },
});
