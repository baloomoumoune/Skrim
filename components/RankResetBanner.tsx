import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { useColors } from '@/hooks/useThemeColors';

export function RankResetBanner() {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();
  const c = useColors();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  const shouldShow =
    profile?.current_rank === 'unranked' &&
    profile?.previous_rank_before_reset != null &&
    profile?.last_rank_reset_at != null;

  const storageKey = profile?.last_rank_reset_at
    ? `@scrim/rank-reset-dismissed:${profile.last_rank_reset_at}`
    : null;

  useEffect(() => {
    if (!storageKey) {
      setDismissed(false);
      return;
    }
    AsyncStorage.getItem(storageKey).then((val) => {
      setDismissed(val === 'true');
    });
  }, [storageKey]);

  const handleDismiss = async () => {
    if (storageKey) {
      await AsyncStorage.setItem(storageKey, 'true');
    }
    setDismissed(true);
  };

  const handleCTA = () => {
    router.push('/(tabs)/profile?openRankEditor=true');
  };

  // Wait for AsyncStorage read before rendering to avoid a flash
  if (dismissed === null || !shouldShow || dismissed) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={20} color="#FBBF24" />
      <TouchableOpacity style={styles.content} onPress={handleCTA} activeOpacity={0.7}>
        <Text style={[styles.text, { color: c.textPrimary }]}>Ranks have been reset.</Text>
        <Text style={styles.cta}>Update your rank now →</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn} activeOpacity={0.7}>
        <Ionicons name="close" size={18} color="#FBBF24" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FBBF24',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  content: { flex: 1 },
  text: { fontSize: 14, fontWeight: '500' },
  cta: { fontSize: 12, color: '#FBBF24', marginTop: 2 },
  dismissBtn: { padding: 4 },
});
