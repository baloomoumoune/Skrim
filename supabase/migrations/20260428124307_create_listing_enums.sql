CREATE TYPE public.valorant_region AS ENUM ('NA', 'LATAM', 'BR', 'EU', 'KR', 'APAC');
CREATE TYPE public.valorant_platform AS ENUM ('pc', 'console');

CREATE TYPE public.lobby_status AS ENUM ('idle', 'searching', 'launched');
CREATE TYPE public.lobby_member_role AS ENUM ('searcher', 'coplayer', 'last');

CREATE TYPE public.listing_kind AS ENUM ('searcher', 'last');
CREATE TYPE public.listing_status AS ENUM ('open', 'closed', 'expired');

CREATE TYPE public.invitation_direction AS ENUM ('invite_last', 'propose_last', 'invite_coplayer');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');

CREATE TYPE public.lobby_event_kind AS ENUM (
  'invitation_received',
  'invitation_accepted',
  'invitation_declined',
  'member_joined',
  'member_left',
  'member_kicked',
  'group_code_set',
  'lobby_launched',
  'listing_expiring_soon',
  'listing_expired'
);
