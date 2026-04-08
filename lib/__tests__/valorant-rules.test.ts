import {
  parseRank,
  isValidPartySize,
  getAllowedRankRange,
  isTrioAllowed,
  getRRPenalty,
  canUnrankedJoin,
} from '../valorant-rules';

// ── parseRank ───────────────────────────────────────

describe('parseRank', () => {
  it('parses a standard rank with tier and division', () => {
    expect(parseRank('iron_1')).toEqual({
      id: 'iron_1',
      tier: 'iron',
      division: 1,
      index: 1,
    });
  });

  it('parses a mid-range rank correctly', () => {
    expect(parseRank('diamond_2')).toEqual({
      id: 'diamond_2',
      tier: 'diamond',
      division: 2,
      index: 17,
    });
  });

  it('parses radiant as division 0 and index 25', () => {
    expect(parseRank('radiant')).toEqual({
      id: 'radiant',
      tier: 'radiant',
      division: 0,
      index: 25,
    });
  });

  it('parses unranked as division 0 and index 0', () => {
    expect(parseRank('unranked')).toEqual({
      id: 'unranked',
      tier: 'unranked',
      division: 0,
      index: 0,
    });
  });

  it('returns null for invalid division (4)', () => {
    expect(parseRank('diamond_4')).toBeNull();
  });

  it('returns null for non-existent tier', () => {
    expect(parseRank('master_1')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseRank('')).toBeNull();
  });

  it('returns null for division 0 on a tiered rank', () => {
    expect(parseRank('gold_0')).toBeNull();
  });

  it('returns null for negative division', () => {
    expect(parseRank('gold_-1')).toBeNull();
  });

  it('returns null for non-integer division', () => {
    expect(parseRank('gold_1.5')).toBeNull();
  });

  it('returns null for unranked_1 (unranked has no divisions)', () => {
    expect(parseRank('unranked_1')).toBeNull();
  });

  it('returns null for radiant_1 (radiant has no divisions)', () => {
    expect(parseRank('radiant_1')).toBeNull();
  });
});

// ── isValidPartySize ────────────────────────────────

describe('isValidPartySize', () => {
  it('allows solo in ranked', () => {
    expect(isValidPartySize(1, true)).toBe(true);
  });

  it('allows duo in ranked', () => {
    expect(isValidPartySize(2, true)).toBe(true);
  });

  it('allows trio in ranked', () => {
    expect(isValidPartySize(3, true)).toBe(true);
  });

  it('rejects 4-stack in ranked', () => {
    expect(isValidPartySize(4, true)).toBe(false);
  });

  it('allows 5-stack in ranked', () => {
    expect(isValidPartySize(5, true)).toBe(true);
  });

  it('rejects 6+ in ranked', () => {
    expect(isValidPartySize(6, true)).toBe(false);
  });

  it('rejects 0 in ranked', () => {
    expect(isValidPartySize(0, true)).toBe(false);
  });

  it('allows 4-stack in non-ranked mode', () => {
    expect(isValidPartySize(4, false)).toBe(true);
  });

  it('allows any size in non-ranked mode', () => {
    expect(isValidPartySize(7, false)).toBe(true);
  });
});

// ── getAllowedRankRange ─────────────────────────────

describe('getAllowedRankRange', () => {
  it('returns Iron 1 to Silver 3 for Iron 1', () => {
    expect(getAllowedRankRange(parseRank('iron_1')!, true)).toEqual({
      min: { id: 'iron_1', tier: 'iron', division: 1, index: 1 },
      max: { id: 'silver_3', tier: 'silver', division: 3, index: 9 },
    });
  });

  it('returns Silver 1 to Platinum 3 for Gold 1', () => {
    expect(getAllowedRankRange(parseRank('gold_1')!, true)).toEqual({
      min: { id: 'silver_1', tier: 'silver', division: 1, index: 7 },
      max: { id: 'platinum_3', tier: 'platinum', division: 3, index: 15 },
    });
  });

  it('returns Silver 1 to Platinum 3 for Gold 3', () => {
    expect(getAllowedRankRange(parseRank('gold_3')!, true)).toEqual({
      min: { id: 'silver_1', tier: 'silver', division: 1, index: 7 },
      max: { id: 'platinum_3', tier: 'platinum', division: 3, index: 15 },
    });
  });

  it('returns Gold 1 to Diamond 1 for Platinum 1', () => {
    expect(getAllowedRankRange(parseRank('platinum_1')!, true)).toEqual({
      min: { id: 'gold_1', tier: 'gold', division: 1, index: 10 },
      max: { id: 'diamond_1', tier: 'diamond', division: 1, index: 16 },
    });
  });

  it('returns Gold 1 to Diamond 3 for Platinum 3', () => {
    expect(getAllowedRankRange(parseRank('platinum_3')!, true)).toEqual({
      min: { id: 'gold_1', tier: 'gold', division: 1, index: 10 },
      max: { id: 'diamond_3', tier: 'diamond', division: 3, index: 18 },
    });
  });

  it('returns Platinum 2 to Ascendant 2 for Diamond 2', () => {
    expect(getAllowedRankRange(parseRank('diamond_2')!, true)).toEqual({
      min: { id: 'platinum_2', tier: 'platinum', division: 2, index: 14 },
      max: { id: 'ascendant_2', tier: 'ascendant', division: 2, index: 20 },
    });
  });

  it('returns Ascendant 1 to Radiant for Immortal 1', () => {
    expect(getAllowedRankRange(parseRank('immortal_1')!, true)).toEqual({
      min: { id: 'ascendant_1', tier: 'ascendant', division: 1, index: 19 },
      max: { id: 'radiant', tier: 'radiant', division: 0, index: 25 },
    });
  });

  it('returns Immortal 1 to Radiant for Radiant', () => {
    expect(getAllowedRankRange(parseRank('radiant')!, true)).toEqual({
      min: { id: 'immortal_1', tier: 'immortal', division: 1, index: 22 },
      max: { id: 'radiant', tier: 'radiant', division: 0, index: 25 },
    });
  });

  it('returns null for non-ranked mode', () => {
    expect(getAllowedRankRange(parseRank('diamond_2')!, false)).toBeNull();
  });

  it('returns null for unranked player', () => {
    expect(getAllowedRankRange(parseRank('unranked')!, true)).toBeNull();
  });
});

// ── isTrioAllowed ───────────────────────────────────

describe('isTrioAllowed', () => {
  it('allows trio for Diamond 3 in ranked', () => {
    expect(isTrioAllowed(parseRank('diamond_3')!, true)).toBe(true);
  });

  it('allows trio for Ascendant 3 in ranked (boundary below Immortal)', () => {
    expect(isTrioAllowed(parseRank('ascendant_3')!, true)).toBe(true);
  });

  it('forbids trio for Immortal 1 in ranked', () => {
    expect(isTrioAllowed(parseRank('immortal_1')!, true)).toBe(false);
  });

  it('forbids trio for Immortal 3 in ranked', () => {
    expect(isTrioAllowed(parseRank('immortal_3')!, true)).toBe(false);
  });

  it('forbids trio for Radiant in ranked', () => {
    expect(isTrioAllowed(parseRank('radiant')!, true)).toBe(false);
  });

  it('allows trio for Immortal 1 in non-ranked mode', () => {
    expect(isTrioAllowed(parseRank('immortal_1')!, false)).toBe(true);
  });
});

// ── getRRPenalty ────────────────────────────────────

describe('getRRPenalty', () => {
  it('returns no penalty for a compliant 5-stack within 3-rank window', () => {
    const members = [
      parseRank('iron_1')!,
      parseRank('iron_2')!,
      parseRank('iron_3')!,
      parseRank('bronze_1')!,
      parseRank('bronze_2')!,
    ];
    expect(getRRPenalty(members, true)).toEqual({
      penalty: 0,
      reason: 'none',
    });
  });

  it('returns no penalty at exactly 3-rank spread (spread = 9)', () => {
    const members = [
      parseRank('iron_1')!,
      parseRank('iron_3')!,
      parseRank('bronze_2')!,
      parseRank('silver_1')!,
      parseRank('gold_1')!,
    ];
    // iron_1 index=1, gold_1 index=10, spread=9 = exactly 3 ranks = OK
    expect(getRRPenalty(members, true)).toEqual({
      penalty: 0,
      reason: 'none',
    });
  });

  it('returns outside_rank_window at spread = 10 (off-by-one boundary)', () => {
    const members = [
      parseRank('iron_1')!,
      parseRank('iron_3')!,
      parseRank('bronze_2')!,
      parseRank('silver_1')!,
      parseRank('gold_2')!,
    ];
    // iron_1 index=1, gold_2 index=11, spread=10 > 9 = penalty
    expect(getRRPenalty(members, true)).toEqual({
      penalty: 0.25,
      reason: 'outside_rank_window',
    });
  });

  it('returns diamond3_plus_present when a Diamond 3 player is in the group', () => {
    const members = [
      parseRank('diamond_1')!,
      parseRank('diamond_1')!,
      parseRank('diamond_2')!,
      parseRank('diamond_2')!,
      parseRank('diamond_3')!,
    ];
    expect(getRRPenalty(members, true)).toEqual({
      penalty: 0.25,
      reason: 'diamond3_plus_present',
    });
  });

  it('returns diamond3_plus_present for Ascendant player', () => {
    const members = [
      parseRank('diamond_1')!,
      parseRank('diamond_1')!,
      parseRank('diamond_2')!,
      parseRank('diamond_2')!,
      parseRank('ascendant_1')!,
    ];
    expect(getRRPenalty(members, true)).toEqual({
      penalty: 0.25,
      reason: 'diamond3_plus_present',
    });
  });

  it('returns radiant_present when one Radiant is in the group', () => {
    const members = [
      parseRank('immortal_1')!,
      parseRank('immortal_2')!,
      parseRank('immortal_3')!,
      parseRank('immortal_3')!,
      parseRank('radiant')!,
    ];
    expect(getRRPenalty(members, true)).toEqual({
      penalty: 0.75,
      reason: 'radiant_present',
    });
  });

  it('returns radiant_present when all five are Radiant', () => {
    const members = [
      parseRank('radiant')!,
      parseRank('radiant')!,
      parseRank('radiant')!,
      parseRank('radiant')!,
      parseRank('radiant')!,
    ];
    expect(getRRPenalty(members, true)).toEqual({
      penalty: 0.75,
      reason: 'radiant_present',
    });
  });

  it('returns no penalty for a group that is not a 5-stack', () => {
    const members = [
      parseRank('iron_1')!,
      parseRank('radiant')!,
      parseRank('radiant')!,
    ];
    expect(getRRPenalty(members, true)).toEqual({
      penalty: 0,
      reason: 'none',
    });
  });

  it('returns no penalty in non-ranked mode regardless of composition', () => {
    const members = [
      parseRank('iron_1')!,
      parseRank('iron_1')!,
      parseRank('iron_1')!,
      parseRank('iron_1')!,
      parseRank('radiant')!,
    ];
    expect(getRRPenalty(members, false)).toEqual({
      penalty: 0,
      reason: 'none',
    });
  });

  it('prioritizes radiant_present over diamond3_plus_present', () => {
    const members = [
      parseRank('diamond_3')!,
      parseRank('ascendant_1')!,
      parseRank('ascendant_2')!,
      parseRank('immortal_1')!,
      parseRank('radiant')!,
    ];
    // Both diamond3+ and radiant are present; radiant has higher priority
    expect(getRRPenalty(members, true)).toEqual({
      penalty: 0.75,
      reason: 'radiant_present',
    });
  });
});

// ── canUnrankedJoin ─────────────────────────────────

describe('canUnrankedJoin', () => {
  it('allows joining when highest rank is Gold 3 (boundary)', () => {
    expect(canUnrankedJoin(parseRank('gold_3')!, true)).toBe(true);
  });

  it('allows joining when highest rank is Iron 1', () => {
    expect(canUnrankedJoin(parseRank('iron_1')!, true)).toBe(true);
  });

  it('rejects joining when highest rank is Platinum 1', () => {
    expect(canUnrankedJoin(parseRank('platinum_1')!, true)).toBe(false);
  });

  it('rejects joining when highest rank is Radiant', () => {
    expect(canUnrankedJoin(parseRank('radiant')!, true)).toBe(false);
  });

  it('allows joining in non-ranked mode regardless of rank', () => {
    expect(canUnrankedJoin(parseRank('radiant')!, false)).toBe(true);
  });
});
