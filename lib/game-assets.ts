import { supabase } from './supabase';

// ── Public URL builder ──────────────────────────────
const BUCKET = 'game-assets';

/**
 * Returns the public CDN URL for a game asset.
 *
 * @example
 *   getAssetUrl('valorant', 'agents', 'jett.png')
 *   // → https://xxx.supabase.co/storage/v1/object/public/game-assets/valorant/agents/jett.png
 */
export function getAssetUrl(
  game: string,
  type: 'agents' | 'maps' | 'ranks',
  filename: string,
): string {
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`${game}/${type}/${filename}`);
  return data.publicUrl;
}

// ── Valorant metadata ───────────────────────────────

export interface AgentMeta {
  id: string;
  name: string;
  role: 'duelist' | 'initiator' | 'controller' | 'sentinel';
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
  { id: 'miks', name: 'Miks', role: 'initiator', image: 'miks.png' },
  { id: 'tejo', name: 'Tejo', role: 'initiator', image: 'tejo.png' },
  { id: 'veto', name: 'Veto', role: 'initiator', image: 'veto.png' },
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
