# Scrim — Roadmap trimestre 2 2026 (avril à juin)

> La roadmap concrète des 3 prochains mois pour amener Scrim à une v1 lançable en bêta privée.
> Ce document complète le `north-star.md` et se met à jour chaque semaine.
>
> Date de démarrage : avril 2026
> Objectif fin de trimestre : v1 publiable sur TestFlight et Google Play Internal Testing, testée par 20-50 joueurs recrutés via DRAVA et le cercle proche.

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
- UX de matching bidirectionnelle (feed solo cherche groupes, pas seulement groupes cherchent solos)
- Système de rôles (Duelist, Controller, Sentinel, Initiator) dans le matching
- Système d'amis basique (futur socle réseau social)
- Feature payante v1 (Scrim+ avec boost de visibilité)
- Enregistrement produit auprès de Riot Games
- Préparation au lancement (App Store, Google Play, landing page)

## Principes de travail

- **Time-boxing strict** : chaque jalon a une durée cible. Si on dépasse de 50%, on coupe le périmètre.
- **Un jalon = une session Claude Code avec Superpowers** : brainstorming → writing-plans → subagent-driven-development → commit → merge sur master.
- **Tests manuels obligatoires** entre chaque jalon sur les flows touchés.
- **Feedback DRAVA continu** : à partir du jalon 3, chaque jalon terminé est testé par au moins un mate DRAVA avant passage au suivant.
- **Pas de perfectionnisme** : mieux vaut une feature livrée en 80% et testée qu'une feature perfaite jamais livrée.

## Mois 1 — Fondations du matching bidirectionnel (avril)

**Objectif mois** : compléter le modèle de matching pour servir la symétrie des rôles définie dans le North Star, et préparer le lancement technique.

### Jalon 1.1 — Système de rôles dans le matching (semaine 1)
Ajouter le concept de rôle Valorant (Duelist, Controller, Sentinel, Initiator, Flex) aux matches et aux profils. Permettre à un match de spécifier "on cherche 1 Sentinel et 1 Controller". Permettre à un profil de déclarer ses rôles principaux et secondaires. Filtrer les matches dans le feed Home selon les rôles recherchés.

**Livrables** :
- Migration Supabase pour ajouter `roles_needed` sur `matches` et `primary_role`, `secondary_roles` sur `profiles`
- UI de sélection de rôles dans CreateMatchModal
- UI de sélection de rôles dans l'onboarding et le profil
- Filtrage du feed Home par compatibilité de rôles
- Tests manuels

### Jalon 1.2 — Feed bidirectionnel (semaine 2)
Transformer le Home d'un simple "liste de matches ouverts" à un feed qui montre aussi "joueurs solo en recherche". Le feed a deux onglets : **Matches ouverts** (groupes qui cherchent) et **Joueurs disponibles** (solos qui cherchent).

**Livrables** :
- Nouvelle table `player_looking_for_group` ou équivalent
- Edge Function ou logique Supabase pour publier/dépublier un "statut de recherche"
- Nouvel onglet sur le Home avec la liste des joueurs disponibles
- Action "Inviter ce joueur" depuis un match en cours
- Tests manuels bidirectionnels

### Jalon 1.3 — Enregistrement Riot Developer Portal (semaine 2, en parallèle)
Créer le compte Riot Developer, lire l'intégralité des policies, enregistrer Scrim en statut "en développement", rejoindre le Discord Dev. **Action administrative, pas technique.**

**Livrables** :
- Compte Dev Portal créé
- Produit Scrim enregistré avec description conforme au positionnement "outil de coordination sociale"
- Accès Discord Dev Riot
- Document interne listant les policies applicables à Scrim (à mettre dans `docs/riot-policies.md`)

### Jalon 1.4 — Système d'amis basique (semaine 3-4)
Premier germe du futur réseau social. Capacité à ajouter un joueur en ami après un match, voir la liste de ses amis, voir qui est en ligne. Pas de chat, pas de feed d'activité. Juste le graphe d'amis.

**Livrables** :
- Table `friendships` avec états pending/accepted/blocked
- UI d'ajout d'ami depuis le profil d'un autre joueur
- Écran "Mes amis" avec statut en ligne
- Notifications push pour les demandes d'ami acceptées
- Tests manuels

## Mois 2 — Monétisation et polish (mai)

**Objectif mois** : implémenter Scrim+ pour couvrir les frais d'infra, polir l'UX partout où c'est nécessaire, préparer les assets de lancement.

### Jalon 2.1 — Scrim+ : abonnement et feature Boost (semaine 1-2)
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

### Jalon 2.2 — Landing page marketing (semaine 2-3, en parallèle)
Une simple page web pour présenter Scrim, donner envie de tester, collecter des adresses email pour la bêta. Hébergée sur Vercel, gratuite.

**Livrables** :
- Page web one-pager en français/anglais (ou juste français pour commencer)
- Screenshots ou mockups de l'app
- Formulaire d'inscription bêta (Supabase ou service externe simple)
- Lien vers Discord communautaire Scrim (créer un Discord Scrim minimal)
- Domaine dédié (scrim.app ou similaire si dispo)

### Jalon 2.3 — Polish UX critique (semaine 3-4)
Identifier et corriger les 10-15 irritants UX qui feront fuir les testeurs bêta. Exemples probables : loading states manquants, erreurs mal affichées, petites incohérences visuelles, bugs de realtime rare, onboarding trop long.

**Livrables** :
- Audit UX complet de l'app sur iPhone et Android (1 journée dédiée)
- Liste priorisée des problèmes
- Corrections des 10-15 plus critiques
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
- [ ] Au moins 20 personnes ont-elles installé et utilisé Scrim au moins une fois ?
- [ ] Au moins 5 matches ont-ils été créés ET complétés via Scrim ?
- [ ] Au moins 1 personne (hors moi) a-t-elle utilisé Scrim deux semaines de suite ?
- [ ] Au moins 1 retour utilisateur m'a-t-il fait modifier une feature ?
- [ ] Scrim+ est-il implémenté et fonctionnel, même si personne ne l'a encore acheté ?
- [ ] Le compte Riot Developer est-il actif et le produit enregistré ?
- [ ] La landing page est-elle en ligne avec un lien vers la bêta ?
- [ ] Au moins 1 personne (hors moi) sait-elle que Scrim existe et me donne son avis régulièrement ?

Si la réponse à la plupart est "oui", le trimestre est un succès. Pas besoin de 10 000 utilisateurs dès le début.

## Hors scope pour ce trimestre (à ne PAS faire)

Pour rester focus, je liste explicitement ce que je ne ferai PAS dans les 3 prochains mois, même si l'envie me prend :

- Intégration Riot API (reporté au trimestre suivant après réponse Riot)
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