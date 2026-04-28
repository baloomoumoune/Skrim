// Supabase Edge Function: daily-sync-report
// Builds a Discord embed summarizing the latest sync-valorant-data run and
// posts it to the monitoring webhook stored in vault.
//
// Auth: Bearer token must be a valid service_role JWT
// Trigger: cron daily-sync-report-daily at 03:05 UTC (5min after sync)
//
// Deploy: supabase functions deploy daily-sync-report

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// === Types ===

interface EndpointSummary {
  status: 'success' | 'error';
  fetched?: number;
  upserted?: number;
  error?: string;
}

interface SyncRun {
  ran_at: string;
  success: boolean;
  duration_ms: number;
  valorant_version: string | null;
  triggered_rank_reset: boolean;
  errors: string[];
  endpoints_summary: Record<string, EndpointSummary>;
}

interface CronRun {
  status: string;
  return_message: string | null;
  start_time: string;
  end_time: string;
}

interface HttpResponse {
  status_code: number | null;
  error_msg: string | null;
  created: string;
}

interface HealthSnapshot {
  sync_run: SyncRun | null;
  cron_run: CronRun | null;
  http_response: HttpResponse | null;
}

// FR labels in the order we want them displayed in the report.
const ENDPOINT_LABELS: { key: string; label: string }[] = [
  { key: 'agents', label: 'Agents' },
  { key: 'maps', label: 'Maps' },
  { key: 'game_modes', label: 'Game modes' },
  { key: 'seasons', label: 'Seasons' },
  { key: 'acts', label: 'Acts' },
  { key: 'competitive_tiers', label: 'Compétitif — Tiers' },
  { key: 'seasons_competitive', label: 'Compétitif — Saisons' },
  { key: 'weapons', label: 'Armes' },
  { key: 'gear', label: 'Équipement' },
  { key: 'level_borders', label: 'Niveaux joueur' },
  { key: 'events', label: 'Événements' },
];

// === Helpers ===

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

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

// === Handler ===

serve(async (req: Request) => {
  // 1. Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    log('auth_failed', { reason: 'missing_header' });
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.replace('Bearer ', '');
  const payload = decodeJwtPayload(token);
  if (!payload || payload.role !== 'service_role') {
    log('auth_failed', { reason: 'invalid_role', role: payload?.role });
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // 2. Admin client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 3. Webhook URL from vault (via RPC since vault schema isn't on PostgREST)
  const { data: webhookUrl, error: secretErr } = await supabase.rpc(
    'get_vault_secret',
    { p_name: 'discord_monitoring_webhook' },
  );
  if (secretErr || !webhookUrl) {
    log('vault_lookup_failed', { error: secretErr?.message });
    return jsonResponse({ error: 'webhook secret not found' }, 500);
  }

  // 4. Snapshot in one RPC call (covers cron + net + sync_runs)
  const { data: snapshotData, error: snapshotErr } = await supabase.rpc(
    'get_sync_health_snapshot',
    { p_since: '6 hours' },
  );
  if (snapshotErr) {
    log('snapshot_failed', { error: snapshotErr.message });
    return jsonResponse({ error: 'snapshot rpc failed' }, 500);
  }
  const snapshot = snapshotData as HealthSnapshot;

  // 5. Build embed
  const embed = buildEmbed(snapshot);

  // 6. POST to Discord
  const discordResp = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
  if (!discordResp.ok) {
    const text = await discordResp.text();
    log('discord_post_failed', { status: discordResp.status, body: text });
    return jsonResponse({ error: 'discord post failed', status: discordResp.status }, 500);
  }

  log('report_sent', {
    has_sync_run: !!snapshot.sync_run,
    success: snapshot.sync_run?.success,
  });
  return jsonResponse({ success: true, sync_run_found: !!snapshot.sync_run });
});

// === Embed builder ===

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  timestamp: string;
}

function buildEmbed(snapshot: HealthSnapshot): DiscordEmbed {
  const today = formatDate(new Date().toISOString());
  const { sync_run: syncRun, cron_run: cronRun, http_response: httpResp } = snapshot;

  if (!syncRun) {
    return {
      title: `❌ Skrim Daily Sync Report — ${today}`,
      description:
        '**Aucun run trouvé dans les 6 dernières heures.**\n' +
        "Le cron a peut-être échoué avant d'invoquer la fonction.\n\n" +
        'Vérifier `cron.job_run_details` pour `sync-valorant-data-daily`.',
      color: 0xef4444,
      timestamp: new Date().toISOString(),
    };
  }

  const dataLines = ENDPOINT_LABELS.map(({ key, label }) => {
    const ep = syncRun.endpoints_summary[key];
    if (!ep) return `❌ ${label} (absent du run)`;
    if (ep.status === 'success') return `✅ ${label} (${ep.upserted ?? 0})`;
    return `❌ ${label} (${ep.error ?? 'erreur'})`;
  }).join('\n');

  const techLines: string[] = [];
  if (cronRun) {
    const cronOk = cronRun.status === 'succeeded';
    techLines.push(`Cron triggered: ${cronOk ? '✅' : '❌'} ${formatTime(cronRun.start_time)}`);
  } else {
    techLines.push('Cron triggered: ⚠️ inconnu (pas de run dans la fenêtre)');
  }
  if (httpResp) {
    const httpOk = httpResp.status_code === 200;
    techLines.push(
      `HTTP response: ${httpOk ? '✅' : '❌'} ${httpResp.status_code ?? 'no response'}`,
    );
  } else {
    techLines.push('HTTP response: ⚠️ inconnu');
  }
  techLines.push(
    `Sync function: ${syncRun.success ? '✅' : '❌'} ${
      syncRun.success ? 'success' : 'failed'
    } in ${(syncRun.duration_ms / 1000).toFixed(1)}s`,
  );
  const epTotal = ENDPOINT_LABELS.length;
  const epOk = ENDPOINT_LABELS.filter(
    ({ key }) => syncRun.endpoints_summary[key]?.status === 'success',
  ).length;
  techLines.push(`Endpoints: ${epOk === epTotal ? '✅' : '❌'} ${epOk}/${epTotal} OK`);
  techLines.push(`Valorant version: ${syncRun.valorant_version ?? 'unknown'}`);
  techLines.push(`Rank reset triggered: ${syncRun.triggered_rank_reset ? 'Yes' : 'No'}`);

  const allGreen = syncRun.success && epOk === epTotal;

  const description =
    `**📦 Données mises à jour**\n${dataLines}\n\n` +
    `—————————————————\n\n` +
    `**🔧 Détails techniques**\n${techLines.join('\n')}`;

  return {
    title: `${allGreen ? '🎯' : '⚠️'} Skrim Daily Sync Report — ${today}`,
    description,
    color: allGreen ? 0x22c55e : 0xef4444,
    timestamp: syncRun.ran_at,
  };
}
