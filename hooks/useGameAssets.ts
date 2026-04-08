import { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useValorantDataStore } from '@/stores/valorantDataStore';
import { getAssetUrl, VALORANT_RANKS } from '@/lib/game-assets';
import type { AgentMeta, AgentRole, MapMeta, RankMeta } from '@/lib/game-assets';
import type { Database } from '@/types/database';

type AgentRow = Database['public']['Tables']['valorant_agents']['Row'];
type MapRow = Database['public']['Tables']['valorant_maps']['Row'];

// Adapt DB row to existing AgentMeta shape for backward compat.
// id format must match profiles.main_agent values: displayName lowercased, non-alphanumeric removed.
// Example: "KAY/O" -> "kayo", "Gekko" -> "gekko"
function toAgentMeta(row: AgentRow): AgentMeta {
  return {
    id: row.display_name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    name: row.display_name,
    role: row.role_name.toLowerCase() as AgentRole,
    image: row.display_icon ?? '',
  };
}

function toMapMeta(row: MapRow): MapMeta {
  return {
    id: row.display_name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    name: row.display_name,
    image: row.splash ?? row.display_icon ?? '',
  };
}

const RANKS_BY_GAME: Record<string, RankMeta[]> = {
  valorant: VALORANT_RANKS,
};

/**
 * Returns metadata + CDN URLs for the currently selected game's assets.
 * Agents and maps come from the Zustand store (synced from Supabase).
 * Ranks are still hardcoded (not in the API).
 */
export function useGameAssets() {
  const selectedGame = useGameStore((s) => s.selectedGame);
  const storeAgents = useValorantDataStore((s) => s.agents);
  const storeMaps = useValorantDataStore((s) => s.maps);

  return useMemo(() => {
    const agents = selectedGame === 'valorant'
      ? storeAgents.map(toAgentMeta)
      : [];
    const maps = selectedGame === 'valorant'
      ? storeMaps.filter((m) => m.is_playable).map(toMapMeta)
      : [];
    const ranks = RANKS_BY_GAME[selectedGame] ?? [];

    // agentUrl/mapUrl: images are now full CDN URLs from valorant-api.com,
    // so we return the first argument directly (it IS the URL).
    // rankUrl still builds Supabase Storage URLs.
    const agentUrl = (imageOrUrl: string, _role: AgentRole) => imageOrUrl;
    const mapUrl = (imageOrUrl: string) => imageOrUrl;
    const rankUrl = (filename: string) => getAssetUrl(selectedGame, 'ranks', filename);

    return { agents, maps, ranks, agentUrl, mapUrl, rankUrl };
  }, [selectedGame, storeAgents, storeMaps]);
}
