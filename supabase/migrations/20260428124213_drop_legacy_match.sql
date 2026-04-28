-- Drop legacy LFG match feature: tables, dependent RPCs, triggers, cron jobs.
-- The replacement (lobbies/listings/invitations/members/events) is built in subsequent migrations.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-old-matches') THEN
    PERFORM cron.unschedule('expire-old-matches');
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

DROP FUNCTION IF EXISTS public.check_active_match(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_kick_cooldown(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_current_players(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.expire_old_matches() CASCADE;
DROP FUNCTION IF EXISTS public.renew_match(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_single_active_match() CASCADE;

DROP TABLE IF EXISTS public.match_members CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_status') THEN
    DROP TYPE public.match_status;
  END IF;
EXCEPTION WHEN dependent_objects_still_exist THEN
  NULL;
END $$;
