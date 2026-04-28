CREATE OR REPLACE FUNCTION public.notify_lobby_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url text;
  v_anon text;
BEGIN
  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'edge_function_url_on_listing_event';
  SELECT decrypted_secret INTO v_anon
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  IF v_url IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_anon, '')
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'lobby_events',
      'record', to_jsonb(NEW)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lobby_events_notify
  AFTER INSERT ON public.lobby_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_lobby_event();
