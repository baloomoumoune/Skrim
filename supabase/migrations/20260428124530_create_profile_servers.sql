CREATE TABLE public.profile_servers (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  server_id text NOT NULL REFERENCES public.valorant_servers(id) ON DELETE RESTRICT,
  PRIMARY KEY (profile_id, server_id)
);

CREATE INDEX idx_profile_servers_server ON public.profile_servers (server_id);

CREATE OR REPLACE FUNCTION public.assert_profile_server_region()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  profile_region public.valorant_region;
  server_region  public.valorant_region;
BEGIN
  SELECT region INTO profile_region FROM public.profiles WHERE id = NEW.profile_id;
  SELECT region INTO server_region  FROM public.valorant_servers WHERE id = NEW.server_id;

  IF profile_region IS NULL THEN
    RAISE EXCEPTION 'profile % not found', NEW.profile_id;
  END IF;
  IF server_region IS NULL THEN
    RAISE EXCEPTION 'server % not found', NEW.server_id;
  END IF;
  IF profile_region <> server_region THEN
    RAISE EXCEPTION 'server % (region %) is not in profile region %',
      NEW.server_id, server_region, profile_region;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_servers_region_check
  BEFORE INSERT OR UPDATE ON public.profile_servers
  FOR EACH ROW EXECUTE FUNCTION public.assert_profile_server_region();
