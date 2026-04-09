# Rapport de divergence DB Supabase <-> git

> Decouvert le 9 avril 2026 pendant l'audit technique du Jalon 1.3.
> Statut : RESOLU le 2026-04-09.

## RESOLU le 2026-04-09

Session de réparation dédiée effectuée le 9 avril 2026. Livrables :

- `supabase/migrations/00000000000000_baseline.sql` (36 Ko) : baseline
  complète du schéma public générée via `supabase db dump --schema public`.
  Contient 11 tables, 5 enums, 13 fonctions Postgres, 11 triggers, 27 RLS
  policies.
- `supabase/functions/sync-valorant-data/index.ts` : code source de
  l'Edge Function récupéré et commité.
- `supabase/cron-jobs.sql` : aligné avec l'état réel de production
  (expire-old-matches actif toutes les 5 min, sync-valorant-data-daily
  à 3h UTC).
- `docs/supabase-discipline.md` : règles non négociables pour prévenir
  toute récidive.

**FREEZE LEVÉ.** Le Jalon 1.3 est débloqué.

---

## Le probleme en une phrase

Aucune table, aucune fonction Postgres, aucun trigger, aucune RLS
policy de la production Supabase n'est versionne en git. Si la
prod tombe, tout le schema backend est perdu.

## Etat de la prod

- 11 tables dans le schema public :
  - 6 tables core (profiles, matches, match_members, teams,
    team_members, team_invites)
  - 5 tables Valorant (valorant_agents, valorant_maps,
    valorant_game_modes, valorant_seasons, valorant_acts)
- 13 fonctions Postgres custom :
  - accept_team_invite, check_active_match, check_email_exists,
    check_kick_cooldown, check_single_active_match,
    check_username_available, expire_old_matches, handle_new_team,
    handle_new_user, handle_updated_at, recalculate_current_players,
    recalculate_team_rank, renew_match
- 2 Edge Functions deployees :
  - on-match-event (en git en local : oui)
  - send-push (en git en local : oui)
  - sync-valorant-data (en git en local : NON)
- 2 cron jobs actifs :
  - sync-valorant-data-daily (3h UTC) — config en git mais Edge
    Function cible non en git
  - expire-old-matches (toutes les 5 min) — fonction et cron pas
    en git
- Enums Postgres : region_type, game_type, match_status, team_role,
  team_invite_status (aucun en git)
- Triggers : moddatetime sur les 5 tables valorant_*, plus d'autres
  triggers metiers (handle_new_user sur auth.users, etc.) — aucun
  en git

## Etat du repo git

supabase/migrations/ contient seulement :
- 20260408120000_drop_orphan_tables.sql (drop de tables obsoletes
  du refactor d'audit)
- 20260408130000_drop_orphan_pg_types.sql (drop de types obsoletes
  du refactor d'audit)

Aucune migration fondatrice qui cree quoi que ce soit.

## Origine probable du probleme

Le projet a ete developpe depuis le debut en utilisant le dashboard
Supabase ou le MCP Supabase pour creer les tables et les fonctions
directement en prod, sans jamais sauvegarder le SQL en local. Le
refactor d'audit (mars-avril 2026) n'a pas detecte ni corrige ce
probleme parce qu'il s'est concentre sur le code TypeScript et
n'a pas audite le schema DB.

## Impact

- Risque 1 (catastrophique) : si le projet Supabase est supprime
  ou corrompu, tout le backend est perdu instantanement. Pas de
  rollback possible.
- Risque 2 (eleve) : impossible de creer un environnement de
  staging ou de dev separe de la prod. Toute experimentation se
  fait directement sur la prod.
- Risque 3 (moyen) : impossible de faire un code review serieux
  des modifications backend, parce que rien n'est dans des PR.
- Risque 4 (bloquant) : le Jalon 1.3 ne peut pas demarrer parce
  qu'il doit modifier le schema profiles et creer une nouvelle
  Edge Function. Sans baseline en git, ces modifications
  aggraveraient la dette au lieu de la reduire.

## Options de reparation envisagees

### Option A — Reparation chirurgicale en plusieurs commits

Recuperer chaque element manuellement et le commiter dans une
migration dediee, regroupee logiquement (Jalon 1.1, expire_old_matches,
fonctions legacy de team management, fonctions legacy d'auth, etc.).
Plus narratif et plus comprehensible historiquement, mais plus long
(2-3h) et risque d'oublier des elements subtils.

### Option B — Baseline complete via pg_dump

Generer un fichier baseline unique via pg_dump --schema-only du
schema public, le commiter comme migration fondatrice
00000000000000_baseline.sql. Plus rapide (1h-1h30), exhaustif par
construction (capture meme les details qu'un humain oublierait),
mais moins narratif (un seul gros blob historique).

### Option C — Hybride

Faire un pg_dump complet pour avoir une baseline garantie exhaustive,
PUIS retravailler le contenu du dump pour le decouper en migrations
narratives par theme (un fichier pour Valorant, un pour les fonctions
de team, etc.). Plus long que A et que B (3-4h), mais le meilleur
des deux mondes. Probablement excessif pour un projet solo.

### Option D — Bricolage actuel

Ne rien faire, continuer comme avant, esperer que la prod ne tombe
jamais. Inacceptable.

## Recommandation pour la prochaine session

Approche B (baseline pg_dump) en priorite, parce que c'est la plus
sure et la plus rapide, et le projet est encore jeune donc l'absence
d'historique narratif n'est pas un drame. La prochaine session dediee
de 1h-1h30 doit produire :
1. Un fichier supabase/migrations/00000000000000_baseline.sql
   genere via pg_dump et commite
2. Le code source de sync-valorant-data en local et commite
3. La mise a jour de cron-jobs.sql avec les 2 jobs actifs
4. Un fichier docs/supabase-discipline.md qui etablit la regle
   "git = source de verite pour toutes les modifications backend
   a partir de maintenant"

## FREEZE — Ne plus modifier le backend

A partir de maintenant et jusqu'a la fin de la session de reparation,
INTERDIT de :
- Creer ou modifier une table en prod
- Creer ou modifier une fonction Postgres en prod
- Deployer une nouvelle Edge Function
- Modifier un cron job
- Creer un trigger ou une RLS policy

Le code mobile, les composants UI, et la logique pure (comme le
module valorant-rules) restent autorises. Mais rien qui touche
Supabase tant que la reparation n'est pas terminee.

## Statut du Jalon 1.3

BLOQUE jusqu'a la fin de la reparation. Ne pas commencer le
brainstorming ou l'execution du Jalon 1.3 tant que ce rapport
n'est pas marque "RESOLU".
