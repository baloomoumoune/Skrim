ALTER TABLE public.lobbies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_servers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valorant_servers     ENABLE ROW LEVEL SECURITY;

CREATE POLICY valorant_servers_read ON public.valorant_servers
  FOR SELECT USING (true);

CREATE POLICY profile_servers_read ON public.profile_servers
  FOR SELECT USING (true);
CREATE POLICY profile_servers_self_insert ON public.profile_servers
  FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY profile_servers_self_delete ON public.profile_servers
  FOR DELETE USING (profile_id = auth.uid());

CREATE POLICY lobbies_read ON public.lobbies
  FOR SELECT USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.lobby_members lm
       WHERE lm.lobby_id = lobbies.id AND lm.user_id = auth.uid() AND lm.left_at IS NULL
    )
  );

CREATE POLICY lobby_members_read ON public.lobby_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.lobbies lo
       WHERE lo.id = lobby_members.lobby_id AND lo.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.lobby_members sib
       WHERE sib.lobby_id = lobby_members.lobby_id
         AND sib.user_id = auth.uid()
         AND sib.left_at IS NULL
    )
  );

CREATE POLICY listings_read ON public.listings
  FOR SELECT USING (
    status = 'open'
    OR EXISTS (
      SELECT 1 FROM public.lobbies lo
       WHERE lo.id = listings.lobby_id AND lo.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.lobby_members lm
       WHERE lm.lobby_id = listings.lobby_id AND lm.user_id = auth.uid() AND lm.left_at IS NULL
    )
  );

CREATE POLICY listing_invitations_read ON public.listing_invitations
  FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY lobby_events_read ON public.lobby_events
  FOR SELECT USING (recipient_id = auth.uid());
