// Pure helpers for sync-valorant-data. No Deno-specific imports so unit tests
// can import this file directly via `deno test`.

const ROMAN_NUMERALS: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
};

export function parseEpisodeNumber(displayName: string): number | null {
  const epMatch = displayName.match(/^EPISODE (\d+)$/);
  if (epMatch) return parseInt(epMatch[1], 10);

  const vMatch = displayName.match(/^V(\d+)$/);
  if (vMatch) return parseInt(vMatch[1], 10);

  return null;
}

export function parseActNumber(displayName: string): number | null {
  const romanMatch = displayName.match(/^ACT ([IVX]+)$/);
  if (romanMatch && ROMAN_NUMERALS[romanMatch[1]] !== undefined) {
    return ROMAN_NUMERALS[romanMatch[1]];
  }

  const arabicMatch = displayName.match(/^ACT (\d+)$/);
  if (arabicMatch) return parseInt(arabicMatch[1], 10);

  return null;
}

export function generateAgentSlug(displayName: string): string {
  return displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Maps with these UUIDs are duplicates managed in DB by the dedup migration.
// valorant-api still returns them — skip on sync to avoid re-creating.
export const BLOCKED_MAP_UUIDS = new Set<string>([
  '5914d1e0-40c4-cfdd-6b88-eba06347686c', // duplicate The Range
]);

// Stringifies any thrown value: native Error, Supabase PostgrestError-like
// object, or arbitrary thrown values. Without this, `String(error)` on a
// PostgrestError returns "[object Object]".
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    if (typeof obj.message === 'string') {
      const parts = [obj.message];
      if (obj.code) parts.push(`code=${obj.code}`);
      if (obj.details) parts.push(`details=${obj.details}`);
      if (obj.hint) parts.push(`hint=${obj.hint}`);
      return parts.join(' | ');
    }
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}
