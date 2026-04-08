# Règles officielles Valorant applicables à Scrim

> Document de référence sur les règles Valorant que Scrim doit respecter.
> Ce fichier est la source de vérité pour le module `lib/valorant-rules.ts`.
>
> Dernière vérification : avril 2026 (Season V26 Act 2)
> Version : 1.0

---

## Comment ce document est maintenu

Les règles listées ici proviennent de la documentation officielle Riot Games et de sources corroborantes à jour. Les données du jeu (agents, maps, modes, seasons, acts) sont synchronisées automatiquement depuis valorant-api.com via l'Edge Function `sync-valorant-data`. Les **règles métier** (party size, rank disparity, restrictions Immortal) ne sont pas dans une API, elles changent rarement et sont maintenues manuellement.

**Veille manuelle obligatoire** à chaque patch Valorant majeur :
1. Lire les patch notes officiels sur le blog Valorant
2. Vérifier les FAQ compétitives sur support-valorant.riotgames.com
3. Comparer avec les règles listées ici
4. Mettre à jour ce document ET le module `lib/valorant-rules.ts` si besoin
5. Bumper la date de dernière vérification en haut du document

Les sources principales à surveiller :
- https://support-valorant.riotgames.com/hc/en-us/articles/360047937633-VALORANT-Competitive-Mode-FAQ (doc officielle)
- https://playvalorant.com/fr-fr/news/game-updates/ (patch notes)
- https://developer.riotgames.com/docs/valorant (policies dev)

---

## 1. Structure des ranks

Valorant compte **9 ranks** principaux :

1. Iron (Fer)
2. Bronze
3. Silver (Argent)
4. Gold (Or)
5. Platinum (Platine)
6. Diamond (Diamant)
7. Ascendant
8. Immortal (Immortel)
9. Radiant

À l'exception de **Radiant**, chaque rank a **3 tiers** (1, 2, 3), où 3 est le plus élevé. Radiant n'a pas de tiers et est réservé au top 500 joueurs par région.

**Total : 25 tiers + Unranked = 26 statuts de rank possibles**.

Le statut Unranked correspond aux joueurs qui n'ont pas encore complété leurs 5 games de placement dans la Season en cours.

## 2. Structure saisonnière

Depuis 2025 (patch v10.00), Valorant a abandonné la structure "Episodes" au profit des **Seasons**.

- **Une Season dure un an** (par exemple V25 = année 2025, V26 = année 2026)
- **Chaque Season contient 6 Acts**
- **Chaque Act dure environ 2 mois**
- **Les ranks sont reset 2 fois par an** : une fois au début de chaque Season (janvier), et une fois en mid-Season (vers juillet)
- **Les placements** : 5 games au début de chaque nouvelle Season, 1 game au début de chaque nouvel Act
- **Les badges d'Act Rank** se figent à la fin de chaque Act (pas de reset, juste un snapshot de la meilleure performance)

**Important pour Scrim** : le `current_rank` des utilisateurs doit être reset à `unranked` uniquement lors des rank resets (2 fois par an), PAS à chaque nouvel Act. L'Edge Function `handle-rank-reset` détecte le début d'une nouvelle Season via la synchronisation valorant-api.com et déclenche le reset automatique.

## 3. Règles de party size en mode Compétitif

### Règle absolue : les 4-stacks sont interdits en ranked

> Source : https://support-valorant.riotgames.com/hc/en-us/articles/360047937633

Il est impossible de créer un match ranked Valorant avec exactement 4 joueurs. Riot a désactivé cette option parce que le 5ème joueur solo se retrouvait souvent harcelé par le groupe de 4.

**Combinaisons valides en ranked** :
- Solo (1 joueur qui queue seul)
- Duo (2 joueurs)
- Trio (3 joueurs, sauf exception Immortal+)
- 5-stack (5 joueurs)

**Combinaisons invalides en ranked** :
- 4-stack (interdit à tous les ranks)

**Impact Scrim** : un groupe de 3 joueurs qui cherche à compléter son lobby ranked doit chercher **2 joueurs d'un coup**, pas 1 puis 1. L'app ne permet JAMAIS la création d'un match ranked qui aboutirait à un groupe de 4. Cette règle ne s'applique pas aux modes non-ranked (Unrated, Swiftplay, Deathmatch, Spike Rush, custom).

### Règle : les trios sont interdits à partir d'Immortal

À partir du rank **Immortal 1**, les joueurs ne peuvent queue en Compétitif que **seul, en duo, ou en 5-stack**. Les parties de 3 sont interdites pour Immortal et Radiant. Cette règle existe pour prévenir le smurfing et le boosting.

**Combinaisons valides pour un joueur Immortal ou Radiant** :
- Solo
- Duo (avec joueur Immortal à Radiant)
- 5-stack (flexible)

**Impact Scrim** : quand un joueur Immortal ou Radiant crée un match ranked, l'option "trio" doit être grisée dans l'UI avec un message pédagogique : "Les parties de 3 joueurs sont interdites à Immortal et Radiant selon les règles Valorant. Choisis solo, duo, ou 5-stack."

### Règle : restrictions de rank disparity pour duos et trios

Pour les parties de 2 ou 3 joueurs, Valorant impose des restrictions sur l'écart de rank autorisé. La règle dépend du rank **le plus bas** dans le groupe :

| Rank le plus bas | Rank le plus haut autorisé |
|---|---|
| Iron (tous tiers) | Jusqu'à Silver 3 |
| Bronze (tous tiers) | Jusqu'à Silver 3 |
| Silver (tous tiers) | Jusqu'à Gold 3 |
| Gold (tous tiers) | Jusqu'à Platinum 3 |
| Platinum 1 | Diamond 1 maximum |
| Platinum 2 | Diamond 2 maximum |
| Platinum 3 | Diamond 3 maximum |
| Diamond 1 | Ascendant 1 maximum |
| Diamond 2 | Ascendant 2 maximum |
| Diamond 3 | Ascendant 3 maximum |
| Ascendant 1 | Immortal 1 maximum |
| Ascendant 2 | Immortal 2 maximum |
| Ascendant 3 | Immortal 3 maximum |
| Immortal 1 | Radiant maximum |
| Immortal 2 | Radiant maximum |
| Immortal 3 | Radiant maximum |
| Radiant | Radiant uniquement |

**Règle synthétisée** :
- Iron à Gold : écart autorisé d'environ 1 rank complet au-dessus
- Platinum et au-dessus : écart autorisé de **1 tier exact** au-dessus seulement

**Impact Scrim** : quand un joueur crée un match ranked en mode duo ou trio, l'app calcule automatiquement la fenêtre de rank autorisée et filtre le feed des joueurs disponibles selon cette fenêtre. Les joueurs hors fenêtre ne voient pas le match dans leur feed et ne peuvent pas le rejoindre. Message pédagogique dans l'UI : "Ton groupe de 3 peut accueillir des joueurs entre [X] et [Y] en ranked."

### Règle : pas de restriction pour les 5-stacks, mais pénalités RR

Les parties de 5 joueurs (5-stacks) ignorent les restrictions de rank disparity. Cependant, si l'écart de rank dans le groupe est trop grand, des **pénalités RR** s'appliquent sur les gains (pas sur les pertes).

**Règles de pénalité 5-stack** :

| Condition | Pénalité RR |
|---|---|
| Tous les joueurs Iron à Diamond 2, dans une fenêtre de 3 ranks | 0% (pas de pénalité) |
| Un ou plusieurs joueurs hors de la fenêtre de 3 ranks | -25% |
| Un ou plusieurs joueurs Diamond 3 à Immortal 3 | -25% (quelle que soit la disparity) |
| Un ou plusieurs joueurs Radiant | -75% |
| Tous les joueurs Radiant | -75% (réduction de la pénalité standard) |

**Important** : les pénalités RR s'appliquent uniquement aux **gains**. Si tu perds un match, tu perds le RR normal, pas réduit.

**Impact Scrim** : pour les 5-stacks, l'app n'empêche JAMAIS la création d'un match (c'est légal dans Valorant), mais affiche un **badge de pénalité RR visible** sur la carte du match et dans le feed. Exemples :
- Badge "⚠️ Pénalité -25% RR" si l'écart de rank est trop grand
- Badge "⚠️ Pénalité -75% RR" si un Radiant est présent
- Aucun badge si le 5-stack est conforme

## 4. Joueurs Unranked

Les joueurs qui n'ont pas encore complété leurs 5 games de placement sont considérés **Unranked**.

**Règles pour les Unranked** :
- Peuvent queue avec des joueurs Iron à **Gold** uniquement (pas Platinum ni au-dessus)
- Une fois les 5 placements faits, les règles normales s'appliquent

**Impact Scrim** : un utilisateur Scrim avec `current_rank = unranked` ne peut rejoindre que des matches ranked dont tous les joueurs sont Gold 3 ou moins. Le feed Home filtre automatiquement les matches trop hauts.

## 5. Niveau de compte minimum

Pour débloquer le mode Compétitif dans Valorant, un joueur doit atteindre le **niveau de compte 20**. C'est une règle Riot qui existe pour filtrer les nouveaux comptes et les smurfs.

**Impact Scrim** : optionnellement, l'onboarding peut demander "Ton compte Valorant est-il level 20+ ?". Si non, l'app propose à l'utilisateur de se concentrer sur les modes non-ranked (Unrated, Spike Rush, Swiftplay, Deathmatch). Les utilisateurs level <20 ne devraient pas voir de matches Compétitif dans leur feed.

## 6. Pénalités comportementales

Valorant applique des pénalités RR pour les comportements indésirables en Compétitif :
- **Dodge** (quitter le lobby avant le début du match) : -6 RR, croissant si récidive
- **AFK** (absence pendant 3+ rounds) : -8 à -12 RR, croissant

**Impact Scrim** : pas de conséquence directe sur la v1. Mais c'est une info à garder en tête pour la v2+ où un système de réputation Scrim pourrait flagger les joueurs qui ne show up pas aux matches organisés via l'app. Pas une priorité actuelle.

## 7. MFA obligatoire pour Ascendant+

Depuis 2024-2025, Riot impose la **Multi-Factor Authentication** via Riot Mobile pour tous les joueurs Ascendant et au-dessus dans les régions NA, LATAM, BR, KR, et pour les comptes EU détectés pour sharing.

**Impact Scrim** : aucun direct en v1. Mais quand l'intégration Riot API RSO sera mise en place (Phase B), les utilisateurs Ascendant+ devront avoir leur MFA activée pour se connecter via RSO. À documenter dans l'onboarding au moment de cette intégration.

## 8. Modes de jeu disponibles

La liste officielle des modes de jeu Valorant est synchronisée automatiquement depuis valorant-api.com dans la table `valorant_game_modes`. Les règles de party ranked listées ci-dessus s'appliquent uniquement au mode **Compétitif**.

**Modes avec règles strictes (Compétitif)** :
- Competitive (ranked classique)
- Premier (compétitif par teams)

**Modes avec règles souples (tous les autres)** :
- Unrated
- Swiftplay
- Spike Rush
- Deathmatch
- Escalation
- Replication
- Team Deathmatch
- Snowball Fight (saisonnier)
- Custom Game

Pour tous les modes non-Compétitif, les règles de party size, rank disparity et restrictions Immortal **ne s'appliquent pas**. Scrim peut permettre n'importe quelle composition pour ces modes.

## 9. Map pool actuel

Le map pool compétitif est synchronisé automatiquement depuis valorant-api.com. Il change à chaque Act environ. L'historique des rotations est conservé dans la table `valorant_maps` avec un flag `active_in_current_pool`.

**Impact Scrim** : quand un joueur crée un match Compétitif, il peut choisir une map dans le pool actif actuel. Les maps hors pool sont disponibles uniquement en mode custom.

## 10. Rôles et agents

Valorant classifie ses agents en **4 rôles** :
- **Duelist** (entry fragger, agressif)
- **Controller** (gestion de la map via smokes et utilitaires)
- **Sentinel** (défense et anchor)
- **Initiator** (ouverture de sites via recon)

**Scrim permet un 5ème rôle virtuel** : **Flex** (le joueur joue plusieurs rôles selon les besoins).

Les agents et leurs rôles sont synchronisés automatiquement depuis valorant-api.com. Quand un nouvel agent sort (comme Miks récemment), il apparaît automatiquement dans Scrim sans nécessiter de build.

**Impact Scrim** : le rôle est un critère **optionnel** dans le matching. Un joueur peut déclarer son rôle principal et ses rôles secondaires sur son profil, et un match peut spécifier quels rôles sont recherchés. Mais ces critères ne sont JAMAIS bloquants dans le matching. Un joueur peut rejoindre un match même si son rôle ne correspond pas exactement à ce qui est demandé, parce que la majorité des joueurs compétitifs sont flexibles sur leur rôle.

## 11. Glossaire

- **RR** : Rank Rating, la monnaie du classement. Tu gagnes du RR en gagnant, tu en perds en perdant. 100 RR = 1 tier.
- **MMR** : Matchmaking Rating, un score caché que Valorant utilise pour équilibrer les matches. Différent du RR visible.
- **Smurf** : joueur de haut niveau qui joue sur un compte de bas niveau pour dominer des joueurs plus faibles. Interdit par Valorant.
- **Boosting** : joueur de haut niveau qui aide un joueur de bas niveau à monter son rank de façon illégitime. Interdit par Valorant.
- **5-stack** : un groupe de 5 joueurs qui queue ensemble.
- **Act Rank** : le plus haut rank atteint par un joueur durant un Act. Se fige à la fin de l'Act et devient un badge permanent.

## Changelog

- **2026-04-08** : Création initiale du document. Vérification basée sur les sources Riot officielles et les sources corroborantes à jour (support-valorant.riotgames.com, valorant.fandom.com, dot esports, thunderpick, esportstales). Season en cours : V26 Act 2.