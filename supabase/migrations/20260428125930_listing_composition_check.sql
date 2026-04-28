-- Returns true if a tier name (e.g. 'Immortal 1', 'Radiant') is Immortal or above.
CREATE OR REPLACE FUNCTION public.is_immortal_plus(p_tier_name text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_tier_name LIKE 'Immortal%' OR p_tier_name = 'Radiant';
$$;

-- Asserts the lobby's composition is launchable per Riot rules.
-- Hard rules: no 4-stack, no Immortal+ trio.
CREATE OR REPLACE FUNCTION public.assert_launch_composition_valid(p_lobby_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_active_count int;
  v_external_count int;
  v_immortal_count int;
  v_external_immortals int;
BEGIN
  v_active_count := public.lobby_active_member_count(p_lobby_id);

  SELECT COALESCE(jsonb_array_length(group_composition), 0)
    INTO v_external_count
    FROM public.listings WHERE lobby_id = p_lobby_id AND status = 'open';

  IF v_active_count + v_external_count = 4 THEN
    RAISE EXCEPTION '4-stacks are not allowed in Competitive' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_immortal_count
    FROM public.lobby_members lm
    JOIN public.profiles p ON p.id = lm.user_id
   WHERE lm.lobby_id = p_lobby_id AND lm.left_at IS NULL
     AND public.is_immortal_plus(p.current_rank);

  SELECT count(*) INTO v_external_immortals
    FROM public.listings l,
         jsonb_array_elements(l.group_composition) AS gc
   WHERE l.lobby_id = p_lobby_id AND l.status = 'open'
     AND public.is_immortal_plus(gc->>'rank');

  IF (v_active_count + v_external_count) = 3 AND (v_immortal_count + v_external_immortals) >= 1 THEN
    RAISE EXCEPTION 'Immortal+ players cannot trio-queue in Competitive' USING ERRCODE = '22023';
  END IF;
END;
$$;
