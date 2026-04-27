# Jalon 1.4 — Sync complet valorant-api.com

> Refonte du sync valorant-api.com pour couvrir 10 endpoints data + /version,
> avec migration des références persistées vers les UUIDs Riot et nouvelle
> table d'audit sync_runs.
>
> Date : 2026-04-27
> Statut : En attente de validation utilisateur

---

## 1. Résumé exécutif

Étendre le sync quotidien valorant-api.com de 4 à 10 endpoints data afin
d'avoir en base toutes les données structurelles et compétitives du jeu,
qu'elles soient utilisées aujourd'hui ou non. La détection de changement
d'Act remplace la détection de changement d'Episode pour déclencher le
rank reset. Les références persistées (`profiles.main_agent`) migrent du
slug dérivé vers l'UUID API, garantissant la stabilité même si Riot
rename un agent. Une table d'audit `sync_runs` capture chaque exécution.

Cette refonte corrige aussi un bug critique : le cron actuel
`sync-valorant-data-daily` est déclaré actif mais n'a jamais exécuté
depuis sa création (cf. `cron.job_run_details` vide pour jobid=3).

## 2. Pré-requis

- Documents lus : [`docs/superpowers/specs/2026-04-08-jalon-1-1-sync-valorant-api-design.md`](2026-04-08-jalon-1-1-sync-valorant-api-design.md), [`docs/superpowers/specs/2026-04-09-jalon-1-3-rank-reset-design.md`](2026-04-09-jalon-1-3-rank-reset-design.md), [`docs/db-drift-report-2026-04-09.md`](../../db-drift-report-2026-04-09.md)
- Branche git : `feat/jalon-1-4-valorant-api-full-sync`
- Projet Supabase ref : `nlmtbflnzykjuwqigctt`
- Endpoints API utilisés (testés au 2026-04-27) :
  - `https://valorant-api.com/v1/agents?isPlayableCharacter=true` (29 entries)
  - `https://valorant-api.com/v1/maps` (23 entries)
  - `https://valorant-api.com/v1/gamemodes` (15 entries)
  - `https://valorant-api.com/v1/seasons` (48 entries — Episodes + Acts mêlés)
  - `https://valorant-api.com/v1/seasons/competitive` (50 entries)
  - `https://valorant-api.com/v1/competitivetiers` (~10 entries)
  - `https://valorant-api.com/v1/weapons` (~17 entries)
  - `https://valorant-api.com/v1/gear` (~3 entries)
  - `https://valorant-api.com/v1/levelborders` (~20 entries)
  - `https://valorant-api.com/v1/events` (~30 entries)
  - `https://valorant-api.com/v1/version` (1 entry, snapshot dans sync_runs)

## 3. Décisions de scope

### 3.1 Endpoints retenus / écartés

**Retenus** : agents, maps, gamemodes, seasons, seasons/competitive,
competitivetiers, weapons, gear, levelborders, events, version.

**Écartés (et pourquoi)** :
- `themes`, `contenttiers`, `ceremonies`, `missions`, `bundles`,
  `weapons/skins`, `weapons/skinchromas`, `weapons/skinlevels`,
  `buddies`, `sprays`, `playercards`, `playertitles`, `contracts`,
  `currencies` : exclusivement cosmétique ou marketing, sans usage
  identifiable pour une app de scrim. Volume cumulé > 50 MB.

### 3.2 Stratégie de cadence

Sync quotidien full refresh à 3h UTC. Pas d'optimisation
`If-Modified-Since` ni de guard via `/version` :
- coût API : nul (valorant-api.com gratuit, derrière Cloudflare)
- coût Supabase : ~30 invocations/mois, 0.006% du free tier
- coût DB : ~410 KB stockés au total, 0.08% du free tier
- bénéfice de la simplicité > optimisation prématurée

Le `/version` reste fetché à chaque run et snapshotté dans `sync_runs`
pour audit historique, mais ne sert pas de filtre de skip.

### 3.3 Détection de rank reset

Surveille les changements d'**Act** (`valorant_acts.is_current` qui
change d'UUID), pas d'Episode. Couvre nativement les changements
d'Episode aussi, puisqu'un nouvel Episode démarre toujours par son
Act I. Ne fait pas la distinction hard/soft reset (l'utilisateur
re-saisit son rank dans l'app de toute façon).

### 3.4 Map pool

`valorant_maps.is_in_current_pool` reste géré manuellement. Riot ne
publie pas le map pool dans une donnée structurée du client de jeu,
donc valorant-api.com ne l'expose pas. Maintenance via SQL direct
après chaque rotation Riot (~3-4× par an).

### 3.5 Mappage stable des références persistées

Migration vers UUIDs Riot pour les colonnes qui référencent des entités
versionnées. Aujourd'hui `profiles.main_agent` stocke un slug dérivé
de `displayName`, qui casserait si Riot renommait un agent. Migration
vers UUID + FK Postgres garantit l'intégrité.

`profiles.current_rank` reste en slug (`gold_2`) car les rangs viennent
d'un jsonb `valorant_competitive_tiers.tiers` (pas d'entité Postgres
indépendante par rang) et le moteur `valorant-rules.ts` parse ces slugs
en interne.

## 4. Architecture

### 4.1 Vue d'ensemble

Une Edge Function unique `sync-valorant-data` (remplace l'existante),
déclenchée par un cron pg_cron quotidien à 3h UTC.

Flux :
1. Auth check (service_role JWT, sinon 401)
2. Snapshot avant : fetch `/version`, lit l'Act courant
3. Fetch parallèle des 10 endpoints (`Promise.allSettled`, timeout 5s)
4. Upsert ordonné (FK-aware) dans 10 tables typées
5. Recalcul `is_current` sur seasons / acts / competitive_seasons / events
6. Détection changement d'Act → trigger `handle-rank-reset` si applicable
7. INSERT dans `sync_runs`
8. Réponse JSON détaillée

### 4.2 Idempotence

Toute la fonction est idempotente : la rejouer N fois la même journée
produit le même état final. Les UPSERT sont par UUID, le recalcul
`is_current` est déclaratif (UPDATE avec WHERE), et la détection de
reset s'appuie sur `valorant_acts.reset_processed` (transition unique).

### 4.3 Modification de handle-rank-reset

L'Edge Function `handle-rank-reset` continue d'exister mais reçoit
désormais `{ act_uuid }` au lieu de `{ season_uuid }`. La RPC
`process_rank_reset` est renommée en gardant la même signature interne :
- avant : `process_rank_reset(p_season_uuid text, p_target_user_ids uuid[])`
- après : `process_rank_reset(p_act_uuid text, p_target_user_ids uuid[])`

La colonne `valorant_seasons.reset_processed` migre vers
`valorant_acts.reset_processed`.

## 5. Schéma DB

### 5.1 Tables existantes modifiées

**`valorant_seasons`**
- AJOUT colonne `episode_number int` (NULL pour Closed Beta)
- SUPPRESSION colonne `reset_processed` (déplacée sur acts)

**`valorant_acts`**
- AJOUT colonne `act_number int NOT NULL`
- AJOUT colonne `reset_processed boolean NOT NULL DEFAULT false`

**`valorant_agents`**
- AJOUT colonne `slug text NOT NULL UNIQUE` (généré au premier insert,
  jamais modifié ensuite — utilisé pour debug et URL routing, pas pour
  les FK)

**`valorant_maps`**
- Pas de modification structurelle
- Données : dédoublonner les deux entrées "The Range" (garder l'UUID
  le plus récent, supprimer l'autre — décision documentée dans la
  migration)

**`valorant_game_modes`** : aucune modification.

**`profiles`**
- Migration : `main_agent text` reste text (pour stocker un UUID en
  string), avec ajout d'une FK vers `valorant_agents(uuid)`
- Script de conversion préalable : `UPDATE profiles SET main_agent =
  va.uuid FROM valorant_agents va WHERE va.slug = profiles.main_agent`
- Profils dont le slug ne matche aucun agent : `SET main_agent = NULL`
- Backup préalable dans `profiles_backup_pre_uuid_migration` (table
  temporaire, droppée après 30 jours de vérification)

### 5.2 Nouvelles tables

#### `valorant_seasons_competitive`

Source : `/v1/seasons/competitive`. ~50 rows.

| Colonne | Type | Contraintes |
|---|---|---|
| uuid | text | PK |
| season_uuid | text | NOT NULL, FK → `valorant_seasons(uuid)` |
| competitive_tiers_uuid | text | NOT NULL, FK → `valorant_competitive_tiers(uuid)` |
| start_time | timestamptz | NOT NULL |
| end_time | timestamptz | NOT NULL |
| borders | jsonb | DEFAULT '[]'::jsonb |
| asset_path | text | |
| is_current | boolean | DEFAULT false |
| raw_data | jsonb | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

Index : `is_current`, `season_uuid`.

#### `valorant_competitive_tiers`

Source : `/v1/competitivetiers`. ~10 rows (1 par génération de la
table de tiers — Riot a remanié les rangs ~5 fois depuis 2020).

| Colonne | Type | Contraintes |
|---|---|---|
| uuid | text | PK |
| asset_object_name | text | |
| tiers | jsonb | NOT NULL — array des 25 ranks complets |
| asset_path | text | |
| raw_data | jsonb | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

Pas d'index supplémentaire (table de ~10 rows).

Format `tiers` : array de `{tier, tierName, division, color, backgroundColor, smallIcon, largeIcon, rankTriangleDownIcon, rankTriangleUpIcon}`.

#### `valorant_weapons`

Source : `/v1/weapons`. ~17 rows.

| Colonne | Type | Contraintes |
|---|---|---|
| uuid | text | PK |
| display_name | text | NOT NULL |
| category | text | NOT NULL |
| default_skin_uuid | text | |
| display_icon | text | |
| kill_stream_icon | text | |
| asset_path | text | |
| weapon_stats | jsonb | |
| shop_data | jsonb | |
| raw_data | jsonb | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

Index : `category`.

#### `valorant_gear`

Source : `/v1/gear`. ~3 rows (Heavy Shield, Light Shield, Regenerative Shield).

| Colonne | Type | Contraintes |
|---|---|---|
| uuid | text | PK |
| display_name | text | NOT NULL |
| description | text | |
| display_icon | text | |
| asset_path | text | |
| shop_data | jsonb | |
| raw_data | jsonb | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

#### `valorant_level_borders`

Source : `/v1/levelborders`. ~20 rows.

| Colonne | Type | Contraintes |
|---|---|---|
| uuid | text | PK |
| display_name | text | |
| starting_level | int | NOT NULL |
| level_number_appearance | text | |
| small_player_card_appearance | text | |
| asset_path | text | |
| raw_data | jsonb | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

Index : `starting_level`.

#### `valorant_events`

Source : `/v1/events`. ~30 rows.

| Colonne | Type | Contraintes |
|---|---|---|
| uuid | text | PK |
| display_name | text | NOT NULL |
| short_display_name | text | |
| start_time | timestamptz | NOT NULL |
| end_time | timestamptz | NOT NULL |
| asset_path | text | |
| is_current | boolean | DEFAULT false |
| raw_data | jsonb | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

Index : `is_current`, `start_time`.

#### `sync_runs`

Audit. 1 INSERT par run du cron.

| Colonne | Type | Contraintes |
|---|---|---|
| id | bigserial | PK |
| ran_at | timestamptz | NOT NULL DEFAULT now() |
| duration_ms | int | NOT NULL |
| success | boolean | NOT NULL |
| valorant_version | text | snapshot de `/version.data.version` |
| valorant_build_date | timestamptz | snapshot de `/version.data.buildDate` |
| endpoints_summary | jsonb | NOT NULL — { "agents": {fetched, upserted, status}, ... } |
| errors | text[] | DEFAULT '{}'::text[] |
| triggered_rank_reset | boolean | NOT NULL DEFAULT false |
| new_current_act_uuid | text | si reset déclenché |

Index : `ran_at DESC`.

RLS : active, **pas de policy SELECT pour anon/authenticated** —
table privée, lecture via dashboard/service_role uniquement.

Pas de purge automatique en v1 (~30 rows/mois × ~1 KB = 12 KB/an,
négligeable). Job de purge à ajouter si la table dépasse 100 MB.

### 5.3 Triggers et RLS communs

Pour les 6 nouvelles tables `valorant_*` :
- Trigger `moddatetime` sur `BEFORE UPDATE` pour `updated_at`
- RLS active, policy `SELECT FOR anon, authenticated` (lecture publique)
- Pas de policy INSERT/UPDATE/DELETE → seul service_role écrit

## 6. Edge Function `sync-valorant-data`

### 6.1 Pseudo-code haut niveau

```
serve(async req) {
  startTime = now()
  authCheck(req)              // service_role JWT, sinon 401
  supabase = createAdminClient()

  // 1. Snapshot avant
  versionInfo = await fetch('/v1/version').data
  actBefore = await db.valorant_acts.where(is_current=true).first()

  // 2. Fetch parallèle
  endpoints = ['agents?isPlayableCharacter=true', 'maps', 'gamemodes',
               'seasons', 'seasons/competitive', 'competitivetiers',
               'weapons', 'gear', 'levelborders', 'events']
  results = await Promise.allSettled(endpoints.map(fetchWithTimeout))

  // 3. Upsert ordonné par dépendances FK
  await upsertSeasons(seasonsData)              // parent
  await upsertActs(seasonsData)                 // FK → seasons
  await upsertCompetitiveTiers(tiersData)       // standalone
  await upsertCompetitiveSeasons(compData)      // FK → seasons + tiers
  await upsertAgents(agentsData)                // standalone
  await upsertMaps(mapsData)                    // standalone
  await upsertGameModes(modesData)              // standalone
  await upsertWeapons(weaponsData)              // standalone
  await upsertGear(gearData)                    // standalone
  await upsertLevelBorders(bordersData)         // standalone
  await upsertEvents(eventsData)                // standalone

  // 4. Recalcul is_current
  await updateIsCurrent('valorant_seasons')
  await updateIsCurrent('valorant_acts')
  await updateIsCurrent('valorant_seasons_competitive')
  await updateIsCurrent('valorant_events')

  // 5. Détection changement d'Act
  actAfter = await db.valorant_acts.where(is_current=true).first()
  triggeredReset = false
  // actBefore présent obligatoire : sinon c'est le 1er run jamais et on ne reset rien
  if (actBefore && actAfter && actAfter.uuid !== actBefore.uuid && !actAfter.reset_processed) {
    await supabase.functions.invoke('handle-rank-reset', { body: { act_uuid: actAfter.uuid } })
    triggeredReset = true
  }

  // 6. Audit
  await db.sync_runs.insert({...})

  return { success, duration_ms, results, errors }
}
```

### 6.2 Helpers utilitaires

**`parseEpisodeNumber(displayName)`** :
- "EPISODE 9" → 9
- "V25" → 25, "V26" → 26
- "Closed Beta" → null
- garbage → null

**`parseActNumber(displayName)`** :
- "ACT I" → 1, ..., "ACT VI" → 6 (chiffres romains)
- "ACT 1" → 1 (fallback arabe au cas où)
- garbage → null

**`generateAgentSlug(displayName)`** :
- `displayName.toLowerCase().replace(/[^a-z0-9]/g, '')`
- "KAY/O" → "kayo", "Cypher" → "cypher"
- collision (improbable) → suffixe `_2`
- **appliqué uniquement à l'INSERT, jamais à l'UPDATE** (pour ne jamais
  muter un slug existant)

**`updateIsCurrent(tableName)`** générique :
```sql
UPDATE <table>
SET is_current = (start_time <= now() AND end_time >= now())
WHERE is_current != (start_time <= now() AND end_time >= now())
```

### 6.3 Gestion d'erreur

Pas de `throw` global. Chaque endpoint et chaque upsert sont isolés
(try/catch local). Les erreurs s'accumulent dans `errors[]`. La fonction
retourne toujours 200 OK avec le détail dans le body.

Si un endpoint critique échoue (ex: seasons), on skip ses dépendants
(acts, competitive_seasons) et on continue les indépendants. Le
recalcul `is_current` skip silencieusement les tables vides.

### 6.4 Logging structuré

`console.log(JSON.stringify({event, ...data, ts}))` à chaque étape :
- `sync_start`
- `fetch_complete` par endpoint (status, count)
- `upsert_complete` par table (count)
- `is_current_updated` par table
- `act_change_detected` (si applicable)
- `rank_reset_triggered` ou `rank_reset_skipped`
- `sync_run_logged` (id de la row sync_runs)
- `sync_complete` (success, duration_ms)

## 7. Cron pg_cron

Garder le job existant `sync-valorant-data-daily` (jobid=3,
schedule `0 3 * * *`).

**Bug actuel à corriger** : la job n'a jamais exécuté depuis sa
création (`cron.job_run_details` vide pour jobid=3). Diagnostic à
faire pendant l'implémentation :
1. `SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'` retourne-t-il une valeur ?
2. Tester manuellement la commande SQL du job (sans le cron) pour voir si pg_net réussit
3. Vérifier `SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5` pour les réponses pg_net récentes
4. Au pire : `SELECT cron.unschedule('sync-valorant-data-daily')` puis `cron.schedule(...)` à neuf

## 8. Code mobile

### 8.1 Hooks React Query

[`hooks/useHydrateValorantData.ts`](../../../hooks/useHydrateValorantData.ts) étendu :
- ajout queries `valorant_seasons`, `valorant_acts`, `valorant_events`
- staleTime 24h partout
- placeholderData fallback uniquement pour agents/maps/gamemodes
  (les nouveaux peuvent attendre la 1ère requête réseau)

Hooks dédiés (lazy, pas dans le hydrate) pour les tables peu utilisées :
- `useValorantWeapons()`, `useValorantGear()`, `useValorantLevelBorders()`
- `useValorantCompetitiveSeasons()`, `useValorantCompetitiveTiers()`

### 8.2 Store Zustand

[`stores/valorantDataStore.ts`](../../../stores/valorantDataStore.ts) ajoute :
```
seasons, acts, events + setters
```

### 8.3 Migration des références agent

[`hooks/useGameAssets.ts`](../../../hooks/useGameAssets.ts) :
- `toAgentMeta()` retourne `id: row.uuid` au lieu de `id: displayName lowercased`

Composants à adapter (grep `main_agent` et `agent\.id`) :
- [`app/(auth)/onboarding.tsx`](../../../app/(auth)/onboarding.tsx) — sélection main_agent
- [`app/(tabs)/profile.tsx`](../../../app/(tabs)/profile.tsx) — affichage main_agent
- liste exhaustive à confirmer pendant l'implémentation

### 8.4 Fallback statique

[`lib/game-assets-fallback.ts`](../../../lib/game-assets-fallback.ts) régénéré pour matcher
le nouveau schéma (slug ajouté). Script `scripts/generate-fallback.ts`
créé pour automatiser la régénération depuis la DB.

Pas d'extension du fallback aux nouvelles tables (events, weapons,
etc.) : si offline, l'app fonctionne sans, ces données enrichissent
l'expérience mais ne sont pas critiques au démarrage.

### 8.5 Composant home — events banner

`<CurrentEventsBanner />` :
- Lit `valorant_events` filtré sur `is_current = true`
- Affiche `display_name` + countdown `end_time - now()`
- Pas de visuel (Riot ne fournit pas d'image dans `/events`)
- Si aucun event en cours → composant absent (pas de placeholder)

Spec UI fine à définir pendant l'implémentation.

### 8.6 Code conservé tel quel

- `GAME_MODE_SCRIM_META` dans `lib/game-assets.ts` (métadonnée Scrim,
  pas Riot) — sera ré-indexé par `gamemode.uuid` à la place de slugs
- `VALORANT_RANKS` hardcodé reste tel quel
- [`lib/valorant-rules.ts`](../../../lib/valorant-rules.ts) intact (utilise des slugs internes)

## 9. Tests

### 9.1 Tests unitaires Edge Function (Deno)

- `parseEpisodeNumber()` : EPISODE 9 / V25 / V26 / Closed Beta / garbage
- `parseActNumber()` : ACT I → ACT VI / ACT 1 / garbage
- `generateAgentSlug()` : KAY/O / Cypher / collision

### 9.2 Tests unitaires mobile (Vitest)

- `toAgentMeta()` retourne `id = uuid`
- Migration script slug→uuid (mock SQL)
- Tests existants `valorant-rules.test.ts` intacts

### 9.3 Test manuel post-déploiement (checklist)

1. Trigger manuel via curl avec service_role
2. Vérif counts SQL : `SELECT count(*) FROM valorant_<table>` pour les
   10 tables (valeurs attendues : agents 29, maps 22 après dédup,
   game_modes 15, seasons 14 parents, acts 39, comp_seasons ~50,
   comp_tiers ~10, weapons ~17, gear ~3, level_borders ~20, events ~30)
3. Vérif `is_current` : 1 row exactement par table avec is_current=true
   (sauf events qui peut être 0)
4. Vérif `sync_runs` contient la nouvelle row avec success=true
5. Test app : home affiche events banner, profile affiche main_agent
   correctement après migration

## 10. Observabilité

**Logs** : visibles dans le dashboard Supabase Logs, filtrables par
fonction.

**Audit** : `sync_runs` est la source de vérité historique.

```sql
-- Health check 7 derniers jours
SELECT ran_at, success, duration_ms, valorant_version,
       triggered_rank_reset, errors
FROM sync_runs
ORDER BY ran_at DESC LIMIT 10;

-- Détection panne
SELECT * FROM sync_runs
WHERE success = false OR ran_at < now() - interval '36 hours';
```

**Pas d'alerting actif en v1**. Tu vérifies manuellement de temps en
temps. Suffisant en pré-prod avec 3 users. Couche d'alerting (Discord
webhook, etc.) à ajouter dans un jalon ultérieur si besoin.

## 11. Rollback

**Si la migration SQL échoue** : ordre inverse de DROP, sans cascade
dangereux car aucune FK externe ne pointe vers les nouvelles tables.

**Si l'Edge Function plante** : `supabase functions deploy
sync-valorant-data` avec un checkout du commit antérieur.

**Si la migration `profiles.main_agent` casse** :
```sql
UPDATE profiles SET main_agent = b.main_agent_old
FROM profiles_backup_pre_uuid_migration b
WHERE profiles.id = b.id;
```
Backup gardé 30 jours.

**Si rank reset déclenché à tort** : RPC `process_rank_reset`
idempotente sur `act.reset_processed` (second appel = 409). Annulation
manuelle :
```sql
UPDATE profiles
SET current_rank = previous_rank_before_reset,
    previous_rank_before_reset = NULL,
    last_rank_reset_at = NULL
WHERE last_rank_reset_at > '<date>';
```

## 12. Découpage commits suggéré

1. `feat(db): add 6 new valorant tables + sync_runs audit`
2. `feat(db): add episode_number, act_number, slug, reset_processed columns`
3. `feat(db): migrate profiles.main_agent from slug to uuid + FK`
4. `feat(supabase): rewrite sync-valorant-data for 10 endpoints`
5. `feat(supabase): adapt handle-rank-reset to use act_uuid instead of season_uuid`
6. `chore(types): regenerate database types`
7. `feat(mobile): extend useHydrateValorantData with seasons/acts/events`
8. `feat(mobile): migrate agent references from slug to uuid`
9. `feat(home): add CurrentEventsBanner component`
10. `chore(scripts): regenerate game-assets-fallback`
11. `docs: add jalon 1.4 spec for full valorant-api sync`

## 13. Critères d'acceptation globaux

- [ ] 6 nouvelles tables créées et peuplées avec données réelles
- [ ] sync_runs créée, RLS privée
- [ ] `valorant_seasons.episode_number` et `valorant_acts.act_number` peuplés
- [ ] `valorant_agents.slug` peuplé et UNIQUE
- [ ] `valorant_acts.reset_processed` colonne en place,
      `valorant_seasons.reset_processed` supprimée
- [ ] `profiles.main_agent` migré vers UUIDs avec FK active
- [ ] Edge Function `sync-valorant-data` redéployée avec les 10 endpoints
- [ ] Cron `sync-valorant-data-daily` exécute réellement (vérifier
      `cron.job_run_details` après 24h)
- [ ] `handle-rank-reset` adapté à `act_uuid`
- [ ] Code mobile lit les nouvelles tables (events sur home)
- [ ] Aucune erreur TypeScript
- [ ] Aucun nouveau warning advisor de sécurité critique
- [ ] sync_runs montre au moins une row success=true post-déploiement

## 14. Hors scope (volontairement)

- `If-Modified-Since` ou guard `/version` (optimisation prématurée)
- Sync des endpoints cosmétiques (themes, contenttiers, ceremonies,
  missions, bundles, weapons/skins, buddies, sprays, playercards,
  playertitles, contracts, currencies)
- `is_in_current_pool` automatique (Riot ne publie pas la donnée)
- Alerting actif sur échec de sync (Discord webhook, etc.)
- i18n des données API (today : anglais uniquement via API default)
- Job de purge automatique de `sync_runs`
- UI admin pour gérer le map pool

Ces points pourront faire l'objet de jalons ultérieurs si besoin.
