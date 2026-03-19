import { useMemo } from 'react';
import { useColorScheme } from 'nativewind';
import { LIGHT_COLORS, DARK_COLORS, GAME_ACCENTS, ThemeColors } from '@/lib/constants';
import { useGameStore } from '@/stores/gameStore';

/**
 * Returns the full color palette for the current theme mode.
 * Use this on auth screens (no game accent).
 */
export function useBaseColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}

/**
 * Returns the full color palette with game accent colors applied.
 * Use this on tab screens (after game selection).
 */
export function useColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  const selectedGame = useGameStore((s) => s.selectedGame);

  return useMemo(() => {
    const base = colorScheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
    const game = GAME_ACCENTS[selectedGame];
    return {
      ...base,
      accent: game.accent,
      accentLight: game.accentLight,
      accentMid: game.accentMid,
      secondary: game.secondary,
    };
  }, [colorScheme, selectedGame]);
}
