import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { useActiveMatchStore } from '@/stores/activeMatchStore';
import { GAME_ACCENTS } from '@/lib/constants';
import { getGameModeById } from '@/lib/game-assets';

interface ActiveMatchBannerProps {
  bottomOffset: number; // tab bar height or 0
}

export default function ActiveMatchBanner({ bottomOffset }: ActiveMatchBannerProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const pathname = usePathname();
  const activeMatch = useActiveMatchStore((s) => s.activeMatch);
  const activeMembers = useActiveMatchStore((s) => s.activeMembers);

  const slideAnim = useRef(new Animated.Value(80)).current;
  const [visible, setVisible] = useState(false);

  // Elapsed timer
  const [elapsed, setElapsed] = useState('');

  const shouldShow = activeMatch && !pathname.startsWith(`/match/${activeMatch.id}`);

  useEffect(() => {
    if (shouldShow) {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 80,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [shouldShow, slideAnim]);

  // Update elapsed time every second
  useEffect(() => {
    if (!activeMatch) return;

    const updateElapsed = () => {
      const start = new Date(activeMatch.created_at).getTime();
      const diff = Math.max(0, Date.now() - start);
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [activeMatch?.id, activeMatch?.created_at]);

  if (!visible || !activeMatch) return null;

  const game = GAME_ACCENTS[activeMatch.game];
  const modeConfig = getGameModeById(activeMatch.game_mode);
  const readyCount = activeMembers.filter((m) => m.is_ready).length;
  const totalMembers = activeMembers.length;
  const readyRatio = totalMembers > 0 ? readyCount / totalMembers : 0;

  const isInProgress = activeMatch.status === 'in_progress';
  const statusLabel = isInProgress ? 'In Progress' : `${activeMatch.current_players}/${activeMatch.max_players}`;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`/match/${activeMatch.id}`)}
        style={[
          styles.banner,
          {
            backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            shadowColor: '#000',
          },
        ]}
      >
        {/* Ready progress bar at top */}
        <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${readyRatio * 100}%`,
                backgroundColor: readyCount === totalMembers && totalMembers > 0 ? '#22C55E' : game.accent,
              },
            ]}
          />
        </View>

        <View style={styles.content}>
          {/* Left: Mode icon + info */}
          <View style={styles.leftSection}>
            <View style={[styles.modeIconBg, { backgroundColor: `${game.accent}18` }]}>
              {modeConfig ? (
                <Ionicons name={modeConfig.icon as keyof typeof Ionicons.glyphMap} size={16} color={game.accent} />
              ) : (
                <Ionicons name="game-controller" size={16} color={game.accent} />
              )}
            </View>
            <View style={styles.info}>
              <Text numberOfLines={1} style={[styles.modeName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {modeConfig?.label ?? activeMatch.game_mode}
              </Text>
              <Text style={[styles.details, { color: isDark ? '#888' : '#666' }]}>
                {statusLabel} · {readyCount}/{totalMembers} ready
              </Text>
            </View>
          </View>

          {/* Right: Timer + chevron */}
          <View style={styles.rightSection}>
            <View style={[styles.timerBadge, { backgroundColor: isInProgress ? 'rgba(245,158,11,0.12)' : `${game.accent}12` }]}>
              <Ionicons
                name={isInProgress ? 'game-controller' : 'time-outline'}
                size={12}
                color={isInProgress ? '#F59E0B' : game.accent}
              />
              <Text style={[styles.timerText, { color: isInProgress ? '#F59E0B' : game.accent }]}>
                {elapsed}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={isDark ? '#555' : '#AAA'} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  banner: {
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  progressTrack: {
    height: 3,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modeIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 1,
  },
  modeName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  details: {
    fontSize: 12,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
