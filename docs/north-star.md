# Scrim — North Star

> La vision long terme de Scrim, les décisions fondatrices, et les garde-fous.
> Ce document est ma boussole. Je le relis quand je doute, je le mets à jour quand la réalité change.
>
> Dernière mise à jour : avril 2026
> Version : 1.0

---

## 1. La vision en une phrase

Scrim est le futur **réseau social mobile de la communauté Valorant mondiale**, dont la fonctionnalité fondatrice est de permettre à n'importe quel joueur, de tout rank et pour tout mode de jeu, de trouver les coéquipiers dont il a besoin pour compléter son lobby, sans jamais quitter l'application.

## 2. Pourquoi ce projet existe

Je suis joueur Valorant compétitif (Ascendant-Immortal) dans une équipe esport amateur, la DRAVA Esport. Je vis tous les jours le problème que Scrim résout : trouver les bons coéquipiers est long, fastidieux, et passe par des outils merdiques (serveurs Discord textuels, sites vieillots, bots qui ne parlent pas la langue du jeu).

PRACC domine le segment scrims team vs team mais son expérience mobile est mauvaise. Gankster et GamerLink s'attaquent au segment LFG solo mais avec une UX inadaptée (Tinder-like pour duos seulement, ou multi-jeux donc générique). Le segment "groupe de joueurs cherche ses derniers joueurs manquants" est mal servi, et c'est précisément ma cible.

Je construis Scrim parce que j'ai la combinaison rare de compétences techniques (fullstack mobile) et de connaissance intime du problème (joueur compétitif quotidien). C'est un avantage "founder-market fit" qui ne se retrouve pas chez les concurrents.

## 3. L'utilisateur cible

**Utilisateur principal** : n'importe quel joueur Valorant, du Iron au Radiant, qui veut trouver des coéquipiers pour jouer. Tous les modes de jeu sont couverts, du Compétitif ranked au Deathmatch en passant par Unrated, Spike Rush, Swiftplay, Premier et les modes custom.

**Le principe de symétrie des rôles** : tout utilisateur peut alterner entre trois états, sans friction :
1. **Au repos** — il navigue dans l'app, consulte son profil, discute avec ses amis
2. **En recherche groupe→solos** — il fait partie d'un groupe de 2, 3 ou 5 et ils cherchent ensemble les joueurs manquants
3. **En recherche solo→groupes** — il est seul (ou en duo) et il cherche un groupe qui a besoin de lui

Il n'y a pas deux audiences à acquérir, il y en a une seule. Chacun joue les deux rôles selon son besoin du moment. Cette symétrie est la base de toute l'UX et de la scalabilité du produit.

## 4. La killer feature (gratuite à 100%, non négociable)

Permettre à un groupe de 2, 3 ou 5 joueurs Valorant de trouver les joueurs manquants pour compléter leur lobby, avec :

- **Matching multi-critères adapté au mode de jeu** : rank, serveur, langue parlée, mode de jeu choisi. Les critères sont resserrés pour le ranked, relâchés pour les modes casual.
- **Respect strict des règles officielles Valorant** : l'app ne permet pas de créer des matches qui seraient invalides dans le jeu (pas de 4-stack en ranked, pas de trio en Immortal+, respect des restrictions de rank disparity pour duos et trios). Toutes les règles sont documentées dans `docs/valorant-rules.md`.
- **Critères secondaires optionnels** : rôle préféré (Duelist, Controller, Sentinel, Initiator, Flex) et agent principal. Ces critères sont activables comme filtres mais ne sont jamais bloquants dans le matching, parce que la majorité des joueurs sont flexibles sur leur rôle.
- **Partage du code de custom game dans l'app** : zéro sortie vers Discord pour récupérer un code, tout se passe dans Scrim.
- **Realtime** : les joueurs voient en direct quand le lobby se remplit, quand quelqu'un est prêt, quand le match démarre.
- **Notifications push** : quand un joueur solo correspond aux critères d'un groupe qui cherche, il est notifié. Quand un lobby se complète, tout le monde est prévenu.
- **Pédagogie des règles Valorant** : quand un joueur crée ou rejoint un match, l'app lui explique en temps réel les contraintes qui s'appliquent (ex : "Tu es Immortal 2, le mode trio est indisponible en ranked selon les règles Valorant" ou "Ton match 5-stack subira une pénalité de 25% RR à cause de l'écart de rank").

Cette feature est gratuite à 100%, à vie, pour tous les utilisateurs. Toute tentative de la rendre payante directement ou indirectement est une violation de ce document.

## 5. Les angles d'attaque contre les concurrents

| Concurrent | Leur faiblesse | Notre angle |
|---|---|---|
| **PRACC** | Produit web vieillot, app mobile bâclée | Mobile-first, UX moderne, native iOS/Android |
| **Gankster** | Tinder pour duos uniquement, onboarding trop lourd | Matching pour matches complets (2, 3 ou 5 joueurs), onboarding minimaliste |
| **GamerLink** | Multi-jeux donc générique (ranks vagues, pas les vrais agents) | Mono-jeu Valorant, vrais critères natifs du jeu, données synchronisées automatiquement |
| **Discord LFG** | Poubelle textuelle, pas de filtre, pas de profils | Matching algorithmique, profils crédibles, historique |
| **Valorant LFG Tracker** | Pas d'app mobile, pas de realtime | App mobile + realtime |

## 6. Ce que Scrim n'est PAS (garde-fous)

Pour éviter la dilution de la vision, voici ce que Scrim **ne fera jamais**, même sous la demande d'utilisateurs :

- **Scrim n'est pas un substitut au matchmaking Valorant.** Scrim aide les joueurs à se coordonner avant de lancer leur partie, mais Valorant reste la source de vérité pour le matchmaking des adversaires. Le vocabulaire "matchmaking" est banni de l'app et de la communication.
- **Scrim ne facture pas l'accès à la fonction de base.** La killer feature est gratuite à vie.
- **Scrim n'exclut aucun rank.** Iron, Bronze, Silver, Gold, Platine, Diamant, Ascendant, Immortal, Radiant et Unranked, tous sont traités avec le même soin.
- **Scrim n'est pas un outil B2B pour teams esport professionnelles.** Le segment cible est le joueur individuel, pas la team structurée. Les features "teams" qui existent dans l'app servent les groupes d'amis récurrents, pas les organisations esport.
- **Scrim n'intègre pas de features qui violent les policies Riot.** Pas de MMR/ELO alternatif, pas de boosting, pas de facturation du matchmaking, pas de substitut de queue.
- **Scrim ne permet jamais la création de matches invalides au regard des règles Valorant.** Un joueur Immortal ne peut pas créer un match trio ranked dans Scrim, parce qu'il ne pourrait pas le lancer dans le jeu. L'app est une extension du jeu, pas une alternative.
- **Scrim ne multiplie pas les jeux avant d'avoir dominé Valorant.** L'ambition multi-jeux est long terme. Dans les 12 premiers mois, c'est Valorant uniquement, point.

## 7. Le modèle économique

**Principe** : la killer feature est gratuite à vie, la monétisation vient de features périphériques qui ne touchent jamais au matching de base.

**Feature payante v1** : **Scrim+** (abonnement mensuel à prix très bas, cible 2-3€/mois).
Contenu de l'abonnement :
- Boost de visibilité sur tous les matches créés par l'utilisateur (ils remontent en haut du feed, apparaissent dans les notifications push ciblées)
- Badge visuel sur le profil
- Statistiques avancées sur les matches joués via Scrim
- Thèmes et avatars exclusifs

**Pourquoi un abonnement plutôt qu'un one-shot** : revenu récurrent prévisible (MRR), psychologie plus facile, alignement avec les modèles Spotify/Discord Nitro que les utilisateurs connaissent déjà.

**Pourquoi prix très bas** : l'objectif n'est pas la rentabilité directe, c'est de couvrir les frais d'infra. Avec 30-50 abonnés à 2-3€/mois, l'infra jusqu'à 20 000 utilisateurs est couverte. Ridicule.

**Features payantes futures (v2+)** : pass saisonniers, cosmétiques additionnels, features sociales premium. Jamais rien qui touche au matching ou à l'intégrité compétitive.

**Ce qu'on ne fait jamais** :
- Facturer pour accéder à des filtres de recherche
- Facturer pour avoir un meilleur matching
- Facturer l'accès à certains ranks ou modes
- Facturer l'accès aux notifications
- Ajouter de la publicité intrusive

## 8. Les données du jeu et l'automatisation

Scrim ne hardcode pas les données Valorant (agents, maps, modes de jeu, seasons, acts). À la place, une Edge Function Supabase synchronise quotidiennement ces données depuis l'API publique non-officielle **valorant-api.com**, qui est gratuite, ouverte, et maintenue depuis 2020.

**Ce qui est synchronisé automatiquement** :
- Liste des agents (nom, rôle, image, abilities)
- Liste des maps (nom, image, rotation compétitive)
- Liste des game modes
- Seasons (V25, V26, V27...) avec leurs dates
- Acts avec leurs dates de début et fin

**Ce qui n'est pas synchronisé et nécessite une veille manuelle** :
- Les règles de party ranked (disparity rules, restrictions Immortal, etc.)
- Les pénalités RR pour 5-stacks
- Les politiques Riot de third-party apps

Ces règles changent rarement (1-2 fois par an) et sont documentées manuellement dans `docs/valorant-rules.md`. À chaque patch majeur Valorant, une veille active est menée pour détecter les changements de règles.

**Gestion des rank resets** : Valorant reset les ranks 2 fois par an (début de Season et mid-Season). Quand Scrim détecte un reset via le sync automatique, il remet le `current_rank` de tous les utilisateurs à `unranked`, tout en conservant l'ancien rank dans un champ `previous_rank_before_reset` qui est affiché sur les profils utilisateur comme information historique. Les utilisateurs sont notifiés par push pour les inciter à faire leurs games de placement et à mettre à jour leur rank dans l'app.

## 9. La vision long terme (12-24 mois)

**Phase A — Valorant MVP (mois 1-3)** : lancement de la killer feature avec déclaration manuelle du rank et synchronisation automatique des données du jeu. Premier palier de 100-1000 utilisateurs en bêta privée.

**Phase B — Valorant Growth (mois 4-9)** : montée en charge, intégration Riot API après validation du produit et obtention de la production key, premières features sociales (liste d'amis, chat basique, historique), premier revenu via Scrim+.

**Phase C — Valorant Social Network (mois 10-18)** : Scrim devient un vrai hub social Valorant. Feed d'activité des amis, statistiques communautaires, tournois communautaires, intégrations streaming, features de découverte de nouveaux joueurs. L'objectif est que les joueurs ouvrent Scrim même quand ils ne cherchent pas un match.

**Phase D — Expansion multi-jeux (mois 18-24)** : Scrim s'ouvre à un deuxième jeu (probablement CS2, étant donné la proximité du public). L'architecture technique permet de gérer plusieurs jeux sans refondre l'app. Plus tard, Overwatch, League of Legends, Rainbow Six, etc.

**Horizon final** : Scrim est à la communauté Valorant ce que Discord est à la communauté gaming globale. Le réflexe quand tu veux jouer, c'est d'ouvrir Scrim avant de lancer le jeu.

## 10. Les risques identifiés et les mitigations

**Risque 1 — Riot Games refuse la production key.**
- Impact : Scrim reste en mode déclaratif manuel (pas de validation automatique des ranks via RSO).
- Mitigation : le produit fonctionne parfaitement sans Riot API dès aujourd'hui grâce à valorant-api.com pour les données du jeu. L'intégration Riot est un bonus, pas un prérequis.

**Risque 2 — Riot Games considère Scrim comme un substitut de queue et demande des modifications.**
- Impact : il faudra ajuster le positionnement ou certaines features.
- Mitigation : positionnement strict "outil de coordination sociale", vocabulaire "matchmaking" banni, respect absolu des règles natives Valorant dans la logique métier. L'app est une extension du jeu, pas une alternative.

**Risque 3 — Riot Games développe une feature concurrente intégrée à Valorant.**
- Impact : une partie de la valeur de Scrim disparaît.
- Mitigation : construire une vraie communauté (amis, chat, réseau social) rend Scrim défendable même si la fonction LFG pure devient intégrée à Valorant. Les réseaux sociaux gagnent sur la rétention, pas sur la feature.

**Risque 4 — valorant-api.com tombe ou est fermée.**
- Impact : plus de synchronisation automatique des données du jeu.
- Mitigation : les données sont dupliquées dans la DB Supabase, donc Scrim continue à fonctionner même si l'API externe tombe. Plan de repli : passer à une source alternative (autre API non-officielle) ou à un hardcode temporaire, le temps de trouver une solution.

**Risque 5 — Problème de masse critique (poule et œuf).**
- Impact : sans utilisateurs initiaux, les premiers utilisateurs ne trouvent rien et partent.
- Mitigation : lancement avec un seul serveur géographique (EU Paris ou EU West), seed manuel par les mates DRAVA et leur entourage, focus croissance géographique progressive plutôt que mondiale d'emblée.

**Risque 6 — Temps éparpillé du fondateur.**
- Impact : développement lent, frustration, risque d'abandon.
- Mitigation : roadmap par jalons courts (2-4 semaines par feature), gratification régulière via les commits et les tests utilisateurs. Jamais plus de 3 semaines sans un signal tangible de progrès.

**Risque 7 — Concurrence installée (Gankster, GamerLink).**
- Impact : acquisition plus difficile que sur un marché vierge.
- Mitigation : positionnement clairement différencié (groupe cherche solos, pas Tinder), mono-jeu, mobile-first, UX moderne, respect des règles natives Valorant. On ne copie pas, on fait mieux sur un angle précis.

## 11. Ce qui doit rester vrai dans 12 mois

Peu importe comment Scrim évolue, ces principes doivent rester intacts. Si l'un d'eux est violé, c'est que le produit a dévié de sa vision.

- **La killer feature reste gratuite à vie**
- **Tous les ranks sont servis avec le même soin, Unranked inclus**
- **L'app reste mobile-first et mono-jeu Valorant** (avant l'expansion multi-jeux contrôlée)
- **Le matching parle la langue native de Valorant** (vrais ranks, vrais agents, vrais serveurs)
- **L'app respecte strictement les règles officielles Valorant** (party size, rank disparity, restrictions Immortal)
- **Toute la valeur est capturée dans l'app** (pas de renvoi vers Discord ou ailleurs)
- **L'utilisateur est roi, pas l'advertiser** (pas de pub intrusive, pas de dark patterns)
- **La symétrie des rôles est respectée** (pas de segmentation artificielle entre "demandeurs" et "offreurs")
- **Les données du jeu sont toujours à jour** (grâce à valorant-api.com ou à son remplaçant)