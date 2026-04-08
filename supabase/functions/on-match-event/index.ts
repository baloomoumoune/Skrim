// Supabase Edge Function: on-match-event
// Triggered by database webhooks to send push notifications for match events.
//
// Deploy: supabase functions deploy on-match-event
//
// Required database webhooks (configure in Supabase Dashboard → Database → Webhooks):
//
// 1. match_members UPDATE → on-match-event (kicked_at set → notify kicked member)
// 2. matches UPDATE → on-match-event (status change → notify all members)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
}

async function sendPush(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
  title: string,
  body: string,
  data: Record<string, string> = {},
) {
  if (userIds.length === 0) return;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('push_token')
    .in('id', userIds)
    .not('push_token', 'is', null);

  const tokens = (profiles ?? [])
    .map((p: { push_token: string | null }) => p.push_token)
    .filter((t): t is string => !!t && t.startsWith('ExponentPushToken'));

  if (tokens.length === 0) return;

  const messages = tokens.map((token: string) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  console.log(`Sent ${tokens.length} push(es): ${title}`);
}

serve(async (req: Request) => {
  try {
    const payload = (await req.json()) as WebhookPayload;
    const { type, table, record, old_record } = payload;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── match_members UPDATE (kicked) → notify kicked member ──
    if (table === 'match_members' && type === 'UPDATE') {
      const wasKicked = !old_record?.kicked_at && record.kicked_at;
      if (wasKicked) {
        const userId = record.user_id as string;
        const matchId = record.match_id as string;

        await sendPush(
          supabase,
          [userId],
          'Removed from match',
          'You have been removed from the match.',
          { match_id: matchId },
        );
      }
    }

    // ── matches UPDATE (status change) → notify all members ──
    if (table === 'matches' && type === 'UPDATE') {
      const newStatus = record.status as string;
      const oldStatus = old_record?.status as string | undefined;
      const matchId = record.id as string;

      if (oldStatus === newStatus) return new Response('OK');

      // Get all active members
      const { data: members } = await supabase
        .from('match_members')
        .select('user_id')
        .eq('match_id', matchId)
        .is('kicked_at', null);

      const memberIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
      if (memberIds.length === 0) return new Response('OK');

      // Exclude creator from their own action notifications
      const creatorId = record.creator_id as string;
      const notifyIds = memberIds.filter((id: string) => id !== creatorId);

      if (newStatus === 'cancelled') {
        await sendPush(
          supabase,
          notifyIds,
          'Match cancelled',
          'The match has been cancelled by the creator.',
          { match_id: matchId },
        );
      }

      if (newStatus === 'in_progress') {
        await sendPush(
          supabase,
          notifyIds,
          'Match started!',
          'The match is now in progress. Good luck!',
          { match_id: matchId },
        );
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('on-match-event error:', err);
    return new Response('Error', { status: 500 });
  }
});
