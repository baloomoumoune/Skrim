CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int;
BEGIN
  WITH expired AS (
    UPDATE public.listing_invitations
       SET status = 'expired', responded_at = now()
     WHERE status = 'pending' AND expires_at <= now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_old_listings()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int;
BEGIN
  WITH expired AS (
    UPDATE public.listings
       SET status = 'expired'
     WHERE status = 'open' AND expires_at <= now()
    RETURNING id, lobby_id
  ),
  events AS (
    INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
    SELECT e.lobby_id, lo.owner_id, 'listing_expired', jsonb_build_object('listing_id', e.id)
      FROM expired e JOIN public.lobbies lo ON lo.id = e.lobby_id
    RETURNING 1
  ),
  reset_lobbies AS (
    UPDATE public.lobbies lo SET status = 'idle'
      FROM expired e
     WHERE lo.id = e.lobby_id AND lo.status = 'searching'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

SELECT cron.schedule('expire-invitations', '* * * * *', $cron$ SELECT public.expire_old_invitations(); $cron$);
SELECT cron.schedule('expire-listings',    '* * * * *', $cron$ SELECT public.expire_old_listings(); $cron$);
SELECT cron.schedule('purge-old-events',   '0 * * * *',
  $cron$ DELETE FROM public.lobby_events
      WHERE seen_at IS NOT NULL AND seen_at < now() - interval '24 hours'; $cron$);
SELECT cron.schedule('purge-old-listings', '0 * * * *',
  $cron$ DELETE FROM public.listings
      WHERE status IN ('expired', 'closed') AND created_at < now() - interval '7 days'; $cron$);
