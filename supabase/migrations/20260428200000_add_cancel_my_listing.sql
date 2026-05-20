-- Lets the lobby owner manually close their open listing (cancelling the
-- search). Mirrors the cron-driven listing_expired path but reuses status
-- 'cancelled' and resets the lobby back to 'idle'. Pending invitations on
-- the listing are also marked declined so they stop blocking the recipient.

CREATE OR REPLACE FUNCTION public.cancel_my_listing()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lobby_id uuid;
  v_listing_id uuid;
BEGIN
  v_lobby_id := public.my_lobby_id();
  IF v_lobby_id IS NULL THEN
    RAISE EXCEPTION 'no lobby for caller' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_listing_id
  FROM public.listings
  WHERE lobby_id = v_lobby_id AND status = 'open'
  LIMIT 1;

  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'no open listing to cancel' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.listings
    SET status = 'cancelled'
  WHERE id = v_listing_id;

  UPDATE public.listing_invitations
    SET status = 'declined', responded_at = now()
  WHERE listing_id = v_listing_id AND status = 'pending';

  UPDATE public.lobbies
    SET status = 'idle'
  WHERE id = v_lobby_id;

  RETURN v_listing_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_my_listing() FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_my_listing() TO authenticated, service_role;
