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

export const VALORANT_AGENTS: AgentMeta[] = [
  { id: 'astra', name: 'Astra', role: 'controller', image: 'astra.png' },
  { id: 'breach', name: 'Breach', role: 'initiator', image: 'breach.png' },
  { id: 'brimstone', name: 'Brimstone', role: 'controller', image: 'brimstone.png' },
  { id: 'chamber', name: 'Chamber', role: 'sentinel', image: 'chamber.png' },
  { id: 'clove', name: 'Clove', role: 'controller', image: 'clove.png' },
  { id: 'cypher', name: 'Cypher', role: 'sentinel', image: 'cypher.png' },
  { id: 'deadlock', name: 'Deadlock', role: 'sentinel', image: 'deadlock.png' },
  { id: 'fade', name: 'Fade', role: 'initiator', image: 'fade.png' },
  { id: 'gekko', name: 'Gekko', role: 'initiator', image: 'gekko.png' },
  { id: 'harbor', name: 'Harbor', role: 'controller', image: 'harbor.png' },
  { id: 'iso', name: 'Iso', role: 'duelist', image: 'iso.png' },
  { id: 'jett', name: 'Jett', role: 'duelist', image: 'jett.png' },
  { id: 'kayo', name: 'KAY/O', role: 'initiator', image: 'kayo.png' },
  { id: 'killjoy', name: 'Killjoy', role: 'sentinel', image: 'killjoy.png' },
  { id: 'neon', name: 'Neon', role: 'duelist', image: 'neon.png' },
  { id: 'omen', name: 'Omen', role: 'controller', image: 'omen.png' },
  { id: 'phoenix', name: 'Phoenix', role: 'duelist', image: 'phoenix.png' },
  { id: 'raze', name: 'Raze', role: 'duelist', image: 'raze.png' },
  { id: 'reyna', name: 'Reyna', role: 'duelist', image: 'reyna.png' },
  { id: 'sage', name: 'Sage', role: 'sentinel', image: 'sage.png' },
  { id: 'skye', name: 'Skye', role: 'initiator', image: 'skye.png' },
  { id: 'sova', name: 'Sova', role: 'initiator', image: 'sova.png' },
  { id: 'viper', name: 'Viper', role: 'controller', image: 'viper.png' },
  { id: 'vyse', name: 'Vyse', role: 'sentinel', image: 'vyse.png' },
  { id: 'yoru', name: 'Yoru', role: 'duelist', image: 'yoru.png' },
  { id: 'miks', name: 'Miks', role: 'controller', image: 'miks.png' },
  { id: 'tejo', name: 'Tejo', role: 'initiator', image: 'tejo.png' },
  { id: 'veto', name: 'Veto', role: 'sentinel', image: 'veto.png' },
  { id: 'waylay', name: 'Waylay', role: 'duelist', image: 'waylay.png' },
];

export const VALORANT_MAPS: MapMeta[] = [
  { id: 'abyss', name: 'Abyss', image: 'abyss.png' },
  { id: 'ascent', name: 'Ascent', image: 'ascent.png' },
  { id: 'bind', name: 'Bind', image: 'bind.png' },
  { id: 'breeze', name: 'Breeze', image: 'breeze.png' },
  { id: 'corrode', name: 'Corrode', image: 'corrode.png' },
  { id: 'fracture', name: 'Fracture', image: 'fracture.png' },
  { id: 'haven', name: 'Haven', image: 'haven.png' },
  { id: 'icebox', name: 'Icebox', image: 'icebox.png' },
  { id: 'lotus', name: 'Lotus', image: 'lotus.png' },
  { id: 'pearl', name: 'Pearl', image: 'pearl.png' },
  { id: 'split', name: 'Split', image: 'split.png' },
  { id: 'sunset', name: 'Sunset', image: 'sunset.png' },
];

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

/** Returns the rank image filename for a given rank ID */
export function getRankImage(rankId: string, ranks: RankMeta[]): string | null {
  const rank = ranks.find((r) => r.id === rankId);
  return rank?.image ?? null;
}

// ── Game Modes ──────────────────────────────────────

export type ValorantGameModeId =
  | 'competitive'
  | 'unrated'
  | 'premier'
  | 'swiftplay'
  | 'spike_rush'
  | 'deathmatch'
  | 'team_deathmatch'
  | 'escalation'
  | 'knockout'
  | 'skirmish_2v2'
  | 'custom';

export interface GameModeMeta {
  id: ValorantGameModeId;
  label: string;
  icon: string; // Ionicons name
  maxPlayers: number;
  hasRank: boolean;
  hasRrPenalty: boolean;
  teamBased: boolean;
  description: string;
  lastsOptions: number[];
}

export const VALORANT_GAME_MODES: GameModeMeta[] = [
  {
    id: 'competitive',
    label: 'Competitive',
    icon: 'trophy',
    maxPlayers: 5,
    hasRank: true,
    hasRrPenalty: true,
    teamBased: true,
    description: 'Ranked 5v5 on attack & defense',
    lastsOptions: [1, 2, 3],
  },
  {
    id: 'unrated',
    label: 'Unrated',
    icon: 'game-controller',
    maxPlayers: 5,
    hasRank: true,
    hasRrPenalty: false,
    teamBased: true,
    description: 'Casual 5v5, no rank impact',
    lastsOptions: [1, 2, 3],
  },
  {
    id: 'premier',
    label: 'Premier',
    icon: 'shield',
    maxPlayers: 5,
    hasRank: true,
    hasRrPenalty: true,
    teamBased: true,
    description: 'Team-based competitive league',
    lastsOptions: [1, 2, 3, 4],
  },
  {
    id: 'swiftplay',
    label: 'Swiftplay',
    icon: 'flash',
    maxPlayers: 5,
    hasRank: false,
    hasRrPenalty: false,
    teamBased: true,
    description: 'Shorter matches, faster rounds',
    lastsOptions: [1, 2, 3],
  },
  {
    id: 'knockout',
    label: 'Knockout',
    icon: 'bonfire',
    maxPlayers: 5,
    hasRank: false,
    hasRrPenalty: false,
    teamBased: true,
    description: 'Win-or-go-home elimination rounds',
    lastsOptions: [1, 2, 3],
  },
  {
    id: 'spike_rush',
    label: 'Spike Rush',
    icon: 'flash-outline',
    maxPlayers: 5,
    hasRank: false,
    hasRrPenalty: false,
    teamBased: true,
    description: 'Fast-paced with random loadouts',
    lastsOptions: [1, 2, 3],
  },
  {
    id: 'team_deathmatch',
    label: 'Team Deathmatch',
    icon: 'skull',
    maxPlayers: 5,
    hasRank: false,
    hasRrPenalty: false,
    teamBased: true,
    description: '5v5 frag fest, first to win',
    lastsOptions: [1, 2, 3],
  },
  {
    id: 'escalation',
    label: 'Escalation',
    icon: 'trending-up',
    maxPlayers: 5,
    hasRank: false,
    hasRrPenalty: false,
    teamBased: true,
    description: 'Team gun game, cycle weapons',
    lastsOptions: [1, 2, 3],
  },
  {
    id: 'skirmish_2v2',
    label: 'Skirmish 2v2',
    icon: 'people',
    maxPlayers: 2,
    hasRank: false,
    hasRrPenalty: false,
    teamBased: true,
    description: '2v2 close-quarters duels',
    lastsOptions: [1],
  },
  {
    id: 'deathmatch',
    label: 'Deathmatch',
    icon: 'skull-outline',
    maxPlayers: 14,
    hasRank: false,
    hasRrPenalty: false,
    teamBased: false,
    description: 'Free-for-all warm-up',
    lastsOptions: [],
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: 'settings',
    maxPlayers: 5,
    hasRank: false,
    hasRrPenalty: false,
    teamBased: true,
    description: 'Custom rules, your lobby',
    lastsOptions: [1, 2, 3, 4],
  },
];

export function getGameModeById(id: string): GameModeMeta | undefined {
  return VALORANT_GAME_MODES.find((m) => m.id === id);
}
