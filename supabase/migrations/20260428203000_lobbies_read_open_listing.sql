-- Allow reading a lobby row when it has an open listing — needed for the
-- Listing detail screen and any screen that drills down from the public feed
-- to discover the owner. Without this, the listing detail page can't load
-- the owner's profile because the lobby itself is invisible to non-members.

CREATE OR REPLACE FUNCTION public.lobby_has_open_listing(p_lobby_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings
    WHERE lobby_id = p_lobby_id AND status = 'open'
  );
$$;

REVOKE ALL ON FUNCTION public.lobby_has_open_listing(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.lobby_has_open_listing(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS lobbies_read ON public.lobbies;
CREATE POLICY lobbies_read ON public.lobbies
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.is_lobby_active_member(id, auth.uid())
    OR public.lobby_has_open_listing(id)
  );
