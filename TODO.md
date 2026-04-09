# TODO — Skrim

## URGENT — FREEZE BACKEND ET REPARATION DB

Decouvert le 9 avril 2026 : aucun element du schema Supabase n'est
versionne en git. Voir docs/db-drift-report-2026-04-09.md pour le
detail complet.

FREEZE : aucune modification du backend Supabase autorisee jusqu'a
la fin de la session de reparation.

JALON 1.3 BLOQUE : ne pas demarrer tant que la reparation n'est
pas faite.

PROCHAINE SESSION : dediee a la reparation, environ 1h-1h30,
approche pg_dump baseline.

---

Dette technique et améliorations identifiées lors du refactor d'audit (v1.0.1-cleanup).
Classé par priorité. Cocher au fur et à mesure.

## 🔴 À traiter prochainement

- [ ] **`invite_code` nullable — vraie fix**
  Actuellement géré par un fallback `?? ''` dans `TeamManagementView.tsx`.
  Options : soit rendre la colonne NOT NULL en DB avec un default généré,
  soit désactiver visuellement le bouton d'invite quand le code est absent
  avec un message explicite. Fichier concerné : `components/TeamManagementView.tsx:302`.

- [ ] **Guard sur `selectedGame` pour jeux disabled**
  `gameStore.setSelectedGame()` accepte n'importe quel `GameId` sans vérifier
  si le jeu est `disabled: true`. Si CS2 est sélectionné et que le jeu est
  désactivé, l'app va essayer de charger des assets qui n'existent pas.
  Ajouter un guard dans le setter.

- [ ] **Remplacer `Alert.alert` par une vraie lib de toast**
  Implémentation actuelle dans `lib/toast.ts` utilise `Alert.alert`, qui est
  bloquant et moche. Candidats : `sonner-native` ou `react-native-toast-message`.
  Refactor d'un seul fichier, zéro changement côté appelant.

## 🟡 Dette moyenne

- [ ] **`Platform` en vrai enum Postgres**
  Actuellement hardcodé en union type `'pc' | 'console'` dans `types/database.ts`.
  Créer une migration qui ajoute un enum Postgres `platform_type`, régénérer
  les types, supprimer le hack.

- [ ] **Données historiques `current_players` désynchronisées**
  Un match completed a `current_players=1` alors qu'il avait 2 membres
  (écart détecté pendant le refactor). Si on ajoute des stats/historique plus
  tard, prévoir un script one-shot qui recalcule tous les `current_players`
  historiques via la même logique que le trigger `trg_recalculate_players`.

- [ ] **Réactiver `disabled` sur CS2 — décision produit**
  CS2 est marqué `disabled: true` dans `game-assets.ts`. Soit implémenter le
  support CS2 complet (agents, maps, ranks), soit retirer du store `GameId`.

## 🟢 Nice-to-have

- [ ] **Tab Scrims — décision produit**
  Supprimé pendant le refactor (était un placeholder "Coming soon"). Les tables
  `scrims` et `availabilities` ont aussi été droppées. Si on veut une feature
  de scheduling avancé avec disponibilités récurrentes, tout est à recréer.
  Spec à écrire d'abord.

- [ ] **Notifications cloche header**
  Le bouton cloche dans le header existe mais `onPress` n'est pas câblé.
  Définir ce qui s'affiche (invitations team en attente ? match events ?
  annonces ?) puis implémenter.

- [ ] **Game stats dans le profil**
  Section "Coming soon" dans l'écran profil. Nécessite probablement
  l'intégration Riot API (Phase 2 du projet).

- [ ] **Flow Join — envisager retour au request/accept**
  Le flow actuel est "join direct", décision actée pendant le refactor.
  Si le feedback utilisateur montre que les créateurs veulent filtrer
  qui rejoint leurs scrims, revenir sur cette décision.

## ✅ Fait pendant le refactor v1.0.1-cleanup

- [x] Drop tables orphelines (`match_requests`, `scrims`, `availabilities`)
- [x] Nettoyer Edge Function `on-match-event` des handlers `match_requests`
- [x] Supprimer tab Scrims (placeholder)
- [x] Régénérer `database.ts` depuis le schéma Supabase via MCP
- [x] Extraire composites dans `types/composites.ts`
- [x] Supprimer tous les casts `as never` / `as Function` / `as string` / `as unknown as`
- [x] Fix bug `profilePayload` nullable dans onboarding
- [x] Fix bug `invite_code` nullable dans TeamManagementView (fallback transitoire)
- [x] Clipboard déprécié → `expo-clipboard`
- [x] Persistence `selectedGame` dans AsyncStorage
- [x] Pattern ref harmonisé sur `useMatchRealtime`
- [x] Vérifier trigger `current_players` (déjà existant et plus robuste que prévu)
- [x] Système `showError` unifié (4 écrans/hooks)
- [x] Realtime subscription sur le feed Home
- [x] Deploy Edge Function sur le projet Supabase distant

## 🟡 Important - Implement offline detection screen

Scrim is a fundamentally online app (matching, realtime, push notifications).
The current fallback in lib/game-assets-fallback.ts serves as instant render
placeholder, NOT as offline mode. We need to add a `<NoConnectionScreen />`
overlay that displays when network is unavailable, and prevent the user from
interacting with the app until connection is restored.

**Implementation plan**:
- Add `expo-network` or `@react-native-community/netinfo` package
- Create `components/NoConnectionScreen.tsx`
- Add network state listener in `app/_layout.tsx`
- Show overlay over the entire app when offline
- Auto-dismiss when connection is restored

**Inspiration**: Instagram, TikTok, Discord, Revolut (all show "no connection"
screen, no fake offline mode).

**Decision context**: discussed during Jalon 1.1 implementation. Aymen wants
the app to behave like modern social media — no half-functional offline mode,
clear "no internet" screen instead.

- [ ] Migrer Jest 29 → Jest 30 quand jest-expo sera compatible
      (workaround temporaire mis en place au Jalon 1.2 cause
      jest-watch-typeahead bloque sur Jest 27-29). A revoir au
      prochain bump d'Expo SDK.

## Issues identifiees au Jalon 1.2

- [ ] Migrer Jest 29 → Jest 30 quand jest-expo sera compatible.
      Workaround temporaire mis en place au Jalon 1.2 parce que
      jest-expo@55 bloque sur Jest 27-29 via sa dependance
      jest-watch-typeahead. A revoir au prochain bump d'Expo SDK
      (probablement SDK 56 ou 57).

- [ ] Creer une fonction facade validateJoinRequest dans
      lib/valorant-rules.ts au Jalon 2.1. Decision de brainstorming :
      les 5 fonctions atomiques suffisent pour le 1.2, mais le feed
      bidirectionnel du 2.1 aura besoin d'une fonction qui orchestre
      l'ensemble pour valider en une passe si un joueur peut rejoindre
      un match donne. La signature et le contexte exact seront
      definis quand on attaquera le 2.1.

- [ ] Migration DB optionnelle : transformer profiles.current_rank
      de type text libre en enum Postgres. Pas urgent parce que
      parseRank() sert deja de validation a l'app, et la colonne
      n'est ecrite que par l'app elle-meme. A reevaluer quand
      l'integration Riot RSO arrivera (Phase B), parce que des
      donnees externes pourraient introduire des valeurs invalides.