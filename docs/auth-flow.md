# Auth Flow — Scrim App

Complete documentation of the sign-in / sign-up / onboarding flow.
Reference this when adding a new OAuth provider (e.g. Apple).

---

## Overview

```
User taps "Continue with X"
        │
        ▼
  login.tsx: signInWithOAuth()
        │
        ▼
  expo-web-browser opens provider page
        │
        ▼
  Provider redirects to skrim://auth/callback#access_token=...&refresh_token=...
        │
        ├─ (A) openAuthSessionAsync intercepts the URL → login.tsx extracts tokens
        │
        └─ (B) If browser closed early, deep link hits app/auth/callback.tsx instead
                │
                ▼
        supabase.auth.setSession({ access_token, refresh_token })
                │
                ▼
        onAuthStateChange fires SIGNED_IN
                │
                ▼
        authStore.setSession() → keeps isLoading: true (waits for profile)
                │
                ▼
        useSession hook fetches profile from DB
                │
                ▼
        authStore.setProfile() → sets isLoading: false
                │
                ▼
        useProtectedRoute decides where to redirect:
                │
                ├─ profile.username starts with "pending_" → /(auth)/onboarding
                │
                └─ profile complete → /(tabs)/feed
```

---

## Files involved

| File | Role |
|------|------|
| `app/(auth)/login.tsx` | Login screen UI + OAuth trigger |
| `app/auth/callback.tsx` | Deep link fallback for OAuth redirect |
| `hooks/useSession.ts` | Listens to auth state + fetches profile |
| `stores/authStore.ts` | Zustand store: session, user, profile, isLoading |
| `app/_layout.tsx` | `useProtectedRoute()` — routing guard |
| `app/(auth)/onboarding.tsx` | Profile setup for new users |

---

## Detailed step-by-step

### 1. Login screen (`app/(auth)/login.tsx`)

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider,               // 'discord' | 'google' | 'apple' (when adding)
  options: {
    redirectTo: 'skrim://auth/callback',
    skipBrowserRedirect: true,  // REQUIRED — we handle the redirect ourselves
  },
});
```

- `skipBrowserRedirect: true` prevents Supabase from doing its own redirect.
  We use `openAuthSessionAsync(data.url, redirectTo)` instead.
- The browser returns a result with `type: 'success'` and the full callback URL.
- We extract `access_token` and `refresh_token` from the URL fragment (`#`).
- We call `supabase.auth.setSession()` with these tokens.

**Important:** `expo-web-browser` is lazy-imported to avoid a crash at mount.

### 2. Callback fallback (`app/auth/callback.tsx`)

If the in-app browser closes before `openAuthSessionAsync` can intercept the URL,
the deep link `skrim://auth/callback#...` arrives via the OS and Expo Router
resolves it to this screen.

It does the same thing: extract tokens from URL fragment → `setSession()`.

**Note:** This file is at `app/auth/callback.tsx` (NOT inside `(auth)` group).
It must exist for Expo Router to resolve the `skrim://auth/callback` deep link.

### 3. Session listener (`hooks/useSession.ts`)

Two separate `useEffect` hooks:

**Hook 1 — Auth state listener:**
```typescript
supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session);  // updates authStore
});
```
- Fires: `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`
- **DO NOT** make async Supabase calls inside this callback — it blocks
  subsequent auth events. That's why profile fetching is in a separate hook.

**Hook 2 — Profile fetcher:**
```typescript
useEffect(() => {
  // Triggers when session.user.id changes
  supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  setProfile(data);
}, [session?.user?.id]);
```
- Uses `.maybeSingle()` (not `.single()`) — returns `null` without error
  if the profile doesn't exist yet.
- Has a `cancelled` flag to avoid setting state on unmounted component.

### 4. Auth store (`stores/authStore.ts`)

```
State: session | user | profile | isLoading
```

Key behaviors:
- `setSession(null)` → clears everything, sets `isLoading: false`
- `setSession(session)` → stores session/user, keeps `isLoading: true`
  (waiting for profile fetch). If same user ID, does NOT reset profile/loading
  (avoids flash on token refresh or duplicate SIGNED_IN events).
- `setProfile(profile)` → stores profile, sets `isLoading: false`
- `signOut()` → calls `supabase.auth.signOut()`, clears everything

**Critical:** `isLoading` starts as `true` and only becomes `false` after
BOTH the session check AND the profile fetch are done. This prevents
`useProtectedRoute` from making premature redirect decisions.

### 5. Protected route (`app/_layout.tsx`)

`useProtectedRoute()` runs in a `useEffect` and decides where to redirect:

```
Guards (skip if not ready):
  - !navigationState?.key → navigation not mounted yet
  - isLoading → session/profile not determined yet

Decision tree:
  1. No session + not on auth screens     → /(auth)/login
  2. No session + already on auth screens  → stay (no redirect)
  3. Session + profile.username starts with "pending_" + not on onboarding → /(auth)/onboarding
  4. Session + profile complete + not on tabs → /(tabs)/feed
  5. Already in the right place → no redirect
```

**Splash screen:** The native splash (`expo-splash-screen`) stays visible until
`useProtectedRoute` has made its first redirect decision (`hasRedirected.current = true`).
This prevents any flash of login/onboarding screens on app launch.

### 6. Onboarding (`app/(auth)/onboarding.tsx`)

Shown when `profile.username.startsWith('pending_')`.

The screen:
- Collects: username (min 3 chars), region, preferred game
- On save: `supabase.from('profiles').update({...}).eq('id', user.id)`
- On success: `setProfile(data)` → `useProtectedRoute` detects profile
  is complete → redirects to `/(tabs)/feed`
- Has a "Sign out" link at the bottom (escape hatch for edge cases)

---

## Supabase configuration

### Dashboard > Authentication > URL Configuration
- **Site URL:** `skrim://auth/callback`
- **Redirect URLs:** `skrim://auth/callback`

### Dashboard > Authentication > Providers
- Discord: enabled
- Google: enabled
- Apple: to be added
- **Automatic Linking:** enabled (same email = same user across providers)

### Database trigger: `handle_new_user()`

Fires on `INSERT` into `auth.users` (i.e. first sign-up only, not re-login).

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, discord_tag, region, timezone, preferred_game)
  VALUES (
    NEW.id,
    'pending_' || LEFT(NEW.id::text, 8),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'full_name',
    'eu',
    'Europe/Paris',
    'valorant'
  );
  RETURN NEW;
END;
$$;
```

**Important:**
- `username` column has a `NOT NULL` constraint → trigger uses `'pending_' || LEFT(id, 8)` as placeholder
- The trigger only fires on first sign-up. If you delete a profile row manually,
  the trigger won't recreate it on next login (the auth.users row still exists)
- RLS policy allows UPDATE on own profile but NOT INSERT from client — only the
  trigger (SECURITY DEFINER) can insert

---

## Adding a new provider (e.g. Apple)

### 1. Supabase Dashboard
- Enable Apple provider in Authentication > Providers
- Configure the required credentials (Service ID, Key ID, etc.)
- Redirect URLs remain the same: `skrim://auth/callback`

### 2. Code changes

**`app/(auth)/login.tsx` only:**

1. Update the `Provider` type:
   ```typescript
   type Provider = 'discord' | 'google' | 'apple';
   ```

2. Add the button in the JSX (same pattern as Discord/Google):
   ```tsx
   <TouchableOpacity
     style={[styles.button, styles.appleButton]}
     onPress={() => handleLogin('apple')}
     disabled={loading !== null}
     activeOpacity={0.8}
   >
     {loading === 'apple' ? (
       <ActivityIndicator color="#FFFFFF" size="small" />
     ) : (
       <>
         <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
         <Text style={styles.buttonText}>Continue with Apple</Text>
       </>
     )}
   </TouchableOpacity>
   ```

3. Add the button style:
   ```typescript
   appleButton: {
     backgroundColor: '#000000',
   },
   ```

**That's it.** The `handleLogin` function is already generic — it works with
any Supabase OAuth provider. The rest of the flow (callback, session, profile
fetch, onboarding, routing) is provider-agnostic.

### 3. app.json (iOS only)

Apple Sign In requires the `expo-apple-authentication` plugin for iOS:
```json
{
  "plugins": [
    "expo-apple-authentication"
  ]
}
```

### 4. Rebuild

Apple Sign In requires a new EAS build (native module change).

---

## Edge cases & gotchas

| Scenario | What happens |
|----------|-------------|
| Same email, different provider | Automatic Linking merges into one user (same user.id, same profile) |
| User deletes profile row manually | Update fails silently (`.maybeSingle()` returns null), onboarding shows error "Profile not found" with sign-out escape hatch |
| Token refresh on app resume | `onAuthStateChange` fires `TOKEN_REFRESHED`, `setSession` sees same user.id → no profile reset, no flash |
| User closes browser mid-OAuth | `openAuthSessionAsync` returns `{ type: 'cancel' }`, nothing happens, user stays on login |
| Deep link arrives before browser result | `app/auth/callback.tsx` handles it as fallback |
| Double SIGNED_IN event | `setSession` checks `state.user?.id !== session.user.id` — if same user, no reset |
| Slow profile fetch on launch | `isLoading` stays `true`, splash stays visible, no premature redirect |

---

## State diagram

```
                    ┌─────────────┐
                    │   App Start  │
                    └──────┬──────┘
                           │
                    isLoading: true
                    splash visible
                           │
                           ▼
                ┌─────────────────────┐
                │  onAuthStateChange  │
                │  INITIAL_SESSION    │
                └──────┬──────────────┘
                       │
              ┌────────┴────────┐
              │                 │
         session: null     session: found
              │                 │
        isLoading: false    fetch profile
              │                 │
              ▼                 ▼
        ┌──────────┐    ┌─────────────────┐
        │  Login   │    │ isLoading: false │
        │  Screen  │    └────────┬────────┘
        └──────────┘             │
                        ┌────────┴────────┐
                        │                 │
                  pending_xxx      real username
                        │                 │
                        ▼                 ▼
                 ┌─────────────┐   ┌───────────┐
                 │ Onboarding  │   │   Tabs    │
                 └──────┬──────┘   └───────────┘
                        │
                   update profile
                        │
                        ▼
                 ┌───────────┐
                 │   Tabs    │
                 └───────────┘
```
