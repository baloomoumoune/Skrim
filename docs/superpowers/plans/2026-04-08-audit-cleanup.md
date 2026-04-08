# Audit Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the Skrim codebase after the audit — remove dead code, fix type safety, apply mechanical fixes, and improve architecture.

**Architecture:** 5 phases executed sequentially. Each phase ends with a verification gate (project must compile). DB cleanup first, then type regen, then cast removal, then mechanical fixes, then architecture improvements.

**Tech Stack:** Supabase (MCP + Edge Functions), TypeScript, Expo/React Native, Zustand, NativeWind

**Spec:** `docs/superpowers/specs/2026-04-08-category2-design-decisions.md`

---

## Phase 1 — DB Cleanup & Dead Code Removal

### Task 1.1: Drop orphan tables via versioned Supabase migration

**Files:**
- Create: `supabase/migrations/<timestamp>_drop_orphan_tables.sql`

- [ ] **Step 1: Create the migration file locally**

Run:
```bash
supabase migration new drop_orphan_tables
```

This creates a timestamped file in `supabase/migrations/`.

- [ ] **Step 2: Write the migration SQL**

Write this content into the newly created migration file:

```sql
-- Drop orphan tables (join requests abandoned, scrims/availabilities not yet built)
DROP TABLE IF EXISTS match_requests CASCADE;
DROP TABLE IF EXISTS scrims CASCADE;
DROP TABLE IF EXISTS availabilities CASCADE;
```

- [ ] **Step 3: Apply the migration to the remote database**

Use MCP tool `apply_migration` with the same SQL to apply it to the live Supabase database.

- [ ] **Step 4: Verify tables are gone**

Use MCP tool `list_tables` and confirm `match_requests`, `scrims`, `availabilities` are no longer listed.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "chore: drop orphan tables (match_requests, scrims, availabilities)"
```

---

### Task 1.2: Clean up Edge Function `on-match-event`

**Files:**
- Modify: `supabase/functions/on-match-event/index.ts`

- [ ] **Step 1: Remove `match_requests` webhook comments**

Remove lines 8-9 from the header comments:

```
// 1. match_requests INSERT → on-match-event (new join request → notify creator)
// 2. match_requests UPDATE → on-match-event (accepted/rejected → notify requester)
```

Update the remaining webhook comments to renumber:

```typescript
// Required database webhooks (configure in Supabase Dashboard → Database → Webhooks):
//
// 1. match_members UPDATE → on-match-event (kicked_at set → notify kicked member)
// 2. matches UPDATE → on-match-event (status change → notify all members)
```

- [ ] **Step 2: Remove `match_requests INSERT` handler**

Remove lines 75-105 (the entire `if (table === 'match_requests' && type === 'INSERT')` block).

- [ ] **Step 3: Remove `match_requests UPDATE` handler**

Remove lines 107-133 (the entire `if (table === 'match_requests' && type === 'UPDATE')` block).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/on-match-event/index.ts
git commit -m "chore: remove match_requests handlers from on-match-event Edge Function"
```

Note: Deploy (`supabase functions deploy on-match-event`) can be done manually after the full plan is executed.

---

### Task 1.3: Delete Scrims tab

**Files:**
- Delete: `app/(tabs)/scrims.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Delete the scrims tab file**

Delete `app/(tabs)/scrims.tsx`.

- [ ] **Step 2: Remove scrims from TAB_CONFIG in `_layout.tsx`**

In `app/(tabs)/_layout.tsx`, remove line 20:

```typescript
// Remove this line:
{ name: 'scrims', title: 'Scrims', icon: 'trophy', iconOutline: 'trophy-outline' },
```

The `TAB_CONFIG` array should now have 4 entries: home, team, calendar, profile.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/scrims.tsx app/(tabs)/_layout.tsx
git commit -m "chore: remove Scrims tab (Coming soon placeholder)"
```

---

### Task 1.4: Phase 1 verification gate

- [ ] **Step 1: Verify TypeScript compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: The project should compile. The orphan types (MatchRequest, Scrim, Availability) still exist in `database.ts` but are unused by any code — no compilation errors expected. If there are errors referencing the deleted `scrims.tsx` file, check for stale imports.

---

## Phase 2 — Type Regeneration

### Task 2.0: Audit all type names imported from `@/types/database`

**Files:**
- None modified — this is a read-only audit step

- [ ] **Step 1: Grep all imports from `@/types/database` across the codebase**

Run:
```bash
grep -rn "from '@/types/database'" --include="*.ts" --include="*.tsx" app/ components/ hooks/ stores/ lib/
```

- [ ] **Step 2: Compile the exhaustive list of imported type names**

The following type names are currently imported from `@/types/database` and MUST all be re-exported after type regeneration:

**Row types:** `Database`, `Profile`, `Match`, `MatchMember`, `Team`, `TeamMember`, `TeamInvite`, `TeamRole`
**Enum types:** `Region`, `GameEnum`, `Platform`, `MatchStatus`, `TeamInviteStatus`
**Composite types (moving to composites.ts):** `MatchMemberWithProfile`, `TeamMemberWithProfile`, `TeamInviteWithTeam`

Keep this list as reference for Task 2.2 Step 4.

---

### Task 2.1: Extract composite types to separate file

**Files:**
- Create: `types/composites.ts`

- [ ] **Step 1: Create `types/composites.ts`**

```typescript
import type { Profile, MatchMember, TeamMember, TeamInvite, Team } from './database';

// Composite types for joined Supabase queries (select with nested profile/team)
export type MatchMemberWithProfile = MatchMember & { profile: Profile };
export type TeamMemberWithProfile = TeamMember & { profile: Profile };
export type TeamInviteWithTeam = TeamInvite & { team: Team; inviter: Profile };
```

Note: `MatchRequestWithProfile` is intentionally omitted — `match_requests` table has been dropped.

- [ ] **Step 2: Commit**

```bash
git add types/composites.ts
git commit -m "refactor: extract composite types to types/composites.ts"
```

---

### Task 2.2: Generate types from Supabase schema

**Files:**
- Overwrite: `types/database.ts`

- [ ] **Step 1: Generate types via MCP**

Use MCP tool `generate_typescript_types` to generate the full Database type from the live Supabase schema.

- [ ] **Step 2: Write generated output to `types/database.ts`**

Replace the entire content of `types/database.ts` with the MCP output.

- [ ] **Step 3: Verify the generated file**

Check that the generated file:
- Contains `profiles`, `teams`, `team_members`, `matches`, `match_members`, `team_invites` tables
- Does NOT contain `match_requests`, `scrims`, `availabilities` (dropped in Phase 1)
- Contains a `Functions` section with the RPCs: `check_active_match`, `check_kick_cooldown`, `check_username_available`, `accept_team_invite`, `recalculate_team_rank`
- Contains `Enums` section with `region`, `game_enum`, `team_role`, `match_status`, `team_invite_status`
- Does NOT contain `scrim_status` or `match_request_status` enums

- [ ] **Step 4: Add mandatory convenience re-exports**

Append re-exports at the bottom of `types/database.ts` so existing imports don't break. Every type name from the Task 2.0 audit list MUST be re-exported. Cross-check this list against the generated output — if a name already exists as a top-level export in the generated file, skip it.

```typescript
// ── Convenience re-exports ──────────────────────────────
// These aliases let the rest of the codebase import short names
// instead of Database['public']['Tables']['...']['Row'].

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type TeamMember = Database['public']['Tables']['team_members']['Row'];
export type TeamInvite = Database['public']['Tables']['team_invites']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type MatchMember = Database['public']['Tables']['match_members']['Row'];

export type Region = Database['public']['Enums']['region'];
export type GameEnum = Database['public']['Enums']['game_enum'];
export type Platform = Database['public']['Enums']['platform'];
export type TeamRole = Database['public']['Enums']['team_role'];
export type MatchStatus = Database['public']['Enums']['match_status'];
export type TeamInviteStatus = Database['public']['Enums']['team_invite_status'];
```

- [ ] **Step 5: Verify composites.ts still compiles**

Run:
```bash
npx tsc --noEmit types/composites.ts
```

Confirm `composites.ts` can still import `Profile`, `MatchMember`, `TeamMember`, `TeamInvite`, `Team` from `./database`.

- [ ] **Step 6: Commit**

```bash
git add types/database.ts
git commit -m "refactor: regenerate database.ts from Supabase schema via MCP"
```

---

### Task 2.3: Update all composite type imports

**Files:**
- Modify: Every file that imports `MatchMemberWithProfile`, `TeamMemberWithProfile`, `TeamInviteWithTeam` from `@/types/database`

Known files to update:
- `hooks/useActiveMatch.ts` — `MatchMemberWithProfile`
- `hooks/useMatchDetail.ts` — `MatchMemberWithProfile`
- `hooks/useTeam.ts` — `TeamMemberWithProfile`
- `hooks/useTeamInvites.ts` — `TeamInviteWithTeam`
- `stores/activeMatchStore.ts` — `MatchMemberWithProfile`
- `stores/teamStore.ts` — `TeamMemberWithProfile`
- `components/TeamManagementView.tsx` — `TeamMemberWithProfile`
- `components/team/TeamMemberRow.tsx` — `TeamMemberWithProfile`
- `components/team/TeamSettingsModal.tsx` — `TeamMemberWithProfile`
- `components/team/TeamSlot.tsx` — `TeamMemberWithProfile`
- `components/team/TeamSlotGrid.tsx` — `TeamMemberWithProfile`
- `components/team/PendingInvitesSection.tsx` — `TeamInviteWithTeam`
- `app/match/[id].tsx` — `MatchMemberWithProfile`

- [ ] **Step 1: Update imports in all files**

For each file, change:
```typescript
// Before:
import type { ..., MatchMemberWithProfile } from '@/types/database';

// After:
import type { ... } from '@/types/database';
import type { MatchMemberWithProfile } from '@/types/composites';
```

Same pattern for `TeamMemberWithProfile` and `TeamInviteWithTeam`. If a file only imported the composite type from `@/types/database`, replace the entire import line.

- [ ] **Step 2: Commit**

```bash
git add hooks/ stores/ components/ app/
git commit -m "refactor: update composite type imports to types/composites.ts"
```

---

### Task 2.4: Phase 2 verification gate

- [ ] **Step 1: Verify TypeScript compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: May have errors related to `as never` / `as Function` casts if the generated types now correctly type things differently. These errors are expected and will be fixed in Phase 3.

Note any errors and confirm they are all cast-related, not structural (missing types, broken imports).

---

## Phase 3 — Remove All Type Casts

### Task 3.1: Fix `as never` casts on Supabase mutations

**Files to modify (all `as never` locations):**
- `hooks/useMatchDetail.ts` — lines 105, 125, 143, 157, 171, 191, 218
- `hooks/useTeamInvites.ts` — line 81
- `lib/notifications.ts` — line 74
- `components/CreateMatchModal.tsx` — lines 100, 113
- `components/CreateTeamModal.tsx` — lines 209, 220, 255, 347
- `components/TeamManagementView.tsx` — lines 125, 154
- `components/team/InviteModal.tsx` — line 170
- `components/team/PlayerSearchModal.tsx` — line 161
- `components/team/TeamSettingsModal.tsx` — lines 134, 169
- `app/(tabs)/profile.tsx` — lines 120, 142, 181, 583
- `app/(auth)/onboarding.tsx` — line 211
- `app/invite/[code].tsx` — line 136

- [ ] **Step 1: Remove `as never` from each mutation call**

For each file, remove the `as never` cast. The generated types should now match the expected payload shape.

Example — in `hooks/useMatchDetail.ts` line 105:
```typescript
// Before:
.insert({ match_id: matchId, user_id: userId, is_ready: false } as never);

// After:
.insert({ match_id: matchId, user_id: userId, is_ready: false });
```

Apply the same pattern to every `as never` occurrence listed above.

- [ ] **Step 2: Compile check after each file group**

Run `npx tsc --noEmit` after removing casts from each file. If a specific mutation still fails to type-check (e.g., because the generated Insert type requires a field), fix the payload rather than re-adding the cast.

- [ ] **Step 3: Commit**

```bash
git add hooks/ lib/ components/ app/
git commit -m "refactor: remove all 'as never' type casts (types now match schema)"
```

---

### Task 3.2: Fix `as Function` casts on RPC calls

**Files to modify:**
- `hooks/useMatchDetail.ts` — lines 84, 93, 203
- `hooks/useTeamInvites.ts` — lines 58, 64
- `components/CreateMatchModal.tsx` — line 72
- `components/onboarding/useUsernameCheck.ts` — line 40
- `app/(tabs)/profile.tsx` — line 160
- `app/invite/[code].tsx` — line 142
- `app/(auth)/email.tsx` — line 51

- [ ] **Step 1: Remove `as Function` from each RPC call**

The generated types now include RPC signatures in `Database.public.Functions`. Replace casts with typed calls.

Example — in `hooks/useMatchDetail.ts` line 84:
```typescript
// Before:
const { data: hasActive } = await (supabase.rpc as Function)('check_active_match', {
  p_user_id: userId,
});

// After:
const { data: hasActive } = await supabase.rpc('check_active_match', {
  p_user_id: userId,
});
```

Apply the same pattern to every `as Function` occurrence listed above.

- [ ] **Step 2: Commit**

```bash
git add hooks/ components/ app/
git commit -m "refactor: remove all 'as Function' RPC casts (RPCs now typed)"
```

---

### Task 3.3: Fix `as string` casts on column filters

**Files to modify:**
- `hooks/useActiveMatch.ts` — lines 26, 58
- `hooks/useMatchDetail.ts` — line 61
- `components/calendar/MyMatchesList.tsx` — line 51

- [ ] **Step 1: Remove `as string` from `.is()` column filters**

Example — in `hooks/useActiveMatch.ts` line 26:
```typescript
// Before:
.is('kicked_at' as string, null)

// After:
.is('kicked_at', null)
```

Apply to all 4 occurrences.

- [ ] **Step 2: Commit**

```bash
git add hooks/ components/
git commit -m "refactor: remove 'as string' casts on Supabase column filters"
```

---

### Task 3.4: Simplify `as unknown as` casts on joined query results

**Files to modify:**
- `hooks/useActiveMatch.ts` — line 61
- `hooks/useMatchDetail.ts` — line 64
- `hooks/useTeam.ts` — lines 40, 60
- `hooks/useTeamInvites.ts` — line 39
- `app/(tabs)/home.tsx` — line 78
- `app/(tabs)/profile.tsx` — line 156
- `app/(auth)/onboarding.tsx` — line 220
- `app/invite/[code].tsx` — lines 92, 121
- `components/CreateTeamModal.tsx` — line 320
- `components/team/InviteModal.tsx` — line 143
- `components/team/PlayerSearchModal.tsx` — line 134

- [ ] **Step 1: Simplify double casts to single casts**

For joined queries (`.select('*, profile:profiles(*)')`), Supabase cannot infer the nested join shape. **Simplify `as unknown as X` to `as X`**. Only remove the cast entirely if TypeScript is happy without it — don't fight Supabase's join inference.

Example — in `hooks/useActiveMatch.ts` line 61:
```typescript
// Before:
const members = (membersData ?? []) as unknown as MatchMemberWithProfile[];

// After:
const members = (membersData ?? []) as MatchMemberWithProfile[];
```

For non-join queries (simple `.select('*')` without nested relations), try removing the cast entirely first. If TypeScript complains, keep it as `as X` (single cast).

- [ ] **Step 2: Commit**

```bash
git add hooks/ app/ components/
git commit -m "refactor: simplify type casts on Supabase query results"
```

---

### Task 3.5: Remove orphan type references

**Files:**
- Verify: no file imports `MatchRequest`, `MatchRequestStatus`, `MatchRequestWithProfile`, `Scrim`, `ScrimStatus`, `Availability`

- [ ] **Step 1: Grep for orphan type usage**

Run:
```bash
grep -rn "MatchRequest\|ScrimStatus\|Scrim\b\|Availability" --include="*.ts" --include="*.tsx" hooks/ components/ app/ stores/ lib/
```

Expected: No results. These types should not appear in any application code (they may still exist in the generated `database.ts` only if Supabase still defines the enums, but the tables are gone).

- [ ] **Step 2: Remove any remaining references found**

If any file still imports these types, remove the import and any code that uses them.

- [ ] **Step 3: Commit (if changes were needed)**

```bash
git add .
git commit -m "chore: remove all references to dropped tables (match_requests, scrims, availabilities)"
```

---

### Task 3.6: Phase 3 verification gate

- [ ] **Step 1: Verify TypeScript compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: **Zero errors.** All casts removed or simplified, types match schema. If errors remain, fix them before proceeding.

- [ ] **Step 2: Commit verification**

```bash
git log --oneline -10
```

Confirm all Phase 3 commits are present.

---

## Phase 4 — Mechanical Fixes (Category 1)

### Task 4.1: Fix F — Replace deprecated Clipboard API

**Files:**
- Modify: `app/match/[id].tsx`

**Prerequisite check:** `expo-clipboard` is already in `package.json` at version `~8.0.8` (confirmed).

- [ ] **Step 1: Replace Clipboard import**

In `app/match/[id].tsx`, remove `Clipboard` from the `react-native` import (line 12):

```typescript
// Before:
import {
  ...
  Clipboard,
  Animated,
} from 'react-native';

// After:
import {
  ...
  Animated,
} from 'react-native';
```

Add at the top with other expo imports:
```typescript
import * as Clipboard from 'expo-clipboard';
```

- [ ] **Step 2: Update Clipboard usage**

In `app/match/[id].tsx`, change line 133:
```typescript
// Before:
Clipboard.setString(match.group_code);

// After:
Clipboard.setStringAsync(match.group_code);
```

- [ ] **Step 3: Commit**

```bash
git add app/match/[id].tsx
git commit -m "fix: replace deprecated react-native Clipboard with expo-clipboard"
```

---

### Task 4.2: Fix J — Remove unused GAME_ACCENTS import

**Files:**
- Modify: `stores/gameStore.ts`

- [ ] **Step 1: Remove unused import**

In `stores/gameStore.ts`, change line 2:

```typescript
// Before:
import { GAME_ACCENTS, GameId } from '@/lib/constants';

// After:
import { GameId } from '@/lib/constants';
```

- [ ] **Step 2: Commit**

```bash
git add stores/gameStore.ts
git commit -m "fix: remove unused GAME_ACCENTS import from gameStore"
```

---

### Task 4.3: Fix K — Hardcoded borderTopColor in match detail

**Files:**
- Modify: `app/match/[id].tsx`

- [ ] **Step 1: Fix hardcoded color in readyRow style**

In `app/match/[id].tsx`, the `readyRow` style at line 623 has a hardcoded dark mode color. Move it to an inline style that adapts to the theme.

Remove `borderTopColor` from the StyleSheet `readyRow` definition (line 623):

```typescript
// Before:
readyRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: 12,
  borderTopWidth: 0.5,
  borderTopColor: 'rgba(255,255,255,0.06)',
},

// After:
readyRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: 12,
  borderTopWidth: 0.5,
},
```

Then in the JSX where `readyRow` is used (around line 280), add the dynamic color:

```typescript
// Before:
<View style={styles.readyRow}>

// After:
<View style={[styles.readyRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
```

- [ ] **Step 2: Commit**

```bash
git add app/match/[id].tsx
git commit -m "fix: make readyRow borderTopColor adaptive to light/dark mode"
```

---

### Task 4.4: Fix E — Deathmatch maxPlayers

**Files:**
- Modify: `lib/game-assets.ts`

- [ ] **Step 1: Fix Deathmatch maxPlayers**

In `lib/game-assets.ts`, around line 282:

```typescript
// Before:
{
  id: 'deathmatch',
  label: 'Deathmatch',
  icon: 'skull-outline',
  maxPlayers: 1,

// After:
{
  id: 'deathmatch',
  label: 'Deathmatch',
  icon: 'skull-outline',
  maxPlayers: 14,
```

14 is the actual Deathmatch FFA player count in Valorant.

- [ ] **Step 2: Commit**

```bash
git add lib/game-assets.ts
git commit -m "fix: correct Deathmatch maxPlayers from 1 to 14"
```

---

### Task 4.5: Fix G — Persist selectedGame in gameStore

**Files:**
- Modify: `stores/gameStore.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add AsyncStorage persistence to gameStore**

Rewrite `stores/gameStore.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { GameId } from '@/lib/constants';

const STORAGE_KEY = 'skrim:selectedGame';

interface GameState {
  selectedGame: GameId;
  isInitialized: boolean;
  setSelectedGame: (game: GameId) => void;
  initGame: () => Promise<void>;
}

export const useGameStore = create<GameState>((set) => ({
  selectedGame: 'valorant',
  isInitialized: false,

  setSelectedGame: (game) => {
    if (__DEV__) console.log('[GameStore] Game changed to:', game);
    set({ selectedGame: game });
    AsyncStorage.setItem(STORAGE_KEY, game).catch(() => {});
  },

  initGame: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'valorant' || stored === 'cs2') {
        set({ selectedGame: stored as GameId, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      set({ isInitialized: true });
    }
  },
}));
```

Note: `isInitialized` is set but not consumed for render-gating — same pattern as `themeStore.ts`. Both stores are ready if we later want to block the splash screen until both are initialized.

- [ ] **Step 2: Call `initGame()` in app startup**

In `app/_layout.tsx`, add initialization alongside existing `initTheme()`:

```typescript
import { useGameStore } from '@/stores/gameStore';

// Inside the root layout component, alongside initTheme:
const initGame = useGameStore((s) => s.initGame);

useEffect(() => {
  initGame();
}, [initGame]);
```

- [ ] **Step 3: Commit**

```bash
git add stores/gameStore.ts app/_layout.tsx
git commit -m "feat: persist selectedGame to AsyncStorage"
```

---

### Task 4.6: Phase 4 verification gate

- [ ] **Step 1: Verify TypeScript compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: Zero errors.

---

## Phase 5 — Architecture Improvements (Category 3)

### Task 5.1: Fix B — Harmonize Realtime hooks (add ref pattern to useMatchRealtime)

**Files:**
- Modify: `hooks/useMatchRealtime.ts`

- [ ] **Step 1: Add useRef pattern for callback stability**

```typescript
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export function useMatchRealtime(matchId: string | undefined, onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`match-detail-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        () => {
          if (__DEV__) console.log('[Realtime] Match updated');
          onRefreshRef.current();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_members',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          if (__DEV__) console.log('[Realtime] Members updated');
          onRefreshRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);
}
```

Key change: `onRefresh` removed from useEffect dependency array, replaced with ref pattern matching `useActiveMatchRealtime`.

- [ ] **Step 2: Commit**

```bash
git add hooks/useMatchRealtime.ts
git commit -m "fix: add ref pattern to useMatchRealtime to prevent re-subscriptions"
```

---

### Task 5.2: Fix D — Verify/add trigger for `current_players`

**Files:**
- Create: `supabase/migrations/<timestamp>_add_match_player_count_trigger.sql`
- Check: Supabase DB triggers via MCP

- [ ] **Step 1: Check existing triggers on `match_members`**

Use MCP tool `execute_sql` to inspect triggers:

```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'match_members';
```

- [ ] **Step 2: If no trigger exists, create the migration file locally**

Run:
```bash
supabase migration new add_match_player_count_trigger
```

Write this SQL into the newly created migration file:

```sql
-- Auto-update current_players count on match_members insert/update/delete
CREATE OR REPLACE FUNCTION update_match_player_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE matches
    SET current_players = (
      SELECT COUNT(*) FROM match_members
      WHERE match_id = OLD.match_id AND kicked_at IS NULL
    )
    WHERE id = OLD.match_id;
    RETURN OLD;
  ELSE
    UPDATE matches
    SET current_players = (
      SELECT COUNT(*) FROM match_members
      WHERE match_id = NEW.match_id AND kicked_at IS NULL
    )
    WHERE id = NEW.match_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_match_player_count
AFTER INSERT OR UPDATE OF kicked_at OR DELETE ON match_members
FOR EACH ROW
EXECUTE FUNCTION update_match_player_count();
```

- [ ] **Step 3: Apply the migration to the remote database**

Use MCP tool `apply_migration` with the same SQL.

- [ ] **Step 4: Verify trigger works and fix existing data**

Use MCP `execute_sql` to check the count matches reality:

```sql
SELECT m.id, m.current_players,
  (SELECT COUNT(*) FROM match_members mm WHERE mm.match_id = m.id AND mm.kicked_at IS NULL) as actual_count
FROM matches m
WHERE m.status IN ('open', 'full', 'in_progress')
LIMIT 10;
```

If counts are mismatched, run a one-time fix:

```sql
UPDATE matches m
SET current_players = (
  SELECT COUNT(*) FROM match_members mm
  WHERE mm.match_id = m.id AND mm.kicked_at IS NULL
);
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add trigger to auto-update match current_players count"
```

---

### Task 5.3: Fix H — Unified error handling for user-facing fetches

**Files:**
- Create: `lib/toast.ts`
- Modify: `app/(tabs)/home.tsx`
- Modify: `hooks/useMatchDetail.ts`
- Modify: `hooks/useTeam.ts`
- Modify: `hooks/useTeamInvites.ts`

- [ ] **Step 1: Create a lightweight toast/error helper**

Create `lib/toast.ts`:

```typescript
import { Alert } from 'react-native';

/**
 * Show a user-facing error.
 * Uses Alert for now — can be swapped for a toast library later.
 */
export function showError(title: string, message?: string) {
  Alert.alert(title, message ?? 'Please try again.');
}
```

- [ ] **Step 2: Add error feedback to Home screen fetch**

In `app/(tabs)/home.tsx`, add user-facing feedback in the catch block of `fetchMatches`:

```typescript
import { showError } from '@/lib/toast';

// In fetchMatches catch block:
} catch (err) {
  if (__DEV__) console.error('[Home] Fetch error:', err);
  showError('Connection error', 'Could not load matches.');
} finally {
```

- [ ] **Step 3: Add error feedback to useMatchDetail**

In `hooks/useMatchDetail.ts`, add to the `refresh` catch block:

```typescript
import { showError } from '@/lib/toast';

// In refresh catch block:
} catch (err) {
  if (__DEV__) console.error('[useMatchDetail] Fetch error:', err);
  showError('Connection error', 'Could not load match details.');
} finally {
```

- [ ] **Step 4: Add error feedback to useTeam**

In `hooks/useTeam.ts`, add to the catch block:

```typescript
import { showError } from '@/lib/toast';

// In catch block:
} catch (err) {
  if (__DEV__) console.error('[useTeam] Fetch error:', err);
  showError('Connection error', 'Could not load team data.');
}
```

- [ ] **Step 5: Add error feedback to useTeamInvites**

In `hooks/useTeamInvites.ts`, add to the catch block:

```typescript
import { showError } from '@/lib/toast';

// In catch block:
} catch (err) {
  if (__DEV__) console.error('[useTeamInvites] Fetch error:', err);
  showError('Connection error', 'Could not load invitations.');
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/toast.ts app/(tabs)/home.tsx hooks/useMatchDetail.ts hooks/useTeam.ts hooks/useTeamInvites.ts
git commit -m "feat: add user-facing error feedback on fetch failures"
```

---

### Task 5.4: Fix I — Add Realtime subscription to Home screen

**Files:**
- Create: `hooks/useHomeRealtime.ts`
- Modify: `app/(tabs)/home.tsx`

- [ ] **Step 1: Create `hooks/useHomeRealtime.ts`**

```typescript
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Subscribe to Supabase Realtime for all match changes.
 * No server-side filter — we refetch on any match table change.
 * The refetch applies game/region/status filters server-side.
 */
export function useHomeRealtime(onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const channel = supabase
      .channel('home-matches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        () => {
          if (__DEV__) console.log('[Realtime:Home] Matches updated');
          onRefreshRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
```

No filter on the subscription — we subscribe to all `matches` table changes and let the refetch apply game/region/status filters server-side. Simpler and more reliable than filtering by enum in the subscription.

- [ ] **Step 2: Wire up in Home screen**

In `app/(tabs)/home.tsx`, add after the existing `useEffect` for `fetchMatches`:

```typescript
import { useHomeRealtime } from '@/hooks/useHomeRealtime';

// After the existing fetchMatches useEffect:
useHomeRealtime(fetchMatches);
```

- [ ] **Step 3: Commit**

```bash
git add hooks/useHomeRealtime.ts app/(tabs)/home.tsx
git commit -m "feat: add Realtime subscription to Home feed"
```

---

### Task 5.5: Phase 5 verification gate

- [ ] **Step 1: Verify TypeScript compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 2: Final commit log review**

```bash
git log --oneline -20
```

Verify all commits from all 5 phases are present and well-ordered.

---

## Summary of all changes

| Phase | Tasks | Files touched |
|-------|-------|---------------|
| 1 — DB Cleanup | 4 tasks | Migration file (local + MCP), `on-match-event/index.ts`, `scrims.tsx` (delete), `_layout.tsx` |
| 2 — Type Regen | 5 tasks | `types/database.ts` (regen), `types/composites.ts` (create), ~13 files (import updates) |
| 3 — Cast Removal | 6 tasks | ~25 files (remove `as never`, `as Function`, `as string`, simplify `as unknown as`) |
| 4 — Mech Fixes | 6 tasks | `match/[id].tsx`, `gameStore.ts`, `_layout.tsx`, `game-assets.ts` |
| 5 — Arch Improvements | 5 tasks | `useMatchRealtime.ts`, migration file (trigger), `toast.ts` (create), `useHomeRealtime.ts` (create), `home.tsx`, `useMatchDetail.ts`, `useTeam.ts`, `useTeamInvites.ts` |
