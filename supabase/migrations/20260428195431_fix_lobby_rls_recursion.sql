-- Break the infinite recursion between lobbies_read and lobby_members_read by
-- moving the cross-table membership/ownership checks into SECURITY DEFINER
-- helpers that bypass RLS. Without these helpers, the read policies on
-- lobbies, lobby_members, and listings recurse into each other and Postgres
-- aborts the query with 42P17.

CREATE OR REPLACE FUNCTION public.is_lobby_owner(p_lobby_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lobbies
    WHERE id = p_lobby_id AND owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_lobby_active_member(p_lobby_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lobby_members
    WHERE lobby_id = p_lobby_id AND user_id = p_user_id AND left_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_lobby_owner(uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_lobby_active_member(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_lobby_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_lobby_active_member(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS lobbies_read ON public.lobbies;
CREATE POLICY lobbies_read ON public.lobbies
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.is_lobby_active_member(id, auth.uid())
  );

DROP POLICY IF EXISTS lobby_members_read ON public.lobby_members;
CREATE POLICY lobby_members_read ON public.lobby_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_lobby_owner(lobby_id, auth.uid())
    OR public.is_lobby_active_member(lobby_id, auth.uid())
  );

DROP POLICY IF EXISTS listings_read ON public.listings;
CREATE POLICY listings_read ON public.listings
  FOR SELECT
  USING (
    status = 'open'::public.listing_status
    OR public.is_lobby_owner(lobby_id, auth.uid())
    OR public.is_lobby_active_member(lobby_id, auth.uid())
  );
