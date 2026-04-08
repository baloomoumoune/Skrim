# Category 2 — Design Decisions Spec

Date: 2026-04-08

## Context

Audit of the Skrim codebase revealed 3 design-level decisions needed before proceeding with mechanical fixes and architecture improvements. These decisions were brainstormed and validated with the project owner.

---

## Decision C — Match Join Flow

### Problem
The original spec described a request/accept flow: players submit join requests (`match_requests` table), the match creator reviews and accepts/rejects. The current code implements direct join: players insert themselves into `match_members` with guards (active match check, kick cooldown, rank range). The components that managed the request flow (MatchCreatorView, MatchPlayerView, RequestRow, MemberRow) were already deleted. The `match_requests` table and related types exist but are unused.

### Decision: Join Direct (confirmed)
The direct join model is the intended behavior. The request/accept flow is abandoned.

### Cleanup Required
- **DB**: Drop `match_requests` table via migration
- **Types**: Remove `MatchRequest`, `MatchRequestStatus`, `MatchRequestWithProfile` from `types/database.ts`
- **Edge Function**: Remove `match_requests INSERT/UPDATE` handlers from `supabase/functions/on-match-event/index.ts`
- **DB Webhooks**: Remove the `match_requests` webhook configuration in Supabase dashboard

---

## Decision L — Orphan Tables and Scrims Tab

### Problem
Three elements exist without any client-side code referencing them:
1. `scrims` table — full TS interface, CRUD types, zero usage
2. `availabilities` table — same situation
3. `app/(tabs)/scrims.tsx` — displays "Coming soon", occupies a tab slot

### Decision: Delete everything
Clean slate. Tables, types, and the tab will be removed entirely. They will be redesigned from scratch when the feature is prioritized.

### Cleanup Required
- **DB**: Drop `scrims` and `availabilities` tables via migration
- **Types**: Remove `Scrim`, `ScrimStatus`, `Availability` interfaces and CRUD sections
- **Tab**: Delete `app/(tabs)/scrims.tsx`, remove from tab navigator in `app/(tabs)/_layout.tsx`

---

## Decision A — Type Safety Strategy for Supabase RPCs

### Problem
The `Database` interface in `types/database.ts` is manually written and declares `Functions: Record<string, never>`. This forces all RPC calls to use `(supabase.rpc as Function)(...)`. Additionally, all mutations use `as never` casts and column filters use `as string` casts, bypassing TypeScript entirely.

### Decision: Auto-generate types via MCP Supabase (Option 1)
Use the Supabase MCP tool `generate_typescript_types` to regenerate `database.ts` from the live schema. This produces exact types including RPC signatures, eliminating all casts.

### Implementation Details
- Generated types go into `types/database.ts` (replaces current manual file)
- Composite types (`MatchMemberWithProfile`, `MatchRequestWithProfile`, `TeamMemberWithProfile`, `TeamInviteWithTeam`) move to a separate `types/composites.ts` file so they survive regeneration
- All `as never`, `as Function`, `as string` casts are removed after regeneration
- Order matters: DB cleanup (decisions C + L) must happen BEFORE type generation so dropped tables don't appear in generated types

---

## Execution Order Constraint

These decisions create a dependency chain:
1. **DB cleanup first** (C + L) — drop dead tables
2. **Type generation second** (A) — generate from clean schema
3. **Cast removal third** — fix all bypassed type safety

This order ensures no intermediate state where the code references deleted tables or has stale types.
