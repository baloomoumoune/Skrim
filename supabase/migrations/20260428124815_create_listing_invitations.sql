CREATE TABLE public.listing_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction public.invitation_direction NOT NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  responded_at timestamptz,
  CONSTRAINT listing_invitations_self_check CHECK (from_user_id <> to_user_id)
);

-- 1 pending propose_last max per Last user.
CREATE UNIQUE INDEX idx_invitations_one_pending_propose_per_user
  ON public.listing_invitations (from_user_id)
  WHERE status = 'pending' AND direction = 'propose_last';

CREATE INDEX idx_invitations_to_pending
  ON public.listing_invitations (to_user_id, status) WHERE status = 'pending';

CREATE INDEX idx_invitations_from_pending
  ON public.listing_invitations (from_user_id, status) WHERE status = 'pending';

CREATE INDEX idx_invitations_expires
  ON public.listing_invitations (expires_at) WHERE status = 'pending';
