# TODO — Skrim

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