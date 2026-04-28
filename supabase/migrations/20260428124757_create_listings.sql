CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id uuid NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  kind public.listing_kind NOT NULL,
  status public.listing_status NOT NULL DEFAULT 'open',
  criteria jsonb NOT NULL,
  target_lasts_count int,
  group_composition jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  CONSTRAINT listings_searcher_target_check CHECK (
    (kind = 'searcher' AND target_lasts_count BETWEEN 1 AND 3)
    OR (kind = 'last' AND target_lasts_count IS NULL AND group_composition IS NULL)
  ),
  CONSTRAINT listings_notes_length CHECK (notes IS NULL OR length(notes) <= 200)
);

CREATE UNIQUE INDEX idx_listings_one_open_per_lobby
  ON public.listings (lobby_id) WHERE status = 'open';

CREATE INDEX idx_listings_feed
  ON public.listings (kind, status, created_at DESC) WHERE status = 'open';

CREATE INDEX idx_listings_criteria
  ON public.listings USING gin (criteria) WHERE status = 'open';
