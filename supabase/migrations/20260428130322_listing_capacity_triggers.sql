-- After insert on lobby_members: close listing if lobby reaches the requested target.
CREATE OR REPLACE FUNCTION public.maybe_close_listing_on_join()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing record;
  v_active_count int;
BEGIN
  SELECT id, target_lasts_count, COALESCE(jsonb_array_length(group_composition), 0) AS external_count
    INTO v_listing FROM public.listings
   WHERE lobby_id = NEW.lobby_id AND status = 'open';
  IF v_listing.id IS NULL THEN RETURN NEW; END IF;

  v_active_count := public.lobby_active_member_count(NEW.lobby_id);
  IF v_active_count + v_listing.external_count >= 5 THEN
    UPDATE public.listings SET status = 'closed' WHERE id = v_listing.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lobby_members_maybe_close
  AFTER INSERT ON public.lobby_members
  FOR EACH ROW EXECUTE FUNCTION public.maybe_close_listing_on_join();

-- After update on lobby_members (left_at set): if lobby was full and listing was closed
-- (not 'expired'), reopen it.
CREATE OR REPLACE FUNCTION public.maybe_reopen_listing_on_leave()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing record;
  v_lobby_status public.lobby_status;
BEGIN
  IF NEW.left_at IS NULL OR OLD.left_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_lobby_status FROM public.lobbies WHERE id = NEW.lobby_id;
  IF v_lobby_status = 'launched' THEN RETURN NEW; END IF;

  SELECT id, status INTO v_listing FROM public.listings
   WHERE lobby_id = NEW.lobby_id
   ORDER BY created_at DESC LIMIT 1;
  IF v_listing.id IS NOT NULL AND v_listing.status = 'closed' THEN
    UPDATE public.listings SET status = 'open'
     WHERE id = v_listing.id AND expires_at > now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lobby_members_maybe_reopen
  AFTER UPDATE ON public.lobby_members
  FOR EACH ROW EXECUTE FUNCTION public.maybe_reopen_listing_on_leave();
