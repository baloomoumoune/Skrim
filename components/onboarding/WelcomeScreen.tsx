import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import { GAME_ACCENTS } from '@/lib/constants';
import { getAssetUrl, getGameLogoUrl } from '@/lib/game-assets';
import type { Region, GameEnum, Platform } from '@/types/database';
import type { AgentMeta, AgentRole, RankMeta } from '@/lib/game-assets';

const REGION_FLAGS: Record<string, string> = {
  eu: '🇪🇺',
  na: '🇺🇸',
  apac: '🌏',
  sa: '🇧🇷',
  me: '🇸🇦',
  oce: '🇦🇺',
};

interface WelcomeScreenProps {
  username: string;
  avatarUri: string | null;
  region: Region;
  game: GameEnum;
  currentRank: string | null;
  mainAgent: string | null;
  platform: Platform | null;
  agents: AgentMeta[];
  ranks: RankMeta[];
  onFinish: () => void;
  saving: boolean;
}

export default function WelcomeScreen({
  username,
  avatarUri,
  region,
  game,
  currentRank,
  mainAgent,
  platform,
  agents,
  ranks,
  onFinish,
  saving,
}: WelcomeScreenProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const agentMeta = agents.find((a) => a.id === mainAgent);
  const rankMeta = ranks.find((r) => r.id === currentRank);
  const gameMeta = GAME_ACCENTS[game];
  const initials = username.trim().slice(0, 2).toUpperCase() || '?';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Avatar */}
        <MotiView
          from={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 12, delay: 100 }}
          style={styles.avatarContainer}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: isDark ? '#222222' : '#E0E0E0' },
            ]}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={[styles.avatarInitials, { color: isDark ? '#FFFFFF' : '#000000' }]}
              >
                {initials}
              </Text>
            )}
          </View>
        </MotiView>

        {/* Username */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 300 }}
        >
          <Text style={[styles.username, { color: c.textPrimary }]}>{username}</Text>
        </MotiView>

        {/* Badges row */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 450 }}
          style={styles.badgesRow}
        >
          {/* Region */}
          <View
            style={[
              styles.badge,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
            ]}
          >
            <Text style={styles.badgeEmoji}>{REGION_FLAGS[region] ?? '🌍'}</Text>
            <Text style={[styles.badgeText, { color: c.textSecondary }]}>
              {region.toUpperCase()}
            </Text>
          </View>

          {/* Game */}
          <View
            style={[
              styles.badge,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
            ]}
          >
            <Image
              source={{ uri: getGameLogoUrl(gameMeta.logo) }}
              style={styles.badgeLogo}
              resizeMode="contain"
            />
            <Text style={[styles.badgeText, { color: c.textSecondary }]}>{gameMeta.name}</Text>
          </View>

          {/* Platform */}
          {platform && (
            <View
              style={[
                styles.badge,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
              ]}
            >
              <Ionicons
                name={platform === 'console' ? 'game-controller-outline' : 'desktop-outline'}
                size={14}
                color={c.textSecondary}
              />
              <Text style={[styles.badgeText, { color: c.textSecondary }]}>
                {platform === 'console' ? 'Console' : 'PC'}
              </Text>
            </View>
          )}
        </MotiView>

        {/* Rank + Agent */}
        {(rankMeta || agentMeta) && (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 600 }}
            style={styles.detailsRow}
          >
            {rankMeta && (
              <View style={styles.detailItem}>
                <Image
                  source={{ uri: getAssetUrl(game, 'ranks', rankMeta.image) }}
                  style={styles.detailImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {agentMeta && (
              <View style={styles.detailItem}>
                <Image
                  source={{
                    uri: getAssetUrl(
                      game,
                      'agents',
                      agentMeta.image,
                      agentMeta.role as AgentRole,
                    ),
                  }}
                  style={styles.detailImage}
                  resizeMode="contain"
                />
              </View>
            )}
          </MotiView>
        )}

        {/* Welcome text */}
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 14, delay: 800 }}
        >
          <Text style={[styles.welcomeTitle, { color: c.textPrimary }]}>
            Welcome to SCRIM
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: c.textSecondary }]}>
            Find your next match
          </Text>
        </MotiView>
      </View>

      {/* Let's go button */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 16, delay: 1000 }}
        style={styles.buttonContainer}
      >
        <TouchableOpacity
          style={[styles.button, { backgroundColor: c.accent }]}
          onPress={onFinish}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={c.background} size="small" />
          ) : (
            <Text style={[styles.buttonText, { color: c.background }]}>Let's go</Text>
          )}
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  avatarContainer: {
    marginBottom: 4,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarInitials: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: 2,
  },
  username: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  badgeEmoji: {
    fontSize: 14,
  },
  badgeLogo: {
    width: 18,
    height: 18,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailImage: {
    width: 52,
    height: 52,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
  welcomeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  button: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
