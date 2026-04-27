import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useValorantDataStore } from '@/stores/valorantDataStore';
import { useColors } from '@/hooks/useThemeColors';

function formatCountdown(endTime: string): string | null {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return null;

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export function CurrentEventsBanner() {
  const events = useValorantDataStore((s) => s.events);
  const c = useColors();
  const [, forceTick] = useState(0);

  const currentEvent = events.find((e) => e.is_current);

  useEffect(() => {
    if (!currentEvent) return;
    const id = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [currentEvent]);

  if (!currentEvent) return null;
  const countdown = currentEvent.end_time ? formatCountdown(currentEvent.end_time) : null;
  if (!countdown) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="calendar-outline" size={20} color="#A78BFA" />
      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.text, { color: c.textPrimary }]}>
          {currentEvent.display_name}
        </Text>
        <Text style={styles.countdown}>{countdown}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#A78BFA',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  content: { flex: 1 },
  text: { fontSize: 14, fontWeight: '500' },
  countdown: { fontSize: 12, color: '#A78BFA', marginTop: 2 },
});
