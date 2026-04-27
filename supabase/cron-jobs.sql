-- ============================================================
-- Cron Jobs — mirror of production state
-- These jobs are active in Supabase production via pg_cron + pg_net.
-- This file reflects the exact state of cron.job in production.
-- Last verified: 2026-04-27 (Jalon 1.4 cron repair)
-- ============================================================

-- Job 1: Expire old matches
-- Schedule: every 5 minutes
-- Active in production since initial development
SELECT cron.schedule(
  'expire-old-matches',
  '*/5 * * * *',
  $$SELECT expire_old_matches()$$
);

-- Job 2: Sync Valorant data from valorant-api.com
-- Schedule: daily at 3h UTC
-- Created by Jalon 1.1 (2026-04-08), repaired by Jalon 1.4 (2026-04-27).
-- Auth: vault.decrypted_secrets lookup (was current_setting which is NULL on Supabase managed Postgres → 401).
-- Timeout 60s: ample headroom for 10 endpoints sync.
SELECT cron.schedule(
  'sync-valorant-data-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nlmtbflnzykjuwqigctt.supabase.co/functions/v1/sync-valorant-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);
