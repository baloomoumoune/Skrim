-- For Last users: returns open searcher listings filtered by region/platform (hard) + soft filters.
CREATE OR REPLACE FUNCTION public.get_searcher_feed(p_filter_overrides jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (
  listing_id uuid,
  lobby_id uuid,
  owner_id uuid,
  owner_username text,
  owner_avatar_url text,
  owner_current_rank text,
  criteria jsonb,
  target_lasts_count int,
  group_composition jsonb,
  notes text,
  created_at timestamptz,
  expires_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_caller_region public.valorant_region;
  v_caller_platform public.valorant_platform;
BEGIN
  SELECT region, platform INTO v_caller_region, v_caller_platform
    FROM public.profiles WHERE id = auth.uid();
  IF v_caller_region IS NULL THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
    SELECT l.id, l.lobby_id, p.id, p.username, p.avatar_url, p.current_rank,
           l.criteria, l.target_lasts_count, l.group_composition, l.notes,
           l.created_at, l.expires_at
      FROM public.listings l
      JOIN public.lobbies lo ON lo.id = l.lobby_id
      JOIN public.profiles p ON p.id = lo.owner_id
     WHERE l.kind = 'searcher'
       AND l.status = 'open'
       AND (l.criteria->>'region') = v_caller_region::text
       AND (l.criteria->>'platform') = v_caller_platform::text
       AND lo.owner_id <> auth.uid()
     ORDER BY l.created_at DESC;
END;
$$;

-- For Searcher users: returns open last listings filtered by region/platform.
CREATE OR REPLACE FUNCTION public.get_last_feed(p_filter_overrides jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (
  listing_id uuid,
  lobby_id uuid,
  owner_id uuid,
  owner_username text,
  owner_avatar_url text,
  owner_current_rank text,
  criteria jsonb,
  notes text,
  created_at timestamptz,
  expires_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_caller_region public.valorant_region;
  v_caller_platform public.valorant_platform;
BEGIN
  SELECT region, platform INTO v_caller_region, v_caller_platform
    FROM public.profiles WHERE id = auth.uid();
  IF v_caller_region IS NULL THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
    SELECT l.id, l.lobby_id, p.id, p.username, p.avatar_url, p.current_rank,
           l.criteria, l.notes, l.created_at, l.expires_at
      FROM public.listings l
      JOIN public.lobbies lo ON lo.id = l.lobby_id
      JOIN public.profiles p ON p.id = lo.owner_id
     WHERE l.kind = 'last'
       AND l.status = 'open'
       AND (l.criteria->>'region') = v_caller_region::text
       AND (l.criteria->>'platform') = v_caller_platform::text
       AND lo.owner_id <> auth.uid()
     ORDER BY l.created_at DESC;
END;
$$;

-- Returns caller's active listing + lobby state (or NULL row).
CREATE OR REPLACE FUNCTION public.get_my_active_listing()
RETURNS TABLE (
  listing_id uuid,
  lobby_id uuid,
  kind public.listing_kind,
  status public.listing_status,
  criteria jsonb,
  target_lasts_count int,
  group_composition jsonb,
  notes text,
  created_at timestamptz,
  expires_at timestamptz,
  lobby_status public.lobby_status,
  group_code text
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT l.id, l.lobby_id, l.kind, l.status, l.criteria,
         l.target_lasts_count, l.group_composition, l.notes,
         l.created_at, l.expires_at, lo.status, lo.group_code
    FROM public.listings l
    JOIN public.lobbies lo ON lo.id = l.lobby_id
   WHERE lo.owner_id = auth.uid() AND l.status = 'open';
$$;

-- Returns full lobby state (members, listing, code) for the caller.
CREATE OR REPLACE FUNCTION public.get_lobby_state(p_lobby_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.lobby_members
     WHERE lobby_id = p_lobby_id AND user_id = auth.uid() AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'caller is not an active member' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'lobby', to_jsonb(lo),
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'member', to_jsonb(lm),
        'profile', to_jsonb(p)
      ) ORDER BY lm.joined_at)
        FROM public.lobby_members lm
        JOIN public.profiles p ON p.id = lm.user_id
       WHERE lm.lobby_id = p_lobby_id AND lm.left_at IS NULL
    ), '[]'::jsonb),
    'listing', (SELECT to_jsonb(l) FROM public.listings l
                 WHERE l.lobby_id = p_lobby_id AND l.status = 'open' LIMIT 1)
  )
  INTO v_result
  FROM public.lobbies lo
  WHERE lo.id = p_lobby_id;
  RETURN v_result;
END;
$$;

-- Marks lobby_events as seen for the caller.
CREATE OR REPLACE FUNCTION public.mark_events_seen(p_event_ids uuid[])
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.lobby_events
     SET seen_at = now()
   WHERE id = ANY(p_event_ids)
     AND recipient_id = auth.uid()
     AND seen_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
