-- Returns the caller's lobby id. Created on profile insert, so always exists.
CREATE OR REPLACE FUNCTION public.my_lobby_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.lobbies WHERE owner_id = auth.uid();
$$;

-- Counts active members (left_at IS NULL) in a lobby.
CREATE OR REPLACE FUNCTION public.lobby_active_member_count(p_lobby_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT count(*)::int FROM public.lobby_members
   WHERE lobby_id = p_lobby_id AND left_at IS NULL;
$$;

-- Asserts the caller owns the given lobby; throws otherwise.
CREATE OR REPLACE FUNCTION public.assert_lobby_owner(p_lobby_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.lobbies WHERE id = p_lobby_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'caller is not the owner of lobby %', p_lobby_id
      USING ERRCODE = '42501';
  END IF;
END;
$$;
