# Scrim — Roadmap trimestre 2 2026 (avril à juin)

> La roadmap concrète des 3 prochains mois pour amener Scrim à une v1 lançable en bêta privée.
> Ce document complète le `north-star.md` et se met à jour chaque semaine.
>
> Date de démarrage : avril 2026
> Objectif fin de trimestre : v1 publiable sur TestFlight et Google Play Internal Testing, testée par 20-50 joueurs recrutés via DRAVA et le cercle proche.
>
> Version : 1.0

---

## Contexte de départ

Le refactor d'audit est terminé (voir `v1.0.2-cleanup-final`). Le code est propre, zéro dette technique visible, zéro erreur TypeScript, base Supabase alignée avec le code. Les features existantes :
- Auth OAuth Discord/Google + Email
- Onboarding 6 étapes
- Matches LFG (créer, rejoindre, ready/launch/leave/kick/cancel/complete)
- Realtime sur match detail et active match
- Teams (création, invitations, management)
- Push notifications (2 Edge Functions déployées)
- Profil joueur avec avatar, rank, agent, settings

Ce qui manque pour atteindre la vision du North Star :
- Synchronisation automatique des données Valorant depuis valorant-api.com
- Moteur de règles Valorant (party size, rank disparity, restrictions Immortal, etc.)
- Gestion des rank resets automatique
- Matching bidirectionnel (feed solo cherche groupes, pas seulement groupes cherchent solos)
- Système de rôles dans le matching (optionnel, non bloquant)
- Système d'amis basique (futur socle réseau social)
- Feature payante v1 (Scrim+ avec boost de visibilité)
- Enregistrement produit auprès de Riot Games
- Préparation au lancement (App Store, Google Play, landing page)
- Application de la charte graphique complète (définie dans `docs/design-system.md`)

## Principes de travail

- **Time-boxing strict** : chaque jalon a une durée cible. Si on dépasse de 50%, on coupe le périmètre.
- **Un jalon = une session Claude Code avec Superpowers** : brainstorming → writing-plans → subagent-driven-development → commit → merge sur master.
- **Tests manuels obligatoires** entre chaque jalon sur les flows touchés.
- **Feedback DRAVA continu** : à partir du jalon 3, chaque jalon terminé est testé par au moins un mate DRAVA avant passage au suivant.
- **Pas de perfectionnisme** : mieux vaut une feature livrée en 80% et testée qu'une feature parfaite jamais livrée.

## Mois 1 — Fondations Valorant (avril)

**Objectif mois** : mettre en place l'infrastructure qui permettra à Scrim de respecter strictement les règles Valorant et de se synchroniser automatiquement avec l'état du jeu.

### Jalon 1.1 — Synchronisation valorant-api.com (semaine 1)
Créer l'Edge Function Supabase qui synchronise quotidiennement les données du jeu depuis valorant-api.com. Tables concernées : `valorant_agents`, `valorant_maps`, `valorant_game_modes`, `valorant_seasons`, `valorant_acts`.

**Livrables** :
- Migration Supabase pour créer les 5 tables de données Valorant synchronisées
- Edge Function `sync-valorant-data` qui appelle valorant-api.com et met à jour les tables
- Cron Supabase configuré pour exécution quotidienne à 3h du matin UTC
- Logs détaillés des changements détectés à chaque sync
- Fallback gracieux si valorant-api.com est indisponible
- Premier sync manuel pour peupler les tables
- Suppression du hardcode actuel de `lib/game-assets.ts` au profit des lectures DB
- Tests manuels de la sync

### Jalon 1.2 — Moteur de règles Valorant (semaine 2)
Implémenter le module métier qui encapsule toutes les règles officielles Valorant applicables à Scrim. Ce module est indépendant du reste du code et entièrement testé unitairement.

**Livrables** :
- Fichier `lib/valorant-rules.ts` avec les fonctions pures :
  - `isValidPartySize(gameMode, partySize)` — retourne true/false (4-stack interdit en ranked, etc.)
  - `getAllowedRankRange(lowestRank, partySize)` — retourne la fenêtre de ranks autorisée pour un duo/trio
  - `isTrioAllowed(highestRank)` — retourne false si Immortal ou Radiant
  - `getRRPenalty(ranksInParty)` — retourne le pourcentage de pénalité pour un 5-stack
  - `canUnrankedJoin(match)` — retourne true/false pour les joueurs non-rankés
- Tests unitaires exhaustifs (au moins 30 cas couvrant les règles documentées dans `docs/valorant-rules.md`)
- Documentation inline de chaque fonction avec référence à la source Riot
- Zéro dépendance au reste du code (pur, testable, réutilisable)

### Jalon 1.3 — Gestion des rank resets (semaine 3)
Implémenter la détection automatique des débuts de Season et le reset automatique du `current_rank` des utilisateurs vers `unranked`, tout en conservant l'historique du rank précédent.

**Livrables** :
- Migration Supabase pour ajouter `previous_rank_before_reset` et `last_rank_reset_at` sur `profiles`
- Edge Function `handle-rank-reset` qui détecte les débuts de nouvelle Season via la table `valorant_seasons` et déclenche le reset
- Logique : quand une nouvelle Season commence, le `current_rank` de tous les utilisateurs passe à `unranked` et le rank précédent est stocké dans `previous_rank_before_reset`
- Notification push envoyée à tous les utilisateurs : "Nouvelle Season Valorant ! Fais tes games de placement et mets ton rank à jour dans Scrim."
- UI du profil utilisateur qui affiche "Rank actuel : Unranked (dernier rank : Ascendant 2)"
- UI d'incitation dans le Home pour les utilisateurs avec rank unranked post-reset
- Tests manuels simulés du flow de reset

### Jalon 1.4 — Enregistrement Riot Developer Portal (semaine 3, en parallèle)
Créer le compte Riot Developer, lire l'intégralité des policies, enregistrer Scrim en statut "en développement", rejoindre le Discord Dev. Action administrative, pas technique.

**Livrables** :
- Compte Dev Portal créé
- Produit Scrim enregistré avec description conforme au positionnement "outil de coordination sociale"
- Accès Discord Dev Riot
- Document `docs/riot-policies.md` qui résume les policies applicables à Scrim

### Jalon 1.5 — Système de rôles optionnel dans le matching (semaine 4)
Ajouter le concept de rôle Valorant (Duelist, Controller, Sentinel, Initiator, Flex) comme critère **optionnel** de matching. Jamais bloquant, toujours activable en filtre.

**Livrables** :
- Migration Supabase pour ajouter `roles_wanted` (nullable, array) sur `matches` et `primary_role`, `secondary_roles` sur `profiles`
- UI de sélection de rôles dans CreateMatchModal (optionnel, skip possible)
- UI de sélection de rôles dans l'onboarding et le profil (optionnel)
- Filtre "Rôle manquant" dans le feed Home, activable/désactivable
- Logique de matching qui n'exclut JAMAIS un joueur basé sur le rôle si le critère n'est pas spécifié
- Tests manuels

### Jalon 1.6 — Application de la charte graphique dans le code (semaine 4, en fin de mois)
Implémenter le design system complet de Scrim (défini dans `docs/design-system.md`) dans le code existant. C'est le jalon qui transforme l'app "fonctionnelle mais sans identité visuelle propre" en l'app "fidèle à la charte Scrim".

**Livrables** :
- Fichier `lib/design-tokens.ts` qui centralise tous les tokens (couleurs, espacements, arrondis, durées d'animation, styles typographiques) selon les valeurs exactes documentées dans `docs/design-system.md`
- Migration du thème actuel vers le nouveau système de tokens (suppression de toutes les valeurs hardcodées dans les composants)
- Hook `useTheme()` qui expose les tokens adaptés au mode light/dark
- Installation et intégration d'Inter via `@expo-google-fonts/inter` (poids 400, 500, 600 uniquement)
- Migration d'Ionicons vers Lucide Icons via `lucide-react-native` (search + replace dans tous les composants)
- Création des composants de base réutilisables : `<Button>`, `<Input>`, `<Card>`, `<Tag>`, `<Modal>`, `<Text>` avec variants sémantiques
- Application du logo Scrim v1 : icône de l'app iOS/Android, splash screen, header de l'app
- Révision visuelle de tous les écrans existants (Home, Match detail, Profile, Teams, Onboarding) pour aligner avec le nouveau design system
- Tests manuels sur iPhone et Android pour vérifier la cohérence visuelle
- Validation que light mode et dark mode fonctionnent tous les deux correctement

**Durée estimée** : 1 semaine complète (fin avril / début mai). C'est un gros jalon parce qu'il touche quasiment tous les fichiers de l'app. Il est placé stratégiquement après les Jalons 1.1 à 1.5 pour que la base Valorant (sync, règles, resets, rôles) soit déjà en place avant qu'on touche au visuel.

## Mois 2 — Matching bidirectionnel et monétisation (mai)

**Objectif mois** : compléter le modèle de matching pour servir la symétrie des rôles définie dans le North Star, implémenter Scrim+ pour couvrir les frais d'infra, polir l'UX partout où c'est nécessaire.

### Jalon 2.1 — Feed bidirectionnel (semaine 1-2)
Transformer le Home d'un simple "liste de matches ouverts" à un feed qui montre aussi "joueurs solo en recherche". Deux onglets : **Matches ouverts** (groupes qui cherchent) et **Joueurs disponibles** (solos qui cherchent).

**Livrables** :
- Nouvelle table `player_looking_for_group` ou équivalent
- Edge Function ou logique Supabase pour publier/dépublier un "statut de recherche"
- Nouvel onglet sur le Home avec la liste des joueurs disponibles
- Action "Inviter ce joueur" depuis un match en cours
- Respect strict du moteur de règles Valorant pour déterminer quels joueurs peuvent rejoindre quels matches
- Tests manuels bidirectionnels

### Jalon 2.2 — Système d'amis basique (semaine 2)
Premier germe du futur réseau social. Capacité à ajouter un joueur en ami après un match, voir la liste de ses amis, voir qui est en ligne. Pas de chat, pas de feed d'activité. Juste le graphe d'amis.

**Livrables** :
- Table `friendships` avec états pending/accepted/blocked
- UI d'ajout d'ami depuis le profil d'un autre joueur
- Écran "Mes amis" avec statut en ligne
- Notifications push pour les demandes d'ami acceptées
- Tests manuels

### Jalon 2.3 — Scrim+ : abonnement et feature Boost (semaine 3)
Implémentation de l'abonnement mensuel Scrim+ avec la feature de boost de visibilité. Prix cible : 2,99€/mois. Facturation via In-App Purchase (Apple StoreKit et Google Play Billing).

**Livrables** :
- Configuration des produits d'abonnement sur App Store Connect et Google Play Console
- Intégration de la lib `react-native-iap` ou équivalent Expo
- Table `subscriptions` avec statut actif/expiré
- Flag `boosted_until` sur les matches
- Tri du feed Home qui place les matches boostés en premier
- Notifications push prioritaires pour les matches boostés
- UI d'abonnement avec claim des bénéfices
- Tests manuels du flow de paiement

### Jalon 2.4 — Landing page marketing (semaine 3, en parallèle)
Une simple page web pour présenter Scrim, donner envie de tester, collecter des adresses email pour la bêta. Hébergée sur Vercel, gratuite.

**Livrables** :
- Page web one-pager en français
- Screenshots ou mockups de l'app
- Formulaire d'inscription bêta (Supabase ou service externe simple)
- Lien vers Discord communautaire Scrim (créer un Discord Scrim minimal)
- Domaine dédié (scrim.app ou similaire si dispo)

### Jalon 2.5 — Polish UX critique (semaine 4)
Identifier et corriger les 10-15 irritants UX qui feront fuir les testeurs bêta. Exemples probables : loading states manquants, erreurs mal affichées, petites incohérences visuelles, bugs de realtime rare, onboarding trop long.

**Livrables** :
- Audit UX complet de l'app sur iPhone et Android (1 journée dédiée)
- Liste priorisée des problèmes
- Corrections des 10-15 plus critiques
- Pédagogie intégrée des règles Valorant (tooltips et messages contextuels dans CreateMatchModal)
- Tests manuels finaux

## Mois 3 — Lancement bêta privée (juin)

**Objectif mois** : publier Scrim en bêta privée sur TestFlight et Google Play Internal Testing, recruter les 20-50 premiers testeurs, collecter le feedback et itérer.

### Jalon 3.1 — Publication TestFlight et Google Play Internal (semaine 1-2)
Configuration complète des comptes développeur Apple et Google, premières builds soumises en revue, acceptation des builds, distribution aux testeurs.

**Livrables** :
- Apple Developer Account actif (99$/an)
- Google Play Developer Account actif (25$ one-time)
- Build iOS soumise sur TestFlight et approuvée
- Build Android soumise sur Google Play Internal Testing et approuvée
- Description store, screenshots, privacy policy, terms of service
- Lien TestFlight et lien Google Play partageables

### Jalon 3.2 — Recrutement des 20-50 premiers testeurs (semaine 1-3, en parallèle)
Recrutement progressif des bêta testeurs. Commence par DRAVA, étend au cercle proche, puis aux connaissances via Discord VALORANT FR.

**Livrables** :
- Message de présentation propre à envoyer aux testeurs
- Formulaire de feedback intégré à l'app ou externe (Typeform gratuit)
- Discord bêta Scrim avec canal dédié aux testeurs
- Liste cible de 30-50 contacts à solliciter

### Jalon 3.3 — Collecte feedback et itérations rapides (semaine 2-4)
Écoute active, corrections rapides, discussion avec les testeurs. L'objectif n'est pas de construire de nouvelles features, c'est d'améliorer ce qui existe sur base des retours réels.

**Livrables** :
- Session feedback hebdomadaire avec les testeurs (30 min par semaine minimum)
- Bug fixes prioritaires livrés dans les 48h
- Mini-améliorations UX livrées en continu
- Rapport de fin de trimestre sur ce qui a marché, ce qui a raté, et les orientations pour le trimestre suivant

### Jalon 3.4 — Premier contact officiel avec Riot Developer Relations (fin du mois)
Envoi d'un message détaillé à Riot Dev Rel présentant Scrim avec un lien TestFlight fonctionnel, des screenshots, le positionnement clair "outil de coordination sociale, pas matchmaking", et la demande officielle de production key pour démarrer l'intégration RSO.

**Livrables** :
- Message officiel envoyé via le Developer Portal
- Captures d'écran et vidéo de démonstration préparées
- Positionnement défendu avec les arguments du North Star
- Réponse attendue sous 2-3 semaines (reportée au trimestre suivant)

## Métriques de suivi du trimestre

À la fin du trimestre, je dois être capable de répondre "oui" à ces questions :

- [ ] Scrim est-il publié sur TestFlight et Google Play Internal Testing ?
- [ ] Les données Valorant sont-elles synchronisées automatiquement depuis valorant-api.com ?
- [ ] Le moteur de règles Valorant bloque-t-il la création de matches invalides ?
- [ ] Le reset automatique des ranks fonctionne-t-il à chaque nouvelle Season ?
- [ ] Au moins 20 personnes ont-elles installé et utilisé Scrim au moins une fois ?
- [ ] Au moins 5 matches ont-ils été créés ET complétés via Scrim ?
- [ ] Au moins 1 personne (hors moi) a-t-elle utilisé Scrim deux semaines de suite ?
- [ ] Au moins 1 retour utilisateur m'a-t-il fait modifier une feature ?
- [ ] Scrim+ est-il implémenté et fonctionnel, même si personne ne l'a encore acheté ?
- [ ] Le compte Riot Developer est-il actif et le produit enregistré ?
- [ ] La landing page est-elle en ligne avec un lien vers la bêta ?
- [ ] Au moins 1 personne (hors moi) sait-elle que Scrim existe et me donne son avis régulièrement ?
- [ ] La charte graphique Scrim est-elle implémentée dans le code et visible sur tous les écrans ?
Si la réponse à la plupart est "oui", le trimestre est un succès. Pas besoin de 10 000 utilisateurs dès le début.

## Hors scope pour ce trimestre (à ne PAS faire)

Pour rester focus, je liste explicitement ce que je ne ferai PAS dans les 3 prochains mois, même si l'envie me prend :

- Intégration Riot API RSO complète (reporté au trimestre suivant après réponse Riot)
- Chat in-app complet (version basique seulement)
- Tournois communautaires
- Support CS2 ou autre jeu
- Features de streaming/Twitch
- Leaderboards compétitifs
- Système de réputation post-match complexe
- Refonte visuelle majeure
- Mode "coach" ou "mentor"
- Clans/guildes étendus au-delà du système "teams" existant

Toute idée qui me vient et qui touche à cette liste va directement dans `TODO.md` pour plus tard.