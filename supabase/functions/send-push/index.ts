// Supabase Edge Function: send-push
// Sends push notifications via Expo Push API
//
// Deploy: supabase functions deploy send-push
// Invoke: supabase.functions.invoke('send-push', { body: { user_ids, title, body, data } })

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushRequest {
  user_ids?: string[];
  tokens?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req: Request) => {
  try {
    const { user_ids, tokens: directTokens, title, body, data } = (await req.json()) as PushRequest;

    if ((!user_ids?.length && !directTokens?.length) || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: (user_ids | tokens), title, body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    let tokens: string[];

    if (directTokens?.length) {
      tokens = directTokens.filter((t) => !!t && t.startsWith('ExponentPushToken'));
    } else {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, push_token')
        .in('id', user_ids!)
        .not('push_token', 'is', null);

      if (error) {
        console.error('Failed to fetch push tokens:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch push tokens' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
      }

      tokens = (profiles ?? [])
        .map((p: { push_token: string | null }) => p.push_token)
        .filter((t): t is string => !!t && t.startsWith('ExponentPushToken'));
    }

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No valid push tokens found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Build Expo push messages
    const messages = tokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data ?? {},
    }));

    // Send to Expo Push API in batches of 100 (Expo limit per request)
    const EXPO_BATCH_SIZE = 100;
    const results = [];
    for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
      const chunk = messages.slice(i, i + EXPO_BATCH_SIZE);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      const data = await res.json();
      results.push(data);
    }

    console.log(`Sent ${tokens.length} push notification(s) in ${results.length} batch(es)`);

    return new Response(
      JSON.stringify({ sent: tokens.length, results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Push function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
