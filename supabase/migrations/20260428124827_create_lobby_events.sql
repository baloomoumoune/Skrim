CREATE TABLE public.lobby_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id uuid NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind public.lobby_event_kind NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz
);

CREATE INDEX idx_events_unseen
  ON public.lobby_events (recipient_id) WHERE seen_at IS NULL;

CREATE INDEX idx_events_recipient_created
  ON public.lobby_events (recipient_id, created_at DESC);
