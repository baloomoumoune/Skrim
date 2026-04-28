# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Persistent Memory

At the **start of each session**, read files in `/memory`:
- `memory/decisions.md` — Technical decisions, architecture choices, accepted tradeoffs
- `memory/people.md` — People involved in the project, roles, contacts
- `memory/preferences.md` — User preferences (code style, workflow, tools)
- `memory/user.md` — User profile, personal context, technical level

At the **end of each session** (or when important info appears mid-session), update these files with new information learned.

## Project: Scrim

Mobile app (iOS + Android) for organizing scrims (practice matches) between competitive esports teams.

- **Games supported at launch**: Valorant, CS2 (disabled)
- **Stack**: Expo SDK 54, Expo Router v4, TypeScript strict, NativeWind v4, Supabase, Zustand, React Query
- **Auth**: Discord OAuth + Google OAuth via Supabase
- **Theme**: Adaptive per game (Valorant = red #FF4655, CS2 = gold #DE9B35)

## Commands

```bash
# Development
npm start              # Start Expo dev server
npm run android        # Start with Android
npm run ios            # Start with iOS

# Build (requires EAS CLI)
eas build --profile development-device   # Dev build with expo-dev-client
eas build --profile preview              # Internal preview build
eas build --profile production           # Production build

# Supabase Edge Functions (from supabase/ directory)
supabase functions serve                 # Local dev
supabase functions deploy <function>     # Deploy to production
```

## Architecture

### Routing (Expo Router v4)
```
app/
├── _layout.tsx           # Root: providers, auth protection, active match banner
├── index.tsx             # Entry redirect
├── (auth)/               # Pre-auth screens (login, onboarding)
├── (tabs)/               # Main tab navigator (home, scrims, team, calendar, profile)
├── match/[id].tsx        # Match detail (dynamic route)
└── invite/[code].tsx     # Team invite deep link
```

Auth protection in `_layout.tsx` redirects based on session state:
- No session → `/(auth)/login`
- Session but no profile/pending username → `/(auth)/onboarding`
- Authenticated → `/(tabs)/home`

### State Management
- **Zustand stores** (`stores/`): Auth, theme, game selection, active match, team
- **React Query**: Server state for matches, teams, profiles
- **Supabase Realtime**: Match members, join requests, team invites

### Theming System
- Base colors in `lib/constants.ts` (LIGHT_COLORS, DARK_COLORS)
- Game accents override accent/secondary colors per selected game (GAME_ACCENTS)
- Use `useColors()` in tab screens (game-aware), `useBaseColors()` in auth screens
- NativeWind v4: className for layout, inline styles via hooks for dynamic colors (CSS variables don't work on native)

### Supabase Integration
- Client configured in `lib/supabase.ts` with AsyncStorage for auth persistence
- Types in `types/database.ts` — all table Row/Insert/Update types
- Edge Functions in `supabase/functions/`:
  - `send-push` — Push notifications via Expo
  - `on-listing-event` — Lobby event lifecycle (push fan-out)
- Game assets (agents, maps, ranks) stored in Supabase Storage `game-assets` bucket
- Asset URL helpers in `lib/game-assets.ts`

### Key Patterns
- Deep link scheme: `skrim://` (configured in app.json)
- Notifications: `hooks/useNotifications.ts` registers push token and handles incoming
- Active match banner: Global overlay when user has an active match, managed by `useActiveMatch` hook

## Code Conventions

- TypeScript strict, no `any`
- Functional components only
- PascalCase for components, camelCase for functions/variables
- Imports use `@/` alias (configured in tsconfig.json)
- Colors from `lib/constants.ts`, no hardcoding (except login screen)
- Comments in English
- Console.log useful for debug in dev (guarded by `__DEV__`)
