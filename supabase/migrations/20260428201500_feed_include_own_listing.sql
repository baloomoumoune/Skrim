-- The Find feed used to hide the caller's own listing, but the UI wants to
-- surface it as a non-actionable card so users can see how their post looks
-- to others. Drop the owner_id <> auth.uid() filter; the front-end disables
-- the card based on owner_id.

CREATE OR REPLACE FUNCTION public.get_searcher_feed(p_filter_overrides jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(
  listing_id uuid, lobby_id uuid, owner_id uuid,
  owner_username text, owner_avatar_url text, owner_current_rank text,
  criteria jsonb, target_lasts_count integer, group_composition jsonb,
  notes text, created_at timestamptz, expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
     ORDER BY l.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_last_feed(p_filter_overrides jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(
  listing_id uuid, lobby_id uuid, owner_id uuid,
  owner_username text, owner_avatar_url text, owner_current_rank text,
  criteria jsonb, notes text, created_at timestamptz, expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
     ORDER BY l.created_at DESC;
END;
$$;
