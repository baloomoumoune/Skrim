-- ============================================================
-- Cron Jobs — mirror of production state
-- These jobs are active in Supabase production via pg_cron + pg_net.
-- This file reflects the exact state of cron.job in production.
-- Last verified: 2026-04-28 (Find Lasts replaces legacy match cron)
-- ============================================================

-- Job 1: Sync Valorant data from valorant-api.com
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

-- Job 2: Daily monitoring report posted to Discord
-- Schedule: daily at 03:05 UTC (5min after the sync to leave room for completion).
-- Reads sync_runs + cron.job_run_details + net._http_response and posts an embed
-- to the discord_monitoring_webhook secret stored in Vault.
SELECT cron.schedule(
  'daily-sync-report',
  '5 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nlmtbflnzykjuwqigctt.supabase.co/functions/v1/daily-sync-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

-- ============================================================
-- Find Lasts — listing lifecycle housekeeping
-- Created by Find Lasts feature (2026-04-28).
-- All four jobs are pure SQL (no HTTP) so they run inside Postgres.
-- ============================================================

-- Job 3: expire pending invitations past their TTL.
-- Schedule: every minute. Cheap (partial index on status='pending').
SELECT cron.schedule(
  'expire-invitations',
  '* * * * *',
  $cron$ SELECT public.expire_old_invitations(); $cron$
);

-- Job 4: expire open listings past their TTL.
-- Schedule: every minute. Also resets any 'searching' lobby back to 'idle'
-- and emits a 'listing_expired' lobby_event to the owner.
SELECT cron.schedule(
  'expire-listings',
  '* * * * *',
  $cron$ SELECT public.expire_old_listings(); $cron$
);

-- Job 5: purge already-seen lobby events older than 24h.
-- Schedule: hourly. Keeps the events table small without losing unread items.
SELECT cron.schedule(
  'purge-old-events',
  '0 * * * *',
  $cron$ DELETE FROM public.lobby_events
      WHERE seen_at IS NOT NULL AND seen_at < now() - interval '24 hours'; $cron$
);

-- Job 6: purge expired/closed listings older than 7 days.
-- Schedule: hourly. Frees space; recent history kept for analytics.
SELECT cron.schedule(
  'purge-old-listings',
  '0 * * * *',
  $cron$ DELETE FROM public.listings
      WHERE status IN ('expired', 'closed') AND created_at < now() - interval '7 days'; $cron$
);
