# Find Lasts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 "Find Lasts" feature — a permanent per-user lobby with Searcher/Last listings, invitations, lobby management and launch — fully replacing the legacy LFG match flow.

**Architecture:** Postgres-first state model (lobbies / listings / invitations / members / events) driven by `SECURITY DEFINER` RPCs. Realtime via Supabase publications. Push via Postgres trigger → renamed edge function `on-listing-event` → existing `send-push`. Frontend wires React Query feed reads on top of realtime invalidation; the rest is realtime-only state. Onboarding extended to a 10-step wizard. Calendar tab is removed.

**Tech Stack:** Expo SDK 54 + Expo Router v4, TypeScript strict, NativeWind v4, Supabase (Postgres + Auth + Realtime + Edge Functions + Storage + pg_cron + pg_net), Zustand, React Query v5.

**Spec:** [docs/superpowers/specs/2026-04-28-find-lasts-design.md](../specs/2026-04-28-find-lasts-design.md)

---

## Milestones overview

| # | Title | Scope |
|---|---|---|
| M0 | Cleanup résiduel & bootstrap | Commit working-tree cleanup, prep folders |
| M1 | DB foundation: enums + profile extensions + reference tables | Wipe users, drop legacy, enums, `profiles`, `valorant_servers`, `profile_servers` |
| M2 | DB feature tables: lobbies, listings, invitations, members, events | Tables, indexes, structural triggers (auto-lobby) |
| M3 | DB business logic: RPCs + RLS + realtime + cron | All listing/invitation/lobby RPCs, RLS, publication, cron |
| M4 | Edge function rename `on-match-event` → `on-listing-event` | Refactor + deploy + wire trigger |
| M5 | Frontend libs: languages, valorant-servers, valorant-regions | Pure data modules + types |
| M6 | Onboarding wizard extension | Birthdate / Servers / Languages / Voice steps + Zustand state |
| M7 | Profile/Settings updates | Editable Valorant fields, region-reset cascade, birthdate read-only |
| M8 | Hooks layer | useMyLobby, useMyInvitations, useFeed, useLobbyAsMember, useUnseenEvents |
| M9 | Find tab | Role toggle, feed list, filter bar, listing detail modal |
| M10 | Publish forms | `publish/searcher.tsx` + `publish/last.tsx` |
| M11 | Home rewrite | Permanent lobby view (idle/searching/launched variants) |
| M12 | Tabs nav + push deep links | `(tabs)/_layout.tsx`, `lib/notifications.ts` |
| M13 | End-to-end verification | Type check, manual run, push, regression |

---

## Milestone 0 — Cleanup résiduel & bootstrap

The working tree already contains the legacy match teardown (calendar/home reset, deletes of `app/match/*`, `components/Match*`, hooks, store). Commit this first so subsequent milestones start from a clean baseline.

### Task 0.1: Verify working tree state

**Files:**
- Inspect: working tree only

- [ ] **Step 1: List staged + unstaged changes**

Run:
```bash
git status
```

Expected output should include the deletions from the previous cleanup phase: `app/match/[id].tsx`, `app/match/_layout.tsx`, `components/ActiveMatchBanner.tsx`, `components/CreateMatchModal.tsx`, `components/CurrentEventsBanner.tsx`, `components/MatchCard.tsx`, `components/RankResetBanner.tsx`, `components/calendar/MyMatchesList.tsx`, `hooks/useActiveMatch.ts`, `hooks/useActiveMatchRealtime.ts`, `hooks/useHomeRealtime.ts`, `hooks/useMatchDetail.ts`, `hooks/useMatchRealtime.ts`, `stores/activeMatchStore.ts`. Modifications expected on `app/(tabs)/calendar.tsx`, `app/(tabs)/home.tsx`, `app/_layout.tsx`, `lib/notifications.ts`, `types/composites.ts`.

- [ ] **Step 2: Confirm no orphan references**

Run:
```bash
grep -RIl --include='*.ts' --include='*.tsx' \
  -e 'useActiveMatch' -e 'useMatchDetail' -e 'useMatchRealtime' \
  -e 'useHomeRealtime' -e 'useActiveMatchRealtime' \
  -e 'MatchCard' -e 'CreateMatchModal' -e 'ActiveMatchBanner' \
  -e 'MyMatchesList' -e 'RankResetBanner' -e 'CurrentEventsBanner' \
  -e 'activeMatchStore' -e 'useActiveMatchStore' \
  app components hooks lib stores types
```

Expected: no output (no orphans).

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: 0 errors.

### Task 0.2: Commit cleanup baseline

**Files:**
- Stage: only the files listed above (do NOT use `git add -A`).

- [ ] **Step 1: Stage cleanup files**

Run:
```bash
git add app/match app/\(tabs\)/calendar.tsx app/\(tabs\)/home.tsx app/_layout.tsx \
  components/ActiveMatchBanner.tsx components/CreateMatchModal.tsx \
  components/CurrentEventsBanner.tsx components/MatchCard.tsx \
  components/RankResetBanner.tsx components/calendar \
  hooks/useActiveMatch.ts hooks/useActiveMatchRealtime.ts hooks/useHomeRealtime.ts \
  hooks/useMatchDetail.ts hooks/useMatchRealtime.ts stores/activeMatchStore.ts \
  lib/notifications.ts types/composites.ts
```

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(match): tear down legacy LFG match frontend

Removes match detail screen, active-match banner/store, match hooks,
and Calendar list component. Resets Home/Calendar tabs to placeholders
in preparation for the new Find Lasts feature.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify**

Run:
```bash
git status
git log -1 --stat
```

Expected: clean tree (or only unrelated `.claude/` files), last commit shows the deletions and resets.

### Task 0.3: Create plan-aligned folders

**Files:**
- Create: `app/publish/` (empty for now)
- Create: `components/lobby/` (empty)
- Create: `components/find/` (empty)
- Create: `components/publish/` (empty)

- [ ] **Step 1: Make directories**

Run:
```bash
mkdir -p app/publish components/lobby components/find components/publish
```

Expected: directories created (no commit yet — will be committed alongside their first file).

---

## Milestone 1 — DB foundation: enums, profile extensions, reference tables

All migrations follow Supabase convention: `supabase/migrations/YYYYMMDDHHmmss_kebab-slug.sql`. Use `supabase migration new <slug>` to scaffold timestamps; the `<HHmmss>` portion below is illustrative — use whatever the CLI emits.

### Task 1.1: Wipe existing users (clean slate)

**Files:**
- Create: `supabase/migrations/<ts>_wipe_users.sql`

- [ ] **Step 1: Scaffold migration**

Run:
```bash
supabase migration new wipe_users
```

- [ ] **Step 2: Write migration**

```sql
-- Personal test accounts only. Cascades through profiles → all dependent tables.
DELETE FROM auth.users;
```

- [ ] **Step 3: Apply locally + verify**

Run:
```bash
supabase db reset --local
```

Expected: reset succeeds; `SELECT count(*) FROM auth.users;` returns 0.

### Task 1.2: Drop legacy match tables, RPCs, cron, edge function

**Files:**
- Create: `supabase/migrations/<ts>_drop_legacy_match.sql`

- [ ] **Step 1: Inventory legacy artefacts**

Run:
```bash
grep -RIn -e 'match_members' -e 'matches' -e 'check_active_match' \
  -e 'check_kick_cooldown' -e 'recalculate_current_players' \
  -e 'expire_old_matches' -e 'renew_match' -e 'check_single_active_match' \
  supabase/migrations supabase/cron-jobs.sql
```

Note every artefact name surfaced — they all need explicit DROP statements.

- [ ] **Step 2: Write migration**

```sql
-- Drop cron schedules (idempotent).
SELECT cron.unschedule('expire-old-matches') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-old-matches');

-- Drop triggers (depend on functions).
DROP TRIGGER IF EXISTS on_match_event ON public.matches;
DROP TRIGGER IF EXISTS check_match_active ON public.matches;
DROP TRIGGER IF EXISTS check_kick_cooldown_trigger ON public.match_members;
DROP TRIGGER IF EXISTS recalculate_match_players ON public.match_members;

-- Drop RPCs.
DROP FUNCTION IF EXISTS public.check_active_match(uuid);
DROP FUNCTION IF EXISTS public.check_kick_cooldown(uuid, uuid);
DROP FUNCTION IF EXISTS public.recalculate_current_players();
DROP FUNCTION IF EXISTS public.expire_old_matches();
DROP FUNCTION IF EXISTS public.renew_match(uuid);
DROP FUNCTION IF EXISTS public.check_single_active_match();

-- Drop tables (CASCADE handles RLS, indexes, FKs).
DROP TABLE IF EXISTS public.match_members CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;

-- Drop legacy enums (only if exclusively used by the dropped tables).
DROP TYPE IF EXISTS public.match_status;
```

- [ ] **Step 3: Apply locally**

Run:
```bash
supabase db reset --local
```

Expected: success.

- [ ] **Step 4: Update `supabase/cron-jobs.sql` mirror**

Open [supabase/cron-jobs.sql](../../../supabase/cron-jobs.sql), remove the `expire-old-matches` block. Keep `sync-valorant-data-daily` intact.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/cron-jobs.sql
git commit -m "$(cat <<'EOF'
chore(db): drop legacy match tables, RPCs, cron, and triggers

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 1.3: Create global enums

**Files:**
- Create: `supabase/migrations/<ts>_create_listing_enums.sql`

- [ ] **Step 1: Write migration**

```sql
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
```

- [ ] **Step 2: Apply + verify**

```bash
supabase db reset --local
psql "$LOCAL_DB_URL" -c "\dT+ public.*"
```

Expected: all 9 enums listed.

### Task 1.4: Extend `profiles` with Valorant identity fields

**Files:**
- Create: `supabase/migrations/<ts>_extend_profiles_valorant.sql`

- [ ] **Step 1: Write migration**

```sql
ALTER TABLE public.profiles
  ADD COLUMN region public.valorant_region NOT NULL,
  ADD COLUMN platform public.valorant_platform NOT NULL,
  ADD COLUMN current_rank text NOT NULL
    REFERENCES public.valorant_competitive_tiers(tier_name)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD COLUMN rank_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN birthdate date NOT NULL,
  ADD COLUMN primary_language text NOT NULL,
  ADD COLUMN secondary_languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN voice_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX idx_profiles_region_platform ON public.profiles (region, platform);
```

NOTE: this works because `auth.users` was wiped in Task 1.1 → `profiles` is empty.

- [ ] **Step 2: Apply + verify**

```bash
supabase db reset --local
psql "$LOCAL_DB_URL" -c "\d public.profiles"
```

Expected: 8 new columns visible with correct types and NOT NULL flags.

### Task 1.5: Create `valorant_servers` reference table + seed

**Files:**
- Create: `supabase/migrations/<ts>_create_valorant_servers.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE TABLE public.valorant_servers (
  id text PRIMARY KEY,
  region public.valorant_region NOT NULL,
  display_name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX idx_valorant_servers_region ON public.valorant_servers (region, sort_order);

INSERT INTO public.valorant_servers (id, region, display_name, sort_order) VALUES
  -- NA
  ('na-virginia',     'NA',    'Virginia (NA)',          10),
  ('na-illinois',     'NA',    'Illinois (NA)',          20),
  ('na-texas',        'NA',    'Texas (NA)',             30),
  ('na-oregon',       'NA',    'Oregon (NA)',            40),
  ('na-california',   'NA',    'California (NA)',        50),
  -- LATAM
  ('latam-mexico',    'LATAM', 'Mexico (LATAM)',         10),
  ('latam-chile',     'LATAM', 'Chile (LATAM)',          20),
  -- BR
  ('br-saopaulo',     'BR',    'São Paulo (BR)',         10),
  -- EU
  ('eu-paris',        'EU',    'Paris (EU)',             10),
  ('eu-frankfurt',    'EU',    'Frankfurt (EU)',         20),
  ('eu-stockholm',    'EU',    'Stockholm (EU)',         30),
  ('eu-london',       'EU',    'London (EU)',            40),
  ('eu-madrid',       'EU',    'Madrid (EU)',            50),
  ('eu-warsaw',       'EU',    'Warsaw (EU)',            60),
  ('eu-istanbul',     'EU',    'Istanbul (EU)',          70),
  ('eu-bahrain',      'EU',    'Bahrain (EU)',           80),
  -- KR
  ('kr-seoul',        'KR',    'Seoul (KR)',             10),
  -- APAC
  ('apac-tokyo',      'APAC',  'Tokyo (APAC)',           10),
  ('apac-singapore',  'APAC',  'Singapore (APAC)',       20),
  ('apac-hongkong',   'APAC',  'Hong Kong (APAC)',       30),
  ('apac-sydney',     'APAC',  'Sydney (APAC)',          40),
  ('apac-mumbai',     'APAC',  'Mumbai (APAC)',          50),
  ('apac-jakarta',    'APAC',  'Jakarta (APAC)',         60),
  ('apac-taipei',     'APAC',  'Taipei (APAC)',          70);
```

NOTE: 24 rows total. If the lib `lib/valorant-servers.ts` (created in Task 5.2) ends up with a different list, update both seed and lib in lockstep.

- [ ] **Step 2: Apply + verify**

```bash
supabase db reset --local
psql "$LOCAL_DB_URL" -c "SELECT region, count(*) FROM public.valorant_servers GROUP BY region ORDER BY region;"
```

Expected: 24 total rows distributed across 6 regions.

### Task 1.6: Create `profile_servers` junction + region-coherence trigger

**Files:**
- Create: `supabase/migrations/<ts>_create_profile_servers.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE TABLE public.profile_servers (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  server_id text NOT NULL REFERENCES public.valorant_servers(id) ON DELETE RESTRICT,
  PRIMARY KEY (profile_id, server_id)
);

CREATE INDEX idx_profile_servers_server ON public.profile_servers (server_id);

CREATE OR REPLACE FUNCTION public.assert_profile_server_region()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  profile_region public.valorant_region;
  server_region  public.valorant_region;
BEGIN
  SELECT region INTO profile_region FROM public.profiles WHERE id = NEW.profile_id;
  SELECT region INTO server_region  FROM public.valorant_servers WHERE id = NEW.server_id;

  IF profile_region IS NULL THEN
    RAISE EXCEPTION 'profile % not found', NEW.profile_id;
  END IF;
  IF server_region IS NULL THEN
    RAISE EXCEPTION 'server % not found', NEW.server_id;
  END IF;
  IF profile_region <> server_region THEN
    RAISE EXCEPTION 'server % (region %) is not in profile region %',
      NEW.server_id, server_region, profile_region;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_servers_region_check
  BEFORE INSERT OR UPDATE ON public.profile_servers
  FOR EACH ROW EXECUTE FUNCTION public.assert_profile_server_region();
```

- [ ] **Step 2: Apply + verify**

```bash
supabase db reset --local
```

- [ ] **Step 3: Commit M1**

```bash
git add supabase/migrations
git commit -m "$(cat <<'EOF'
feat(db): listing-feature foundation — enums, profile extensions, valorant_servers

Adds region/platform/rank/birthdate/language/voice columns to profiles,
creates valorant_servers reference table seeded with 24 servers, and
profile_servers junction with region-coherence trigger.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Milestone 2 — DB feature tables: lobbies, listings, invitations, members, events

### Task 2.1: Create `lobbies` table + auto-create trigger on profile insert

**Files:**
- Create: `supabase/migrations/<ts>_create_lobbies.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE TABLE public.lobbies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_code text,
  status public.lobby_status NOT NULL DEFAULT 'idle',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_launched_at timestamptz,
  CONSTRAINT lobbies_group_code_format CHECK (
    group_code IS NULL OR group_code ~ '^[A-Z0-9]{6}$'
  )
);

CREATE UNIQUE INDEX idx_lobbies_owner ON public.lobbies (owner_id);

-- Auto-create lobby on profile insert (the owner-as-member is added
-- in the lobby_members migration, after that table exists).
CREATE OR REPLACE FUNCTION public.create_lobby_for_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.lobbies (owner_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_create_lobby
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_lobby_for_profile();
```

- [ ] **Step 2: Apply + verify**

```bash
supabase db reset --local
```

### Task 2.2: Create `lobby_members` + active-uniqueness + auto-insert owner

**Files:**
- Create: `supabase/migrations/<ts>_create_lobby_members.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE TABLE public.lobby_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id uuid NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.lobby_member_role NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  removed_by_searcher boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX idx_lobby_members_active_unique
  ON public.lobby_members (lobby_id, user_id)
  WHERE left_at IS NULL;

CREATE INDEX idx_lobby_members_active
  ON public.lobby_members (lobby_id) WHERE left_at IS NULL;

CREATE INDEX idx_lobby_members_user_active
  ON public.lobby_members (user_id) WHERE left_at IS NULL;

-- Replace the lobby auto-create trigger so it inserts the owner as a member.
CREATE OR REPLACE FUNCTION public.create_lobby_for_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_lobby_id uuid;
BEGIN
  INSERT INTO public.lobbies (owner_id) VALUES (NEW.id) RETURNING id INTO new_lobby_id;
  INSERT INTO public.lobby_members (lobby_id, user_id, role)
  VALUES (new_lobby_id, NEW.id, 'searcher');
  RETURN NEW;
END;
$$;
```

- [ ] **Step 2: Apply + smoke-test**

```bash
supabase db reset --local
psql "$LOCAL_DB_URL" -c "SELECT count(*) FROM public.lobby_members;"
```

Expected: 0 rows (no profiles yet).

### Task 2.3: Create `listings` table

**Files:**
- Create: `supabase/migrations/<ts>_create_listings.sql`

- [ ] **Step 1: Write migration**

```sql
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
```

- [ ] **Step 2: Apply**

```bash
supabase db reset --local
```

### Task 2.4: Create `listing_invitations` table

**Files:**
- Create: `supabase/migrations/<ts>_create_listing_invitations.sql`

- [ ] **Step 1: Write migration**

```sql
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
```

- [ ] **Step 2: Apply**

```bash
supabase db reset --local
```

### Task 2.5: Create `lobby_events` table

**Files:**
- Create: `supabase/migrations/<ts>_create_lobby_events.sql`

- [ ] **Step 1: Write migration**

```sql
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
```

- [ ] **Step 2: Apply + commit M2**

```bash
supabase db reset --local
git add supabase/migrations
git commit -m "$(cat <<'EOF'
feat(db): add lobbies, listings, invitations, members, events tables

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Milestone 3 — DB business logic: RPCs + structural triggers + RLS + realtime + cron

This milestone writes a lot of SQL. Split into focused migrations so review is tractable.

### Task 3.1: Helper RPCs (auth + composition checks)

**Files:**
- Create: `supabase/migrations/<ts>_listing_helpers.sql`

- [ ] **Step 1: Write migration**

```sql
-- Returns the caller's lobby id. Created on profile insert, so always exists.
CREATE OR REPLACE FUNCTION public.my_lobby_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.lobbies WHERE owner_id = auth.uid();
$$;

-- Counts active members (left_at IS NULL) in a lobby.
CREATE OR REPLACE FUNCTION public.lobby_active_member_count(p_lobby_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT count(*)::int FROM public.lobby_members
   WHERE lobby_id = p_lobby_id AND left_at IS NULL;
$$;

-- Asserts the caller owns the given lobby; throws otherwise.
CREATE OR REPLACE FUNCTION public.assert_lobby_owner(p_lobby_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.lobbies WHERE id = p_lobby_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'caller is not the owner of lobby %', p_lobby_id
      USING ERRCODE = '42501';
  END IF;
END;
$$;
```

- [ ] **Step 2: Apply**

```bash
supabase db reset --local
```

### Task 3.2: Listing lifecycle RPCs

**Files:**
- Create: `supabase/migrations/<ts>_listing_lifecycle_rpcs.sql`

- [ ] **Step 1: Write migration**

```sql
-- Validates and creates a Searcher listing.
CREATE OR REPLACE FUNCTION public.create_searcher_listing(
  p_criteria jsonb,
  p_target_lasts_count int,
  p_group_composition jsonb,
  p_coplayer_invites uuid[],
  p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lobby_id uuid;
  v_listing_id uuid;
  v_external_count int := COALESCE(jsonb_array_length(p_group_composition), 0);
  v_invite_count int := COALESCE(array_length(p_coplayer_invites, 1), 0);
  v_target_user uuid;
BEGIN
  v_lobby_id := public.my_lobby_id();
  IF v_lobby_id IS NULL THEN
    RAISE EXCEPTION 'no lobby for caller' USING ERRCODE = '42501';
  END IF;

  IF p_target_lasts_count IS NULL OR p_target_lasts_count NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'target_lasts_count must be 1, 2 or 3' USING ERRCODE = '22023';
  END IF;

  -- 1 (searcher) + externals + invites + lasts must equal 5.
  IF 1 + v_external_count + v_invite_count + p_target_lasts_count <> 5 THEN
    RAISE EXCEPTION 'composition does not sum to 5 (got 1+%+%+% )',
      v_external_count, v_invite_count, p_target_lasts_count
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.listings WHERE lobby_id = v_lobby_id AND status = 'open') THEN
    RAISE EXCEPTION 'an open listing already exists' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.listings (lobby_id, kind, criteria, target_lasts_count, group_composition, notes)
  VALUES (v_lobby_id, 'searcher', p_criteria, p_target_lasts_count, p_group_composition, p_notes)
  RETURNING id INTO v_listing_id;

  -- Send invite_coplayer invitations.
  IF p_coplayer_invites IS NOT NULL THEN
    FOREACH v_target_user IN ARRAY p_coplayer_invites LOOP
      INSERT INTO public.listing_invitations (listing_id, from_user_id, to_user_id, direction)
      VALUES (v_listing_id, auth.uid(), v_target_user, 'invite_coplayer');

      INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
      VALUES (v_lobby_id, v_target_user, 'invitation_received',
              jsonb_build_object('listing_id', v_listing_id, 'direction', 'invite_coplayer'));
    END LOOP;
  END IF;

  UPDATE public.lobbies SET status = 'searching' WHERE id = v_lobby_id;
  RETURN v_listing_id;
END;
$$;

-- Creates a Last listing. Requires solo lobby.
CREATE OR REPLACE FUNCTION public.create_last_listing(
  p_criteria jsonb,
  p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lobby_id uuid;
  v_listing_id uuid;
BEGIN
  v_lobby_id := public.my_lobby_id();
  IF v_lobby_id IS NULL THEN
    RAISE EXCEPTION 'no lobby for caller' USING ERRCODE = '42501';
  END IF;

  IF public.lobby_active_member_count(v_lobby_id) <> 1 THEN
    RAISE EXCEPTION 'last listing requires a solo lobby' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.listings WHERE lobby_id = v_lobby_id AND status = 'open') THEN
    RAISE EXCEPTION 'an open listing already exists' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.listings (lobby_id, kind, criteria, notes)
  VALUES (v_lobby_id, 'last', p_criteria, p_notes)
  RETURNING id INTO v_listing_id;

  UPDATE public.lobbies SET status = 'searching' WHERE id = v_lobby_id;
  RETURN v_listing_id;
END;
$$;

-- Cancels caller's listing and any pending invitations on it.
CREATE OR REPLACE FUNCTION public.cancel_listing(p_listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lobby_id uuid;
BEGIN
  SELECT lobby_id INTO v_lobby_id FROM public.listings
   WHERE id = p_listing_id AND status = 'open';
  IF v_lobby_id IS NULL THEN
    RAISE EXCEPTION 'listing not found or not open' USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.assert_lobby_owner(v_lobby_id);

  UPDATE public.listings SET status = 'closed' WHERE id = p_listing_id;
  UPDATE public.listing_invitations
     SET status = 'cancelled', responded_at = now()
   WHERE listing_id = p_listing_id AND status = 'pending';

  UPDATE public.lobbies SET status = 'idle' WHERE id = v_lobby_id;
END;
$$;
```

- [ ] **Step 2: Apply**

```bash
supabase db reset --local
```

### Task 3.3: Invitation RPCs

**Files:**
- Create: `supabase/migrations/<ts>_invitation_rpcs.sql`

- [ ] **Step 1: Write migration**

```sql
-- Searcher → Last: invite a specific Last to fill a slot.
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

-- Last → Searcher: propose self for an open searcher listing.
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

  -- Caller must hold an active 'last' listing.
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

-- Searcher → friend: invite as co-player.
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

  -- Determine the joining user's role.
  v_role := CASE v_inv.direction
    WHEN 'invite_last'     THEN 'last'::public.lobby_member_role
    WHEN 'propose_last'    THEN 'last'::public.lobby_member_role
    WHEN 'invite_coplayer' THEN 'coplayer'::public.lobby_member_role
  END;

  -- Add to lobby. The "joining user" is whoever was the Last (from_user for propose, to_user for invite).
  INSERT INTO public.lobby_members (lobby_id, user_id, role)
  VALUES (
    v_target_lobby_id,
    CASE WHEN v_inv.direction = 'propose_last' THEN v_inv.from_user_id ELSE v_inv.to_user_id END,
    v_role
  );

  -- Mark accepted.
  UPDATE public.listing_invitations
     SET status = 'accepted', responded_at = now()
   WHERE id = p_invitation_id;

  -- Cancel sibling pending invitations addressed to the joining user.
  UPDATE public.listing_invitations
     SET status = 'cancelled', responded_at = now()
   WHERE status = 'pending'
     AND id <> p_invitation_id
     AND (
       to_user_id = CASE WHEN v_inv.direction = 'propose_last' THEN v_inv.from_user_id ELSE v_inv.to_user_id END
       OR (from_user_id = CASE WHEN v_inv.direction = 'propose_last' THEN v_inv.from_user_id ELSE v_inv.to_user_id END
           AND direction = 'propose_last')
     );

  -- If the joining user has an active 'last' listing of their own, close it.
  UPDATE public.listings SET status = 'closed'
   WHERE lobby_id = (SELECT id FROM public.lobbies WHERE owner_id =
                       CASE WHEN v_inv.direction = 'propose_last'
                            THEN v_inv.from_user_id ELSE v_inv.to_user_id END)
     AND kind = 'last' AND status = 'open';

  -- Notify the inviter.
  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  VALUES (v_target_lobby_id, v_inv.from_user_id, 'invitation_accepted',
          jsonb_build_object('invitation_id', p_invitation_id));

  -- Notify lobby members of the join.
  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  SELECT v_target_lobby_id, lm.user_id, 'member_joined',
         jsonb_build_object('user_id',
           CASE WHEN v_inv.direction = 'propose_last' THEN v_inv.from_user_id ELSE v_inv.to_user_id END)
    FROM public.lobby_members lm
   WHERE lm.lobby_id = v_target_lobby_id AND lm.left_at IS NULL
     AND lm.user_id <> CASE WHEN v_inv.direction = 'propose_last' THEN v_inv.from_user_id ELSE v_inv.to_user_id END;

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
```

- [ ] **Step 2: Apply**

```bash
supabase db reset --local
```

### Task 3.4: Lobby management RPCs

**Files:**
- Create: `supabase/migrations/<ts>_lobby_management_rpcs.sql`

- [ ] **Step 1: Write migration**

```sql
-- Searcher sets the Valorant group code.
CREATE OR REPLACE FUNCTION public.set_group_code(p_lobby_id uuid, p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_lobby_owner(p_lobby_id);
  IF p_code IS NULL OR p_code !~ '^[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'invalid group code format' USING ERRCODE = '22023';
  END IF;

  UPDATE public.lobbies SET group_code = p_code WHERE id = p_lobby_id;

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  SELECT p_lobby_id, lm.user_id, 'group_code_set',
         jsonb_build_object('lobby_id', p_lobby_id, 'code', p_code)
    FROM public.lobby_members lm
   WHERE lm.lobby_id = p_lobby_id AND lm.left_at IS NULL AND lm.user_id <> auth.uid();
END;
$$;

-- Member (non-owner) leaves.
CREATE OR REPLACE FUNCTION public.leave_lobby(p_lobby_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.lobbies WHERE id = p_lobby_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'lobby not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner = auth.uid() THEN
    RAISE EXCEPTION 'owner cannot leave own lobby — cancel listing or kick instead' USING ERRCODE = '22023';
  END IF;

  UPDATE public.lobby_members
     SET left_at = now()
   WHERE lobby_id = p_lobby_id AND user_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'caller is not an active member of this lobby' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  SELECT p_lobby_id, lm.user_id, 'member_left', jsonb_build_object('user_id', auth.uid())
    FROM public.lobby_members lm
   WHERE lm.lobby_id = p_lobby_id AND lm.left_at IS NULL;
END;
$$;

-- Searcher kicks a member.
CREATE OR REPLACE FUNCTION public.remove_lobby_member(p_lobby_id uuid, p_target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_lobby_owner(p_lobby_id);
  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot remove yourself' USING ERRCODE = '22023';
  END IF;

  UPDATE public.lobby_members
     SET left_at = now(), removed_by_searcher = true
   WHERE lobby_id = p_lobby_id AND user_id = p_target_user_id AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'member not found in lobby' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  VALUES (p_lobby_id, p_target_user_id, 'member_kicked', jsonb_build_object('lobby_id', p_lobby_id));

  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  SELECT p_lobby_id, lm.user_id, 'member_left', jsonb_build_object('user_id', p_target_user_id, 'kicked', true)
    FROM public.lobby_members lm
   WHERE lm.lobby_id = p_lobby_id AND lm.left_at IS NULL AND lm.user_id <> p_target_user_id;
END;
$$;

-- Searcher launches the lobby. Hard checks: full, code set, valid composition.
CREATE OR REPLACE FUNCTION public.launch_lobby(p_lobby_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lobby record;
  v_listing_id uuid;
  v_active_count int;
  v_external_count int;
  v_listing_target int;
BEGIN
  PERFORM public.assert_lobby_owner(p_lobby_id);
  SELECT * INTO v_lobby FROM public.lobbies WHERE id = p_lobby_id;

  IF v_lobby.group_code IS NULL THEN
    RAISE EXCEPTION 'group code must be set before launch' USING ERRCODE = '22023';
  END IF;

  SELECT id, target_lasts_count, COALESCE(jsonb_array_length(group_composition), 0)
    INTO v_listing_id, v_listing_target, v_external_count
    FROM public.listings WHERE lobby_id = p_lobby_id AND status = 'open';
  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'no active listing to launch' USING ERRCODE = 'P0002';
  END IF;

  v_active_count := public.lobby_active_member_count(p_lobby_id);
  IF v_active_count + v_external_count <> 5 THEN
    RAISE EXCEPTION 'lobby must reach 5/5 (active=%, external=%)', v_active_count, v_external_count
      USING ERRCODE = '22023';
  END IF;

  -- Hard composition checks (4-stack and Immortal+ trio rejection) handled
  -- in dedicated migration <ts>_listing_composition_check.sql below.
  PERFORM public.assert_launch_composition_valid(p_lobby_id);

  UPDATE public.lobbies SET status = 'launched', last_launched_at = now() WHERE id = p_lobby_id;
  UPDATE public.listings SET status = 'closed' WHERE id = v_listing_id;

  -- Remove non-owner members.
  UPDATE public.lobby_members
     SET left_at = now()
   WHERE lobby_id = p_lobby_id AND user_id <> v_lobby.owner_id AND left_at IS NULL;

  -- Notify all members (including owner).
  INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
  SELECT p_lobby_id, lm.user_id, 'lobby_launched', jsonb_build_object('lobby_id', p_lobby_id)
    FROM public.lobby_members lm
   WHERE lm.lobby_id = p_lobby_id;
END;
$$;
```

- [ ] **Step 2: Apply**

```bash
supabase db reset --local
```

### Task 3.5: Composition validity check (4-stack & Immortal+ trio)

**Files:**
- Create: `supabase/migrations/<ts>_listing_composition_check.sql`

- [ ] **Step 1: Write migration**

```sql
-- Returns true if a tier name (e.g. 'Immortal 1', 'Radiant') is Immortal or above.
CREATE OR REPLACE FUNCTION public.is_immortal_plus(p_tier_name text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_tier_name LIKE 'Immortal%' OR p_tier_name = 'Radiant';
$$;

-- Asserts the lobby's composition is launchable per Riot rules.
-- Hard rules: no 4-stack, no Immortal+ trio.
CREATE OR REPLACE FUNCTION public.assert_launch_composition_valid(p_lobby_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_active_count int;
  v_external_count int;
  v_immortal_count int;
  v_external_immortals int;
BEGIN
  v_active_count := public.lobby_active_member_count(p_lobby_id);

  SELECT COALESCE(jsonb_array_length(group_composition), 0)
    INTO v_external_count
    FROM public.listings WHERE lobby_id = p_lobby_id AND status = 'open';

  -- 4-stack rule: composition (active + external) must not equal 4.
  IF v_active_count + v_external_count = 4 THEN
    RAISE EXCEPTION '4-stacks are not allowed in Competitive' USING ERRCODE = '22023';
  END IF;

  -- Immortal+ trio: count Immortal+ players among active members + external composition.
  SELECT count(*) INTO v_immortal_count
    FROM public.lobby_members lm
    JOIN public.profiles p ON p.id = lm.user_id
   WHERE lm.lobby_id = p_lobby_id AND lm.left_at IS NULL
     AND public.is_immortal_plus(p.current_rank);

  SELECT count(*) INTO v_external_immortals
    FROM public.listings l,
         jsonb_array_elements(l.group_composition) AS gc
   WHERE l.lobby_id = p_lobby_id AND l.status = 'open'
     AND public.is_immortal_plus(gc->>'rank');

  IF (v_active_count + v_external_count) = 3 AND (v_immortal_count + v_external_immortals) >= 1 THEN
    -- Trio with at least one Immortal+ → blocked
    RAISE EXCEPTION 'Immortal+ players cannot trio-queue in Competitive' USING ERRCODE = '22023';
  END IF;
END;
$$;
```

- [ ] **Step 2: Apply**

```bash
supabase db reset --local
```

### Task 3.6: Feed-read RPCs

**Files:**
- Create: `supabase/migrations/<ts>_feed_read_rpcs.sql`

- [ ] **Step 1: Write migration**

```sql
-- For Last users: returns open searcher listings filtered by region/platform (hard) + soft filters.
CREATE OR REPLACE FUNCTION public.get_searcher_feed(p_filter_overrides jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (
  listing_id uuid,
  lobby_id uuid,
  owner_id uuid,
  owner_username text,
  owner_avatar_url text,
  owner_current_rank text,
  criteria jsonb,
  target_lasts_count int,
  group_composition jsonb,
  notes text,
  created_at timestamptz,
  expires_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_caller record;
BEGIN
  SELECT region, platform INTO v_caller FROM public.profiles WHERE id = auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
    SELECT l.id, l.lobby_id, p.id, p.username, p.avatar_url, p.current_rank,
           l.criteria, l.target_lasts_count, l.group_composition, l.notes,
           l.created_at, l.expires_at
      FROM public.listings l
      JOIN public.lobbies lo ON lo.id = l.lobby_id
      JOIN public.profiles p ON p.id = lo.owner_id
     WHERE l.kind = 'searcher'
       AND l.status = 'open'
       AND (l.criteria->>'region') = v_caller.region::text
       AND (l.criteria->>'platform') = v_caller.platform::text
       AND lo.owner_id <> auth.uid()
     ORDER BY l.created_at DESC;
END;
$$;

-- For Searcher users: returns open last listings filtered by region/platform.
CREATE OR REPLACE FUNCTION public.get_last_feed(p_filter_overrides jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (
  listing_id uuid,
  lobby_id uuid,
  owner_id uuid,
  owner_username text,
  owner_avatar_url text,
  owner_current_rank text,
  criteria jsonb,
  notes text,
  created_at timestamptz,
  expires_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_caller record;
BEGIN
  SELECT region, platform INTO v_caller FROM public.profiles WHERE id = auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
    SELECT l.id, l.lobby_id, p.id, p.username, p.avatar_url, p.current_rank,
           l.criteria, l.notes, l.created_at, l.expires_at
      FROM public.listings l
      JOIN public.lobbies lo ON lo.id = l.lobby_id
      JOIN public.profiles p ON p.id = lo.owner_id
     WHERE l.kind = 'last'
       AND l.status = 'open'
       AND (l.criteria->>'region') = v_caller.region::text
       AND (l.criteria->>'platform') = v_caller.platform::text
       AND lo.owner_id <> auth.uid()
     ORDER BY l.created_at DESC;
END;
$$;

-- Returns caller's active listing + lobby state (or NULL row).
CREATE OR REPLACE FUNCTION public.get_my_active_listing()
RETURNS TABLE (
  listing_id uuid,
  lobby_id uuid,
  kind public.listing_kind,
  status public.listing_status,
  criteria jsonb,
  target_lasts_count int,
  group_composition jsonb,
  notes text,
  created_at timestamptz,
  expires_at timestamptz,
  lobby_status public.lobby_status,
  group_code text
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT l.id, l.lobby_id, l.kind, l.status, l.criteria,
         l.target_lasts_count, l.group_composition, l.notes,
         l.created_at, l.expires_at, lo.status, lo.group_code
    FROM public.listings l
    JOIN public.lobbies lo ON lo.id = l.lobby_id
   WHERE lo.owner_id = auth.uid() AND l.status = 'open';
$$;

-- Returns full lobby state (members, listing, code) for the caller, who must be an active member.
CREATE OR REPLACE FUNCTION public.get_lobby_state(p_lobby_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.lobby_members
     WHERE lobby_id = p_lobby_id AND user_id = auth.uid() AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'caller is not an active member' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'lobby', to_jsonb(lo),
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'member', to_jsonb(lm),
        'profile', to_jsonb(p)
      ) ORDER BY lm.joined_at)
        FROM public.lobby_members lm
        JOIN public.profiles p ON p.id = lm.user_id
       WHERE lm.lobby_id = p_lobby_id AND lm.left_at IS NULL
    ), '[]'::jsonb),
    'listing', (SELECT to_jsonb(l) FROM public.listings l
                 WHERE l.lobby_id = p_lobby_id AND l.status = 'open' LIMIT 1)
  )
  INTO v_result
  FROM public.lobbies lo
  WHERE lo.id = p_lobby_id;
  RETURN v_result;
END;
$$;

-- Marks lobby_events as seen for the caller.
CREATE OR REPLACE FUNCTION public.mark_events_seen(p_event_ids uuid[])
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.lobby_events
     SET seen_at = now()
   WHERE id = ANY(p_event_ids)
     AND recipient_id = auth.uid()
     AND seen_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
```

- [ ] **Step 2: Apply**

```bash
supabase db reset --local
```

### Task 3.7: Structural triggers (close/reopen on capacity changes)

**Files:**
- Create: `supabase/migrations/<ts>_listing_capacity_triggers.sql`

- [ ] **Step 1: Write migration**

```sql
-- After insert on lobby_members: close listing if lobby reaches the requested target.
CREATE OR REPLACE FUNCTION public.maybe_close_listing_on_join()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing record;
  v_active_count int;
BEGIN
  SELECT id, target_lasts_count, COALESCE(jsonb_array_length(group_composition), 0) AS external_count
    INTO v_listing FROM public.listings
   WHERE lobby_id = NEW.lobby_id AND status = 'open';
  IF v_listing.id IS NULL THEN RETURN NEW; END IF;

  v_active_count := public.lobby_active_member_count(NEW.lobby_id);
  IF v_active_count + v_listing.external_count >= 5 THEN
    UPDATE public.listings SET status = 'closed' WHERE id = v_listing.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lobby_members_maybe_close
  AFTER INSERT ON public.lobby_members
  FOR EACH ROW EXECUTE FUNCTION public.maybe_close_listing_on_join();

-- After update on lobby_members (left_at set): if lobby was full and listing was closed
-- (not 'expired'), reopen it.
CREATE OR REPLACE FUNCTION public.maybe_reopen_listing_on_leave()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing record;
  v_lobby_status public.lobby_status;
BEGIN
  IF NEW.left_at IS NULL OR OLD.left_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_lobby_status FROM public.lobbies WHERE id = NEW.lobby_id;
  IF v_lobby_status = 'launched' THEN RETURN NEW; END IF;

  SELECT id, status INTO v_listing FROM public.listings
   WHERE lobby_id = NEW.lobby_id
   ORDER BY created_at DESC LIMIT 1;
  IF v_listing.id IS NOT NULL AND v_listing.status = 'closed' THEN
    -- Reopen only if not expired and within original 30 min window.
    UPDATE public.listings SET status = 'open'
     WHERE id = v_listing.id AND expires_at > now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lobby_members_maybe_reopen
  AFTER UPDATE ON public.lobby_members
  FOR EACH ROW EXECUTE FUNCTION public.maybe_reopen_listing_on_leave();
```

- [ ] **Step 2: Apply**

```bash
supabase db reset --local
```

### Task 3.8: Cron expirers + cleanup

**Files:**
- Create: `supabase/migrations/<ts>_listing_cron.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int;
BEGIN
  WITH expired AS (
    UPDATE public.listing_invitations
       SET status = 'expired', responded_at = now()
     WHERE status = 'pending' AND expires_at <= now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_old_listings()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int;
BEGIN
  WITH expired AS (
    UPDATE public.listings
       SET status = 'expired'
     WHERE status = 'open' AND expires_at <= now()
    RETURNING id, lobby_id
  ),
  events AS (
    INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
    SELECT e.lobby_id, lo.owner_id, 'listing_expired', jsonb_build_object('listing_id', e.id)
      FROM expired e JOIN public.lobbies lo ON lo.id = e.lobby_id
    RETURNING 1
  ),
  reset_lobbies AS (
    UPDATE public.lobbies lo SET status = 'idle'
      FROM expired e
     WHERE lo.id = e.lobby_id AND lo.status = 'searching'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

SELECT cron.schedule('expire-invitations', '* * * * *', $$ SELECT public.expire_old_invitations(); $$);
SELECT cron.schedule('expire-listings',    '* * * * *', $$ SELECT public.expire_old_listings(); $$);
SELECT cron.schedule('purge-old-events',   '0 * * * *',
  $$ DELETE FROM public.lobby_events
      WHERE seen_at IS NOT NULL AND seen_at < now() - interval '24 hours'; $$);
SELECT cron.schedule('purge-old-listings', '0 * * * *',
  $$ DELETE FROM public.listings
      WHERE status IN ('expired', 'closed') AND created_at < now() - interval '7 days'; $$);
```

- [ ] **Step 2: Apply + mirror to `cron-jobs.sql`**

```bash
supabase db reset --local
```

Append the four schedule lines to [supabase/cron-jobs.sql](../../../supabase/cron-jobs.sql) under a new "Find Lasts" section so the local mirror reflects prod state.

### Task 3.9: RLS policies

**Files:**
- Create: `supabase/migrations/<ts>_listing_rls.sql`

- [ ] **Step 1: Write migration**

```sql
ALTER TABLE public.lobbies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_servers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valorant_servers     ENABLE ROW LEVEL SECURITY;

-- valorant_servers: public read.
CREATE POLICY valorant_servers_read ON public.valorant_servers
  FOR SELECT USING (true);

-- profile_servers: public read; user manages own rows.
CREATE POLICY profile_servers_read ON public.profile_servers
  FOR SELECT USING (true);
CREATE POLICY profile_servers_self_insert ON public.profile_servers
  FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY profile_servers_self_delete ON public.profile_servers
  FOR DELETE USING (profile_id = auth.uid());

-- lobbies: owner OR active member can read.
CREATE POLICY lobbies_read ON public.lobbies
  FOR SELECT USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.lobby_members lm
       WHERE lm.lobby_id = lobbies.id AND lm.user_id = auth.uid() AND lm.left_at IS NULL
    )
  );
-- All writes go through SECURITY DEFINER RPCs → no INSERT/UPDATE/DELETE policies.

-- lobby_members: owner of the lobby OR self OR active sibling member can read.
CREATE POLICY lobby_members_read ON public.lobby_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.lobbies lo
       WHERE lo.id = lobby_members.lobby_id AND lo.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.lobby_members sib
       WHERE sib.lobby_id = lobby_members.lobby_id
         AND sib.user_id = auth.uid()
         AND sib.left_at IS NULL
    )
  );

-- listings: open ones are public; closed/expired ones only to owner & active members.
CREATE POLICY listings_read ON public.listings
  FOR SELECT USING (
    status = 'open'
    OR EXISTS (
      SELECT 1 FROM public.lobbies lo
       WHERE lo.id = listings.lobby_id AND lo.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.lobby_members lm
       WHERE lm.lobby_id = listings.lobby_id AND lm.user_id = auth.uid() AND lm.left_at IS NULL
    )
  );

-- listing_invitations: from_user OR to_user can read.
CREATE POLICY listing_invitations_read ON public.listing_invitations
  FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- lobby_events: recipient only.
CREATE POLICY lobby_events_read ON public.lobby_events
  FOR SELECT USING (recipient_id = auth.uid());
```

- [ ] **Step 2: Apply**

```bash
supabase db reset --local
```

### Task 3.10: Realtime publication

**Files:**
- Create: `supabase/migrations/<ts>_listing_realtime.sql`

- [ ] **Step 1: Write migration**

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_events;
```

- [ ] **Step 2: Apply + commit M3**

```bash
supabase db reset --local
git add supabase/migrations supabase/cron-jobs.sql
git commit -m "$(cat <<'EOF'
feat(db): listing RPCs, RLS, realtime, cron expirers

Implements the full server-side state machine for the Find Lasts feature:
listing lifecycle, invitations, lobby management, launch validation,
feed reads, capacity triggers, RLS, and pg_cron expirers.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Milestone 4 — Edge function rename `on-match-event` → `on-listing-event`

The existing edge function `supabase/functions/on-match-event/` is repurposed: it now consumes `lobby_events` payloads from the Postgres trigger and dispatches push notifications.

### Task 4.1: Rename folder + index handler

**Files:**
- Move: `supabase/functions/on-match-event/` → `supabase/functions/on-listing-event/`
- Modify: `supabase/functions/on-listing-event/index.ts`

- [ ] **Step 1: Read existing handler**

```bash
ls supabase/functions/on-match-event
cat supabase/functions/on-match-event/index.ts
```

Note: imports, signature of `Deno.serve`, env reads, and the call into `send-push`. Most of these are reusable.

- [ ] **Step 2: Move folder**

```bash
git mv supabase/functions/on-match-event supabase/functions/on-listing-event
```

- [ ] **Step 3: Rewrite `index.ts`**

```ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type LobbyEventKind =
  | "invitation_received"
  | "invitation_accepted"
  | "invitation_declined"
  | "member_joined"
  | "member_left"
  | "member_kicked"
  | "group_code_set"
  | "lobby_launched"
  | "listing_expiring_soon"
  | "listing_expired";

type Payload = {
  type: "INSERT";
  table: "lobby_events";
  record: {
    id: string;
    lobby_id: string;
    recipient_id: string;
    kind: LobbyEventKind;
    metadata: Record<string, unknown> | null;
  };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SEND_PUSH_URL = `${SUPABASE_URL}/functions/v1/send-push`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

function buildNotification(kind: LobbyEventKind, metadata: Record<string, unknown> | null) {
  switch (kind) {
    case "invitation_received":
      return { title: "New invitation", body: "You have a new lobby invitation" };
    case "invitation_accepted":
      return { title: "Invitation accepted", body: "Your invitation was accepted" };
    case "invitation_declined":
      return { title: "Invitation declined", body: "Your invitation was declined" };
    case "member_joined":
      return { title: "Lobby update", body: "A new member joined your lobby" };
    case "member_left":
      return { title: "Lobby update", body: "A member left your lobby" };
    case "member_kicked":
      return { title: "Removed from lobby", body: "You were removed from a lobby" };
    case "group_code_set":
      return { title: "Group code ready", body: `Code: ${metadata?.code ?? ""}` };
    case "lobby_launched":
      return { title: "Match launched", body: "Have a good game!" };
    case "listing_expiring_soon":
      return { title: "Listing expiring soon", body: "Your listing expires in a few minutes" };
    case "listing_expired":
      return { title: "Listing expired", body: "Your listing was closed (timeout)" };
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (payload?.table !== "lobby_events" || payload?.type !== "INSERT" || !payload.record) {
    return new Response("ignored", { status: 200 });
  }

  const { recipient_id, kind, metadata } = payload.record;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", recipient_id)
    .maybeSingle();

  if (error || !profile?.push_token) {
    return new Response(JSON.stringify({ skipped: "no token" }), { status: 200 });
  }

  const notif = buildNotification(kind, metadata);
  const data = { kind, ...(metadata ?? {}) };

  const res = await fetch(SEND_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
```

- [ ] **Step 4: Update any project config referencing the old name**

```bash
grep -RIn 'on-match-event' supabase config.toml supabase/config.toml || true
```

If matches: update them to `on-listing-event`.

### Task 4.2: Wire trigger to call the edge function

**Files:**
- Create: `supabase/migrations/<ts>_lobby_events_webhook.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE OR REPLACE FUNCTION public.notify_lobby_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url text;
  v_anon text;
BEGIN
  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'edge_function_url_on_listing_event';
  SELECT decrypted_secret INTO v_anon
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  IF v_url IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_anon, '')
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'lobby_events',
      'record', to_jsonb(NEW)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lobby_events_notify
  AFTER INSERT ON public.lobby_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_lobby_event();
```

NOTE: this requires two vault secrets, set manually after the function is deployed:
- `edge_function_url_on_listing_event` = `<project>.functions.supabase.co/on-listing-event`
- `service_role_key` (already exists for the sync cron)

- [ ] **Step 2: Apply locally**

```bash
supabase db reset --local
```

### Task 4.3: Deploy + smoke-test

- [ ] **Step 1: Deploy function**

```bash
supabase functions deploy on-listing-event
```

- [ ] **Step 2: Set vault secret**

In Supabase dashboard → Settings → Vault, add:
`edge_function_url_on_listing_event = https://<project-ref>.functions.supabase.co/on-listing-event`

- [ ] **Step 3: Smoke-test from psql**

```sql
INSERT INTO public.lobby_events (lobby_id, recipient_id, kind, metadata)
VALUES (
  (SELECT id FROM public.lobbies LIMIT 1),
  (SELECT id FROM public.profiles WHERE push_token IS NOT NULL LIMIT 1),
  'invitation_received',
  '{"test": true}'::jsonb
);
```

Expected: a push arrives on the test device. Check logs:
```bash
supabase functions logs on-listing-event --tail
```

- [ ] **Step 4: Commit M4**

```bash
git add supabase/functions supabase/migrations
git commit -m "$(cat <<'EOF'
feat(edge): rename on-match-event to on-listing-event, wire lobby_events trigger

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Milestone 5 — Frontend libs: languages, valorant-servers, valorant-regions

Pure data modules used by onboarding, profile settings, publish forms, and feed cards.

### Task 5.1: Create `lib/valorant-regions.ts`

**Files:**
- Create: [lib/valorant-regions.ts](../../../lib/valorant-regions.ts)

- [ ] **Step 1: Write the module**

```ts
export const VALORANT_REGIONS = [
  { id: 'NA',    label: 'North America' },
  { id: 'LATAM', label: 'Latin America' },
  { id: 'BR',    label: 'Brazil' },
  { id: 'EU',    label: 'Europe' },
  { id: 'KR',    label: 'Korea' },
  { id: 'APAC',  label: 'Asia-Pacific' },
] as const;

export type ValorantRegion = typeof VALORANT_REGIONS[number]['id'];

export const VALORANT_REGION_IDS: ValorantRegion[] =
  VALORANT_REGIONS.map((r) => r.id);

export function getRegionLabel(id: ValorantRegion): string {
  return VALORANT_REGIONS.find((r) => r.id === id)?.label ?? id;
}
```

### Task 5.2: Create `lib/valorant-servers.ts`

**Files:**
- Create: [lib/valorant-servers.ts](../../../lib/valorant-servers.ts)

- [ ] **Step 1: Write the module (must mirror seed in Task 1.5)**

```ts
import type { ValorantRegion } from './valorant-regions';

export type ValorantServer = {
  id: string;
  region: ValorantRegion;
  displayName: string;
  sortOrder: number;
};

export const VALORANT_SERVERS: ValorantServer[] = [
  { id: 'na-virginia',    region: 'NA',    displayName: 'Virginia',   sortOrder: 10 },
  { id: 'na-illinois',    region: 'NA',    displayName: 'Illinois',   sortOrder: 20 },
  { id: 'na-texas',       region: 'NA',    displayName: 'Texas',      sortOrder: 30 },
  { id: 'na-oregon',      region: 'NA',    displayName: 'Oregon',     sortOrder: 40 },
  { id: 'na-california',  region: 'NA',    displayName: 'California', sortOrder: 50 },
  { id: 'latam-mexico',   region: 'LATAM', displayName: 'Mexico',     sortOrder: 10 },
  { id: 'latam-chile',    region: 'LATAM', displayName: 'Chile',      sortOrder: 20 },
  { id: 'br-saopaulo',    region: 'BR',    displayName: 'São Paulo',  sortOrder: 10 },
  { id: 'eu-paris',       region: 'EU',    displayName: 'Paris',      sortOrder: 10 },
  { id: 'eu-frankfurt',   region: 'EU',    displayName: 'Frankfurt',  sortOrder: 20 },
  { id: 'eu-stockholm',   region: 'EU',    displayName: 'Stockholm',  sortOrder: 30 },
  { id: 'eu-london',      region: 'EU',    displayName: 'London',     sortOrder: 40 },
  { id: 'eu-madrid',      region: 'EU',    displayName: 'Madrid',     sortOrder: 50 },
  { id: 'eu-warsaw',      region: 'EU',    displayName: 'Warsaw',     sortOrder: 60 },
  { id: 'eu-istanbul',    region: 'EU',    displayName: 'Istanbul',   sortOrder: 70 },
  { id: 'eu-bahrain',     region: 'EU',    displayName: 'Bahrain',    sortOrder: 80 },
  { id: 'kr-seoul',       region: 'KR',    displayName: 'Seoul',      sortOrder: 10 },
  { id: 'apac-tokyo',     region: 'APAC',  displayName: 'Tokyo',      sortOrder: 10 },
  { id: 'apac-singapore', region: 'APAC',  displayName: 'Singapore',  sortOrder: 20 },
  { id: 'apac-hongkong',  region: 'APAC',  displayName: 'Hong Kong',  sortOrder: 30 },
  { id: 'apac-sydney',    region: 'APAC',  displayName: 'Sydney',     sortOrder: 40 },
  { id: 'apac-mumbai',    region: 'APAC',  displayName: 'Mumbai',     sortOrder: 50 },
  { id: 'apac-jakarta',   region: 'APAC',  displayName: 'Jakarta',    sortOrder: 60 },
  { id: 'apac-taipei',    region: 'APAC',  displayName: 'Taipei',     sortOrder: 70 },
];

export function serversInRegion(region: ValorantRegion): ValorantServer[] {
  return VALORANT_SERVERS
    .filter((s) => s.region === region)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
```

### Task 5.3: Create `lib/languages.ts`

**Files:**
- Create: [lib/languages.ts](../../../lib/languages.ts)

- [ ] **Step 1: Write the module — ISO 639-1 with native names**

```ts
export type LanguageOption = {
  code: string;
  native: string;
  english: string;
};

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', native: 'English',    english: 'English' },
  { code: 'fr', native: 'Français',   english: 'French' },
  { code: 'es', native: 'Español',    english: 'Spanish' },
  { code: 'pt', native: 'Português',  english: 'Portuguese' },
  { code: 'de', native: 'Deutsch',    english: 'German' },
  { code: 'it', native: 'Italiano',   english: 'Italian' },
  { code: 'ru', native: 'Русский',    english: 'Russian' },
  { code: 'pl', native: 'Polski',     english: 'Polish' },
  { code: 'tr', native: 'Türkçe',     english: 'Turkish' },
  { code: 'nl', native: 'Nederlands', english: 'Dutch' },
  { code: 'sv', native: 'Svenska',    english: 'Swedish' },
  { code: 'no', native: 'Norsk',      english: 'Norwegian' },
  { code: 'da', native: 'Dansk',      english: 'Danish' },
  { code: 'fi', native: 'Suomi',      english: 'Finnish' },
  { code: 'cs', native: 'Čeština',    english: 'Czech' },
  { code: 'hu', native: 'Magyar',     english: 'Hungarian' },
  { code: 'ro', native: 'Română',     english: 'Romanian' },
  { code: 'el', native: 'Ελληνικά',   english: 'Greek' },
  { code: 'ar', native: 'العربية',     english: 'Arabic' },
  { code: 'he', native: 'עברית',       english: 'Hebrew' },
  { code: 'fa', native: 'فارسی',       english: 'Persian' },
  { code: 'hi', native: 'हिन्दी',         english: 'Hindi' },
  { code: 'ja', native: '日本語',       english: 'Japanese' },
  { code: 'ko', native: '한국어',       english: 'Korean' },
  { code: 'zh', native: '中文',         english: 'Chinese' },
  { code: 'th', native: 'ไทย',         english: 'Thai' },
  { code: 'vi', native: 'Tiếng Việt',  english: 'Vietnamese' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian' },
  { code: 'ms', native: 'Bahasa Melayu',    english: 'Malay' },
  { code: 'tl', native: 'Filipino',    english: 'Filipino' },
];

export function getLanguageByCode(code: string): LanguageOption | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export function getDeviceLanguageCode(): string {
  return 'en';
}
```

NOTE: `getDeviceLanguageCode` returns `'en'` as a safe default. Onboarding may override this by reading `expo-localization` at the wizard step (see Task 6.5).

### Task 5.4: Type-check + commit

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Commit**

```bash
git add lib/valorant-regions.ts lib/valorant-servers.ts lib/languages.ts
git commit -m "$(cat <<'EOF'
feat(lib): add valorant-regions, valorant-servers, languages data modules

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Milestone 6 — Onboarding wizard extension (10 steps)

The current wizard ([app/(auth)/onboarding.tsx](../../../app/%28auth%29/onboarding.tsx)) handles 6 steps (`profile`, `game`, `platform`, `rank`, `agent`, `welcome`). We extend it to 10 steps per spec §6.1.

### Task 6.1: Extend `StepId` and wizard state

**Files:**
- Modify: [app/(auth)/onboarding.tsx](../../../app/%28auth%29/onboarding.tsx)

- [ ] **Step 1: Read current wizard**

Re-read the full file to capture imports, state shape, animation logic, save handler.

- [ ] **Step 2: Extend StepId enum and add state**

Replace `type StepId = 'profile' | 'game' | 'platform' | 'rank' | 'agent' | 'welcome';` with:

```ts
type StepId =
  | 'profile'      // username + avatar
  | 'birthdate'
  | 'region'
  | 'servers'
  | 'platform'
  | 'rank'
  | 'languages'
  | 'voice'
  | 'agent'
  | 'welcome';
```

Add to component state:

```ts
const [birthdate, setBirthdate] = useState<Date | null>(null);
const [region, setRegion] = useState<ValorantRegion | null>(null);
const [servers, setServers] = useState<string[]>([]);
const [primaryLanguage, setPrimaryLanguage] = useState<string>('en');
const [secondaryLanguages, setSecondaryLanguages] = useState<string[]>([]);
const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
```

(Keep existing `username`, `game`, `platform`, `currentRank`, `mainAgent`, `avatarUri`.)

- [ ] **Step 3: Update step ordering**

Replace the stepIds array used for indexing with:

```ts
const STEP_IDS: StepId[] = [
  'profile', 'birthdate', 'region', 'servers', 'platform',
  'rank', 'languages', 'voice', 'agent', 'welcome',
];
```

### Task 6.2: Create `StepBirthdate`

**Files:**
- Create: [components/onboarding/StepBirthdate.tsx](../../../components/onboarding/StepBirthdate.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useBaseColors } from '@/hooks/useThemeColors';

type Props = {
  value: Date | null;
  onChange: (d: Date | null) => void;
};

const MIN_AGE = 13;

export default function StepBirthdate({ value, onChange }: Props) {
  const c = useBaseColors();

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_AGE);
    return d;
  }, []);

  const ageOk = useMemo(() => {
    if (!value) return false;
    const ageMs = Date.now() - value.getTime();
    const ageYears = ageMs / (365.25 * 24 * 3600 * 1000);
    return ageYears >= MIN_AGE;
  }, [value]);

  const handleChange = (_: DateTimePickerEvent, date?: Date) => {
    if (date) onChange(date);
  };

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: c.textPrimary, marginBottom: 8 }}>
        Your birthdate
      </Text>
      <Text style={{ fontSize: 14, color: c.textSecondary, marginBottom: 24 }}>
        You must be at least {MIN_AGE} years old to use Skrim. This cannot be changed later.
      </Text>
      <DateTimePicker
        value={value ?? maxDate}
        mode="date"
        display="spinner"
        maximumDate={maxDate}
        onChange={handleChange}
      />
      {value && !ageOk && (
        <Text style={{ color: '#FF4655', marginTop: 12 }}>You must be at least {MIN_AGE} years old.</Text>
      )}
    </View>
  );
}
```

NOTE: project must already have `@react-native-community/datetimepicker`. If not (verify with `npm ls @react-native-community/datetimepicker`), install via `npx expo install @react-native-community/datetimepicker`.

### Task 6.3: Create `StepRegion`

**Files:**
- Create: [components/onboarding/StepRegion.tsx](../../../components/onboarding/StepRegion.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useBaseColors } from '@/hooks/useThemeColors';
import { VALORANT_REGIONS, type ValorantRegion } from '@/lib/valorant-regions';

type Props = {
  value: ValorantRegion | null;
  onChange: (r: ValorantRegion) => void;
};

export default function StepRegion({ value, onChange }: Props) {
  const c = useBaseColors();
  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: c.textPrimary, marginBottom: 8 }}>
        Your region
      </Text>
      <Text style={{ fontSize: 14, color: c.textSecondary, marginBottom: 24 }}>
        Pick the Riot region your account plays in.
      </Text>
      {VALORANT_REGIONS.map((r) => {
        const selected = value === r.id;
        return (
          <Pressable
            key={r.id}
            onPress={() => onChange(r.id)}
            style={{
              padding: 16, borderRadius: 12, marginBottom: 8,
              backgroundColor: selected ? c.accent : c.surface,
              borderWidth: 1, borderColor: selected ? c.accent : c.border,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: selected ? '#fff' : c.textPrimary }}>
              {r.label}
            </Text>
            <Text style={{ fontSize: 13, color: selected ? 'rgba(255,255,255,0.85)' : c.textSecondary }}>
              {r.id}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
```

### Task 6.4: Create `StepServers`

**Files:**
- Create: [components/onboarding/StepServers.tsx](../../../components/onboarding/StepServers.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useBaseColors } from '@/hooks/useThemeColors';
import { serversInRegion } from '@/lib/valorant-servers';
import type { ValorantRegion } from '@/lib/valorant-regions';

type Props = {
  region: ValorantRegion;
  value: string[];
  onChange: (ids: string[]) => void;
};

export default function StepServers({ region, value, onChange }: Props) {
  const c = useBaseColors();
  const servers = useMemo(() => serversInRegion(region), [region]);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: c.textPrimary, marginBottom: 8 }}>
        Preferred servers
      </Text>
      <Text style={{ fontSize: 14, color: c.textSecondary, marginBottom: 24 }}>
        Select at least one server in {region}.
      </Text>
      {servers.map((s) => {
        const selected = value.includes(s.id);
        return (
          <Pressable
            key={s.id}
            onPress={() => toggle(s.id)}
            style={{
              padding: 14, borderRadius: 10, marginBottom: 6,
              backgroundColor: selected ? c.accent : c.surface,
              borderWidth: 1, borderColor: selected ? c.accent : c.border,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: selected ? '#fff' : c.textPrimary }}>
              {s.displayName}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
```

### Task 6.5: Create `StepLanguages`

**Files:**
- Create: [components/onboarding/StepLanguages.tsx](../../../components/onboarding/StepLanguages.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useBaseColors } from '@/hooks/useThemeColors';
import { LANGUAGES } from '@/lib/languages';

type Props = {
  primary: string;
  secondary: string[];
  onPrimaryChange: (code: string) => void;
  onSecondaryChange: (codes: string[]) => void;
};

export default function StepLanguages({
  primary, secondary, onPrimaryChange, onSecondaryChange,
}: Props) {
  const c = useBaseColors();

  const toggleSecondary = (code: string) => {
    if (code === primary) return;
    if (secondary.includes(code)) onSecondaryChange(secondary.filter((x) => x !== code));
    else onSecondaryChange([...secondary, code]);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: c.textPrimary, marginBottom: 8 }}>
        Languages
      </Text>
      <Text style={{ fontSize: 14, color: c.textSecondary, marginBottom: 16 }}>
        Pick your primary language. Tap others to add as secondary.
      </Text>
      {LANGUAGES.map((l) => {
        const isPrimary = primary === l.code;
        const isSecondary = secondary.includes(l.code);
        return (
          <View key={l.code} style={{ flexDirection: 'row', marginBottom: 6, gap: 8 }}>
            <Pressable
              onPress={() => onPrimaryChange(l.code)}
              style={{
                flex: 1, padding: 12, borderRadius: 10,
                backgroundColor: isPrimary ? c.accent : c.surface,
                borderWidth: 1, borderColor: isPrimary ? c.accent : c.border,
              }}
            >
              <Text style={{ color: isPrimary ? '#fff' : c.textPrimary, fontWeight: '600' }}>
                {l.native}
              </Text>
              <Text style={{ color: isPrimary ? 'rgba(255,255,255,0.85)' : c.textSecondary, fontSize: 12 }}>
                {l.english}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => toggleSecondary(l.code)}
              disabled={isPrimary}
              style={{
                width: 60, alignItems: 'center', justifyContent: 'center',
                borderRadius: 10,
                backgroundColor: isSecondary ? c.accent : c.surface,
                borderWidth: 1, borderColor: isSecondary ? c.accent : c.border,
                opacity: isPrimary ? 0.3 : 1,
              }}
            >
              <Text style={{ color: isSecondary ? '#fff' : c.textPrimary, fontSize: 12 }}>
                {isSecondary ? '✓' : '+'}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}
```

### Task 6.6: Create `StepVoice`

**Files:**
- Create: [components/onboarding/StepVoice.tsx](../../../components/onboarding/StepVoice.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { View, Text, Pressable } from 'react-native';
import { useBaseColors } from '@/hooks/useThemeColors';

type Props = {
  value: boolean;
  onChange: (v: boolean) => void;
};

export default function StepVoice({ value, onChange }: Props) {
  const c = useBaseColors();
  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: c.textPrimary, marginBottom: 8 }}>
        Voice chat
      </Text>
      <Text style={{ fontSize: 14, color: c.textSecondary, marginBottom: 24 }}>
        Are you available to use voice chat in lobbies?
      </Text>
      {[
        { id: true, label: 'Yes — I use voice chat' },
        { id: false, label: 'No — text/in-game only' },
      ].map((opt) => {
        const selected = value === opt.id;
        return (
          <Pressable
            key={String(opt.id)}
            onPress={() => onChange(opt.id)}
            style={{
              padding: 16, borderRadius: 12, marginBottom: 8,
              backgroundColor: selected ? c.accent : c.surface,
              borderWidth: 1, borderColor: selected ? c.accent : c.border,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: selected ? '#fff' : c.textPrimary }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

### Task 6.7: Wire new steps into `onboarding.tsx`

**Files:**
- Modify: [app/(auth)/onboarding.tsx](../../../app/%28auth%29/onboarding.tsx)

- [ ] **Step 1: Render the new step components**

In the step renderer switch, add cases for each new step. Pattern:

```tsx
{step === 'birthdate' && (
  <StepBirthdate value={birthdate} onChange={setBirthdate} />
)}
{step === 'region' && (
  <StepRegion value={region} onChange={(r) => { setRegion(r); setServers([]); }} />
)}
{step === 'servers' && region && (
  <StepServers region={region} value={servers} onChange={setServers} />
)}
{step === 'languages' && (
  <StepLanguages
    primary={primaryLanguage}
    secondary={secondaryLanguages}
    onPrimaryChange={setPrimaryLanguage}
    onSecondaryChange={setSecondaryLanguages}
  />
)}
{step === 'voice' && (
  <StepVoice value={voiceEnabled} onChange={setVoiceEnabled} />
)}
```

- [ ] **Step 2: Update Next-button gating**

Each step has its own validity rule. Add to the existing `canAdvance` switch:

```ts
case 'birthdate': {
  if (!birthdate) return false;
  const ageYears = (Date.now() - birthdate.getTime()) / (365.25 * 24 * 3600 * 1000);
  return ageYears >= 13;
}
case 'region':    return region !== null;
case 'servers':   return servers.length > 0;
case 'languages': return primaryLanguage !== '';
case 'voice':     return true;
```

- [ ] **Step 3: Update final submit (handleSubmit)**

In the existing save handler, write the new fields to the profiles table and the junction:

```ts
const { error: profileErr } = await supabase
  .from('profiles')
  .update({
    username,
    avatar_url: uploadedAvatarUrl ?? null,
    region,
    platform,
    current_rank: currentRank,
    rank_updated_at: new Date().toISOString(),
    birthdate: birthdate!.toISOString().slice(0, 10),
    primary_language: primaryLanguage,
    secondary_languages: secondaryLanguages,
    voice_enabled: voiceEnabled,
  })
  .eq('id', userId);
if (profileErr) throw profileErr;

const { error: serversErr } = await supabase
  .from('profile_servers')
  .insert(servers.map((server_id) => ({ profile_id: userId, server_id })));
if (serversErr) throw serversErr;
```

### Task 6.8: Type-check + smoke-test

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Run app**

```bash
npm start
```

Walk through onboarding from a freshly-wiped account; ensure each new step appears, validates, and the final submit succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/onboarding.tsx components/onboarding
git commit -m "$(cat <<'EOF'
feat(onboarding): extend wizard to 10 steps (birthdate, region, servers, languages, voice)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Milestone 7 — Profile/Settings updates

Profile screen needs to expose the new editable Valorant fields, with birthdate read-only.

### Task 7.1: Inventory current profile screen

**Files:**
- Read: [app/(tabs)/profile.tsx](../../../app/%28tabs%29/profile.tsx)

- [ ] **Step 1: Read the file**

```bash
cat app/\(tabs\)/profile.tsx
```

Identify existing edit sections, modal pattern, save mechanism. We'll mirror that pattern for the new fields.

### Task 7.2: Add editable Valorant fields section

**Files:**
- Modify: [app/(tabs)/profile.tsx](../../../app/%28tabs%29/profile.tsx)

- [ ] **Step 1: Add Region/Servers/Platform/Languages/Voice/Rank rows**

Below existing avatar/username section, add a "Valorant" section. Each row opens an edit modal (or inline picker) reusing the relevant `StepXxx` component from `components/onboarding/`.

- [ ] **Step 2: Implement region change cascade**

When the user changes `region`, prompt: "Changing your region will clear your selected servers. Continue?" On confirm:
1. Update `profiles.region`.
2. Delete all rows from `profile_servers` where `profile_id = me`.
3. Open the StepServers picker pre-populated to allow re-selection.

```ts
const onRegionChange = async (newRegion: ValorantRegion) => {
  await supabase.from('profile_servers').delete().eq('profile_id', userId);
  await supabase.from('profiles').update({ region: newRegion }).eq('id', userId);
  setNeedsServerReselect(true);
};
```

- [ ] **Step 3: Display birthdate read-only with computed age + ±18 badge**

```ts
const ageYears = birthdate
  ? Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 3600 * 1000))
  : null;
const ageBadge = ageYears == null ? '—' : ageYears >= 18 ? '18+' : 'Under 18';
```

Render this row without an edit affordance.

- [ ] **Step 4: Platform-change warning**

When user taps platform row, show a confirm dialog: "Changing your platform changes who you see in Find — not who can see you. Continue?"

### Task 7.3: Type-check + smoke-test

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Smoke-test**

Run the app, edit each new field, verify DB updates via Supabase Studio.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "$(cat <<'EOF'
feat(profile): add editable Valorant fields (region/servers/platform/languages/voice/rank)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Milestone 8 — Hooks layer

Five hooks bridge realtime / RPCs / React Query into the screens.

### Task 8.1: Regenerate `types/database.ts`

**Files:**
- Modify: [types/database.ts](../../../types/database.ts)

- [ ] **Step 1: Regenerate**

```bash
supabase gen types typescript --local > types/database.ts
```

- [ ] **Step 2: Verify new tables/RPCs are present**

```bash
grep -E '(lobbies|listings|listing_invitations|lobby_members|lobby_events|valorant_servers|profile_servers|create_searcher_listing|get_searcher_feed)' types/database.ts | head -40
```

Expected: matches for all new entities.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

### Task 8.2: Add composite types

**Files:**
- Modify: [types/composites.ts](../../../types/composites.ts)

- [ ] **Step 1: Add lobby/listing composites**

Append to existing file:

```ts
import type { Lobby, LobbyMember, Listing, ListingInvitation, Profile, ValorantServer } from './database';

export type LobbyMemberWithProfile = LobbyMember & { profile: Profile };

export type LobbyState = {
  lobby: Lobby;
  members: { member: LobbyMember; profile: Profile }[];
  listing: Listing | null;
};

export type FeedSearcherListing = {
  listing_id: string;
  lobby_id: string;
  owner_id: string;
  owner_username: string;
  owner_avatar_url: string | null;
  owner_current_rank: string;
  criteria: Record<string, unknown>;
  target_lasts_count: number;
  group_composition: { rank: string }[] | null;
  notes: string | null;
  created_at: string;
  expires_at: string;
};

export type FeedLastListing = Omit<FeedSearcherListing, 'target_lasts_count' | 'group_composition'>;
```

NOTE: the `Lobby`, `Listing`, etc. type aliases will be valid after Task 8.1's regeneration — they map to the table Row types.

### Task 8.3: `useMyLobby` — realtime subscription on owner's lobby

**Files:**
- Create: [hooks/useMyLobby.ts](../../../hooks/useMyLobby.ts)

- [ ] **Step 1: Write the hook**

```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { LobbyState } from '@/types/composites';

export function useMyLobby() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const [state, setState] = useState<LobbyState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const fetchState = async () => {
      const { data: lobby } = await supabase
        .from('lobbies').select('*').eq('owner_id', userId).maybeSingle();
      if (!lobby || cancelled) return;
      const { data } = await supabase.rpc('get_lobby_state', { p_lobby_id: lobby.id });
      if (!cancelled) {
        setState(data as LobbyState);
        setLoading(false);
      }
    };
    fetchState();

    const channel = supabase
      .channel(`my-lobby-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbies', filter: `owner_id=eq.${userId}` }, fetchState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_members' }, fetchState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, fetchState)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [userId]);

  return { state, loading };
}
```

NOTE: filtering on `lobby_members` and `listings` by `lobby_id` is harder via a single channel because the lobby_id is computed; we re-fetch on every change as a simple correctness-first approach. Optimize later if needed.

### Task 8.4: `useMyInvitations` — pending invitations realtime

**Files:**
- Create: [hooks/useMyInvitations.ts](../../../hooks/useMyInvitations.ts)

- [ ] **Step 1: Write the hook**

```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Database } from '@/types/database';

type Invitation = Database['public']['Tables']['listing_invitations']['Row'];

export function useMyInvitations() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const [received, setReceived] = useState<Invitation[]>([]);
  const [sent, setSent] = useState<Invitation[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const refresh = async () => {
      const [{ data: inboxData }, { data: outboxData }] = await Promise.all([
        supabase.from('listing_invitations').select('*')
          .eq('to_user_id', userId).eq('status', 'pending'),
        supabase.from('listing_invitations').select('*')
          .eq('from_user_id', userId).eq('status', 'pending'),
      ]);
      if (cancelled) return;
      setReceived(inboxData ?? []);
      setSent(outboxData ?? []);
    };
    refresh();

    const channel = supabase
      .channel(`my-invitations-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'listing_invitations', filter: `to_user_id=eq.${userId}` }, refresh)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'listing_invitations', filter: `from_user_id=eq.${userId}` }, refresh)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [userId]);

  return { received, sent };
}
```

### Task 8.5: `useFeed` — React Query feed reads + realtime invalidation

**Files:**
- Create: [hooks/useFeed.ts](../../../hooks/useFeed.ts)

- [ ] **Step 1: Write the hook**

```ts
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { FeedSearcherListing, FeedLastListing } from '@/types/composites';

export type FeedRole = 'searcher' | 'last';

export function useFeed(role: FeedRole, filterOverrides: Record<string, unknown> = {}) {
  const qc = useQueryClient();
  const queryKey = ['feed', role, filterOverrides] as const;

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const rpcName = role === 'searcher' ? 'get_last_feed' : 'get_searcher_feed';
      const { data, error } = await supabase.rpc(rpcName, { p_filter_overrides: filterOverrides });
      if (error) throw error;
      return (data ?? []) as (FeedSearcherListing | FeedLastListing)[];
    },
  });

  useEffect(() => {
    const target = role === 'searcher' ? 'last' : 'searcher';
    const channel = supabase
      .channel(`feed-${role}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'listings', filter: `kind=eq.${target}` },
        () => { qc.invalidateQueries({ queryKey: ['feed', role] }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [role, qc]);

  return query;
}
```

### Task 8.6: `useLobbyAsMember` — for non-owner members

**Files:**
- Create: [hooks/useLobbyAsMember.ts](../../../hooks/useLobbyAsMember.ts)

- [ ] **Step 1: Write the hook**

```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { LobbyState } from '@/types/composites';

export function useLobbyAsMember() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const [state, setState] = useState<LobbyState | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const refresh = async () => {
      const { data: membership } = await supabase
        .from('lobby_members').select('lobby_id')
        .eq('user_id', userId).is('left_at', null).neq('role', 'searcher')
        .maybeSingle();
      if (!membership || cancelled) {
        if (!cancelled) setState(null);
        return;
      }
      const { data } = await supabase.rpc('get_lobby_state', { p_lobby_id: membership.lobby_id });
      if (!cancelled) setState(data as LobbyState);
    };
    refresh();

    const channel = supabase
      .channel(`as-member-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_members' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbies' }, refresh)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [userId]);

  return state;
}
```

### Task 8.7: `useUnseenEvents` — unseen-events count for tab dot

**Files:**
- Create: [hooks/useUnseenEvents.ts](../../../hooks/useUnseenEvents.ts)

- [ ] **Step 1: Write the hook**

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useUnseenEvents() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const [eventIds, setEventIds] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const refresh = async () => {
      const { data } = await supabase.from('lobby_events')
        .select('id')
        .eq('recipient_id', userId)
        .is('seen_at', null);
      if (!cancelled) setEventIds((data ?? []).map((e) => e.id));
    };
    refresh();

    const channel = supabase
      .channel(`unseen-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'lobby_events', filter: `recipient_id=eq.${userId}` }, refresh)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [userId]);

  const markSeen = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await supabase.rpc('mark_events_seen', { p_event_ids: ids });
  }, []);

  return { count: eventIds.length, eventIds, markSeen };
}
```

### Task 8.8: Type-check + commit M8

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useMyLobby.ts hooks/useMyInvitations.ts hooks/useFeed.ts \
        hooks/useLobbyAsMember.ts hooks/useUnseenEvents.ts \
        types/database.ts types/composites.ts
git commit -m "$(cat <<'EOF'
feat(hooks): add useMyLobby, useMyInvitations, useFeed, useLobbyAsMember, useUnseenEvents

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Milestone 9 — Find tab

The new core tab. Role toggle + filter bar + feed list of opposite-role listings + listing detail modal with Invite/Propose CTA.

### Task 9.1: Build `RoleToggle`

**Files:**
- Create: [components/find/RoleToggle.tsx](../../../components/find/RoleToggle.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { View, Text, Pressable } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';

type Props = {
  role: 'searcher' | 'last';
  onChange: (r: 'searcher' | 'last') => void;
  locked?: boolean;
};

export default function RoleToggle({ role, onChange, locked }: Props) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, padding: 4 }}>
      {(['searcher', 'last'] as const).map((r) => {
        const active = role === r;
        return (
          <Pressable
            key={r}
            disabled={locked && !active}
            onPress={() => onChange(r)}
            style={{
              flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
              backgroundColor: active ? c.accent : 'transparent',
              opacity: locked && !active ? 0.4 : 1,
            }}
          >
            <Text style={{ color: active ? '#fff' : c.textPrimary, fontWeight: '600' }}>
              {r === 'searcher' ? "I'm looking for lasts" : "I'm a last"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

### Task 9.2: Build `FilterBar`

**Files:**
- Create: [components/find/FilterBar.tsx](../../../components/find/FilterBar.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';

export type FeedFilters = {
  rankMin?: string;
  rankMax?: string;
  primaryLanguage?: string;
  voiceRequired?: boolean;
  servers?: string[];
  ageFilter?: 'under_18' | 'over_18' | 'any';
};

type Props = {
  filters: FeedFilters;
  onChange: (f: FeedFilters) => void;
  onReset: () => void;
  onOpenRank: () => void;
  onOpenLanguage: () => void;
  onOpenServers: () => void;
};

export default function FilterBar({ filters, onChange, onReset, onOpenRank, onOpenLanguage, onOpenServers }: Props) {
  const c = useColors();
  const badge = (label: string, onPress: () => void, active: boolean) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={{
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginRight: 8,
        backgroundColor: active ? c.accent : c.surface,
        borderWidth: 1, borderColor: active ? c.accent : c.border,
      }}
    >
      <Text style={{ color: active ? '#fff' : c.textPrimary, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ paddingVertical: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {badge(filters.voiceRequired ? 'Voice ✓' : 'Voice', () => onChange({ ...filters, voiceRequired: !filters.voiceRequired }), !!filters.voiceRequired)}
        {badge(`Rank: ${filters.rankMin ?? '—'}–${filters.rankMax ?? '—'}`, onOpenRank, !!(filters.rankMin || filters.rankMax))}
        {badge(`Lang: ${filters.primaryLanguage ?? 'any'}`, onOpenLanguage, !!filters.primaryLanguage)}
        {badge(`Servers: ${filters.servers?.length ?? 0}`, onOpenServers, (filters.servers?.length ?? 0) > 0)}
        {badge(`Age: ${filters.ageFilter ?? 'any'}`, () => onChange({ ...filters, ageFilter: filters.ageFilter === 'over_18' ? 'under_18' : filters.ageFilter === 'under_18' ? 'any' : 'over_18' }), filters.ageFilter !== undefined && filters.ageFilter !== 'any')}
        {badge('Reset', onReset, false)}
      </ScrollView>
    </View>
  );
}
```

NOTE: the rank / language / servers pickers are not embedded in `FilterBar`; the parent `find.tsx` owns the modals (reusing `StepLanguages`, `StepServers`, and a thin `RankRangePicker` written ad-hoc). `find.tsx` wires `onOpenRank`/`onOpenLanguage`/`onOpenServers` to its own `useState`-managed visibility flags.

### Task 9.3: Build `ListingCard`

**Files:**
- Create: [components/find/ListingCard.tsx](../../../components/find/ListingCard.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { View, Text, Image, Pressable } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';
import type { FeedSearcherListing, FeedLastListing } from '@/types/composites';

type Props = {
  listing: FeedSearcherListing | FeedLastListing;
  onPress: () => void;
};

function isSearcher(l: FeedSearcherListing | FeedLastListing): l is FeedSearcherListing {
  return 'target_lasts_count' in l && (l as FeedSearcherListing).target_lasts_count !== undefined;
}

export default function ListingCard({ listing, onPress }: Props) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 10,
        flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: c.border,
      }}
    >
      {listing.owner_avatar_url ? (
        <Image source={{ uri: listing.owner_avatar_url }} style={{ width: 52, height: 52, borderRadius: 26 }} />
      ) : (
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.border }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: c.textPrimary }}>
          {listing.owner_username}
        </Text>
        <Text style={{ fontSize: 13, color: c.textSecondary }}>
          {listing.owner_current_rank}
          {isSearcher(listing) ? `  •  Looking for ${listing.target_lasts_count} last${listing.target_lasts_count > 1 ? 's' : ''}` : '  •  Available as last'}
        </Text>
        {listing.notes && (
          <Text numberOfLines={2} style={{ fontSize: 12, color: c.textSecondary, marginTop: 4 }}>
            {listing.notes}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
```

### Task 9.4: Build the Find screen

**Files:**
- Create: [app/(tabs)/find.tsx](../../../app/%28tabs%29/find.tsx)

- [ ] **Step 1: Write the screen**

```tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useThemeColors';
import RoleToggle from '@/components/find/RoleToggle';
import FilterBar, { type FeedFilters } from '@/components/find/FilterBar';
import ListingCard from '@/components/find/ListingCard';
import StepServers from '@/components/onboarding/StepServers';
import StepLanguages from '@/components/onboarding/StepLanguages';
import { useFeed } from '@/hooks/useFeed';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import type { ValorantRegion } from '@/lib/valorant-regions';

export default function FindScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const params = useLocalSearchParams<{ role?: 'searcher' | 'last' }>();
  const session = useAuthStore((s) => s.session);
  const [role, setRole] = useState<'searcher' | 'last'>(params.role ?? 'searcher');
  const [filters, setFilters] = useState<FeedFilters>({});
  const [region, setRegion] = useState<ValorantRegion | null>(null);
  const [showServers, setShowServers] = useState(false);
  const [showLangs, setShowLangs] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('region').eq('id', session.user.id).maybeSingle();
      if (data?.region) setRegion(data.region as ValorantRegion);
    })();
  }, [session?.user.id]);

  const feed = useFeed(role, filters);

  const onPublish = () => {
    router.push(role === 'searcher' ? '/publish/searcher' : '/publish/last');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: c.textPrimary, marginBottom: 12 }}>
          Find
        </Text>
        <RoleToggle role={role} onChange={setRole} />
        <Pressable
          onPress={onPublish}
          style={{
            marginTop: 12, padding: 14, borderRadius: 12, alignItems: 'center',
            backgroundColor: c.accent,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            {role === 'searcher' ? 'Publish search' : 'Publish as last'}
          </Text>
        </Pressable>
      </View>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters({})}
        onOpenRank={() => { /* rank min/max picker — out of scope for this task; stays as defaults until a follow-up wires a RankRangePicker */ }}
        onOpenLanguage={() => setShowLangs(true)}
        onOpenServers={() => region && setShowServers(true)}
      />

      <Modal visible={showServers} animationType="slide" onRequestClose={() => setShowServers(false)}>
        <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
          {region && (
            <StepServers
              region={region}
              value={filters.servers ?? []}
              onChange={(servers) => setFilters({ ...filters, servers })}
            />
          )}
          <Pressable onPress={() => setShowServers(false)} style={{ margin: 16, padding: 14, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={showLangs} animationType="slide" onRequestClose={() => setShowLangs(false)}>
        <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
          <StepLanguages
            primary={filters.primaryLanguage ?? ''}
            secondary={[]}
            onPrimaryChange={(primary_language) => setFilters({ ...filters, primaryLanguage: primary_language })}
            onSecondaryChange={() => { /* secondary not exposed in feed filters for now */ }}
          />
          <Pressable onPress={() => setShowLangs(false)} style={{ margin: 16, padding: 14, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
      </Modal>
      {feed.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 12 }}
          data={feed.data ?? []}
          keyExtractor={(item) => item.listing_id}
          renderItem={({ item }) => (
            <ListingCard listing={item} onPress={() => router.push(`/listing/${item.listing_id}`)} />
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: c.textSecondary, marginTop: 40 }}>
              No matching listings.
            </Text>
          }
        />
      )}
    </View>
  );
}
```

NOTE: the listing detail modal is opened via `router.push('/listing/[id]')`. We'll add a minimal `app/listing/[id].tsx` route in Task 9.5.

### Task 9.5: Create listing detail modal

**Files:**
- Create: [app/listing/[id].tsx](../../../app/listing/%5Bid%5D.tsx)
- Create: [app/listing/_layout.tsx](../../../app/listing/_layout.tsx)

- [ ] **Step 1: Write the layout**

```tsx
import { Stack } from 'expo-router';
export default function ListingLayout() {
  return <Stack screenOptions={{ presentation: 'modal' }} />;
}
```

- [ ] **Step 2: Write the detail screen**

```tsx
import { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const session = useAuthStore((s) => s.session);
  const [listing, setListing] = useState<any>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('listings').select('*, lobbies!inner(owner_id, profiles!inner(*))')
        .eq('id', id).maybeSingle();
      setListing(data);
    })();
  }, [id]);

  if (!listing) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  const isMyListing = listing.lobbies?.owner_id === session?.user.id;
  const cta = listing.kind === 'searcher' ? 'Propose myself as last' : 'Invite';

  const onCta = async () => {
    if (isMyListing) return;
    setActing(true);
    try {
      if (listing.kind === 'searcher') {
        const { error } = await supabase.rpc('propose_as_last', { p_listing_id: id });
        if (error) throw error;
        Alert.alert('Sent', 'Your proposal was sent.');
      } else {
        const { data: myListing } = await supabase.rpc('get_my_active_listing');
        if (!myListing?.[0] || myListing[0].kind !== 'searcher') {
          Alert.alert('Publish first', 'You must publish a Searcher listing before inviting a Last.');
          return;
        }
        const { error } = await supabase.rpc('invite_last', {
          p_listing_id: myListing[0].listing_id,
          p_target_user_id: listing.lobbies.owner_id,
        });
        if (error) throw error;
        Alert.alert('Sent', 'Invitation sent.');
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActing(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: c.textPrimary, marginBottom: 12 }}>
        {listing.lobbies.profiles.username}
      </Text>
      <Text style={{ color: c.textSecondary, marginBottom: 16 }}>
        {listing.lobbies.profiles.current_rank}
      </Text>
      {listing.notes && (
        <Text style={{ color: c.textPrimary, marginBottom: 16 }}>{listing.notes}</Text>
      )}
      {!isMyListing && (
        <Pressable
          disabled={acting}
          onPress={onCta}
          style={{ backgroundColor: c.accent, padding: 14, borderRadius: 12, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>{cta}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
```

### Task 9.6: Type-check + commit M9

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/find.tsx app/listing components/find
git commit -m "$(cat <<'EOF'
feat(find): add Find tab with role toggle, filter bar, listing feed and detail modal

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Milestone 10 — Publish forms

Two routes (`publish/searcher.tsx`, `publish/last.tsx`) collect criteria, group composition (Searcher only), and notes, then call the RPCs.

### Task 10.1: Create `publish/_layout.tsx`

**Files:**
- Create: [app/publish/_layout.tsx](../../../app/publish/_layout.tsx)

- [ ] **Step 1: Write**

```tsx
import { Stack } from 'expo-router';
export default function PublishLayout() {
  return <Stack screenOptions={{ presentation: 'modal' }} />;
}
```

### Task 10.2: Build `ComposeGroupSection`

**Files:**
- Create: [components/publish/ComposeGroupSection.tsx](../../../components/publish/ComposeGroupSection.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { View, Text, Pressable, TextInput } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';

type CoplayerSlot =
  | { mode: 'external'; rank: string }
  | { mode: 'invite'; userId: string; username: string };

type Props = {
  targetLastsCount: 1 | 2 | 3;
  onTargetLastsChange: (n: 1 | 2 | 3) => void;
  coplayers: CoplayerSlot[];
  onCoplayersChange: (slots: CoplayerSlot[]) => void;
  onPickFriend: (slotIndex: number) => void;
};

export default function ComposeGroupSection({
  targetLastsCount, onTargetLastsChange, coplayers, onCoplayersChange, onPickFriend,
}: Props) {
  const c = useColors();
  const coplayerCount = 4 - targetLastsCount;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: c.textPrimary, marginBottom: 8 }}>
        Group composition
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {([1, 2, 3] as const).map((n) => {
          const active = targetLastsCount === n;
          return (
            <Pressable
              key={n}
              onPress={() => onTargetLastsChange(n)}
              style={{
                flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
                backgroundColor: active ? c.accent : c.surface,
                borderWidth: 1, borderColor: active ? c.accent : c.border,
              }}
            >
              <Text style={{ color: active ? '#fff' : c.textPrimary, fontWeight: '600' }}>
                {n} last{n > 1 ? 's' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {Array.from({ length: coplayerCount }).map((_, idx) => {
        const slot = coplayers[idx] ?? { mode: 'external' as const, rank: '' };
        return (
          <View key={idx} style={{ marginBottom: 8, padding: 10, backgroundColor: c.surface, borderRadius: 10 }}>
            <Text style={{ fontSize: 13, color: c.textSecondary, marginBottom: 6 }}>
              Co-player #{idx + 1}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {(['external', 'invite'] as const).map((m) => {
                const active = slot.mode === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      const next = [...coplayers];
                      next[idx] = m === 'external'
                        ? { mode: 'external', rank: '' }
                        : { mode: 'invite', userId: '', username: '' };
                      onCoplayersChange(next);
                    }}
                    style={{
                      flex: 1, padding: 8, borderRadius: 8, alignItems: 'center',
                      backgroundColor: active ? c.accent : c.background,
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : c.textPrimary, fontSize: 12 }}>
                      {m === 'external' ? 'External (rank only)' : 'Invite friend'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {slot.mode === 'external' ? (
              <TextInput
                placeholder="Rank (e.g. Gold 2)"
                value={slot.rank}
                onChangeText={(t) => {
                  const next = [...coplayers];
                  next[idx] = { mode: 'external', rank: t };
                  onCoplayersChange(next);
                }}
                style={{
                  padding: 10, borderRadius: 8, color: c.textPrimary,
                  backgroundColor: c.background, borderWidth: 1, borderColor: c.border,
                }}
                placeholderTextColor={c.textSecondary}
              />
            ) : (
              <Pressable
                onPress={() => onPickFriend(idx)}
                style={{ padding: 10, borderRadius: 8, backgroundColor: c.background, borderWidth: 1, borderColor: c.border }}
              >
                <Text style={{ color: slot.username ? c.textPrimary : c.textSecondary }}>
                  {slot.username || 'Pick a friend'}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}
```

### Task 10.3: Build `CriteriaSection`

**Files:**
- Create: [components/publish/CriteriaSection.tsx](../../../components/publish/CriteriaSection.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { useState } from 'react';
import { View, Text, Switch, Pressable, Modal } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';
import StepServers from '@/components/onboarding/StepServers';
import StepLanguages from '@/components/onboarding/StepLanguages';
import { LANGUAGES } from '@/lib/languages';
import type { ValorantRegion } from '@/lib/valorant-regions';

export type Criteria = {
  region: ValorantRegion;
  servers: string[];
  platform: string;
  rank_min: string;
  rank_max: string;
  primary_language: string;
  secondary_languages: string[];
  voice_required: boolean;
  age_filter: 'under_18' | 'over_18' | 'any';
};

type Props = {
  value: Criteria;
  onChange: (c: Criteria) => void;
};

export default function CriteriaSection({ value, onChange }: Props) {
  const c = useColors();
  const [serversOpen, setServersOpen] = useState(false);
  const [langsOpen, setLangsOpen] = useState(false);
  const langLabel = LANGUAGES.find((l) => l.code === value.primary_language)?.native ?? value.primary_language;

  const cycleAge = () => {
    const next = value.age_filter === 'any' ? 'over_18' : value.age_filter === 'over_18' ? 'under_18' : 'any';
    onChange({ ...value, age_filter: next });
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: c.textPrimary, marginBottom: 8 }}>
        Criteria
      </Text>
      <Text style={{ color: c.textSecondary, marginBottom: 8 }}>Region (read-only): {value.region}</Text>

      <Pressable
        onPress={() => setServersOpen(true)}
        style={{ padding: 12, borderRadius: 10, backgroundColor: c.surface, marginBottom: 8 }}
      >
        <Text style={{ color: c.textPrimary }}>Servers ({value.servers.length})</Text>
      </Pressable>

      <Pressable
        onPress={() => setLangsOpen(true)}
        style={{ padding: 12, borderRadius: 10, backgroundColor: c.surface, marginBottom: 8 }}
      >
        <Text style={{ color: c.textPrimary }}>
          Primary: {langLabel}  •  Secondary: {value.secondary_languages.length}
        </Text>
      </Pressable>

      <Pressable
        onPress={cycleAge}
        style={{ padding: 12, borderRadius: 10, backgroundColor: c.surface, marginBottom: 8 }}
      >
        <Text style={{ color: c.textPrimary }}>Age filter: {value.age_filter}</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Text style={{ color: c.textPrimary, flex: 1 }}>Voice required</Text>
        <Switch value={value.voice_required} onValueChange={(b) => onChange({ ...value, voice_required: b })} />
      </View>

      <Modal visible={serversOpen} animationType="slide" onRequestClose={() => setServersOpen(false)}>
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <StepServers
            region={value.region}
            value={value.servers}
            onChange={(servers) => onChange({ ...value, servers })}
          />
          <Pressable
            onPress={() => setServersOpen(false)}
            style={{ margin: 16, padding: 14, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={langsOpen} animationType="slide" onRequestClose={() => setLangsOpen(false)}>
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <StepLanguages
            primary={value.primary_language}
            secondary={value.secondary_languages}
            onPrimaryChange={(primary_language) => onChange({ ...value, primary_language })}
            onSecondaryChange={(secondary_languages) => onChange({ ...value, secondary_languages })}
          />
          <Pressable
            onPress={() => setLangsOpen(false)}
            style={{ margin: 16, padding: 14, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
```

NOTE: The rank min/max picker is not bundled in this component — it would inflate the file. Build a separate `<RankRangePicker>` modal in a follow-up step inside Task 10.4 (the Searcher form) once the simpler pickers are validated. Until then, rank min/max default to the user's current rank from the profile (set in `useEffect` of the searcher/last screens).

### Task 10.4: Build `app/publish/searcher.tsx`

**Files:**
- Create: [app/publish/searcher.tsx](../../../app/publish/searcher.tsx)

- [ ] **Step 1: Write the screen**

```tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import ComposeGroupSection from '@/components/publish/ComposeGroupSection';
import CriteriaSection, { type Criteria } from '@/components/publish/CriteriaSection';

type CoplayerSlot =
  | { mode: 'external'; rank: string }
  | { mode: 'invite'; userId: string; username: string };

export default function PublishSearcher() {
  const c = useColors();
  const session = useAuthStore((s) => s.session);
  const [target, setTarget] = useState<1 | 2 | 3>(1);
  const [coplayers, setCoplayers] = useState<CoplayerSlot[]>([]);
  const [criteria, setCriteria] = useState<Criteria | null>(null);
  const [groupCode, setGroupCode] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load defaults from profile on mount
  useEffect(() => {
    if (!session?.user.id) return;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('region, platform, current_rank, primary_language, secondary_languages, voice_enabled')
        .eq('id', session.user.id).maybeSingle();
      const { data: ps } = await supabase
        .from('profile_servers').select('server_id').eq('profile_id', session.user.id);
      if (!profile) return;
      setCriteria({
        region: profile.region,
        servers: (ps ?? []).map((r) => r.server_id),
        platform: profile.platform,
        rank_min: profile.current_rank,
        rank_max: profile.current_rank,
        primary_language: profile.primary_language,
        secondary_languages: profile.secondary_languages,
        voice_required: profile.voice_enabled,
        age_filter: 'any',
      });
    })();
  }, [session?.user.id]);

  const compositionValid =
    coplayers.length === 4 - target &&
    coplayers.every((s) => (s.mode === 'external' ? !!s.rank : !!s.userId));

  const codeValid = groupCode === '' || /^[A-Z0-9]{6}$/.test(groupCode);

  const onSubmit = async () => {
    if (!criteria || !compositionValid || !codeValid) return;
    setSubmitting(true);
    try {
      const externals = coplayers.filter((s) => s.mode === 'external').map((s) => ({ rank: s.rank }));
      const invites = coplayers.filter((s) => s.mode === 'invite').map((s) => s.userId);
      const { data: listingId, error } = await supabase.rpc('create_searcher_listing', {
        p_criteria: criteria as unknown as Record<string, unknown>,
        p_target_lasts_count: target,
        p_group_composition: externals.length ? externals : null,
        p_coplayer_invites: invites.length ? invites : null,
        p_notes: notes || null,
      });
      if (error) throw error;

      if (groupCode) {
        const { data: lobby } = await supabase.from('lobbies').select('id').eq('owner_id', session!.user.id).single();
        if (lobby) await supabase.rpc('set_group_code', { p_lobby_id: lobby.id, p_code: groupCode });
      }

      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!criteria) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }}>
      <ComposeGroupSection
        targetLastsCount={target}
        onTargetLastsChange={(n) => { setTarget(n); setCoplayers([]); }}
        coplayers={coplayers}
        onCoplayersChange={setCoplayers}
        onPickFriend={(slotIndex) => {
          // Minimal v1: prompt for a username, look it up, fill the slot.
          // A richer "friend picker" with avatars/recent contacts can replace this later.
          Alert.prompt?.('Invite friend by username', undefined, async (text) => {
            if (!text) return;
            const { data } = await supabase.from('profiles').select('id, username').eq('username', text.trim()).maybeSingle();
            if (!data) { Alert.alert('Not found', `No user named "${text}".`); return; }
            const next = [...coplayers];
            next[slotIndex] = { mode: 'invite', userId: data.id, username: data.username };
            setCoplayers(next);
          });
        }}
      />
      <CriteriaSection value={criteria} onChange={setCriteria} />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.textPrimary, marginBottom: 8 }}>
          Optional
        </Text>
        <TextInput
          placeholder="Group code (6 chars, A-Z 0-9)"
          autoCapitalize="characters"
          maxLength={6}
          value={groupCode}
          onChangeText={(t) => setGroupCode(t.toUpperCase())}
          style={{ padding: 12, borderRadius: 10, color: c.textPrimary, backgroundColor: c.surface, marginBottom: 8 }}
          placeholderTextColor={c.textSecondary}
        />
        {!codeValid && <Text style={{ color: '#FF4655', marginBottom: 8 }}>Code must match A-Z 0-9 (6 chars).</Text>}
        <TextInput
          placeholder="Notes (max 200)"
          multiline
          maxLength={200}
          value={notes}
          onChangeText={setNotes}
          style={{ padding: 12, borderRadius: 10, color: c.textPrimary, backgroundColor: c.surface, minHeight: 80 }}
          placeholderTextColor={c.textSecondary}
        />
      </View>
      <View style={{ padding: 16 }}>
        <Pressable
          disabled={submitting || !compositionValid || !codeValid}
          onPress={onSubmit}
          style={{
            backgroundColor: c.accent, padding: 14, borderRadius: 12, alignItems: 'center',
            opacity: submitting || !compositionValid || !codeValid ? 0.4 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Publish</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
```

### Task 10.5: Build `app/publish/last.tsx`

**Files:**
- Create: [app/publish/last.tsx](../../../app/publish/last.tsx)

- [ ] **Step 1: Write the screen**

```tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import CriteriaSection, { type Criteria } from '@/components/publish/CriteriaSection';

export default function PublishLast() {
  const c = useColors();
  const session = useAuthStore((s) => s.session);
  const [criteria, setCriteria] = useState<Criteria | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('region, platform, current_rank, primary_language, secondary_languages, voice_enabled')
        .eq('id', session.user.id).maybeSingle();
      const { data: ps } = await supabase
        .from('profile_servers').select('server_id').eq('profile_id', session.user.id);
      if (!profile) return;
      setCriteria({
        region: profile.region,
        servers: (ps ?? []).map((r) => r.server_id),
        platform: profile.platform,
        rank_min: profile.current_rank,
        rank_max: profile.current_rank,
        primary_language: profile.primary_language,
        secondary_languages: profile.secondary_languages,
        voice_required: profile.voice_enabled,
        age_filter: 'any',
      });
    })();
  }, [session?.user.id]);

  const onSubmit = async () => {
    if (!criteria) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('create_last_listing', {
        p_criteria: criteria as unknown as Record<string, unknown>,
        p_notes: notes || null,
      });
      if (error) throw error;
      router.replace({ pathname: '/(tabs)/find', params: { role: 'last' } });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!criteria) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }}>
      <CriteriaSection value={criteria} onChange={setCriteria} />
      <View style={{ padding: 16 }}>
        <TextInput
          placeholder="Notes (max 200)"
          multiline
          maxLength={200}
          value={notes}
          onChangeText={setNotes}
          style={{ padding: 12, borderRadius: 10, color: c.textPrimary, backgroundColor: c.surface, minHeight: 80 }}
          placeholderTextColor={c.textSecondary}
        />
      </View>
      <View style={{ padding: 16 }}>
        <Pressable
          disabled={submitting}
          onPress={onSubmit}
          style={{ backgroundColor: c.accent, padding: 14, borderRadius: 12, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Publish as last</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
```

### Task 10.6: Type-check + commit M10

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Commit**

```bash
git add app/publish components/publish
git commit -m "$(cat <<'EOF'
feat(publish): add searcher and last publish forms

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Milestone 11 — Home rewrite (permanent lobby view)

Replaces the current Home placeholder with a full lobby UI driven by `useMyLobby()` and `useLobbyAsMember()`. Variants: idle solo / idle with co-players / searching / launched.

### Task 11.1: Build `LobbySlot`

**Files:**
- Create: [components/lobby/LobbySlot.tsx](../../../components/lobby/LobbySlot.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { View, Text, Image, Pressable } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';

type Props = {
  state: 'filled' | 'pending' | 'empty';
  username?: string;
  rank?: string;
  avatarUrl?: string | null;
  role?: 'searcher' | 'coplayer' | 'last';
  external?: boolean;
  onKick?: () => void;
};

export default function LobbySlot({
  state, username, rank, avatarUrl, role, external, onKick,
}: Props) {
  const c = useColors();
  const opacity = state === 'pending' ? 0.45 : 1;
  const bg = state === 'empty' ? c.background : c.surface;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: bg, opacity }}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
      ) : (
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.border }} />
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: '600', color: c.textPrimary }}>
          {state === 'empty' ? 'Empty slot' : username ?? 'Pending…'}
        </Text>
        <Text style={{ fontSize: 12, color: c.textSecondary }}>
          {[rank, role, external ? 'external' : null].filter(Boolean).join(' • ')}
        </Text>
      </View>
      {onKick && state === 'filled' && role !== 'searcher' && (
        <Pressable onPress={onKick} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FF4655' }}>
          <Text style={{ color: '#fff', fontSize: 12 }}>Kick</Text>
        </Pressable>
      )}
    </View>
  );
}
```

### Task 11.2: Build `GroupCodeInput`

**Files:**
- Create: [components/lobby/GroupCodeInput.tsx](../../../components/lobby/GroupCodeInput.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';
import { supabase } from '@/lib/supabase';

type Props = { lobbyId: string; current: string | null };

export default function GroupCodeInput({ lobbyId, current }: Props) {
  const c = useColors();
  const [code, setCode] = useState(current ?? '');
  const valid = /^[A-Z0-9]{6}$/.test(code);

  const onSave = async () => {
    if (!valid) return;
    const { error } = await supabase.rpc('set_group_code', { p_lobby_id: lobbyId, p_code: code });
    if (error) Alert.alert('Error', error.message);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        maxLength={6}
        placeholder="GROUP CODE"
        placeholderTextColor={c.textSecondary}
        style={{
          flex: 1, padding: 12, borderRadius: 10, color: c.textPrimary,
          backgroundColor: c.surface, fontFamily: 'monospace', letterSpacing: 4,
        }}
      />
      <Pressable
        onPress={onSave}
        disabled={!valid || code === current}
        style={{
          padding: 12, borderRadius: 10, backgroundColor: c.accent,
          opacity: !valid || code === current ? 0.4 : 1,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
      </Pressable>
    </View>
  );
}
```

### Task 11.3: Build `LobbyHeader` (banner + listing-state)

**Files:**
- Create: [components/lobby/LobbyHeader.tsx](../../../components/lobby/LobbyHeader.tsx)

- [ ] **Step 1: Write the component**

```tsx
import { View, Text, Pressable, Alert } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';
import { supabase } from '@/lib/supabase';
import type { LobbyState } from '@/types/composites';

type Props = { state: LobbyState };

export default function LobbyHeader({ state }: Props) {
  const c = useColors();
  const listing = state.listing;
  const status = state.lobby.status;

  if (status === 'launched') {
    return (
      <View style={{ padding: 12, borderRadius: 12, backgroundColor: c.surface }}>
        <Text style={{ color: c.textPrimary, fontWeight: '600' }}>Match in progress</Text>
        <Text style={{ color: c.textSecondary, fontSize: 13 }}>Have a good game!</Text>
      </View>
    );
  }

  if (!listing) return null;

  const onCancel = async () => {
    const { error } = await supabase.rpc('cancel_listing', { p_listing_id: listing.id });
    if (error) Alert.alert('Error', error.message);
  };

  const minutesLeft = Math.max(0, Math.ceil((new Date(listing.expires_at).getTime() - Date.now()) / 60000));
  return (
    <View style={{ padding: 12, borderRadius: 12, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.textPrimary, fontWeight: '600' }}>Listing active</Text>
        <Text style={{ color: c.textSecondary, fontSize: 13 }}>Expires in {minutesLeft} min</Text>
      </View>
      <Pressable onPress={onCancel} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FF4655', borderRadius: 6 }}>
        <Text style={{ color: '#fff', fontSize: 13 }}>Cancel</Text>
      </Pressable>
    </View>
  );
}
```

### Task 11.4: Rewrite Home

**Files:**
- Modify: [app/(tabs)/home.tsx](../../../app/%28tabs%29/home.tsx)

- [ ] **Step 1: Replace placeholder**

```tsx
import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useThemeColors';
import { useMyLobby } from '@/hooks/useMyLobby';
import { useLobbyAsMember } from '@/hooks/useLobbyAsMember';
import { useUnseenEvents } from '@/hooks/useUnseenEvents';
import { supabase } from '@/lib/supabase';
import LobbySlot from '@/components/lobby/LobbySlot';
import LobbyHeader from '@/components/lobby/LobbyHeader';
import GroupCodeInput from '@/components/lobby/GroupCodeInput';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { state: ownLobby, loading } = useMyLobby();
  const memberLobby = useLobbyAsMember();
  const { eventIds, markSeen } = useUnseenEvents();

  // Mark events as seen when Home is visible.
  useEffect(() => {
    if (eventIds.length) markSeen(eventIds);
  }, [eventIds, markSeen]);

  const lobby = memberLobby ?? ownLobby;
  if (loading || !lobby) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  const isOwner = !memberLobby;
  const listing = lobby.listing;
  const externalCount = listing?.group_composition ? (listing.group_composition as any[]).length : 0;
  const totalSlots = 5;
  const filledCount = lobby.members.length + externalCount;
  const emptyCount = Math.max(0, totalSlots - filledCount);

  const launchEnabled = isOwner
    && lobby.lobby.group_code
    && filledCount === totalSlots
    && lobby.lobby.status !== 'launched';

  const onLaunch = async () => {
    const { error } = await supabase.rpc('launch_lobby', { p_lobby_id: lobby.lobby.id });
    if (error) Alert.alert('Cannot launch', error.message);
  };

  const onLeave = async () => {
    const { error } = await supabase.rpc('leave_lobby', { p_lobby_id: lobby.lobby.id });
    if (error) Alert.alert('Error', error.message);
  };

  const onKick = async (targetUserId: string) => {
    const { error } = await supabase.rpc('remove_lobby_member', {
      p_lobby_id: lobby.lobby.id, p_target_user_id: targetUserId,
    });
    if (error) Alert.alert('Error', error.message);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ paddingTop: insets.top, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: c.textPrimary, marginBottom: 12 }}>Home</Text>
      <LobbyHeader state={lobby} />
      <View style={{ marginTop: 16, gap: 8 }}>
        {lobby.members.map(({ member, profile }) => (
          <LobbySlot
            key={member.id}
            state="filled"
            username={profile.username}
            rank={profile.current_rank}
            avatarUrl={profile.avatar_url}
            role={member.role}
            onKick={isOwner && member.role !== 'searcher' ? () => onKick(profile.id) : undefined}
          />
        ))}
        {externalCount > 0 && (listing?.group_composition as any[]).map((gc, idx) => (
          <LobbySlot key={`ext-${idx}`} state="filled" username="External co-player" rank={gc.rank} role="coplayer" external />
        ))}
        {Array.from({ length: emptyCount }).map((_, idx) => (
          <LobbySlot key={`empty-${idx}`} state="empty" />
        ))}
      </View>

      {isOwner && lobby.lobby.status !== 'launched' && (
        <View style={{ marginTop: 16, gap: 12 }}>
          <GroupCodeInput lobbyId={lobby.lobby.id} current={lobby.lobby.group_code} />
          {!listing && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => router.push('/publish/searcher')}
                style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Find lasts</Text>
              </Pressable>
              {lobby.members.length === 1 && (
                <Pressable
                  onPress={() => router.push('/publish/last')}
                  style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: c.surface, alignItems: 'center', borderWidth: 1, borderColor: c.border }}
                >
                  <Text style={{ color: c.textPrimary, fontWeight: '600' }}>Be a last</Text>
                </Pressable>
              )}
            </View>
          )}
          {listing && (
            <Pressable
              onPress={onLaunch}
              disabled={!launchEnabled}
              style={{
                padding: 14, borderRadius: 12, alignItems: 'center',
                backgroundColor: launchEnabled ? '#22C55E' : c.surface,
                opacity: launchEnabled ? 1 : 0.5,
              }}
            >
              <Text style={{ color: launchEnabled ? '#fff' : c.textSecondary, fontWeight: '700' }}>
                {launchEnabled ? 'Launch' : (lobby.lobby.group_code ? `Need ${5 - filledCount} more` : 'Set group code first')}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {!isOwner && (
        <Pressable
          onPress={onLeave}
          style={{ marginTop: 16, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: c.border }}
        >
          <Text style={{ color: c.textPrimary, fontWeight: '600' }}>Leave lobby</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
```

### Task 11.5: Type-check + smoke-test + commit

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Smoke-test**

Run the app, sign in. Home should render the solo-idle variant. Use the publish CTA to create a listing → verify it transitions to searching variant with the listing banner.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/home.tsx components/lobby
git commit -m "$(cat <<'EOF'
feat(home): rewrite as permanent lobby view

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Milestone 12 — Tabs nav + push deep links

### Task 12.1: Update tabs layout

**Files:**
- Modify: [app/(tabs)/_layout.tsx](../../../app/%28tabs%29/_layout.tsx)
- Delete: [app/(tabs)/calendar.tsx](../../../app/%28tabs%29/calendar.tsx)

- [ ] **Step 1: Read current layout**

```bash
cat app/\(tabs\)/_layout.tsx
```

- [ ] **Step 2: Remove the Calendar tab and add Find**

In the layout, replace the Calendar `<Tabs.Screen name="calendar" ... />` with:

```tsx
<Tabs.Screen
  name="find"
  options={{
    title: 'Find',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="search" size={size} color={color} />
    ),
  }}
/>
```

- [ ] **Step 3: Add tab dot driven by `useUnseenEvents`**

On the Home tab, decorate `tabBarBadge` from a small wrapper component:

```tsx
function HomeTabBadgeOptions() {
  const { count } = useUnseenEvents();
  return {
    title: 'Home',
    tabBarBadge: count > 0 ? '' : undefined,
    tabBarBadgeStyle: { backgroundColor: '#FF4655', minWidth: 8, height: 8, borderRadius: 4 },
    tabBarIcon: ({ color, size }: { color: string; size: number }) => (
      <Ionicons name="home" size={size} color={color} />
    ),
  };
}
```

Pass these options via the Tabs.Screen `options={HomeTabBadgeOptions()}`.

- [ ] **Step 4: Delete the Calendar route file**

```bash
git rm app/\(tabs\)/calendar.tsx
```

- [ ] **Step 5: Verify the navigator boots**

```bash
npm start
```

Expected: tab bar shows `[Home] [Find] [Team] [Profile]`. No Calendar tab. Red dot on Home only when unseen events exist.

### Task 12.2: Update push deep-link routing

**Files:**
- Modify: [lib/notifications.ts](../../../lib/notifications.ts)

- [ ] **Step 1: Read current handler**

```bash
cat lib/notifications.ts
```

- [ ] **Step 2: Replace the legacy `match_id` handling**

Identify the `addNotificationResponseReceivedListener` callback. Replace any `match_id`-based logic with kind-based dispatch:

```ts
import { router } from 'expo-router';

Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  if (!data?.kind) return;

  switch (data.kind) {
    case 'invitation_received':
    case 'invitation_accepted':
    case 'member_joined':
    case 'member_left':
    case 'member_kicked':
    case 'group_code_set':
    case 'lobby_launched':
      router.push('/(tabs)/home');
      return;
    case 'invitation_declined':
    case 'listing_expired':
    case 'listing_expiring_soon':
      router.push('/(tabs)/find');
      return;
    default:
      if (__DEV__) console.warn('[notifications] unknown kind', data.kind);
  }
});
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add app/\(tabs\)/_layout.tsx lib/notifications.ts
git commit -m "$(cat <<'EOF'
feat(nav): replace Calendar tab with Find, wire push deep links to lobby events

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Milestone 13 — End-to-end verification

Final pass: type-check, manual flows, regression in adjacent features.

### Task 13.1: Type-check + grep for orphans

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Grep for legacy references**

```bash
grep -RIn -e 'on-match-event' -e 'check_active_match' -e 'expire_old_matches' \
  -e 'check_kick_cooldown' -e 'recalculate_current_players' -e 'renew_match' \
  app components hooks lib stores types supabase
```

Expected: no matches in `app/**`, `components/**`, `hooks/**`, `lib/**`, `stores/**`, `types/**`. The only acceptable matches in `supabase/migrations/**` are inside the `_drop_legacy_match.sql` file (DROP statements).

### Task 13.2: Manual happy-path

- [ ] **Step 1: Onboarding**

Create a fresh account → walk through 10 steps → verify profile + profile_servers populated correctly via Supabase Studio.

- [ ] **Step 2: Searcher flow**

Account A: publish a Searcher listing (1 last, no co-players, no code) → Home shows 1/5 + 4 empty + listing banner. Account B (Last): publish a Last listing → Account A's Find feed shows it → Account A taps Invite → Account B receives push → accepts → Account A's lobby shows 2/5.

- [ ] **Step 3: Group code + launch**

Account A: type a 6-char code in Home → Save. Add 3 external co-players via a new Searcher form (cancel current first) → reach 5/5 → Launch button enables → tap → status=launched → all members notified.

- [ ] **Step 4: Expirations**

Wait 31 minutes (or temporarily reduce expiry in dev) → listing transitions to `expired`, lobby returns to `idle`, owner gets a `listing_expired` push.

### Task 13.3: Regression check

- [ ] **Step 1: Adjacent tabs work**

Navigate Team → invite/leave still work. Profile → edit existing fields still work.

- [ ] **Step 2: Auth → Onboarding → Tabs**

Logout, log back in → if profile is incomplete (e.g. missing birthdate), `_layout.tsx` should redirect to onboarding. If complete, lands on Home.

- [ ] **Step 3: No realtime leaks**

Toggle airplane mode, return — channels should reconnect; check Metro logs for unhandled subscription errors.

### Task 13.4: Final commit + summary

- [ ] **Step 1: Verify clean tree**

```bash
git status
```

Expected: clean (or only `.claude/` ephemera).

- [ ] **Step 2: Push branch**

(After user authorization.)

```bash
git push -u origin <branch>
```

---

## Out of scope (intentionally not in this plan)

- Riot API rank verification (declarative ranks only in v1)
- Long-lived co-player groups (lobbies reset on launch)
- Scheduling / future-dated listings (instant-only)
- Game modes other than Competitive
- Duo-q / trio-q ranked
- In-app messaging
- Reputation / report system
- Listing kick cooldown / rate limiting

---


