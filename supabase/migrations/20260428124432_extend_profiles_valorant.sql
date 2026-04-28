-- Replace legacy profile fields with the spec'd Valorant identity columns.
-- Safe because auth.users was wiped (profiles is empty) and teams is empty.

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS region,
  DROP COLUMN IF EXISTS current_rank,
  DROP COLUMN IF EXISTS platform,
  DROP COLUMN IF EXISTS previous_rank_before_reset,
  DROP COLUMN IF EXISTS last_rank_reset_at,
  DROP COLUMN IF EXISTS timezone;

ALTER TABLE public.teams
  DROP COLUMN IF EXISTS region;

DROP TYPE IF EXISTS public.region_type;

-- valorant_competitive_tiers stores tiers as jsonb; current_rank is plain text,
-- validated by RPC/business-logic layer (see lib/valorant-rules.ts mirror in M3).
ALTER TABLE public.profiles
  ADD COLUMN region public.valorant_region NOT NULL,
  ADD COLUMN platform public.valorant_platform NOT NULL,
  ADD COLUMN current_rank text NOT NULL,
  ADD COLUMN rank_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN birthdate date NOT NULL,
  ADD COLUMN primary_language text NOT NULL,
  ADD COLUMN secondary_languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN voice_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX idx_profiles_region_platform ON public.profiles (region, platform);
