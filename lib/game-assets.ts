import { supabase } from './supabase';

// ── Public URL builder ──────────────────────────────
const BUCKET = 'game-assets';

export type AgentRole = 'duelist' | 'initiator' | 'controller' | 'sentinel';

/** Maps agent role to the Storage folder name */
const ROLE_FOLDER: Record<AgentRole, string> = {
  controller: 'Controllers',
  duelist: 'Duellists',
  initiator: 'Initiators',
  sentinel: 'Sentinels',
};

/** Returns the public CDN URL for a game logo in games-logo/ folder */
export function getGameLogoUrl(logo: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(`games-logo/${logo}`);
  return data.publicUrl;
}

/**
 * Returns the public CDN URL for a game asset.
 *
 * @example
 *   getAssetUrl('valorant', 'maps', 'jett.png')
 *   getAssetUrl('valorant', 'agents', 'jett.png', 'duelist')
 */
export function getAssetUrl(
  game: string,
  type: 'agents' | 'maps' | 'ranks',
  filename: string,
  role?: AgentRole,
): string {
  const path =
    type === 'agents' && role
      ? `${game}/${type}/${ROLE_FOLDER[role]}/${filename}`
      : `${game}/${type}/${filename}`;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ── Valorant metadata ───────────────────────────────

export interface AgentMeta {
  id: string;
  name: string;
  role: AgentRole;
  image: string; // filename in storage
}

export interface MapMeta {
  id: string;
  name: string;
  image: string;
}

export interface RankMeta {
  id: string;
  name: string;
  tier: number | null; // null for Radiant
  image: string;
}

// Agents and maps are now synced from Supabase (valorant_agents, valorant_maps tables).
// Use useValorantDataStore() or useGameAssets() to access them.

function rankEntry(name: string, tiers: number): RankMeta[] {
  const base = name.toLowerCase();
  // Files are stored as: iron_1_rank.png, radiant_rank.png (matching local filenames lowercased)
  if (tiers === 0) {
    return [{ id: base, name, tier: null, image: `${base}_rank.png` }];
  }
  return Array.from({ length: tiers }, (_, i) => ({
    id: `${base}_${i + 1}`,
    name: `${name} ${i + 1}`,
    tier: i + 1,
    image: `${base}_${i + 1}_rank.png`,
  }));
}

export const VALORANT_RANKS: RankMeta[] = [
  { id: 'unranked', name: 'Unranked', tier: null, image: 'unranked.png' },
  ...rankEntry('Iron', 3),
  ...rankEntry('Bronze', 3),
  ...rankEntry('Silver', 3),
  ...rankEntry('Gold', 3),
  ...rankEntry('Platinum', 3),
  ...rankEntry('Diamond', 3),
  ...rankEntry('Ascendant', 3),
  ...rankEntry('Immortal', 3),
  ...rankEntry('Radiant', 0),
];

/** Extracts the general rank name from a rank ID: 'gold_1' → 'Gold', 'radiant' → 'Radiant' */
export function getRankLabel(rankId: string): string {
  const base = rankId.split('_')[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Formats a full rank ID to its display name: 'diamond_2' → 'Diamond 2', 'radiant' → 'Radiant' */
export function formatRank(rankId: string): string {
  const entry = VALORANT_RANKS.find((r) => r.id === rankId);
  return entry?.name ?? getRankLabel(rankId);
}

/** Returns the rank image filename for a given rank ID */
export function getRankImage(rankId: string, ranks: RankMeta[]): string | null {
  const rank = ranks.find((r) => r.id === rankId);
  return rank?.image ?? null;
}

// ── Game Modes (Scrim-specific metadata) ────────────
// Game mode data from valorant-api.com is in the valorant_game_modes table.
// The API has no "Competitive", "Premier", or "Custom" — "Standard" covers
// both Unrated and Competitive (same game mode, different queue).
// GAME_MODE_SCRIM_META is keyed by scrimId (matches.game_mode values).

export interface GameModeScrimMeta {
  scrimId: string;
  label: string;
  icon: string;
  hasRank: boolean;
  hasRrPenalty: boolean;
  maxPlayers: number;
  teamBased: boolean;
  description: string;
  lastsOptions: number[];
}

export const GAME_MODE_SCRIM_META: Record<string, GameModeScrimMeta> = {
  competitive:     { scrimId: 'competitive', label: 'Competitive', icon: 'trophy', hasRank: true, hasRrPenalty: true, maxPlayers: 5, teamBased: true, description: 'Ranked 5v5 on attack & defense', lastsOptions: [1, 2, 3] },
  unrated:         { scrimId: 'unrated', label: 'Unrated', icon: 'game-controller', hasRank: false, hasRrPenalty: false, maxPlayers: 5, teamBased: true, description: 'Casual 5v5, no rank impact', lastsOptions: [1, 2, 3] },
  premier:         { scrimId: 'premier', label: 'Premier', icon: 'shield', hasRank: true, hasRrPenalty: true, maxPlayers: 5, teamBased: true, description: 'Team-based competitive league', lastsOptions: [1, 2, 3, 4] },
  swiftplay:       { scrimId: 'swiftplay', label: 'Swiftplay', icon: 'flash', hasRank: false, hasRrPenalty: false, maxPlayers: 5, teamBased: true, description: 'Shorter matches, faster rounds', lastsOptions: [1, 2, 3] },
  knockout:        { scrimId: 'knockout', label: 'Knockout', icon: 'bonfire', hasRank: false, hasRrPenalty: false, maxPlayers: 5, teamBased: true, description: 'Win-or-go-home elimination rounds', lastsOptions: [1, 2, 3] },
  spike_rush:      { scrimId: 'spike_rush', label: 'Spike Rush', icon: 'flash-outline', hasRank: false, hasRrPenalty: false, maxPlayers: 5, teamBased: true, description: 'Fast-paced with random loadouts', lastsOptions: [1, 2, 3] },
  team_deathmatch: { scrimId: 'team_deathmatch', label: 'Team Deathmatch', icon: 'skull', hasRank: false, hasRrPenalty: false, maxPlayers: 5, teamBased: true, description: '5v5 frag fest, first to win', lastsOptions: [1, 2, 3] },
  escalation:      { scrimId: 'escalation', label: 'Escalation', icon: 'trending-up', hasRank: false, hasRrPenalty: false, maxPlayers: 5, teamBased: true, description: 'Team gun game, cycle weapons', lastsOptions: [1, 2, 3] },
  skirmish_2v2:    { scrimId: 'skirmish_2v2', label: 'Skirmish 2v2', icon: 'people', hasRank: false, hasRrPenalty: false, maxPlayers: 2, teamBased: true, description: '2v2 close-quarters duels', lastsOptions: [1] },
  deathmatch:      { scrimId: 'deathmatch', label: 'Deathmatch', icon: 'skull-outline', hasRank: false, hasRrPenalty: false, maxPlayers: 14, teamBased: false, description: 'Free-for-all warm-up', lastsOptions: [] },
  custom:          { scrimId: 'custom', label: 'Custom', icon: 'settings', hasRank: false, hasRrPenalty: false, maxPlayers: 5, teamBased: true, description: 'Custom rules, your lobby', lastsOptions: [1, 2, 3, 4] },
};

export function getGameModeScrimMeta(scrimId: string): GameModeScrimMeta | undefined {
  return GAME_MODE_SCRIM_META[scrimId];
}
