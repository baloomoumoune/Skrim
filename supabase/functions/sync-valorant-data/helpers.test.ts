// Run: deno test supabase/functions/sync-valorant-data/helpers.test.ts

import { assertEquals } from 'https://deno.land/std@0.168.0/assert/mod.ts';
import { generateAgentSlug, parseActNumber, parseEpisodeNumber } from './helpers.ts';

Deno.test('parseEpisodeNumber — EPISODE format', () => {
  assertEquals(parseEpisodeNumber('EPISODE 1'), 1);
  assertEquals(parseEpisodeNumber('EPISODE 9'), 9);
  assertEquals(parseEpisodeNumber('EPISODE 25'), 25);
});

Deno.test('parseEpisodeNumber — V format (post Episode 9)', () => {
  assertEquals(parseEpisodeNumber('V25'), 25);
  assertEquals(parseEpisodeNumber('V26'), 26);
});

Deno.test('parseEpisodeNumber — unparseable returns null', () => {
  assertEquals(parseEpisodeNumber('Closed Beta'), null);
  assertEquals(parseEpisodeNumber('Test Season (Jalon 1.3)'), null);
  assertEquals(parseEpisodeNumber(''), null);
  assertEquals(parseEpisodeNumber('EPISODE'), null);
  assertEquals(parseEpisodeNumber('episode 1'), null); // case sensitive
});

Deno.test('parseActNumber — roman numerals I to VI', () => {
  assertEquals(parseActNumber('ACT I'), 1);
  assertEquals(parseActNumber('ACT II'), 2);
  assertEquals(parseActNumber('ACT III'), 3);
  assertEquals(parseActNumber('ACT IV'), 4);
  assertEquals(parseActNumber('ACT V'), 5);
  assertEquals(parseActNumber('ACT VI'), 6);
});

Deno.test('parseActNumber — Arabic fallback', () => {
  assertEquals(parseActNumber('ACT 1'), 1);
  assertEquals(parseActNumber('ACT 7'), 7);
});

Deno.test('parseActNumber — unparseable returns null', () => {
  assertEquals(parseActNumber('Closed Beta'), null);
  assertEquals(parseActNumber('ACT'), null);
  assertEquals(parseActNumber('ACT XX'), null); // not in our roman map
  assertEquals(parseActNumber(''), null);
});

Deno.test('generateAgentSlug — strips non-alphanumeric, lowercases', () => {
  assertEquals(generateAgentSlug('Astra'), 'astra');
  assertEquals(generateAgentSlug('Brimstone'), 'brimstone');
  assertEquals(generateAgentSlug('KAY/O'), 'kayo');
  assertEquals(generateAgentSlug('Phoenix'), 'phoenix');
});

Deno.test('generateAgentSlug — handles spaces and punctuation', () => {
  assertEquals(generateAgentSlug('Some Agent'), 'someagent');
  assertEquals(generateAgentSlug("D'Va"), 'dva');
});
