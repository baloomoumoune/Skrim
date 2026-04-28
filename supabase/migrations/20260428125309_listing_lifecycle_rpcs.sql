-- Validates and creates a Searcher listing.
CREATE OR REPLACE FUNCTION public.create_searcher_listing(
  p_criteria jsonb,
  p_target_lasts_count int,
  p_group_composition jsonb,
  p_coplayer_invites uuid[],
  p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lobby_id uuid;
  v_listing_id uuid;
  v_external_count int := COALESCE(jsonb_array_length(p_group_composition), 0);
  v_invite_count int := COALESCE(array_length(p_coplayer_invites, 1), 0);
  v_target_user uuid;
BEGIN
  v_lobby_id := public.my_lobby_id();
  IF v_lobby_id IS NULL THEN
    RAISE EXCEPTION 'no lobby for caller' USING ERRCODE = '42501';
  END IF;

  IF p_target_lasts_count IS NULL OR p_target_lasts_count NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'target_lasts_count must be 1, 2 or 3' USING ERRCODE = '22023';
  END IF;

  IF 1 + v_external_count + v_invite_count + p_target_lasts_count <> 5 THEN
    RAISE EXCEPTION 'composition does not sum to 5 (got 1+%+%+% )',
      v_external_count, v_invite_count, p_target_lasts_count
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.listings WHERE lobby_id = v_lobby_id AND status = 'open') THEN
    RAISE EXCEPTION 'an open listing already exists' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.listings (lobby_id, kind, criteria, target_lasts_count, group_composition, notes)
  VALUES (v_lobby_id, 'searcher', p_criteria, p_target_lasts_count, p_group_composition, p_notes)
  RETURNING id INTO v_listing_id;

  IF p_coplayer_invites IS NOT NULL THEN
    FOREACH v_target_user IN ARRAY p_coplayer_invites LOOP
      INSERT INTO public.listing_invitations (listing_id, from_user_id, to_user_id, direction)
      VALUES (v_listing_id, auth.uid(), v_target_user, 'invite_coplayer');

      INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
      VALUES (v_lobby_id, v_target_user, 'invitation_received',
              jsonb_build_object('listing_id', v_listing_id, 'direction', 'invite_coplayer'));
    END LOOP;
  END IF;

  UPDATE public.lobbies SET status = 'searching' WHERE id = v_lobby_id;
  RETURN v_listing_id;
END;
$$;

-- Creates a Last listing. Requires solo lobby.
CREATE OR REPLACE FUNCTION public.create_last_listing(
  p_criteria jsonb,
  p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lobby_id uuid;
  v_listing_id uuid;
BEGIN
  v_lobby_id := public.my_lobby_id();
  IF v_lobby_id IS NULL THEN
    RAISE EXCEPTION 'no lobby for caller' USING ERRCODE = '42501';
  END IF;

  IF public.lobby_active_member_count(v_lobby_id) <> 1 THEN
    RAISE EXCEPTION 'last listing requires a solo lobby' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.listings WHERE lobby_id = v_lobby_id AND status = 'open') THEN
    RAISE EXCEPTION 'an open listing already exists' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.listings (lobby_id, kind, criteria, notes)
  VALUES (v_lobby_id, 'last', p_criteria, p_notes)
  RETURNING id INTO v_listing_id;

  UPDATE public.lobbies SET status = 'searching' WHERE id = v_lobby_id;
  RETURN v_listing_id;
END;
$$;

-- Cancels caller's listing and any pending invitations on it.
CREATE OR REPLACE FUNCTION public.cancel_listing(p_listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lobby_id uuid;
BEGIN
  SELECT lobby_id INTO v_lobby_id FROM public.listings
   WHERE id = p_listing_id AND status = 'open';
  IF v_lobby_id IS NULL THEN
    RAISE EXCEPTION 'listing not found or not open' USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.assert_lobby_owner(v_lobby_id);

  UPDATE public.listings SET status = 'closed' WHERE id = p_listing_id;
  UPDATE public.listing_invitations
     SET status = 'cancelled', responded_at = now()
   WHERE listing_id = p_listing_id AND status = 'pending';

  UPDATE public.lobbies SET status = 'idle' WHERE id = v_lobby_id;
END;
$$;
