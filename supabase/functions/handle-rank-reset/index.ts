// Supabase Edge Function: handle-rank-reset
// Resets all ranked users to 'unranked' when a new Valorant Act starts.
// Preserves previous rank in profiles.previous_rank_before_reset.
// Sends push notification to affected users via send-push.
//
// Auth: Bearer token must be a valid service_role JWT
// Trigger: called by sync-valorant-data when an Act change is detected
//
// Deploy: supabase functions deploy handle-rank-reset

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// === Types ===

interface RankResetRequest {
  act_uuid: string;
  dry_run?: boolean;
  target_user_ids?: string[];
}

interface RankResetResponse {
  success: boolean;
  act_uuid: string;
  dry_run: boolean;
  affected_count: number;
  notified_count: number;
  errors: string[];
}

// === Helpers ===

function log(event: string, data: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ...data, ts: new Date().toISOString() }));
}

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

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// === Handler ===

serve(async (req: Request) => {
  // 1. Auth check: Bearer token must be a service_role JWT
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

  // 2. Create admin Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 3. Parse and validate body
  let body: RankResetRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { act_uuid, dry_run = false, target_user_ids } = body;

  if (!act_uuid) {
    return jsonResponse({ error: 'Missing required field: act_uuid' }, 400);
  }

  log('rank_reset_start', { act_uuid, dry_run, target_user_ids: target_user_ids ?? 'all' });

  const errors: string[] = [];

  // 4. Verify Act exists and reset_processed = false
  const { data: act, error: actError } = await supabase
    .from('valorant_acts')
    .select('uuid, reset_processed')
    .eq('uuid', act_uuid)
    .maybeSingle();

  if (actError) {
    log('act_check_error', { error: actError.message });
    return jsonResponse({ error: 'Failed to check act' }, 500);
  }

  if (!act) {
    log('act_not_found', { act_uuid });
    return jsonResponse({ error: `Act ${act_uuid} not found` }, 409);
  }

  if (act.reset_processed) {
    log('act_already_processed', { act_uuid });
    return jsonResponse({ error: `Act ${act_uuid} already processed` }, 409);
  }

  // 5. Dry run: count affected profiles without modifying anything
  if (dry_run) {
    let query = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .not('current_rank', 'is', null)
      .neq('current_rank', 'unranked');

    if (target_user_ids && target_user_ids.length > 0) {
      query = query.in('id', target_user_ids);
    }

    const { count, error: countError } = await query;

    if (countError) {
      log('dry_run_error', { error: countError.message });
      return jsonResponse({ error: 'Failed to count profiles' }, 500);
    }

    const response: RankResetResponse = {
      success: true,
      act_uuid,
      dry_run: true,
      affected_count: count ?? 0,
      notified_count: 0,
      errors: [],
    };

    log('dry_run_complete', { affected_count: count ?? 0 });
    return jsonResponse(response as unknown as Record<string, unknown>);
  }

  // 6. Call RPC process_rank_reset (atomic transaction)
  const rpcParams: { p_act_uuid: string; p_target_user_ids?: string[] } = {
    p_act_uuid: act_uuid,
  };
  if (target_user_ids && target_user_ids.length > 0) {
    rpcParams.p_target_user_ids = target_user_ids;
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'process_rank_reset',
    rpcParams,
  );

  if (rpcError) {
    log('rpc_error', { error: rpcError.message });
    // Act already processed or not found → 409
    if (rpcError.message.includes('already processed') || rpcError.message.includes('not found')) {
      return jsonResponse({ error: rpcError.message }, 409);
    }
    return jsonResponse({ error: 'Rank reset failed: ' + rpcError.message }, 500);
  }

  // RPC returns TABLE → array of rows, take first
  const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  const affectedCount: number = result?.affected_count ?? 0;
  const userIds: string[] = result?.user_ids ?? [];

  log('reset_complete', { affected_count: affectedCount, user_ids_count: userIds.length });

  // 7. Send push notifications to affected users
  let notifiedCount = 0;

  if (userIds.length > 0) {
    try {
      const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-push', {
        body: {
          user_ids: userIds,
          title: 'New Valorant Act',
          body: 'Ranks have been reset. Complete your placement matches and update your rank in Scrim.',
        },
      });

      if (pushError) {
        log('push_error', { error: pushError.message });
        errors.push(`Push notification failed: ${pushError.message}`);
      } else {
        notifiedCount = pushResult?.sent ?? 0;
        log('push_sent', { notified_count: notifiedCount });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log('push_exception', { error: errMsg });
      errors.push(`Push notification exception: ${errMsg}`);
    }
  }

  // 8. Return result
  const response: RankResetResponse = {
    success: true,
    act_uuid,
    dry_run: false,
    affected_count: affectedCount,
    notified_count: notifiedCount,
    errors,
  };

  log('rank_reset_complete', {
    act_uuid,
    affected_count: affectedCount,
    notified_count: notifiedCount,
    errors_count: errors.length,
  });

  return jsonResponse(response as unknown as Record<string, unknown>);
});
