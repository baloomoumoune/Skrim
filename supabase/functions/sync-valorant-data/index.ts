// Supabase Edge Function: sync-valorant-data
// Syncs 10 endpoints from valorant-api.com into Supabase tables and writes
// an audit row to sync_runs. Rank reset is triggered on Act change.
//
// Auth: Bearer token must be a valid service_role JWT.
// Trigger: pg_cron daily at 03:00 UTC via pg_net, or manual curl.
//
// Deploy: supabase functions deploy sync-valorant-data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BLOCKED_MAP_UUIDS, errorMessage, generateAgentSlug, parseActNumber, parseEpisodeNumber } from './helpers.ts';

// ============================================================
// API response types (subset of fields we persist)
// ============================================================

interface ApiAgent {
  uuid: string;
  displayName: string;
  description: string | null;
  developerName: string | null;
  role: { uuid: string; displayName: string; displayIcon: string | null } | null;
  displayIcon: string | null;
  fullPortrait: string | null;
  killfeedPortrait: string | null;
  background: string | null;
  abilities: Array<{ slot: string; displayName: string; description: string | null; displayIcon: string | null }>;
  isBaseContent: boolean;
}

interface ApiMap {
  uuid: string;
  displayName: string;
  tacticalDescription: string | null;
  coordinates: string | null;
  displayIcon: string | null;
  listViewIcon: string | null;
  splash: string | null;
}

interface ApiGameMode {
  uuid: string;
  displayName: string;
  description: string | null;
  duration: string | null;
  displayIcon: string | null;
  allowsMatchTimeouts: boolean;
  isTeamVoiceAllowed: boolean;
}

interface ApiSeason {
  uuid: string;
  displayName: string;
  type: string | null;
  startTime: string;
  endTime: string;
  parentUuid: string | null;
}

interface ApiSeasonCompetitive {
  uuid: string;
  startTime: string;
  endTime: string;
  seasonUuid: string;
  competitiveTiersUuid: string;
  borders: unknown[] | null;
  assetPath: string | null;
}

interface ApiCompetitiveTier {
  uuid: string;
  assetObjectName: string | null;
  tiers: unknown[];
  assetPath: string | null;
}

interface ApiWeapon {
  uuid: string;
  displayName: string;
  category: string;
  defaultSkinUuid: string | null;
  displayIcon: string | null;
  killStreamIcon: string | null;
  assetPath: string | null;
  weaponStats: unknown | null;
  shopData: unknown | null;
}

interface ApiGear {
  uuid: string;
  displayName: string;
  description: string | null;
  displayIcon: string | null;
  assetPath: string | null;
  shopData: unknown | null;
}

interface ApiLevelBorder {
  uuid: string;
  displayName: string | null;
  startingLevel: number;
  levelNumberAppearance: string | null;
  smallPlayerCardAppearance: string | null;
  assetPath: string | null;
}

interface ApiEvent {
  uuid: string;
  displayName: string;
  shortDisplayName: string | null;
  startTime: string;
  endTime: string;
  assetPath: string | null;
}

interface ApiVersion {
  manifestId: string;
  version: string;
  buildDate: string;
}

interface SyncResult {
  status: 'success' | 'error';
  fetched: number;
  upserted: number;
  error?: string;
}

// ============================================================
// Constants
// ============================================================

const API_BASE = 'https://valorant-api.com/v1';
const FETCH_TIMEOUT_MS = 5000;
const ENDPOINTS = {
  version: `${API_BASE}/version`,
  agents: `${API_BASE}/agents?isPlayableCharacter=true`,
  maps: `${API_BASE}/maps`,
  gameModes: `${API_BASE}/gamemodes`,
  seasons: `${API_BASE}/seasons`,
  seasonsCompetitive: `${API_BASE}/seasons/competitive`,
  competitiveTiers: `${API_BASE}/competitivetiers`,
  weapons: `${API_BASE}/weapons`,
  gear: `${API_BASE}/gear`,
  levelBorders: `${API_BASE}/levelborders`,
  events: `${API_BASE}/events`,
} as const;

// ============================================================
// Helpers
// ============================================================

function log(event: string, data: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ...data, ts: new Date().toISOString() }));
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
    const json = await res.json();
    return json.data as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// Upsert functions — one per endpoint, all share the same shape:
// (supabase, payload) -> SyncResult
// ============================================================

async function upsertAgents(supabase: SupabaseClient, agents: ApiAgent[]): Promise<SyncResult> {
  try {
    const rows = agents.map((a) => ({
      uuid: a.uuid,
      display_name: a.displayName,
      slug: generateAgentSlug(a.displayName),
      description: a.description,
      developer_name: a.developerName,
      role_uuid: a.role?.uuid ?? '',
      role_name: a.role?.displayName ?? '',
      role_display_icon: a.role?.displayIcon ?? null,
      display_icon: a.displayIcon,
      full_portrait: a.fullPortrait,
      killfeed_portrait: a.killfeedPortrait,
      background: a.background,
      abilities: a.abilities.map((ab) => ({
        slot: ab.slot,
        displayName: ab.displayName,
        description: ab.description,
        displayIcon: ab.displayIcon,
      })),
      is_base_content: a.isBaseContent,
      raw_data: a as unknown as Record<string, unknown>,
    }));
    const { error } = await supabase.from('valorant_agents').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_agents', count: rows.length });
    return { status: 'success', fetched: agents.length, upserted: rows.length };
  } catch (e) {
    const msg = errorMessage(e);
    log('upsert_error', { table: 'valorant_agents', error: msg });
    return { status: 'error', fetched: agents.length, upserted: 0, error: msg };
  }
}

async function upsertMaps(supabase: SupabaseClient, maps: ApiMap[]): Promise<SyncResult> {
  try {
    const filtered = maps.filter((m) => !BLOCKED_MAP_UUIDS.has(m.uuid));
    const rows = filtered.map((m) => ({
      uuid: m.uuid,
      display_name: m.displayName,
      tactical_description: m.tacticalDescription,
      coordinates: m.coordinates,
      display_icon: m.displayIcon,
      list_view_icon: m.listViewIcon,
      splash: m.splash,
      raw_data: m as unknown as Record<string, unknown>,
    }));
    const { error } = await supabase.from('valorant_maps').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_maps', count: rows.length, blocked: maps.length - filtered.length });
    return { status: 'success', fetched: maps.length, upserted: rows.length };
  } catch (e) {
    const msg = errorMessage(e);
    log('upsert_error', { table: 'valorant_maps', error: msg });
    return { status: 'error', fetched: maps.length, upserted: 0, error: msg };
  }
}

async function upsertGameModes(supabase: SupabaseClient, modes: ApiGameMode[]): Promise<SyncResult> {
  try {
    const rows = modes.map((m) => ({
      uuid: m.uuid,
      display_name: m.displayName,
      description: m.description,
      duration: m.duration,
      display_icon: m.displayIcon,
      allows_match_timeouts: m.allowsMatchTimeouts,
      is_team_voice_allowed: m.isTeamVoiceAllowed,
      raw_data: m as unknown as Record<string, unknown>,
    }));
    const { error } = await supabase.from('valorant_game_modes').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_game_modes', count: rows.length });
    return { status: 'success', fetched: modes.length, upserted: rows.length };
  } catch (e) {
    const msg = errorMessage(e);
    log('upsert_error', { table: 'valorant_game_modes', error: msg });
    return { status: 'error', fetched: modes.length, upserted: 0, error: msg };
  }
}

async function upsertSeasons(supabase: SupabaseClient, allSeasons: ApiSeason[]): Promise<SyncResult> {
  try {
    // Episodes only (parentUuid === null and type is null in current API).
    const seasons = allSeasons.filter(
      (s) => s.parentUuid === null && !s.displayName.includes('Closed Beta'),
    );
    const rows = seasons.map((s) => ({
      uuid: s.uuid,
      display_name: s.displayName,
      episode_number: parseEpisodeNumber(s.displayName),
      start_time: s.startTime,
      end_time: s.endTime,
    }));
    const { error } = await supabase.from('valorant_seasons').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_seasons', count: rows.length });
    return { status: 'success', fetched: seasons.length, upserted: rows.length };
  } catch (e) {
    const msg = errorMessage(e);
    log('upsert_error', { table: 'valorant_seasons', error: msg });
    return { status: 'error', fetched: 0, upserted: 0, error: msg };
  }
}

async function upsertActs(supabase: SupabaseClient, allSeasons: ApiSeason[]): Promise<SyncResult> {
  try {
    const acts = allSeasons.filter((s) => s.parentUuid !== null);
    const rows = acts.map((a) => {
      const actNumber = parseActNumber(a.displayName);
      return {
        uuid: a.uuid,
        display_name: a.displayName,
        act_number: actNumber ?? 0, // 0 sentinel; will be visible in audit if encountered
        season_uuid: a.parentUuid!,
        start_time: a.startTime,
        end_time: a.endTime,
      };
    });

    // Surface unparseable display_names so they can be added to parseActNumber
    const unparseable = rows.filter((r) => r.act_number === 0).map((r) => r.display_name);
    if (unparseable.length > 0) log('act_number_unparseable', { display_names: unparseable });

    const { error } = await supabase.from('valorant_acts').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_acts', count: rows.length });
    return { status: 'success', fetched: acts.length, upserted: rows.length };
  } catch (e) {
    const msg = errorMessage(e);
    log('upsert_error', { table: 'valorant_acts', error: msg });
    return { status: 'error', fetched: 0, upserted: 0, error: msg };
  }
}

async function upsertCompetitiveTiers(supabase: SupabaseClient, tiers: ApiCompetitiveTier[]): Promise<SyncResult> {
  try {
    const rows = tiers.map((t) => ({
      uuid: t.uuid,
      asset_object_name: t.assetObjectName,
      tiers: t.tiers as unknown,
      asset_path: t.assetPath,
      raw_data: t as unknown as Record<string, unknown>,
    }));
    const { error } = await supabase.from('valorant_competitive_tiers').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_competitive_tiers', count: rows.length });
    return { status: 'success', fetched: tiers.length, upserted: rows.length };
  } catch (e) {
    const msg = errorMessage(e);
    log('upsert_error', { table: 'valorant_competitive_tiers', error: msg });
    return { status: 'error', fetched: tiers.length, upserted: 0, error: msg };
  }
}

async function upsertSeasonsCompetitive(
  supabase: SupabaseClient,
  competitiveSeasons: ApiSeasonCompetitive[],
  knownSeasonUuids: Set<string>,
  knownTierUuids: Set<string>,
): Promise<SyncResult> {
  try {
    // Skip rows whose FKs aren't satisfied (e.g. Closed Beta seasons we filtered out).
    const filtered = competitiveSeasons.filter(
      (cs) => knownSeasonUuids.has(cs.seasonUuid) && knownTierUuids.has(cs.competitiveTiersUuid),
    );
    const skipped = competitiveSeasons.length - filtered.length;
    const rows = filtered.map((cs) => ({
      uuid: cs.uuid,
      season_uuid: cs.seasonUuid,
      competitive_tiers_uuid: cs.competitiveTiersUuid,
      start_time: cs.startTime,
      end_time: cs.endTime,
      borders: cs.borders ?? [],
      asset_path: cs.assetPath,
      raw_data: cs as unknown as Record<string, unknown>,
    }));
    const { error } = await supabase.from('valorant_seasons_competitive').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_seasons_competitive', count: rows.length, fk_skipped: skipped });
    return { status: 'success', fetched: competitiveSeasons.length, upserted: rows.length };
  } catch (e) {
    const msg = errorMessage(e);
    log('upsert_error', { table: 'valorant_seasons_competitive', error: msg });
    return { status: 'error', fetched: competitiveSeasons.length, upserted: 0, error: msg };
  }
}

async function upsertWeapons(supabase: SupabaseClient, weapons: ApiWeapon[]): Promise<SyncResult> {
  try {
    const rows = weapons.map((w) => ({
      uuid: w.uuid,
      display_name: w.displayName,
      category: w.category,
      default_skin_uuid: w.defaultSkinUuid,
      display_icon: w.displayIcon,
      kill_stream_icon: w.killStreamIcon,
      asset_path: w.assetPath,
      weapon_stats: w.weaponStats,
      shop_data: w.shopData,
      raw_data: w as unknown as Record<string, unknown>,
    }));
    const { error } = await supabase.from('valorant_weapons').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_weapons', count: rows.length });
    return { status: 'success', fetched: weapons.length, upserted: rows.length };
  } catch (e) {
    const msg = errorMessage(e);
    log('upsert_error', { table: 'valorant_weapons', error: msg });
    return { status: 'error', fetched: weapons.length, upserted: 0, error: msg };
  }
}

async function upsertGear(supabase: SupabaseClient, gear: ApiGear[]): Promise<SyncResult> {
  try {
    const rows = gear.map((g) => ({
      uuid: g.uuid,
      display_name: g.displayName,
      description: g.description,
      display_icon: g.displayIcon,
      asset_path: g.assetPath,
      shop_data: g.shopData,
      raw_data: g as unknown as Record<string, unknown>,
    }));
    const { error } = await supabase.from('valorant_gear').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_gear', count: rows.length });
    return { status: 'success', fetched: gear.length, upserted: rows.length };
  } catch (e) {
    const msg = errorMessage(e);
    log('upsert_error', { table: 'valorant_gear', error: msg });
    return { status: 'error', fetched: gear.length, upserted: 0, error: msg };
  }
}

async function upsertLevelBorders(supabase: SupabaseClient, borders: ApiLevelBorder[]): Promise<SyncResult> {
  try {
    const rows = borders.map((b) => ({
      uuid: b.uuid,
      display_name: b.displayName,
      starting_level: b.startingLevel,
      level_number_appearance: b.levelNumberAppearance,
      small_player_card_appearance: b.smallPlayerCardAppearance,
      asset_path: b.assetPath,
      raw_data: b as unknown as Record<string, unknown>,
    }));
    const { error } = await supabase.from('valorant_level_borders').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_level_borders', count: rows.length });
    return { status: 'success', fetched: borders.length, upserted: rows.length };
  } catch (e) {
    const msg = errorMessage(e);
    log('upsert_error', { table: 'valorant_level_borders', error: msg });
    return { status: 'error', fetched: borders.length, upserted: 0, error: msg };
  }
}

async function upsertEvents(supabase: SupabaseClient, events: ApiEvent[]): Promise<SyncResult> {
  try {
    // Skip events without a display_name (table requires it NOT NULL).
    // Riot occasionally returns events with null displayName (e.g. 2025 LNY).
    const valid = events.filter((e) => e.displayName != null);
    const skipped = events.length - valid.length;
    const rows = valid.map((e) => ({
      uuid: e.uuid,
      display_name: e.displayName,
      short_display_name: e.shortDisplayName,
      start_time: e.startTime,
      end_time: e.endTime,
      asset_path: e.assetPath,
      raw_data: e as unknown as Record<string, unknown>,
    }));
    const { error } = await supabase.from('valorant_events').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_events', count: rows.length, skipped_null_name: skipped });
    return { status: 'success', fetched: events.length, upserted: rows.length };
  } catch (e) {
    const msg = errorMessage(e);
    log('upsert_error', { table: 'valorant_events', error: msg });
    return { status: 'error', fetched: events.length, upserted: 0, error: msg };
  }
}

// ============================================================
// is_current update — one declarative pass per table with a temporal flag.
// ============================================================

async function updateIsCurrent(supabase: SupabaseClient, errors: string[]): Promise<void> {
  const now = new Date().toISOString();
  const tables = ['valorant_seasons', 'valorant_acts', 'valorant_seasons_competitive', 'valorant_events'] as const;

  for (const table of tables) {
    const { error: e1 } = await supabase
      .from(table)
      .update({ is_current: true })
      .lte('start_time', now)
      .gte('end_time', now)
      .eq('is_current', false);
    if (e1) {
      errors.push(`is_current set ${table}: ${e1.message}`);
      log('is_current_error', { table, op: 'set', error: e1.message });
    }

    const { error: e2 } = await supabase
      .from(table)
      .update({ is_current: false })
      .eq('is_current', true)
      .or(`start_time.gt.${now},end_time.lt.${now}`);
    if (e2) {
      errors.push(`is_current clear ${table}: ${e2.message}`);
      log('is_current_error', { table, op: 'clear', error: e2.message });
    }
  }
  log('is_current_updated');
}

// ============================================================
// Main handler
// ============================================================

serve(async (req: Request) => {
  const startTime = Date.now();

  // 1. Auth: Bearer must be a valid service_role JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    log('auth_failed', { reason: 'missing_header' });
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const token = authHeader.replace('Bearer ', '');
  const payload = decodeJwtPayload(token);
  if (!payload || payload.role !== 'service_role') {
    log('auth_failed', { reason: 'invalid_role', role: payload?.role });
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 2. Snapshot: current Act before any sync (for rank reset detection).
  const { data: actBefore } = await supabase
    .from('valorant_acts')
    .select('uuid')
    .eq('is_current', true)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  log('sync_start', { act_before: actBefore?.uuid ?? null });
  const errors: string[] = [];
  const endpointsSummary: Record<string, SyncResult> = {};

  // 3. Fetch /version (single object, separate from the parallel batch).
  let version: ApiVersion | null = null;
  try {
    version = await fetchJson<ApiVersion>(ENDPOINTS.version);
    log('version_fetched', { version: version.version, build_date: version.buildDate });
  } catch (e) {
    errors.push(`version fetch: ${errorMessage(e)}`);
    log('version_error', { error: errorMessage(e) });
  }

  // 4. Fetch the 10 list endpoints in parallel.
  const [
    agentsRes, mapsRes, modesRes, seasonsRes, seasonsCompRes,
    competitiveTiersRes, weaponsRes, gearRes, levelBordersRes, eventsRes,
  ] = await Promise.allSettled([
    fetchJson<ApiAgent[]>(ENDPOINTS.agents),
    fetchJson<ApiMap[]>(ENDPOINTS.maps),
    fetchJson<ApiGameMode[]>(ENDPOINTS.gameModes),
    fetchJson<ApiSeason[]>(ENDPOINTS.seasons),
    fetchJson<ApiSeasonCompetitive[]>(ENDPOINTS.seasonsCompetitive),
    fetchJson<ApiCompetitiveTier[]>(ENDPOINTS.competitiveTiers),
    fetchJson<ApiWeapon[]>(ENDPOINTS.weapons),
    fetchJson<ApiGear[]>(ENDPOINTS.gear),
    fetchJson<ApiLevelBorder[]>(ENDPOINTS.levelBorders),
    fetchJson<ApiEvent[]>(ENDPOINTS.events),
  ]);

  log('fetch_complete', {
    agents: agentsRes.status, maps: mapsRes.status, game_modes: modesRes.status,
    seasons: seasonsRes.status, seasons_competitive: seasonsCompRes.status,
    competitive_tiers: competitiveTiersRes.status, weapons: weaponsRes.status,
    gear: gearRes.status, level_borders: levelBordersRes.status, events: eventsRes.status,
  });

  // 5. Process each endpoint. Order matters where FKs exist:
  //    seasons before acts; competitive_tiers + seasons before seasons_competitive.

  if (seasonsRes.status === 'fulfilled') {
    endpointsSummary.seasons = await upsertSeasons(supabase, seasonsRes.value);
    if (endpointsSummary.seasons.error) errors.push(`seasons: ${endpointsSummary.seasons.error}`);
    endpointsSummary.acts = await upsertActs(supabase, seasonsRes.value);
    if (endpointsSummary.acts.error) errors.push(`acts: ${endpointsSummary.acts.error}`);
  } else {
    const msg = errorMessage(seasonsRes.reason);
    endpointsSummary.seasons = { status: 'error', fetched: 0, upserted: 0, error: msg };
    endpointsSummary.acts = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`seasons fetch: ${msg}`);
  }

  if (competitiveTiersRes.status === 'fulfilled') {
    endpointsSummary.competitive_tiers = await upsertCompetitiveTiers(supabase, competitiveTiersRes.value);
    if (endpointsSummary.competitive_tiers.error) errors.push(`competitive_tiers: ${endpointsSummary.competitive_tiers.error}`);
  } else {
    const msg = errorMessage(competitiveTiersRes.reason);
    endpointsSummary.competitive_tiers = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`competitive_tiers fetch: ${msg}`);
  }

  if (seasonsCompRes.status === 'fulfilled' && seasonsRes.status === 'fulfilled' && competitiveTiersRes.status === 'fulfilled') {
    // Mirror upsertSeasons filter exactly: parentUuid === null AND not Closed Beta.
    const knownSeasonUuids = new Set(
      seasonsRes.value
        .filter((s) => s.parentUuid === null && !s.displayName.includes('Closed Beta'))
        .map((s) => s.uuid),
    );
    const knownTierUuids = new Set(competitiveTiersRes.value.map((t) => t.uuid));
    endpointsSummary.seasons_competitive = await upsertSeasonsCompetitive(
      supabase, seasonsCompRes.value, knownSeasonUuids, knownTierUuids,
    );
    if (endpointsSummary.seasons_competitive.error) errors.push(`seasons_competitive: ${endpointsSummary.seasons_competitive.error}`);
  } else if (seasonsCompRes.status === 'rejected') {
    const msg = errorMessage(seasonsCompRes.reason);
    endpointsSummary.seasons_competitive = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`seasons_competitive fetch: ${msg}`);
  }

  if (agentsRes.status === 'fulfilled') {
    endpointsSummary.agents = await upsertAgents(supabase, agentsRes.value);
    if (endpointsSummary.agents.error) errors.push(`agents: ${endpointsSummary.agents.error}`);
  } else {
    const msg = errorMessage(agentsRes.reason);
    endpointsSummary.agents = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`agents fetch: ${msg}`);
  }

  if (mapsRes.status === 'fulfilled') {
    endpointsSummary.maps = await upsertMaps(supabase, mapsRes.value);
    if (endpointsSummary.maps.error) errors.push(`maps: ${endpointsSummary.maps.error}`);
  } else {
    const msg = errorMessage(mapsRes.reason);
    endpointsSummary.maps = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`maps fetch: ${msg}`);
  }

  if (modesRes.status === 'fulfilled') {
    endpointsSummary.game_modes = await upsertGameModes(supabase, modesRes.value);
    if (endpointsSummary.game_modes.error) errors.push(`game_modes: ${endpointsSummary.game_modes.error}`);
  } else {
    const msg = errorMessage(modesRes.reason);
    endpointsSummary.game_modes = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`game_modes fetch: ${msg}`);
  }

  if (weaponsRes.status === 'fulfilled') {
    endpointsSummary.weapons = await upsertWeapons(supabase, weaponsRes.value);
    if (endpointsSummary.weapons.error) errors.push(`weapons: ${endpointsSummary.weapons.error}`);
  } else {
    const msg = errorMessage(weaponsRes.reason);
    endpointsSummary.weapons = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`weapons fetch: ${msg}`);
  }

  if (gearRes.status === 'fulfilled') {
    endpointsSummary.gear = await upsertGear(supabase, gearRes.value);
    if (endpointsSummary.gear.error) errors.push(`gear: ${endpointsSummary.gear.error}`);
  } else {
    const msg = errorMessage(gearRes.reason);
    endpointsSummary.gear = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`gear fetch: ${msg}`);
  }

  if (levelBordersRes.status === 'fulfilled') {
    endpointsSummary.level_borders = await upsertLevelBorders(supabase, levelBordersRes.value);
    if (endpointsSummary.level_borders.error) errors.push(`level_borders: ${endpointsSummary.level_borders.error}`);
  } else {
    const msg = errorMessage(levelBordersRes.reason);
    endpointsSummary.level_borders = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`level_borders fetch: ${msg}`);
  }

  if (eventsRes.status === 'fulfilled') {
    endpointsSummary.events = await upsertEvents(supabase, eventsRes.value);
    if (endpointsSummary.events.error) errors.push(`events: ${endpointsSummary.events.error}`);
  } else {
    const msg = errorMessage(eventsRes.reason);
    endpointsSummary.events = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`events fetch: ${msg}`);
  }

  // 6. Update is_current flags across the 4 temporal tables.
  await updateIsCurrent(supabase, errors);

  // 7. Detect Act change → trigger rank reset (Jalon 1.4 trigger).
  // actBefore non-null guard: prevents reset on a fresh DB or when sync runs
  // before any is_current row exists.
  let triggeredRankReset = false;
  let newCurrentActUuid: string | null = null;

  const { data: actAfter } = await supabase
    .from('valorant_acts')
    .select('uuid, reset_processed')
    .eq('is_current', true)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  newCurrentActUuid = actAfter?.uuid ?? null;

  if (
    actBefore?.uuid &&
    actAfter?.uuid &&
    actBefore.uuid !== actAfter.uuid &&
    !actAfter.reset_processed
  ) {
    log('act_change_detected', { from: actBefore.uuid, to: actAfter.uuid });

    // supabase.functions.invoke() defaults to the anon key in the Authorization
    // header regardless of what was passed to createClient(). handle-rank-reset
    // requires a service_role JWT, so we override the header explicitly.
    const { error: invokeError } = await supabase.functions.invoke('handle-rank-reset', {
      body: { act_uuid: actAfter.uuid },
      headers: { Authorization: `Bearer ${serviceRoleKey}` },
    });

    if (invokeError) {
      errors.push(`rank_reset invoke: ${invokeError.message}`);
      log('rank_reset_error', { error: invokeError.message });
    } else {
      triggeredRankReset = true;
      log('rank_reset_triggered', { act_uuid: actAfter.uuid });
    }
  }

  // 8. Persist a sync_runs audit row (always, even on partial errors).
  const durationMs = Date.now() - startTime;
  const success = errors.length === 0;

  const { error: auditError } = await supabase.from('sync_runs').insert({
    duration_ms: durationMs,
    success,
    valorant_version: version?.version ?? null,
    valorant_build_date: version?.buildDate ?? null,
    endpoints_summary: endpointsSummary,
    errors,
    triggered_rank_reset: triggeredRankReset,
    new_current_act_uuid: newCurrentActUuid,
  });
  if (auditError) {
    log('sync_runs_insert_error', { error: auditError.message });
    // Don't add to errors[] — audit failure shouldn't change the response
  }

  log('sync_complete', { success, duration_ms: durationMs, errors_count: errors.length });

  return new Response(
    JSON.stringify({
      success,
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
      endpoints_summary: endpointsSummary,
      errors,
      triggered_rank_reset: triggeredRankReset,
      new_current_act_uuid: newCurrentActUuid,
    }, null, 2),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
