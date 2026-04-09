# Contexte de session — avril 2026, post-Jalon 1.2

## Jalons livres

### Jalon 1.1 — Synchronisation des donnees Valorant (livre)

Edge Function `sync-valorant-data` deployee en prod. Synchronise
quotidiennement a 3h UTC les donnees agents, maps, game modes,
seasons et acts depuis valorant-api.com vers 5 tables Supabase.
Cron job `sync-valorant-data-daily` actif. Tables peuplees avec
29 agents, 23 maps, 15 game modes, 13 seasons, 39 acts.

### Jalon 1.2 — Moteur de regles Valorant (livre)

Module `lib/valorant-rules.ts` livre avec 6 fonctions exportees
(parseRank, isValidPartySize, getAllowedRankRange, isTrioAllowed,
getRRPenalty, canUnrankedJoin) et 52 tests unitaires Jest. Encode
toutes les regles officielles Valorant pour le matchmaking ranked.

### Jalon 1.3 — Gestion des rank resets (EN ATTENTE)

Brainstorming commence le 9 avril 2026 mais interrompu par la
decouverte du probleme de versioning DB. Bloque jusqu'a la
reparation.

## Problème de versioning DB découvert et résolu

Le 9 avril 2026, pendant l'audit technique préparatoire au Jalon 1.3,
découverte qu'aucun élément du schéma Supabase (11 tables, 13 fonctions,
enums, triggers, RLS policies) n'était versionné en git. Tout avait été
créé directement en production via le dashboard ou le MCP sans jamais
être sauvegardé en local.

**RÉSOLU le même jour** par une session de réparation dédiée qui a
produit un baseline complet via `supabase db dump`, récupéré l'Edge
Function `sync-valorant-data` en local, aligné `cron-jobs.sql` avec
la prod, et établi des règles de discipline dans
`docs/supabase-discipline.md` pour prévenir toute récidive.

Voir `docs/db-drift-report-2026-04-09.md` pour le rapport complet.
