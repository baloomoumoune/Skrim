import { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { getAssetUrl, VALORANT_AGENTS, VALORANT_MAPS, VALORANT_RANKS } from '@/lib/game-assets';
import type { AgentMeta, MapMeta, RankMeta } from '@/lib/game-assets';

// ── Per-game registries ─────────────────────────────
// Add CS2 arrays here when ready

const AGENTS_BY_GAME: Record<string, AgentMeta[]> = {
  valorant: VALORANT_AGENTS,
  // cs2: CS2_AGENTS,
};

const MAPS_BY_GAME: Record<string, MapMeta[]> = {
  valorant: VALORANT_MAPS,
  // cs2: CS2_MAPS,
};

const RANKS_BY_GAME: Record<string, RankMeta[]> = {
  valorant: VALORANT_RANKS,
  // cs2: CS2_RANKS,
};

/**
 * Returns metadata + CDN URLs for the currently selected game's assets.
 *
 * @example
 *   const { agents, maps, ranks, agentUrl } = useGameAssets();
 *   <Image source={{ uri: agentUrl('jett.png') }} />
 */
export function useGameAssets() {
  const selectedGame = useGameStore((s) => s.selectedGame);

  return useMemo(() => {
    const agents = AGENTS_BY_GAME[selectedGame] ?? [];
    const maps = MAPS_BY_GAME[selectedGame] ?? [];
    const ranks = RANKS_BY_GAME[selectedGame] ?? [];

    const agentUrl = (filename: string) => getAssetUrl(selectedGame, 'agents', filename);
    const mapUrl = (filename: string) => getAssetUrl(selectedGame, 'maps', filename);
    const rankUrl = (filename: string) => getAssetUrl(selectedGame, 'ranks', filename);

    return { agents, maps, ranks, agentUrl, mapUrl, rankUrl };
  }, [selectedGame]);
}
