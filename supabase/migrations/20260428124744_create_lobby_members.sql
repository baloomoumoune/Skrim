CREATE TABLE public.lobby_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id uuid NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.lobby_member_role NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  removed_by_searcher boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX idx_lobby_members_active_unique
  ON public.lobby_members (lobby_id, user_id)
  WHERE left_at IS NULL;

CREATE INDEX idx_lobby_members_active
  ON public.lobby_members (lobby_id) WHERE left_at IS NULL;

CREATE INDEX idx_lobby_members_user_active
  ON public.lobby_members (user_id) WHERE left_at IS NULL;

-- Replace the lobby auto-create trigger so it inserts the owner as a member.
CREATE OR REPLACE FUNCTION public.create_lobby_for_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_lobby_id uuid;
BEGIN
  INSERT INTO public.lobbies (owner_id) VALUES (NEW.id) RETURNING id INTO new_lobby_id;
  INSERT INTO public.lobby_members (lobby_id, user_id, role)
  VALUES (new_lobby_id, NEW.id, 'searcher');
  RETURN NEW;
END;
$$;
