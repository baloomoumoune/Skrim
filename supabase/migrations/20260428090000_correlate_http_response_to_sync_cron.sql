-- Correlate the HTTP response in get_sync_health_snapshot to the sync cron
-- run by time window instead of "latest in 6h". Without this, the report
-- shows the most recent HTTP response from any source (e.g. the Discord
-- report's own POST, manual test invocations), which can falsely indicate
-- the sync HTTP call failed when it actually succeeded.
CREATE OR REPLACE FUNCTION public.get_sync_health_snapshot(p_since interval DEFAULT '6 hours')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_sync_run jsonb;
  v_cron_run jsonb;
  v_cron_start timestamptz;
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

  SELECT to_jsonb(r), r.start_time INTO v_cron_run, v_cron_start
  FROM (
    SELECT jrd.status, jrd.return_message, jrd.start_time, jrd.end_time
    FROM cron.job_run_details jrd
    JOIN cron.job j ON j.jobid = jrd.jobid
    WHERE j.jobname = 'sync-valorant-data-daily'
      AND jrd.start_time >= v_since
    ORDER BY jrd.start_time DESC
    LIMIT 1
  ) r;

  -- Pick the HTTP response that arrived within ~60s after the cron triggered
  -- net.http_post. The sync function returns in ~5-10s; 60s gives ample
  -- headroom while excluding unrelated requests in the same 6h window.
  IF v_cron_start IS NOT NULL THEN
    SELECT to_jsonb(r) INTO v_http_resp
    FROM (
      SELECT status_code, error_msg, created
      FROM net._http_response
      WHERE created >= v_cron_start
        AND created <= v_cron_start + interval '60 seconds'
      ORDER BY created ASC
      LIMIT 1
    ) r;
  END IF;

  RETURN jsonb_build_object(
    'sync_run', v_sync_run,
    'cron_run', v_cron_run,
    'http_response', v_http_resp
  );
END;
$$;
