-- Searcher -> Last: invite a specific Last to fill a slot.
CREATE OR REPLACE FUNCTION public.invite_last(
  p_listing_id uuid, p_target_user_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lobby_id uuid;
  v_listing_platform text;
  v_target_platform public.valorant_platform;
  v_invitation_id uuid;
BEGIN
  SELECT l.lobby_id, l.criteria->>'platform'
    INTO v_lobby_id, v_listing_platform
    FROM public.listings l
   WHERE l.id = p_listing_id AND l.status = 'open' AND l.kind = 'searcher';
  IF v_lobby_id IS NULL THEN
    RAISE EXCEPTION 'listing not found or invalid' USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.assert_lobby_owner(v_lobby_id);

  SELECT platform INTO v_target_platform FROM public.profiles WHERE id = p_target_user_id;
  IF v_target_platform::text <> v_listing_platform THEN
    RAISE EXCEPTION 'platform mismatch' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.listing_invitations (listing_id, from_user_id, to_user_id, direction)
  VALUES (p_listing_id, auth.uid(), p_target_user_id, 'invite_last')
  RETURNING id INTO v_invitation_id;

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  VALUES (v_lobby_id, p_target_user_id, 'invitation_received',
          jsonb_build_object('invitation_id', v_invitation_id, 'direction', 'invite_last'));
  RETURN v_invitation_id;
END;
$$;

-- Last -> Searcher: propose self for an open searcher listing.
CREATE OR REPLACE FUNCTION public.propose_as_last(p_listing_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lobby_id uuid;
  v_searcher uuid;
  v_listing_platform text;
  v_caller_platform public.valorant_platform;
  v_invitation_id uuid;
BEGIN
  SELECT l.lobby_id, lo.owner_id, l.criteria->>'platform'
    INTO v_lobby_id, v_searcher, v_listing_platform
    FROM public.listings l
    JOIN public.lobbies lo ON lo.id = l.lobby_id
   WHERE l.id = p_listing_id AND l.status = 'open' AND l.kind = 'searcher';
  IF v_lobby_id IS NULL THEN
    RAISE EXCEPTION 'listing not found or invalid' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.listings l
    JOIN public.lobbies lo ON lo.id = l.lobby_id
    WHERE lo.owner_id = auth.uid() AND l.kind = 'last' AND l.status = 'open'
  ) THEN
    RAISE EXCEPTION 'caller has no active last listing' USING ERRCODE = '42501';
  END IF;

  SELECT platform INTO v_caller_platform FROM public.profiles WHERE id = auth.uid();
  IF v_caller_platform::text <> v_listing_platform THEN
    RAISE EXCEPTION 'platform mismatch' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.listing_invitations (listing_id, from_user_id, to_user_id, direction)
  VALUES (p_listing_id, auth.uid(), v_searcher, 'propose_last')
  RETURNING id INTO v_invitation_id;

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  VALUES (v_lobby_id, v_searcher, 'invitation_received',
          jsonb_build_object('invitation_id', v_invitation_id, 'direction', 'propose_last'));
  RETURN v_invitation_id;
END;
$$;

-- Searcher -> friend: invite as co-player.
CREATE OR REPLACE FUNCTION public.invite_coplayer(
  p_listing_id uuid, p_target_user_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lobby_id uuid;
  v_invitation_id uuid;
BEGIN
  SELECT lobby_id INTO v_lobby_id FROM public.listings
   WHERE id = p_listing_id AND status = 'open' AND kind = 'searcher';
  IF v_lobby_id IS NULL THEN
    RAISE EXCEPTION 'listing not found or invalid' USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.assert_lobby_owner(v_lobby_id);

  INSERT INTO public.listing_invitations (listing_id, from_user_id, to_user_id, direction)
  VALUES (p_listing_id, auth.uid(), p_target_user_id, 'invite_coplayer')
  RETURNING id INTO v_invitation_id;

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  VALUES (v_lobby_id, p_target_user_id, 'invitation_received',
          jsonb_build_object('invitation_id', v_invitation_id, 'direction', 'invite_coplayer'));
  RETURN v_invitation_id;
END;
$$;

-- Recipient accepts. Adds to lobby_members, cascades cancellations.
CREATE OR REPLACE FUNCTION public.accept_invitation(p_invitation_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_inv record;
  v_target_lobby_id uuid;
  v_role public.lobby_member_role;
  v_joining_user uuid;
BEGIN
  SELECT * INTO v_inv FROM public.listing_invitations
   WHERE id = p_invitation_id AND status = 'pending' FOR UPDATE;
  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'invitation not found or not pending' USING ERRCODE = 'P0002';
  END IF;
  IF v_inv.to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'caller is not the recipient' USING ERRCODE = '42501';
  END IF;
  IF v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'invitation expired' USING ERRCODE = '22023';
  END IF;

  SELECT lobby_id INTO v_target_lobby_id FROM public.listings WHERE id = v_inv.listing_id;

  v_role := CASE v_inv.direction
    WHEN 'invite_last'     THEN 'last'::public.lobby_member_role
    WHEN 'propose_last'    THEN 'last'::public.lobby_member_role
    WHEN 'invite_coplayer' THEN 'coplayer'::public.lobby_member_role
  END;

  v_joining_user := CASE WHEN v_inv.direction = 'propose_last'
                         THEN v_inv.from_user_id ELSE v_inv.to_user_id END;

  INSERT INTO public.lobby_members (lobby_id, user_id, role)
  VALUES (v_target_lobby_id, v_joining_user, v_role);

  UPDATE public.listing_invitations
     SET status = 'accepted', responded_at = now()
   WHERE id = p_invitation_id;

  UPDATE public.listing_invitations
     SET status = 'cancelled', responded_at = now()
   WHERE status = 'pending'
     AND id <> p_invitation_id
     AND (
       to_user_id = v_joining_user
       OR (from_user_id = v_joining_user AND direction = 'propose_last')
     );

  UPDATE public.listings SET status = 'closed'
   WHERE lobby_id = (SELECT id FROM public.lobbies WHERE owner_id = v_joining_user)
     AND kind = 'last' AND status = 'open';

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  VALUES (v_target_lobby_id, v_inv.from_user_id, 'invitation_accepted',
          jsonb_build_object('invitation_id', p_invitation_id));

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  SELECT v_target_lobby_id, lm.user_id, 'member_joined',
         jsonb_build_object('user_id', v_joining_user)
    FROM public.lobby_members lm
   WHERE lm.lobby_id = v_target_lobby_id AND lm.left_at IS NULL
     AND lm.user_id <> v_joining_user;

  RETURN v_target_lobby_id;
END;
$$;

-- Recipient declines.
CREATE OR REPLACE FUNCTION public.decline_invitation(p_invitation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_inv record;
  v_lobby_id uuid;
BEGIN
  SELECT * INTO v_inv FROM public.listing_invitations
   WHERE id = p_invitation_id AND status = 'pending' FOR UPDATE;
  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'invitation not found or not pending' USING ERRCODE = 'P0002';
  END IF;
  IF v_inv.to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'caller is not the recipient' USING ERRCODE = '42501';
  END IF;

  UPDATE public.listing_invitations
     SET status = 'declined', responded_at = now()
   WHERE id = p_invitation_id;

  SELECT lobby_id INTO v_lobby_id FROM public.listings WHERE id = v_inv.listing_id;
  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  VALUES (v_lobby_id, v_inv.from_user_id, 'invitation_declined',
          jsonb_build_object('invitation_id', p_invitation_id));
END;
$$;

-- Sender cancels their own pending invitation.
CREATE OR REPLACE FUNCTION public.cancel_invitation(p_invitation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.listing_invitations
     SET status = 'cancelled', responded_at = now()
   WHERE id = p_invitation_id
     AND from_user_id = auth.uid()
     AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation not found, not pending, or not yours' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
