# Décisions techniques

## Stack & SDK
- **Expo SDK 54** (pas 55) — Expo Go sur les stores iOS/Android est encore en SDK 54, aucune mise à jour dispo (session du 2026-03-18)
- **npm avec --legacy-peer-deps** — Nécessaire à cause de conflits peer deps entre expo-router (radix-ui/react-dom) et react 19.1.0. Fichier `.npmrc` avec `legacy-peer-deps=true` pour les builds EAS.
- **Development build EAS** (pas Expo Go) — OAuth Discord/Google ne fonctionne pas avec Expo Go car les schemes custom (exp://) ne sont pas supportés par les providers OAuth.

## Architecture
- **Expo Router v4** (file-based routing) avec groupes `(auth)` et `(tabs)`
- **NativeWind v4** + Tailwind CSS 3 pour le styling
  - `babel.config.js` avec `nativewind/babel` preset ET `jsxImportSource: 'nativewind'` — **CRITIQUE** : sans ce fichier, className est silencieusement ignoré
  - `metro.config.js` configuré avec `withNativeWind`
  - `nativewind-env.d.ts` pour les types
- **Zustand** pour le state global (auth + game/theme)
- **React Query** pour le data fetching (configuré, à utiliser)
- **Supabase Auth** avec OAuth uniquement (Discord + Google), pas d'email/password

## UI/UX — Design "Tactical Minimalism"
- **Thème light + dark** adaptatif au système + toggle manuel (Auto/Light/Dark) dans Profile
- Palette neutre noir/blanc (correspond au logo SCRIM), pas de couleurs gaming dans la base
- Accents de jeu : Valorant (#FF4655 rouge) / CS2 (#DE9B35 or) — injectés dynamiquement
- **Couleurs via inline styles** `style={{ color: c.textPrimary }}` — les CSS variables `var()` ne fonctionnent PAS avec NativeWind sur React Native
- Hooks `useBaseColors()` (auth screens) et `useColors()` (tab screens, avec accent jeu) dans `hooks/useThemeColors.ts`
- NativeWind `className` utilisé UNIQUEMENT pour le layout (flex, padding, margin, rounded, gap...)
- `useColors()` memoized avec `useMemo` pour éviter boucle infinie dans les layouts
- LoadingScreen : toujours fond noir #000000 (moment de marque, indépendant du thème)
- Splash screen natif : fond #000000
- `app.json` : `userInterfaceStyle: "automatic"` (nécessite build EAS après changement)
- 5 tabs : Feed, Scrims, Team, Calendar, Profile
- `stores/themeStore.ts` : persiste la préférence thème dans AsyncStorage (`@scrim/theme-preference`)
- `colorScheme.set()` de `nativewind` (via `react-native-css-interop`) utilisable hors composants React

## Assets de jeux — Supabase Storage
- **Bucket public `game-assets`** sur Supabase Storage pour tous les assets de jeux (agents, maps, ranks)
- Structure : `game-assets/valorant/agents/jett.png`, `game-assets/valorant/maps/ascent.png`, etc.
- Fichiers uploadés en lowercase (le script convertit automatiquement)
- 66 assets Valorant uploadés : 29 agents, 12 maps, 25 ranks
- `lib/game-assets.ts` : métadonnées + `getAssetUrl()` pour construire les URLs CDN
- `hooks/useGameAssets.ts` : hook qui retourne agents/maps/ranks + URL builders du jeu sélectionné
- `expo-image` gère le cache disque automatiquement — pas de cache custom nécessaire
- Garder dans le repo uniquement les assets de la marque SCRIM (logo, icônes, splash)
- Script `scripts/upload-assets.ts` pour uploader en masse vers Supabase Storage
- Pour ajouter CS2 : créer les arrays dans `game-assets.ts`, ajouter le dossier `assets/CS2/`, relancer le script

## Auth flow
- **Scheme** : `skrim://` (PAS `scrim://`)
- OAuth Discord/Google → Supabase signInWithOAuth (flowType: implicit) → WebBrowser.openAuthSessionAsync
- Le callback `skrim://auth/callback` est intercepté par `openAuthSessionAsync` qui retourne les tokens
- Si le browser se ferme et le deep link arrive, `app/auth/callback.tsx` prend le relais
- `_layout.tsx` contient `useProtectedRoute()` qui surveille la session en continu et redirige auto (login ↔ tabs)
- Supabase Dashboard : Site URL = `skrim://auth/callback`, Redirect URLs = `skrim://auth/callback`
- `onAuthStateChange` : NE PAS mettre d'appels async Supabase dedans (bloque les events suivants)
- Profile fetch séparé dans son propre `useEffect` déclenché par `session?.user?.id`
- `setSession` garde `isLoading: true` tant que le profil n'est pas chargé (évite flash onboarding)
- `setSession` ne reset le profil que si c'est un user différent (évite flash au re-login)
- Trigger `handle_new_user()` crée le profil avec username `pending_xxx` → l'onboarding le met à jour

## Bugs résolus
- **babel.config.js manquant** (session 2026-03-19) — NativeWind className complètement ignoré, aucun style appliqué. Résolu en créant le fichier avec les presets nativewind/babel et jsxImportSource.
- **Zustand getSnapshot infinite loop** — `useColors()` retournait un nouvel objet à chaque render dans le tabs layout → boucle infinie `useSyncExternalStore`. Résolu avec `useMemo` et utilisation directe des constantes dans _layout.tsx.
- **expo-linear-gradient crash** — Package installé mais pas dans le build natif (nécessite rebuild EAS). Crash `IllegalViewOperationException` au runtime. Résolu en supprimant le package.
- **CSS variables ne fonctionnent pas** — `var(--color-xxx)` dans tailwind.config.js ne se résout pas côté natif. Résolu en utilisant inline styles via hooks.
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
- Trigger `on_auth_user_created` sur `auth.users` → appelle `handle_new_user()` pour créer un profil avec username `pending_` + LEFT(id, 8)
- Tables : profiles, teams, team_members, availabilities, scrims
- Triggers existants : on_profiles_updated, on_scrims_updated, on_team_created, on_teams_updated
- **Storage** : bucket public `game-assets` avec les assets Valorant (agents, maps, ranks)
