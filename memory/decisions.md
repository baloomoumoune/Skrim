# Décisions techniques

## Stack & SDK
- **Expo SDK 54** (pas 55) — Expo Go sur les stores iOS/Android est encore en SDK 54, aucune mise à jour dispo (session du 2026-03-18)
- **npm avec --legacy-peer-deps** — Nécessaire à cause de conflits peer deps entre expo-router (radix-ui/react-dom) et react 19.1.0. Fichier `.npmrc` avec `legacy-peer-deps=true` pour les builds EAS.
- **Development build EAS** (pas Expo Go) — OAuth Discord/Google ne fonctionne pas avec Expo Go car les schemes custom (exp://) ne sont pas supportés par les providers OAuth.

## Architecture
- **Expo Router v4** (file-based routing) avec groupes `(auth)` et `(tabs)`
- **NativeWind v4** + Tailwind CSS 3 pour le styling (metro.config.js configuré avec `withNativeWind`)
- **Zustand** pour le state global (auth + game/theme)
- **React Query** pour le data fetching (configuré, à utiliser)
- **Supabase Auth** avec OAuth uniquement (Discord + Google), pas d'email/password

## UI/UX
- Dark theme par défaut, pas de mode light
- Thème adaptatif par jeu : Valorant (#FF4655 rouge) / CS2 (#DE9B35 or)
- 5 tabs : Feed, Scrims, Team, Calendar, Profile
- Login screen avec design gaming dark, deux boutons OAuth empilés (Ionicons)
- Splash screen fond #0F1923 avec texte "SCRIM", fondu 600ms vers le login/tabs

## Auth flow
- **Scheme** : `skrim://` (PAS `scrim://`)
- OAuth Discord/Google → Supabase signInWithOAuth (flowType: implicit) → WebBrowser.openAuthSessionAsync
- Le callback `skrim://auth/callback` est intercepté par `openAuthSessionAsync` qui retourne les tokens
- Si le browser se ferme et le deep link arrive, `app/auth/callback.tsx` prend le relais
- `_layout.tsx` contient `useProtectedRoute()` qui surveille la session en continu et redirige auto (login ↔ tabs)
- Supabase Dashboard : Site URL = `skrim://auth/callback`, Redirect URLs = `skrim://auth/callback`

## Bugs résolus (session du 2026-03-18)
- **SafeAreaView crash** — `react-native-safe-area-context` nécessite `SafeAreaProvider` wrappé en haut de l'arbre (`_layout.tsx`). Le composant `SafeAreaView` crash quand même → utiliser `useSafeAreaInsets()` + `View` avec padding à la place.
- **router.replace crash** — Les appels impératifs dans useEffect crashent si le navigation state n'est pas prêt. Garder dans useEffect mais avec guard `navigationState?.key` et `isLoading`.
- **expo-splash-screen build fail** — Le build Android échoue si `splash.image` n'est pas défini dans app.json.
- **expo-web-browser** — Import lazy dans login.tsx pour éviter un crash au mount.
- **Double redirection** — `index.tsx` et `_layout.tsx` ne doivent pas tous les deux rediriger. `_layout.tsx` gère le routing protégé, `index.tsx` affiche juste le splash animé.
- **Callback Unmatched Route** — Il faut `app/auth/callback.tsx` pour que expo-router puisse résoudre `skrim://auth/callback`.

## Comptes & Config
- **Compte Expo** : aymendev (organization: aymendevs-organization) — compte freelance dédié
- **EAS Project ID** : 8f746bc4-9380-489b-bfab-54f4a0c5c984
- Clés Supabase remplies dans `lib/supabase.ts`

## BDD Supabase
- Trigger `on_auth_user_created` sur `auth.users` → appelle `handle_new_user()` pour créer un profil automatiquement
- Tables : profiles, teams, team_members, availabilities, scrims
- Triggers existants : on_profiles_updated, on_scrims_updated, on_team_created, on_teams_updated
