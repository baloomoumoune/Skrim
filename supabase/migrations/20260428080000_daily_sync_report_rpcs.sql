-- RPCs supporting the daily-sync-report Edge Function.
-- Both are SECURITY DEFINER and restricted to service_role.

-- get_sync_health_snapshot: returns latest sync_run + cron_run + http_response
-- in a single call so the function can build its embed without juggling
-- non-PostgREST schemas (cron, net) from TS code.
CREATE OR REPLACE FUNCTION public.get_sync_health_snapshot(p_since interval DEFAULT '6 hours')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_sync_run jsonb;
  v_cron_run jsonb;
  v_http_resp jsonb;
  v_since timestamptz := now() - p_since;
BEGIN
  SELECT to_jsonb(r) INTO v_sync_run
  FROM (
    SELECT ran_at, success, duration_ms, valorant_version,
           triggered_rank_reset, errors, endpoints_summary
    FROM public.sync_runs
    WHERE ran_at >= v_since
    ORDER BY ran_at DESC
    LIMIT 1
  ) r;

  SELECT to_jsonb(r) INTO v_cron_run
  FROM (
    SELECT jrd.status, jrd.return_message, jrd.start_time, jrd.end_time
    FROM cron.job_run_details jrd
    JOIN cron.job j ON j.jobid = jrd.jobid
    WHERE j.jobname = 'sync-valorant-data-daily'
      AND jrd.start_time >= v_since
    ORDER BY jrd.start_time DESC
    LIMIT 1
  ) r;

  SELECT to_jsonb(r) INTO v_http_resp
  FROM (
    SELECT status_code, error_msg, created
    FROM net._http_response
    WHERE created >= v_since
    ORDER BY created DESC
    LIMIT 1
  ) r;

  RETURN jsonb_build_object(
    'sync_run', v_sync_run,
    'cron_run', v_cron_run,
    'http_response', v_http_resp
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_sync_health_snapshot(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sync_health_snapshot(interval) TO service_role;

-- get_vault_secret: reads a single named secret. PostgREST can't expose the
-- vault schema directly, so this proxy lets Edge Functions fetch secrets via
-- supabase.rpc('get_vault_secret', ...).
CREATE OR REPLACE FUNCTION public.get_vault_secret(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = p_name;
  RETURN v_secret;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vault_secret(text) TO service_role;
