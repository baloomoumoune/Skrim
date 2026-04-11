// Supabase Edge Function: sync-valorant-data
// Syncs Valorant game data (agents, maps, game modes, seasons, acts)
// from valorant-api.com into Supabase tables.
//
// Auth: Bearer token must be a valid service_role JWT
// Trigger: pg_cron daily at 3h UTC via pg_net, or manual curl
//
// Deploy: supabase functions deploy sync-valorant-data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// === Types ===

interface SyncResult {
  status: 'success' | 'error';
  fetched: number;
  upserted: number;
  error?: string;
}

interface SyncResponse {
  success: boolean;
  timestamp: string;
  duration_ms: number;
  results: {
    agents: SyncResult;
    maps: SyncResult;
    game_modes: SyncResult;
    seasons: SyncResult;
    acts: SyncResult;
  };
  errors: string[];
}

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
  abilities: Array<{
    slot: string;
    displayName: string;
    description: string | null;
    displayIcon: string | null;
  }>;
  isBaseContent: boolean;
  isPlayableCharacter: boolean;
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

// === Constants ===

const API_BASE = 'https://valorant-api.com/v1';
const FETCH_TIMEOUT_MS = 5000;
const ENDPOINTS = {
  agents: `${API_BASE}/agents?isPlayableCharacter=true`,
  maps: `${API_BASE}/maps`,
  gameModes: `${API_BASE}/gamemodes`,
  seasons: `${API_BASE}/seasons`,
};

// === Helpers ===

function log(event: string, data: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ...data, ts: new Date().toISOString() }));
}

// Decode JWT payload without verification (auth is handled by checking role claim)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

async function fetchWithTimeout<T>(url: string): Promise<T[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data as T[];
  } finally {
    clearTimeout(timeout);
  }
}

// === Sync functions ===

async function syncSeasons(
  supabase: ReturnType<typeof createClient>,
  allSeasons: ApiSeason[],
): Promise<SyncResult> {
  try {
    const seasons = allSeasons.filter(
      (s) => s.type === null && s.parentUuid === null && !s.displayName.includes('Closed Beta'),
    );
    const rows = seasons.map((s) => ({
      uuid: s.uuid,
      display_name: s.displayName,
      start_time: s.startTime,
      end_time: s.endTime,
    }));
    const { error } = await supabase.from('valorant_seasons').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_seasons', count: rows.length });
    return { status: 'success', fetched: seasons.length, upserted: rows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log('upsert_error', { table: 'valorant_seasons', error: msg });
    return { status: 'error', fetched: 0, upserted: 0, error: msg };
  }
}

async function syncActs(
  supabase: ReturnType<typeof createClient>,
  allSeasons: ApiSeason[],
): Promise<SyncResult> {
  try {
    const acts = allSeasons.filter(
      (s) => s.type === 'EAresSeasonType::Act' && s.parentUuid !== null,
    );
    const rows = acts.map((a) => ({
      uuid: a.uuid,
      display_name: a.displayName,
      season_uuid: a.parentUuid!,
      start_time: a.startTime,
      end_time: a.endTime,
    }));
    const { error } = await supabase.from('valorant_acts').upsert(rows, { onConflict: 'uuid' });
    if (error) throw error;
    log('upsert_complete', { table: 'valorant_acts', count: rows.length });
    return { status: 'success', fetched: acts.length, upserted: rows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log('upsert_error', { table: 'valorant_acts', error: msg });
    return { status: 'error', fetched: 0, upserted: 0, error: msg };
  }
}

async function syncAgents(
  supabase: ReturnType<typeof createClient>,
  agents: ApiAgent[],
): Promise<SyncResult> {
  try {
    const rows = agents.map((a) => ({
      uuid: a.uuid,
      display_name: a.displayName,
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
    const msg = e instanceof Error ? e.message : String(e);
    log('upsert_error', { table: 'valorant_agents', error: msg });
    return { status: 'error', fetched: 0, upserted: 0, error: msg };
  }
}

async function syncMaps(
  supabase: ReturnType<typeof createClient>,
  maps: ApiMap[],
): Promise<SyncResult> {
  try {
    const rows = maps.map((m) => ({
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
    log('upsert_complete', { table: 'valorant_maps', count: rows.length });
    return { status: 'success', fetched: maps.length, upserted: rows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log('upsert_error', { table: 'valorant_maps', error: msg });
    return { status: 'error', fetched: 0, upserted: 0, error: msg };
  }
}

async function syncGameModes(
  supabase: ReturnType<typeof createClient>,
  modes: ApiGameMode[],
): Promise<SyncResult> {
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
    const msg = e instanceof Error ? e.message : String(e);
    log('upsert_error', { table: 'valorant_game_modes', error: msg });
    return { status: 'error', fetched: 0, upserted: 0, error: msg };
  }
}

async function updateIsCurrent(supabase: ReturnType<typeof createClient>): Promise<void> {
  const now = new Date().toISOString();

  await supabase
    .from('valorant_seasons')
    .update({ is_current: true })
    .lte('start_time', now)
    .gte('end_time', now)
    .eq('is_current', false);

  await supabase
    .from('valorant_seasons')
    .update({ is_current: false })
    .eq('is_current', true)
    .or(`start_time.gt.${now},end_time.lt.${now}`);

  await supabase
    .from('valorant_acts')
    .update({ is_current: true })
    .lte('start_time', now)
    .gte('end_time', now)
    .eq('is_current', false);

  await supabase
    .from('valorant_acts')
    .update({ is_current: false })
    .eq('is_current', true)
    .or(`start_time.gt.${now},end_time.lt.${now}`);

  log('is_current_updated');
}

// === Main handler ===

serve(async (req: Request) => {
  const startTime = Date.now();

  // 1. Auth check: Bearer token must be a service_role JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    log('auth_failed', { reason: 'missing_header' });
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = decodeJwtPayload(token);
  if (!payload || payload.role !== 'service_role') {
    log('auth_failed', { reason: 'invalid_role', role: payload?.role });
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 2. Create admin Supabase client using the token from the request
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Jalon 1.3: snapshot current Season BEFORE any sync/upsert
  // Used after updateIsCurrent() to detect Season change
  const { data: seasonBefore } = await supabase
    .from('valorant_seasons')
    .select('uuid')
    .eq('is_current', true)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  log('sync_start');
  const errors: string[] = [];
  const results: Record<string, SyncResult> = {};

  // 3. Fetch all 4 endpoints in parallel
  const [agentsResult, mapsResult, modesResult, seasonsResult] = await Promise.allSettled([
    fetchWithTimeout<ApiAgent>(ENDPOINTS.agents),
    fetchWithTimeout<ApiMap>(ENDPOINTS.maps),
    fetchWithTimeout<ApiGameMode>(ENDPOINTS.gameModes),
    fetchWithTimeout<ApiSeason>(ENDPOINTS.seasons),
  ]);

  log('fetch_complete', {
    agents: agentsResult.status,
    maps: mapsResult.status,
    game_modes: modesResult.status,
    seasons: seasonsResult.status,
  });

  // 4. Process seasons + acts first (FK dependency)
  if (seasonsResult.status === 'fulfilled') {
    results.seasons = await syncSeasons(supabase, seasonsResult.value);
    if (results.seasons.status === 'error') errors.push(`seasons: ${results.seasons.error}`);

    results.acts = await syncActs(supabase, seasonsResult.value);
    if (results.acts.status === 'error') errors.push(`acts: ${results.acts.error}`);
  } else {
    const msg = seasonsResult.reason?.message ?? 'Fetch failed';
    results.seasons = { status: 'error', fetched: 0, upserted: 0, error: msg };
    results.acts = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`seasons fetch: ${msg}`);
  }

  // 5. Process agents, maps, game_modes
  if (agentsResult.status === 'fulfilled') {
    results.agents = await syncAgents(supabase, agentsResult.value);
    if (results.agents.status === 'error') errors.push(`agents: ${results.agents.error}`);
  } else {
    const msg = agentsResult.reason?.message ?? 'Fetch failed';
    results.agents = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`agents fetch: ${msg}`);
  }

  if (mapsResult.status === 'fulfilled') {
    results.maps = await syncMaps(supabase, mapsResult.value);
    if (results.maps.status === 'error') errors.push(`maps: ${results.maps.error}`);
  } else {
    const msg = mapsResult.reason?.message ?? 'Fetch failed';
    results.maps = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`maps fetch: ${msg}`);
  }

  if (modesResult.status === 'fulfilled') {
    results.game_modes = await syncGameModes(supabase, modesResult.value);
    if (results.game_modes.status === 'error') errors.push(`game_modes: ${results.game_modes.error}`);
  } else {
    const msg = modesResult.reason?.message ?? 'Fetch failed';
    results.game_modes = { status: 'error', fetched: 0, upserted: 0, error: msg };
    errors.push(`game_modes fetch: ${msg}`);
  }

  // 6. Update is_current on seasons and acts
  try {
    await updateIsCurrent(supabase);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`is_current update: ${msg}`);
    log('is_current_error', { error: msg });
  }

  // Jalon 1.3: detect Season change and trigger rank reset
  const { data: seasonAfter } = await supabase
    .from('valorant_seasons')
    .select('uuid, reset_processed')
    .eq('is_current', true)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    seasonAfter &&
    seasonAfter.uuid !== seasonBefore?.uuid &&
    !seasonAfter.reset_processed
  ) {
    log('season_change_detected', {
      from: seasonBefore?.uuid ?? 'none',
      to: seasonAfter.uuid,
    });

    const { error } = await supabase.functions.invoke('handle-rank-reset', {
      body: { season_uuid: seasonAfter.uuid },
    });

    if (error) {
      log('rank_reset_error', { error: error.message });
    } else {
      log('rank_reset_triggered', { season_uuid: seasonAfter.uuid });
    }
  }

  // 7. Build and return response
  const response: SyncResponse = {
    success: errors.length === 0,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    results: {
      agents: results.agents ?? { status: 'error', fetched: 0, upserted: 0, error: 'not processed' },
      maps: results.maps ?? { status: 'error', fetched: 0, upserted: 0, error: 'not processed' },
      game_modes: results.game_modes ?? { status: 'error', fetched: 0, upserted: 0, error: 'not processed' },
      seasons: results.seasons ?? { status: 'error', fetched: 0, upserted: 0, error: 'not processed' },
      acts: results.acts ?? { status: 'error', fetched: 0, upserted: 0, error: 'not processed' },
    },
    errors,
  };

  log('sync_complete', { success: response.success, duration_ms: response.duration_ms });

  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
