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

interface FloatingMatchPillProps {
  bottomOffset: number;
}

function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function ActiveMatchBanner({ bottomOffset }: FloatingMatchPillProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const pathname = usePathname();
  const activeMatch = useActiveMatchStore((s) => s.activeMatch);
  const activeMembers = useActiveMatchStore((s) => s.activeMembers);

  const slideAnim = useRef(new Animated.Value(80)).current;
  const [visible, setVisible] = useState(false);

  // Timer for in_progress
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!activeMatch?.launched_at || activeMatch.status !== 'in_progress') {
      setElapsed(0);
      return;
    }
    const launchedMs = new Date(activeMatch.launched_at).getTime();
    const tick = () => setElapsed(Date.now() - launchedMs);
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [activeMatch?.launched_at, activeMatch?.status]);

  // Don't show on match detail screen
  const isOnMatchScreen = pathname?.startsWith('/match/');

  const shouldShow = !!activeMatch && !isOnMatchScreen;

  useEffect(() => {
    if (shouldShow && !visible) {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 18,
        useNativeDriver: true,
      }).start();
    } else if (!shouldShow && visible) {
      Animated.timing(slideAnim, {
        toValue: 80,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [shouldShow, visible, slideAnim]);

  if (!visible || !activeMatch) return null;

  const game = GAME_ACCENTS[activeMatch.game];
  const readyCount = activeMembers.filter((m) => m.is_ready).length;
  const isInProgress = activeMatch.status === 'in_progress';

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
          styles.pill,
          {
            backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        {/* Accent dot */}
        <View style={[styles.dot, { backgroundColor: isInProgress ? '#22C55E' : game.accent }]} />

        {/* Content */}
        <View style={styles.pillContent}>
          <Text numberOfLines={1} style={[styles.pillLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            {isInProgress ? 'In Progress' : `${activeMatch.current_players}/${activeMatch.max_players} players`}
          </Text>
          <Text style={[styles.pillMeta, { color: isDark ? '#888888' : '#666666' }]}>
            {isInProgress ? formatTimer(elapsed) : `${readyCount}/${activeMembers.length} ready`}
          </Text>
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={16} color={isDark ? '#555555' : '#999999'} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 40,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pillContent: {
    flex: 1,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pillMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
});
