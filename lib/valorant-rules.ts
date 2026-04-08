// ── Valorant Rules Engine ───────────────────────────
// Pure TypeScript module, zero dependencies.
// Source of truth: docs/valorant-rules.md (Season V26 Act 2)

// ── Types ───────────────────────────────────────────

export type RankTier =
  | 'unranked'
  | 'iron'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'ascendant'
  | 'immortal'
  | 'radiant';

export interface ParsedRank {
  id: string;
  tier: RankTier;
  division: 0 | 1 | 2 | 3;
  index: number;
}

export type PenaltyReason =
  | 'none'
  | 'outside_rank_window'
  | 'diamond3_plus_present'
  | 'radiant_present';

export interface RRPenaltyResult {
  penalty: number;
  reason: PenaltyReason;
}

// ── Constants ───────────────────────────────────────

const RANK_TIERS: RankTier[] = [
  'unranked',
  'iron',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'ascendant',
  'immortal',
  'radiant',
];

/** Mapping rank ID → ordinal index (0–25) */
const RANK_ORDER: Record<string, number> = {
  unranked: 0,
  iron_1: 1,
  iron_2: 2,
  iron_3: 3,
  bronze_1: 4,
  bronze_2: 5,
  bronze_3: 6,
  silver_1: 7,
  silver_2: 8,
  silver_3: 9,
  gold_1: 10,
  gold_2: 11,
  gold_3: 12,
  platinum_1: 13,
  platinum_2: 14,
  platinum_3: 15,
  diamond_1: 16,
  diamond_2: 17,
  diamond_3: 18,
  ascendant_1: 19,
  ascendant_2: 20,
  ascendant_3: 21,
  immortal_1: 22,
  immortal_2: 23,
  immortal_3: 24,
  radiant: 25,
};

/**
 * Duo/trio rank disparity: lowest rank in group → highest rank allowed.
 * Transcribed line-by-line from docs/valorant-rules.md section 3.
 * Unranked is NOT in this table (see canUnrankedJoin).
 */
const RANK_DISPARITY_TABLE: Record<string, string> = {
  iron_1: 'silver_3',
  iron_2: 'silver_3',
  iron_3: 'silver_3',
  bronze_1: 'silver_3',
  bronze_2: 'silver_3',
  bronze_3: 'silver_3',
  silver_1: 'gold_3',
  silver_2: 'gold_3',
  silver_3: 'gold_3',
  gold_1: 'platinum_3',
  gold_2: 'platinum_3',
  gold_3: 'platinum_3',
  platinum_1: 'diamond_1',
  platinum_2: 'diamond_2',
  platinum_3: 'diamond_3',
  diamond_1: 'ascendant_1',
  diamond_2: 'ascendant_2',
  diamond_3: 'ascendant_3',
  ascendant_1: 'immortal_1',
  ascendant_2: 'immortal_2',
  ascendant_3: 'immortal_3',
  immortal_1: 'radiant',
  immortal_2: 'radiant',
  immortal_3: 'radiant',
  radiant: 'radiant',
};

/**
 * Duo/trio rank disparity inverse: for a given rank, the lowest rank
 * allowed in the group.
 *
 * Derived from RANK_DISPARITY_TABLE: for rank X, min is the lowest Y
 * such that RANK_DISPARITY_TABLE[Y] >= X.
 *
 * Radiant case: Immortal 1/2/3 all have "Radiant" as max allowed,
 * so a Radiant player can duo with any Immortal. Min = immortal_1.
 */
const RANK_DISPARITY_MIN_TABLE: Record<string, string> = {
  iron_1: 'iron_1',
  iron_2: 'iron_1',
  iron_3: 'iron_1',
  bronze_1: 'iron_1',
  bronze_2: 'iron_1',
  bronze_3: 'iron_1',
  silver_1: 'iron_1',
  silver_2: 'iron_1',
  silver_3: 'iron_1',
  gold_1: 'silver_1',
  gold_2: 'silver_1',
  gold_3: 'silver_1',
  platinum_1: 'gold_1',
  platinum_2: 'gold_1',
  platinum_3: 'gold_1',
  diamond_1: 'platinum_1',
  diamond_2: 'platinum_2',
  diamond_3: 'platinum_3',
  ascendant_1: 'diamond_1',
  ascendant_2: 'diamond_2',
  ascendant_3: 'diamond_3',
  immortal_1: 'ascendant_1',
  immortal_2: 'ascendant_2',
  immortal_3: 'ascendant_3',
  radiant: 'immortal_1',
};

/**
 * 5-stack RR penalty rules, evaluated in priority order (first match wins).
 * Source: docs/valorant-rules.md section 3 "5-stack penalties".
 *
 * NOTE on the "Iron a Diamond 2" lower bound from the doc:
 * The doc lists "all players Iron to Diamond 2, within a 3-rank window"
 * as the no-penalty condition. We do NOT check the "Iron to Diamond 2"
 * bound explicitly because it is implicitly satisfied by the sequential
 * evaluation of the rules below:
 *   - Rule 1 fires if any Radiant is present (penalty 0.75)
 *   - Rule 2 fires if any Diamond 3+ is present (penalty 0.25)
 *   - Rule 3 fires if the spread exceeds 9 indices (penalty 0.25)
 *   - Fallback: no penalty
 * If we reach the fallback, by construction all players are below
 * Diamond 3 (so Iron to Diamond 2) AND within a 3-rank window. The
 * explicit "Iron to Diamond 2" check would be redundant.
 */
const FIVE_STACK_PENALTY_RULES: {
  check: (members: ParsedRank[]) => boolean;
  result: RRPenaltyResult;
}[] = [
  {
    check: (members) => members.some((m) => m.index >= RANK_ORDER['radiant']),
    result: { penalty: 0.75, reason: 'radiant_present' },
  },
  {
    check: (members) => members.some((m) => m.index >= RANK_ORDER['diamond_3']),
    result: { penalty: 0.25, reason: 'diamond3_plus_present' },
  },
  {
    check: (members) => {
      const indexes = members.map((m) => m.index);
      const spread = Math.max(...indexes) - Math.min(...indexes);
      return spread > 9;
    },
    result: { penalty: 0.25, reason: 'outside_rank_window' },
  },
];

// ── parseRank ───────────────────────────────────────

export function parseRank(value: string): ParsedRank | null {
  if (value === 'unranked') {
    return { id: 'unranked', tier: 'unranked', division: 0, index: 0 };
  }

  if (value === 'radiant') {
    return { id: 'radiant', tier: 'radiant', division: 0, index: 25 };
  }

  const parts = value.split('_');
  if (parts.length !== 2) return null;

  const [tierStr, divStr] = parts;
  const tier = tierStr as RankTier;
  if (!RANK_TIERS.includes(tier)) return null;
  if (tier === 'unranked' || tier === 'radiant') return null;

  const divNum = Number(divStr);
  if (divNum !== 1 && divNum !== 2 && divNum !== 3) return null;
  const division: 1 | 2 | 3 = divNum;

  const id = value;
  const index = RANK_ORDER[id];
  if (index === undefined) return null;

  return { id, tier, division, index };
}

// ── Public functions ────────────────────────────────

export function isValidPartySize(size: number, isRanked: boolean): boolean {
  if (!isRanked) return true;
  return size === 1 || size === 2 || size === 3 || size === 5;
}

export function getAllowedRankRange(
  rank: ParsedRank,
  isRanked: boolean,
): { min: ParsedRank; max: ParsedRank } | null {
  if (!isRanked) return null;
  if (rank.tier === 'unranked') return null;

  const maxId = RANK_DISPARITY_TABLE[rank.id];
  const minId = RANK_DISPARITY_MIN_TABLE[rank.id];
  if (!maxId || !minId) return null;

  const max = parseRank(maxId);
  const min = parseRank(minId);
  if (!max || !min) return null;

  return { min, max };
}

export function isTrioAllowed(
  highestRank: ParsedRank,
  isRanked: boolean,
): boolean {
  if (!isRanked) return true;
  return highestRank.tier !== 'immortal' && highestRank.tier !== 'radiant';
}

export function getRRPenalty(
  members: ParsedRank[],
  isRanked: boolean,
): RRPenaltyResult {
  if (!isRanked) return { penalty: 0, reason: 'none' };
  if (members.length !== 5) return { penalty: 0, reason: 'none' };

  for (const rule of FIVE_STACK_PENALTY_RULES) {
    if (rule.check(members)) return rule.result;
  }

  return { penalty: 0, reason: 'none' };
}

export function canUnrankedJoin(
  highestRank: ParsedRank,
  isRanked: boolean,
): boolean {
  if (!isRanked) return true;
  return highestRank.index <= RANK_ORDER['gold_3'];
}
