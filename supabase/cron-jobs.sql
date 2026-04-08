-- ============================================================
-- Cron Jobs Reference (documentary, not auto-executed)
-- These jobs are configured in Supabase via pg_cron + pg_net.
-- ============================================================

-- Job 1: Expire old matches (pre-existing)
-- Schedule: every minute
-- SELECT cron.schedule('expire-old-matches', '* * * * *', $$SELECT expire_old_matches()$$);

-- Job 2: Sync Valorant data from valorant-api.com
-- Schedule: daily at 3h UTC
-- Created by Jalon 1.1 (2026-04-08)
SELECT cron.schedule(
  'sync-valorant-data-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nlmtbflnzykjuwqigctt.supabase.co/functions/v1/sync-valorant-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);