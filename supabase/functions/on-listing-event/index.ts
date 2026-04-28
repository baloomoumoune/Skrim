// Supabase Edge Function: on-listing-event
// Triggered by Postgres trigger trg_lobby_events_notify on INSERT into public.lobby_events.
// Dispatches a push notification to the recipient via the existing send-push function.
//
// Deploy: supabase functions deploy on-listing-event
// Vault secret required: edge_function_url_on_listing_event = https://<project-ref>.functions.supabase.co/on-listing-event

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type LobbyEventKind =
  | 'invitation_received'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'member_joined'
  | 'member_left'
  | 'member_kicked'
  | 'group_code_set'
  | 'lobby_launched'
  | 'listing_expiring_soon'
  | 'listing_expired';

interface Payload {
  type: 'INSERT';
  table: 'lobby_events';
  record: {
    id: string;
    lobby_id: string;
    recipient_id: string;
    kind: LobbyEventKind;
    metadata: Record<string, unknown> | null;
  };
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SEND_PUSH_URL = `${SUPABASE_URL}/functions/v1/send-push`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

function buildNotification(
  kind: LobbyEventKind,
  metadata: Record<string, unknown> | null,
): { title: string; body: string } {
  switch (kind) {
    case 'invitation_received':
      return { title: 'New invitation', body: 'You have a new lobby invitation' };
    case 'invitation_accepted':
      return { title: 'Invitation accepted', body: 'Your invitation was accepted' };
    case 'invitation_declined':
      return { title: 'Invitation declined', body: 'Your invitation was declined' };
    case 'member_joined':
      return { title: 'Lobby update', body: 'A new member joined your lobby' };
    case 'member_left':
      return { title: 'Lobby update', body: 'A member left your lobby' };
    case 'member_kicked':
      return { title: 'Removed from lobby', body: 'You were removed from a lobby' };
    case 'group_code_set':
      return { title: 'Group code ready', body: `Code: ${metadata?.code ?? ''}` };
    case 'lobby_launched':
      return { title: 'Match launched', body: 'Have a good game!' };
    case 'listing_expiring_soon':
      return { title: 'Listing expiring soon', body: 'Your listing expires in a few minutes' };
    case 'listing_expired':
      return { title: 'Listing expired', body: 'Your listing was closed (timeout)' };
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (payload?.table !== 'lobby_events' || payload?.type !== 'INSERT' || !payload.record) {
    return new Response('ignored', { status: 200 });
  }

  const { recipient_id, kind, metadata } = payload.record;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', recipient_id)
    .maybeSingle();

  if (error || !profile?.push_token) {
    return new Response(JSON.stringify({ skipped: 'no token' }), { status: 200 });
  }

  const notif = buildNotification(kind, metadata);
  const data = { kind, ...(metadata ?? {}) };

  const res = await fetch(SEND_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify({
      tokens: [profile.push_token],
      title: notif.title,
      body: notif.body,
      data,
    }),
  });

  return new Response(JSON.stringify({ status: res.status }), { status: 200 });
});
