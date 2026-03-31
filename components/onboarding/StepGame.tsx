import { View, Text, Image, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import { GAME_ACCENTS } from '@/lib/constants';
import { getGameLogoUrl } from '@/lib/game-assets';
import type { GameEnum } from '@/types/database';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2; // 24px padding each side + 12px gap

interface StepGameProps {
  selectedGame: GameEnum;
  onSelectGame: (game: GameEnum) => void;
}

export default function StepGame({ selectedGame, onSelectGame }: StepGameProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const games = Object.values(GAME_ACCENTS);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {games.map((game, i) => {
          const isActive = selectedGame === game.id;
          const isDisabled = !!game.disabled;

          return (
            <MotiView
              key={game.id}
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 15, delay: i * 120 }}
              style={{ width: CARD_WIDTH }}
            >
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor: isActive
                      ? isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'
                      : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isActive
                      ? c.accent
                      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    opacity: isDisabled ? 0.4 : 1,
                  },
                ]}
                onPress={() => !isDisabled && onSelectGame(game.id as GameEnum)}
                activeOpacity={isDisabled ? 1 : 0.7}
                disabled={isDisabled}
              >
                <Image
                  source={{ uri: getGameLogoUrl(game.logo) }}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.gameName,
                    { color: isActive ? c.textPrimary : c.textSecondary },
                  ]}
                >
                  {game.name}
                </Text>
                {isDisabled && (
                  <View
                    style={[
                      styles.comingSoonBadge,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                  >
                    <Text style={[styles.comingSoonText, { color: c.textTertiary }]}>
                      Coming Soon
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </MotiView>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  logo: {
    width: 64,
    height: 64,
  },
  gameName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
