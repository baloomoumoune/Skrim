CREATE TABLE public.lobbies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_code text,
  status public.lobby_status NOT NULL DEFAULT 'idle',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_launched_at timestamptz,
  CONSTRAINT lobbies_group_code_format CHECK (
    group_code IS NULL OR group_code ~ '^[A-Z0-9]{6}$'
  )
);

CREATE UNIQUE INDEX idx_lobbies_owner ON public.lobbies (owner_id);

-- Auto-create lobby on profile insert. The owner-as-member insert is added in
-- the next migration once lobby_members exists.
CREATE OR REPLACE FUNCTION public.create_lobby_for_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.lobbies (owner_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_create_lobby
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_lobby_for_profile();
