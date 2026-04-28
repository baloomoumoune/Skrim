-- Searcher sets the Valorant group code.
CREATE OR REPLACE FUNCTION public.set_group_code(p_lobby_id uuid, p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_lobby_owner(p_lobby_id);
  IF p_code IS NULL OR p_code !~ '^[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'invalid group code format' USING ERRCODE = '22023';
  END IF;

  UPDATE public.lobbies SET group_code = p_code WHERE id = p_lobby_id;

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  SELECT p_lobby_id, lm.user_id, 'group_code_set',
         jsonb_build_object('lobby_id', p_lobby_id, 'code', p_code)
    FROM public.lobby_members lm
   WHERE lm.lobby_id = p_lobby_id AND lm.left_at IS NULL AND lm.user_id <> auth.uid();
END;
$$;

-- Member (non-owner) leaves.
CREATE OR REPLACE FUNCTION public.leave_lobby(p_lobby_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.lobbies WHERE id = p_lobby_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'lobby not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner = auth.uid() THEN
    RAISE EXCEPTION 'owner cannot leave own lobby - cancel listing or kick instead' USING ERRCODE = '22023';
  END IF;

  UPDATE public.lobby_members
     SET left_at = now()
   WHERE lobby_id = p_lobby_id AND user_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'caller is not an active member of this lobby' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  SELECT p_lobby_id, lm.user_id, 'member_left', jsonb_build_object('user_id', auth.uid())
    FROM public.lobby_members lm
   WHERE lm.lobby_id = p_lobby_id AND lm.left_at IS NULL;
END;
$$;

-- Searcher kicks a member.
CREATE OR REPLACE FUNCTION public.remove_lobby_member(p_lobby_id uuid, p_target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_lobby_owner(p_lobby_id);
  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot remove yourself' USING ERRCODE = '22023';
  END IF;

  UPDATE public.lobby_members
     SET left_at = now(), removed_by_searcher = true
   WHERE lobby_id = p_lobby_id AND user_id = p_target_user_id AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'member not found in lobby' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  VALUES (p_lobby_id, p_target_user_id, 'member_kicked', jsonb_build_object('lobby_id', p_lobby_id));

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  SELECT p_lobby_id, lm.user_id, 'member_left', jsonb_build_object('user_id', p_target_user_id, 'kicked', true)
    FROM public.lobby_members lm
   WHERE lm.lobby_id = p_lobby_id AND lm.left_at IS NULL AND lm.user_id <> p_target_user_id;
END;
$$;

-- Searcher launches the lobby. Hard checks: full, code set, valid composition.
CREATE OR REPLACE FUNCTION public.launch_lobby(p_lobby_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lobby record;
  v_listing_id uuid;
  v_active_count int;
  v_external_count int;
  v_listing_target int;
BEGIN
  PERFORM public.assert_lobby_owner(p_lobby_id);
  SELECT * INTO v_lobby FROM public.lobbies WHERE id = p_lobby_id;

  IF v_lobby.group_code IS NULL THEN
    RAISE EXCEPTION 'group code must be set before launch' USING ERRCODE = '22023';
  END IF;

  SELECT id, target_lasts_count, COALESCE(jsonb_array_length(group_composition), 0)
    INTO v_listing_id, v_listing_target, v_external_count
    FROM public.listings WHERE lobby_id = p_lobby_id AND status = 'open';
  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'no active listing to launch' USING ERRCODE = 'P0002';
  END IF;

  v_active_count := public.lobby_active_member_count(p_lobby_id);
  IF v_active_count + v_external_count <> 5 THEN
    RAISE EXCEPTION 'lobby must reach 5/5 (active=%, external=%)', v_active_count, v_external_count
      USING ERRCODE = '22023';
  END IF;

  PERFORM public.assert_launch_composition_valid(p_lobby_id);

  UPDATE public.lobbies SET status = 'launched', last_launched_at = now() WHERE id = p_lobby_id;
  UPDATE public.listings SET status = 'closed' WHERE id = v_listing_id;

  UPDATE public.lobby_members
     SET left_at = now()
   WHERE lobby_id = p_lobby_id AND user_id <> v_lobby.owner_id AND left_at IS NULL;

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  SELECT p_lobby_id, lm.user_id, 'lobby_launched', jsonb_build_object('lobby_id', p_lobby_id)
    FROM public.lobby_members lm
   WHERE lm.lobby_id = p_lobby_id;
END;
$$;
