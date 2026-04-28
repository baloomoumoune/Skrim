# Find Lasts — Design Spec

**Date:** 2026-04-28
**Status:** Approved (brainstorming complete, awaiting implementation plan)
**Author:** Aymen Gharbi (with Claude)

---

## 1. Context & Goal

The core feature of Skrim is **Find Lasts**: helping a Valorant player or group find the missing players ("lasts") needed to launch a 5-stack ranked match.

Two roles, **interchangeable** (a user can be Searcher today and Last tomorrow):

- **Searcher** — has a partial group (1 to 4 players), looking for 1-3 lasts to fill to 5
- **Last** — solo player, available to fill incomplete groups

The app acts as a discovery and coordination layer **outside** the Valorant client: it does not interact with Riot's APIs. The bridge between the app and the in-game lobby is the **Valorant group code** (6-char alphanumeric, e.g. `XHE419`), which the Searcher manually copies from his Valorant lobby into the app.

V1 supports **Competitive mode only**, **5-stack only** (no duo/trio queue), with strict Riot-rule enforcement on impossible compositions (4-stack, Immortal+ trio) and informative-but-non-blocking display for the rest (rank disparity, RR penalty).

### Out of scope (v1)

- Other game modes (Unrated, Swiftplay, etc.)
- Duo-q / trio-q ranked
- Chat / messaging
- Rank verification via Riot API (declarative only in v1; sync planned for v2)
- CS2 (game is disabled at launch)
- Long-lived group persistence (lobbies reset after each launch)
- Calendar/scheduling (instant-only matchmaking)

---

## 2. Product model

### 2.1. Permanent lobby per user

Every user **always has a personal lobby**, created at signup and persistent. The Home screen always displays this lobby. States:

- **`idle`** — user alone or with co-players, no active listing
- **`searching`** — a Searcher listing is open (looking for lasts)
- **`launched`** — match just launched (transient, returns to `idle` after the lobby reset)

### 2.2. Listings (publications)

A user publishes a listing to engage with the matchmaking flow. Two kinds:

- **`searcher`** — "I have a group, I'm looking for N lasts" (N ∈ [1, 3])
- **`last`** — "I'm a solo player available as last"

Constraints:

- 1 active listing max per user
- A `last` listing can only be created if the user is **solo in his lobby** (no co-players)
- Listings expire after **30 minutes** if not closed
- Form is explicit (not implicit on first invite/propose action)

### 2.3. Co-players

When a Searcher publishes, his existing group is described in two possible ways per slot:

- **External co-player** — declarative rank only (the friend isn't on Skrim, the Searcher just declares his rank for window calculation). Stored as metadata `group_composition` on the listing.
- **Internal co-player** — invited Skrim user. Receives an `invite_coplayer` invitation, joins the lobby on accept as `lobby_member` (role=`coplayer`).

A solo Searcher who would need 4 lasts must instead use the **Last role** (no Searcher with `target_lasts_count = 4`).

### 2.4. Invitations

Three kinds, all expire after **5 minutes** if not responded to:

- **`invite_last`** — Searcher → Last
- **`propose_last`** — Last → Searcher
- **`invite_coplayer`** — Searcher → friend (any user)

Constraints:

- **Searchers can send multiple `invite_last` and `invite_coplayer` in parallel** (they may be looking for several lasts at once).
- **Lasts can only have 1 pending `propose_last` at a time** (the proposing user is committing himself, can't be in two places). Enforced via partial unique index on `listing_invitations(from_user_id) WHERE status='pending' AND direction='propose_last'`.
- On accept of an invitation: cancels all other pending invitations addressed to the accepting user (he can no longer be claimed by other senders) and any pending `propose_last` he himself sent.
- On accept of `invite_last` / `propose_last`: the Last's own listing (if any) auto-closes.
- Decline is **notified** (push) to the from_user.
- Sender can `cancel_invitation` before the recipient responds.

### 2.5. Lobby fill, code, launch

When invitations are accepted, members fill the 5 slots:

- **Slot count** = 1 (Searcher) + N internal co-players + K external co-players + M lasts = **5**
- The Valorant **group code** (6-char alphanumeric uppercase, regex `^[A-Z0-9]{6}$`) can be saved by the Searcher at any time (form, lobby screen)
- The **Launch** button is only available when:
  - Lobby is full (5/5)
  - `group_code` is set
  - Composition is Riot-valid (no impossible combo)
- On launch: lobby `status='launched'`, all non-owner members are removed (`left_at` set), listing closes, push notification to all members

### 2.6. Search / browse

Each role browses the opposite role's feed:

- **Searcher's feed** = listings of `last` (compatible solo players)
- **Last's feed** = listings of `searcher` (compatible groups)

Filters:

- **Hard filter (server-side, non-overridable)**: Region (your region only), Platform (PC users see PC only, console users see console only — change requires settings update)
- **Soft filters (default = profile values, overridable per session)**: Servers, rank window, primary language, secondary languages, voice required, age (`under_18` / `over_18` / `any`)
- "Reset" button restores all filters to profile defaults
- Browse is allowed without a listing; **publish is required to invite/propose**

### 2.7. Lobby management actions

- **Searcher kicks** a member: free, no friction, no cooldown (v1)
- **Member leaves**: free; if lobby was full, listing auto-reopens
- **Member kicked**: same effect as leave + push notification "you were removed"
- **Searcher cancels listing**: closes the listing, lobby returns to `idle`, all pending invitations cancelled

### 2.8. Valorant rules enforcement

Per `lib/valorant-rules.ts` (existing pure module) and `docs/valorant-rules.md`:

- **Hard-blocked** (impossible per Riot): 4-stacks, Immortal+ trio
- **Informative** (visible warning, non-blocking): rank disparity, 5-stack RR penalty (-25%, -75% for Radiant)
- Hard checks happen **server-side at launch** (RPC `launch_lobby` rejects invalid compositions)

---

## 3. Data model

### 3.1. Profile extensions

Columns added to existing `profiles` table:

| Column | Type | Constraint |
|---|---|---|
| `region` | `valorant_region` (enum) | NOT NULL — `NA`, `LATAM`, `BR`, `EU`, `KR`, `APAC` |
| `platform` | `valorant_platform` (enum) | NOT NULL — `pc`, `console` |
| `current_rank` | `text` | NOT NULL REFERENCES `valorant_competitive_tiers(tier_name)` ON UPDATE CASCADE ON DELETE RESTRICT |
| `rank_updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` |
| `birthdate` | `date` | NOT NULL — non-editable post-onboarding |
| `primary_language` | `text` | NOT NULL — ISO 639-1 code |
| `secondary_languages` | `text[]` | NOT NULL DEFAULT `'{}'` — ISO 639-1 codes |
| `voice_enabled` | `boolean` | NOT NULL DEFAULT `false` |

### 3.2. Reference tables

**`valorant_servers`** (seeded from `lib/valorant-servers.ts`):

| Column | Type | Constraint |
|---|---|---|
| `id` | `text` | PK — e.g. `na-virginia`, `eu-paris` |
| `region` | `valorant_region` | NOT NULL |
| `display_name` | `text` | NOT NULL — e.g. `"Virginia (NA)"` |
| `sort_order` | `int` | NOT NULL DEFAULT `0` |

**`profile_servers`** (M:N junction, multi-server preferences):

| Column | Type | Constraint |
|---|---|---|
| `profile_id` | `uuid` | REFERENCES `profiles(id)` ON DELETE CASCADE |
| `server_id` | `text` | REFERENCES `valorant_servers(id)` ON DELETE RESTRICT |

PRIMARY KEY (`profile_id`, `server_id`).
Trigger `before insert/update`: rejects rows where `valorant_servers.region != profiles.region`.

### 3.3. Feature tables

**`lobbies`** — 1-to-1 with `profiles`:

| Column | Type | Constraint |
|---|---|---|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` |
| `owner_id` | `uuid` | UNIQUE NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE |
| `group_code` | `text` | NULL — `^[A-Z0-9]{6}$` validated via CHECK |
| `status` | `lobby_status` | NOT NULL DEFAULT `'idle'` — `idle`, `searching`, `launched` |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` |
| `last_launched_at` | `timestamptz` | NULL |

Auto-created via trigger `after insert on profiles`.

**`lobby_members`**:

| Column | Type | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `lobby_id` | `uuid` | REFERENCES `lobbies(id)` ON DELETE CASCADE |
| `user_id` | `uuid` | REFERENCES `profiles(id)` ON DELETE CASCADE |
| `role` | `lobby_member_role` | NOT NULL — `searcher`, `coplayer`, `last` |
| `joined_at` | `timestamptz` | NOT NULL DEFAULT `now()` |
| `left_at` | `timestamptz` | NULL |
| `removed_by_searcher` | `boolean` | NOT NULL DEFAULT `false` |

UNIQUE (`lobby_id`, `user_id`) WHERE `left_at IS NULL`.

The `searcher` (= owner) is auto-inserted at lobby creation.

**`listings`**:

| Column | Type | Constraint |
|---|---|---|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` |
| `lobby_id` | `uuid` | NOT NULL REFERENCES `lobbies(id)` ON DELETE CASCADE |
| `kind` | `listing_kind` | NOT NULL — `searcher`, `last` |
| `status` | `listing_status` | NOT NULL DEFAULT `'open'` — `open`, `closed`, `expired` |
| `criteria` | `jsonb` | NOT NULL — snapshot at publish time, modifiable ad-hoc |
| `target_lasts_count` | `int` | NULL — `searcher` only, CHECK in `[1, 3]` |
| `group_composition` | `jsonb` | NULL — `searcher` only, external co-players: `[{ "rank": "Gold 2" }, ...]` |
| `notes` | `text` | NULL — max 200 chars |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` |
| `expires_at` | `timestamptz` | NOT NULL — `created_at + interval '30 minutes'` |

UNIQUE INDEX on `lobby_id` WHERE `status = 'open'` (1 active listing max per lobby).

`criteria` jsonb shape:

```json
{
  "region": "EU",
  "servers": ["eu-paris", "eu-stockholm"],
  "platform": "pc",
  "rank_min": "Silver 2",
  "rank_max": "Platinum 3",
  "primary_language": "fr",
  "secondary_languages": ["en"],
  "voice_required": true,
  "age_filter": "any"
}
```

**`listing_invitations`**:

| Column | Type | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `listing_id` | `uuid` | NOT NULL REFERENCES `listings(id)` ON DELETE CASCADE |
| `from_user_id` | `uuid` | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE |
| `to_user_id` | `uuid` | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE |
| `direction` | `invitation_direction` | NOT NULL — `invite_last`, `propose_last`, `invite_coplayer` |
| `status` | `invitation_status` | NOT NULL DEFAULT `'pending'` — `pending`, `accepted`, `declined`, `expired`, `cancelled` |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` |
| `expires_at` | `timestamptz` | NOT NULL — `created_at + interval '5 minutes'` |
| `responded_at` | `timestamptz` | NULL |

Partial UNIQUE INDEX on `from_user_id` WHERE `status = 'pending' AND direction = 'propose_last'` (1 pending propose_last max per Last user). Searchers may send multiple `invite_last` / `invite_coplayer` in parallel — no unique constraint applies in that case.

**`lobby_events`** (in-app event feed for unseen-indicator + push trigger):

| Column | Type | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `lobby_id` | `uuid` | REFERENCES `lobbies(id)` ON DELETE CASCADE |
| `recipient_id` | `uuid` | REFERENCES `profiles(id)` ON DELETE CASCADE |
| `kind` | `lobby_event_kind` | NOT NULL — see enum below |
| `metadata` | `jsonb` | NULL |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` |
| `seen_at` | `timestamptz` | NULL |

`lobby_event_kind` values: `invitation_received`, `invitation_accepted`, `invitation_declined`, `member_joined`, `member_left`, `member_kicked`, `group_code_set`, `lobby_launched`, `listing_expiring_soon`, `listing_expired`.

### 3.4. Enums summary

| Enum | Values |
|---|---|
| `valorant_region` | `NA`, `LATAM`, `BR`, `EU`, `KR`, `APAC` |
| `valorant_platform` | `pc`, `console` |
| `lobby_status` | `idle`, `searching`, `launched` |
| `lobby_member_role` | `searcher`, `coplayer`, `last` |
| `listing_kind` | `searcher`, `last` |
| `listing_status` | `open`, `closed`, `expired` |
| `invitation_direction` | `invite_last`, `propose_last`, `invite_coplayer` |
| `invitation_status` | `pending`, `accepted`, `declined`, `expired`, `cancelled` |
| `lobby_event_kind` | (10 values, see above) |

### 3.5. Indexes

```sql
CREATE INDEX idx_listings_feed ON listings (kind, status, created_at DESC) WHERE status = 'open';
CREATE INDEX idx_listings_criteria ON listings USING gin (criteria) WHERE status = 'open';
CREATE UNIQUE INDEX idx_lobbies_owner ON lobbies (owner_id);
CREATE INDEX idx_lobby_members_active ON lobby_members (lobby_id) WHERE left_at IS NULL;
CREATE INDEX idx_lobby_members_user_active ON lobby_members (user_id) WHERE left_at IS NULL;
CREATE INDEX idx_invitations_to_pending ON listing_invitations (to_user_id, status) WHERE status = 'pending';
CREATE INDEX idx_invitations_from_pending ON listing_invitations (from_user_id, status) WHERE status = 'pending';
CREATE INDEX idx_invitations_expires ON listing_invitations (expires_at) WHERE status = 'pending';
CREATE INDEX idx_events_unseen ON lobby_events (recipient_id) WHERE seen_at IS NULL;
CREATE INDEX idx_profile_servers_server ON profile_servers (server_id);
```

---

## 4. Business logic (RPCs)

All RPCs are `SECURITY DEFINER` Postgres functions with explicit auth checks via `auth.uid()`.

### 4.1. Listing lifecycle

| RPC | Description |
|---|---|
| `create_searcher_listing(criteria, target_lasts_count, group_composition, coplayer_invites uuid[], notes)` | Validates `1 + len(group_composition) + len(coplayer_invites) + target_lasts_count = 5`. Creates listing, inserts `invite_coplayer` invitations, transitions lobby to `searching`. Returns `listing_id`. |
| `create_last_listing(criteria, notes)` | Requires lobby has only the owner (no co-players). Creates `kind='last'` listing. Returns `listing_id`. |
| `cancel_listing(listing_id)` | Owner-only. Cancels pending invitations, lobby returns to `idle`. |

### 4.2. Invitations

| RPC | Description |
|---|---|
| `invite_last(listing_id, target_user_id)` | Searcher invites a Last. Hard-checks platform match. |
| `propose_as_last(listing_id)` | Last user proposes himself to a Searcher listing. Requires caller has an active `last` listing. Hard-checks platform. |
| `invite_coplayer(listing_id, target_user_id)` | Searcher invites a Skrim friend as co-player. |
| `accept_invitation(invitation_id)` | Recipient accepts. Adds caller to `lobby_members` with appropriate role. Cancels all other pending invitations from caller. Closes Last's own listing if applicable. Returns `lobby_id`. |
| `decline_invitation(invitation_id)` | Recipient declines. Triggers push notification to sender. |
| `cancel_invitation(invitation_id)` | Sender cancels before response. |

### 4.3. Lobby management

| RPC | Description |
|---|---|
| `set_group_code(lobby_id, code)` | Searcher only. Validates `^[A-Z0-9]{6}$`. Triggers push notif to lobby members. |
| `leave_lobby(lobby_id)` | Member (non-owner) leaves. Reopens listing if was full. |
| `remove_lobby_member(lobby_id, target_user_id)` | Searcher only. Same effect as leave + flagged `removed_by_searcher`. |
| `launch_lobby(lobby_id)` | Searcher only. Hard checks: lobby full, code set, Riot-valid composition. Sets `status='launched'`, removes all non-owner members, closes listing. |

### 4.4. Feed reads

| RPC | Description |
|---|---|
| `get_searcher_feed(filter_overrides jsonb)` | For Last users. Returns open `searcher` listings filtered by caller's profile + overrides. Hard filter on region & platform (non-overridable). |
| `get_last_feed(filter_overrides jsonb)` | For Searcher users. Returns open `last` listings filtered by caller's profile (and group composition rank window) + overrides. |
| `get_my_active_listing()` | Returns caller's active listing + lobby state, or null. |
| `get_lobby_state(lobby_id)` | Returns full lobby state (members + profiles + group_composition + parent listing). Caller must be active member. |
| `mark_events_seen(event_ids uuid[])` | Marks events as seen by caller. |

### 4.5. Triggers

- **`after insert on profiles`** → auto-create `lobbies` row + insert owner as `lobby_members` (role=`searcher`).
- **`before insert/update on profile_servers`** → reject if `valorant_servers.region != profiles.region`.
- **`after insert on lobby_members`** → close listing if lobby reaches 5/5.
- **`after update on lobby_members`** (left_at non-null) → reopen listing if lobby drops below capacity (and not expired).
- **`after insert on lobby_events`** → HTTP POST to edge function `on-listing-event` for push notification dispatch.

### 4.6. Cron jobs (pg_cron)

```sql
SELECT cron.schedule('expire-invitations',  '* * * * *', $$ SELECT expire_old_invitations(); $$);
SELECT cron.schedule('expire-listings',     '* * * * *', $$ SELECT expire_old_listings(); $$);
SELECT cron.schedule('purge-old-events',    '0 * * * *', $$ DELETE FROM lobby_events WHERE seen_at IS NOT NULL AND seen_at < now() - interval '24 hours'; $$);
SELECT cron.schedule('purge-old-listings',  '0 * * * *', $$ DELETE FROM listings WHERE status IN ('expired', 'closed') AND created_at < now() - interval '7 days'; $$);
```

---

## 5. UI / screens

### 5.1. Tab bar

```
[Home]  [Find]  [Team]  [Profile]
```

- `Calendar` tab is **removed** entirely (file deleted, removed from `(tabs)/_layout.tsx`).
- `Find` is the new tab containing the matchmaking feature.
- `Home` is the **lobby screen**, always.

### 5.2. Routing

```
app/
├── _layout.tsx                     # already cleaned
├── (auth)/
│   └── onboarding/...              # 10-step onboarding (see §6)
├── (tabs)/
│   ├── home.tsx                    # Lobby permanent (always shown)
│   ├── find.tsx                    # Role toggle + feed + publish CTA
│   ├── team.tsx                    # existing, unchanged
│   └── profile.tsx                 # existing + new editable fields
└── publish/
    ├── searcher.tsx                # Searcher publish form
    └── last.tsx                    # Last publish form
```

### 5.3. Home — permanent lobby view

The Home screen always renders the user's lobby. UI variants by lobby state:

**Idle, solo:**

- Avatar slot (1/5) + 4 empty slots
- "Find lasts" CTA → `find.tsx?role=searcher`
- "Be a Last" CTA → `find.tsx?role=last`
- "Invite a friend" button (modal user-search → sends `invite_coplayer`)
- Optional group-code input

**Idle, with co-players:**

- 5 slots: 1 (searcher) + N co-players + (4-N) empty
- "Find lasts to fill" CTA → searcher publish form pre-filled with auto-calculated `target_lasts_count`
- "Invite a friend" still available
- Searcher can kick co-players

**Searching (active listing):**

- Slots: real members + pending invitation slots (greyed avatars)
- Banner "Listing active — expires in X min" + "Cancel" CTA
- "Invite more lasts" reopens the feed
- **Launch** button (disabled with reason badge until prerequisites met)

**Launched:**

- Recap view: 5 members + group code + launch timestamp
- "Match in progress — Have a good game!"
- Auto-reset back to idle after a delay

### 5.4. Find — role toggle + feed

- Header: role toggle "I'm looking for lasts" / "I'm a last"
- If no active listing: "Publish" CTA below the toggle
- If active listing: toggle locked on active role, CTA replaced by "Modify / Cancel my listing"
- Sticky filter bar: editable badges (rank window, languages, voice, servers, age), "Reset", "My criteria"
- Listing cards: avatar, Riot ID, rank, languages, ±18, voice, servers, notes
- Tap card → detail modal with primary CTA (**Invite** / **Propose**)
- Browse without listing is allowed; CTA shows modal "Publish first" if no active listing

### 5.5. Publish forms

**`publish/searcher.tsx`** — 3 collapsible sections (default open):

1. **Group composition** — `target_lasts_count` segmented control (1/2/3). For each co-player slot: mode picker (External / Invite friend), then rank dropdown or user picker.
2. **Criteria** — pre-filled from profile, modifiable: region (read-only), servers, rank min/max, primary language, secondary languages, voice, age filter.
3. **Optional** — group code (regex-validated live), notes (200 chars).

CTA: "Publish" (disabled until composition valid). Redirects to Home.

**`publish/last.tsx`** — single section:

1. Criteria (pre-filled, modifiable) + optional notes.

CTA: "Publish as last". Redirects to Find with `?role=last`.

### 5.6. Hooks

- `useMyLobby()` — RT on `lobbies` (owner_id = me) + `lobby_members` (lobby = my_lobby) + `listings` (lobby = my_lobby)
- `useMyInvitations()` — RT on `listing_invitations` where me ∈ {from, to}
- `useFeed(role, filters)` — React Query that calls RPC `get_searcher_feed` or `get_last_feed`. RT subscription on `listings` (kind = role, status = open) is used solely to invalidate the React Query cache when listings appear/change.
- `useLobbyAsMember()` — RT on lobbies where I'm an active member (Last accepted, coplayer accepted)
- `useUnseenEvents()` — RT on `lobby_events` (recipient_id = me, seen_at IS NULL) → drives Home tab dot

### 5.7. Tab indicator (Home)

A red dot appears on the Home tab when `useUnseenEvents().count > 0` — i.e. only when the user has at least one unseen event (new invitation, member joined/left, code set, lobby launched, listing expiring, etc.). The dot is **event-driven**, not a permanent indicator of "you have a lobby". Cleared via `mark_events_seen()` when the user opens Home and views the relevant content (e.g. consults the lobby slots, the invitations list, etc.).

### 5.8. Push notification deep links

All push types route to `(tabs)/home`:

| Event | Payload | Action |
|---|---|---|
| `invitation_received` | `{invitation_id}` | Modal invitation detail |
| `invitation_accepted` | `{lobby_id}` | Navigate Home |
| `invitation_declined` | — | Toast + invalidate feed |
| `member_joined` | `{user_id}` | Navigate Home |
| `member_left` | `{user_id}` | Navigate Home |
| `member_kicked` | — | Modal "You were removed" + Home |
| `group_code_set` | `{lobby_id, code}` | Navigate Home + toast (copyable code) |
| `lobby_launched` | `{lobby_id}` | Navigate Home |
| `listing_expiring_soon` | `{listing_id}` | Toast warning |

---

## 6. Onboarding & settings

### 6.1. Onboarding — 10 steps

All steps are mandatory before entering the tabs. Stored in a Zustand `OnboardingProvider` until final submit.

1. **Username**
2. **Avatar**
3. **Birthdate** — date picker, ≥ 13 years old (Valorant TOS)
4. **Region** — picker (6 values)
5. **Servers** — multi-select within the chosen region (min 1, max all-of-region)
6. **Platform** — PC / Console
7. **Rank** — dropdown from `valorant_competitive_tiers.tier_name` (includes "Unranked")
8. **Languages** — primary (single, defaults to device language) + secondary (multi, optional)
9. **Voice chat** — toggle yes/no
10. **Submit** — writes profile, creates lobby (via trigger), routes to `(tabs)/home`

Implemented as a wizard with shared state (Zustand) rather than 9 separate routes.

### 6.2. Settings (Profile screen)

All fields editable post-onboarding except **birthdate** (anti-fraud, displayed read-only with computed age / ±18 badge).

- Region change → triggers reset of `profile_servers` (must re-select within new region)
- Rank change → updates `rank_updated_at`
- Platform change → user warning: "this changes who you see in Find, not who can see you"

### 6.3. Libs to create

- `lib/languages.ts` — exhaustive ISO 639-1 list (`{ code, native }[]`, native = name written in the language itself)
- `lib/valorant-servers.ts` — 24 servers grouped by region (used for seed + UI pickers)
- `lib/valorant-regions.ts` — 6 regions with display labels

### 6.4. Existing users

All users in `auth.users` are deleted at migration time (only 2 personal test accounts exist). This wipes the schema cleanly for the new flow:

```sql
DELETE FROM auth.users; -- cascades through profiles → lobbies → all dependent tables
```

This allows new columns to be `NOT NULL` immediately without backfill logic.

---

## 7. Realtime, RLS, edge functions

### 7.1. Realtime publications

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE lobby_members;
ALTER PUBLICATION supabase_realtime ADD TABLE listings;
ALTER PUBLICATION supabase_realtime ADD TABLE listing_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE lobby_events;
```

### 7.2. RLS policies

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `lobbies` | owner OR active member | trigger only | RPC only (specific cols) | cascade only |
| `lobby_members` | owner OR self OR active sibling member | RPC only | RPC only | RPC only |
| `listings` | public if `open`, owner/member otherwise | RPC only | RPC only | RPC only |
| `listing_invitations` | from_user OR to_user | RPC only | RPC only | RPC only |
| `lobby_events` | recipient only | trigger/RPC only | self via RPC `mark_events_seen` | cron only |
| `profile_servers` | public | self | — | self |
| `valorant_servers` | public | seed only | seed only | seed only |
| `profiles` | (existing public read) | (existing) | self only | (existing) |

### 7.3. Edge functions

- **`on-match-event` is renamed `on-listing-event`** — the Postgres trigger on `lobby_events` HTTP-POSTs the event payload here. The function reads `profiles.push_token` for the recipient and calls `send-push` (existing) with mapped title/body/data.
- **`send-push` unchanged.**
- Push localization: handled in `on-listing-event` (FR/EN minimum at v1).

### 7.4. Migration order

1. `wipe_users.sql` — `DELETE FROM auth.users`
2. `drop_legacy_match_tables.sql` — drops legacy `matches`, `match_members`, RPCs, cron, edge function
3. `add_valorant_profile_columns.sql` — extends `profiles`
4. `create_valorant_servers_table.sql` — reference table + seed (24 servers)
5. `create_profile_servers_junction.sql` — junction + region-coherence trigger
6. `create_lobbies_table.sql` — lobbies + auto-create trigger on `profiles` insert
7. `create_listings_table.sql` — listings + indexes + cron expire
8. `create_listing_invitations_table.sql` — invitations + indexes + cron expire
9. `create_lobby_members_table.sql` — members + indexes
10. `create_lobby_events_table.sql` — events + indexes + cron purge
11. `create_listing_rpcs.sql` — all business RPCs
12. `create_listing_rls.sql` — RLS policies
13. `enable_listing_realtime.sql` — `ALTER PUBLICATION`

---

## 8. Hard-blocking rules vs informative warnings

| Situation | Behaviour |
|---|---|
| 4-stack composition | Hard-blocked (impossible Riot) — `target_lasts_count` constrained to 1-3 |
| Immortal+ trio | Hard-blocked — checked at launch |
| Platform mismatch in feed | Hard filter (PC users don't see console listings) |
| Region mismatch | Hard filter |
| Rank disparity outside Riot window | Informative warning badge ⚠️ on card; not blocked |
| 5-stack RR penalty (-25% / -75% Radiant) | Informative banner on Launch button |
| Rank declarative outdated | "Updated X days ago" timestamp on card |

---

## 9. Files affected

**New files:**

```
app/(tabs)/find.tsx
app/publish/searcher.tsx
app/publish/last.tsx
app/(auth)/onboarding/...               # extended wizard
hooks/useMyLobby.ts
hooks/useMyInvitations.ts
hooks/useFeed.ts
hooks/useLobbyAsMember.ts
hooks/useUnseenEvents.ts
lib/languages.ts
lib/valorant-servers.ts
lib/valorant-regions.ts
components/lobby/LobbySlot.tsx
components/lobby/LobbyHeader.tsx
components/lobby/GroupCodeInput.tsx
components/find/RoleToggle.tsx
components/find/ListingCard.tsx
components/find/FilterBar.tsx
components/publish/ComposeGroupSection.tsx
components/publish/CriteriaSection.tsx
supabase/migrations/<13 files listed in §7.4>
supabase/functions/on-listing-event/  # renamed from on-match-event
```

**Modified files:**

```
app/(tabs)/_layout.tsx              # add Find, remove Calendar
app/(tabs)/home.tsx                 # rewrite as permanent lobby view
app/(tabs)/profile.tsx              # add editable Valorant fields
lib/notifications.ts                # add new deep link routing
types/database.ts                   # regenerated post-migration
types/composites.ts                 # add lobby/listing composite types
```

**Deleted files:**

```
app/(tabs)/calendar.tsx             # removed entirely
```

---

## 10. Open questions deferred to v1.1+

- Rank verification via Riot API (currently declarative)
- Long-lived co-player groups (currently reset at launch)
- Scheduling / future-dated listings (currently instant only)
- Other game modes (Unrated, Swiftplay)
- Duo-q / trio-q
- In-app messaging
- Reputation / report system
- Listing kick cooldown / rate limiting
