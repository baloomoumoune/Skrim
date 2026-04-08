# Jalon 1.1 — Synchronisation valorant-api.com

> Spec d'implémentation pour la synchronisation automatique des données
> Valorant depuis valorant-api.com vers Supabase.
>
> Date : 2026-04-08
> Statut : En attente de validation utilisateur

---

## 1. Resume executif

Mettre en place l'infrastructure de synchronisation quotidienne des
donnees Valorant (agents, maps, game modes, seasons, acts) depuis
l'API publique valorant-api.com vers la base Supabase, via une Edge
Function declenchee par un cron `pg_cron` a 3h UTC. Cote mobile,
remplacer le hardcode actuel de `lib/game-assets.ts` par des lectures
Supabase avec React Query et fallback statique.

## 2. Pre-requis

- Documents lus : `docs/north-star.md`, `docs/roadmap-q2-2026.md`,
  `docs/valorant-rules.md`, `docs/design-system.md`
- Branche git : `master` (ou feature branch `feat/jalon-1-1-sync-valorant-api`)
- Projet Supabase ref : `nlmtbflnzykjuwqigctt`
- Endpoints API valides (testes via curl) :
  - `https://valorant-api.com/v1/agents?isPlayableCharacter=true`
  - `https://valorant-api.com/v1/maps`
  - `https://valorant-api.com/v1/gamemodes`
  - `https://valorant-api.com/v1/seasons`

## 3. Checklist des livrables

- [ ] Migration Supabase creant les 5 tables de donnees Valorant
- [ ] Edge Function `sync-valorant-data` deployee
- [ ] Cron `pg_cron` configure pour execution quotidienne a 3h UTC
- [ ] Premier sync manuel execute et verifie
- [ ] Hardcode supprime de `lib/game-assets.ts`, lectures depuis Supabase
- [ ] Fichier fallback `lib/game-assets-fallback.ts` genere
- [ ] Types TypeScript regeneres (`types/database.ts`)
- [ ] Tests manuels documentes et valides

## 4. Plan d'execution

### Etape 1 — Migration SQL (par Claude via MCP)

**Outil** : `apply_migration`
**Nom** : `create_valorant_data_tables`

Cree les 5 tables avec :

#### valorant_agents
| Colonne | Type | Contraintes |
|---|---|---|
| uuid | text | PK |
| display_name | text | NOT NULL |
| description | text | |
| developer_name | text | |
| role_uuid | text | NOT NULL |
| role_name | text | NOT NULL |
| role_display_icon | text | |
| display_icon | text | |
| full_portrait | text | |
| killfeed_portrait | text | |
| background | text | |
| abilities | jsonb | NOT NULL |
| is_base_content | boolean | DEFAULT false |
| raw_data | jsonb | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

Index : `role_name`.
Commentaire SQL : `is_base_content` = agent inclus dans le contenu de base du jeu (gratuit) vs agent a debloquer.

#### valorant_maps
| Colonne | Type | Contraintes |
|---|---|---|
| uuid | text | PK |
| display_name | text | NOT NULL |
| tactical_description | text | |
| coordinates | text | |
| display_icon | text | |
| list_view_icon | text | |
| splash | text | |
| is_playable | boolean | GENERATED ALWAYS AS (coordinates IS NOT NULL) STORED |
| is_in_current_pool | boolean | DEFAULT false |
| raw_data | jsonb | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

Index : `is_playable`, `is_in_current_pool`.
Commentaire SQL : `is_in_current_pool` = gere manuellement, pas synchronise automatiquement.

#### valorant_game_modes
| Colonne | Type | Contraintes |
|---|---|---|
| uuid | text | PK |
| display_name | text | NOT NULL |
| description | text | |
| duration | text | |
| display_icon | text | |
| allows_match_timeouts | boolean | DEFAULT false |
| is_team_voice_allowed | boolean | DEFAULT true |
| raw_data | jsonb | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

Pas d'index supplementaire (petite table, ~15 rows).

#### valorant_seasons
| Colonne | Type | Contraintes |
|---|---|---|
| uuid | text | PK |
| display_name | text | NOT NULL |
| start_time | timestamptz | NOT NULL |
| end_time | timestamptz | NOT NULL |
| is_current | boolean | DEFAULT false |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

Index : `is_current`.
`is_current` mis a jour par l'Edge Function apres chaque sync (UPDATE avec WHERE clause).

#### valorant_acts
| Colonne | Type | Contraintes |
|---|---|---|
| uuid | text | PK |
| display_name | text | NOT NULL |
| season_uuid | text | NOT NULL, FK -> valorant_seasons(uuid) |
| start_time | timestamptz | NOT NULL |
| end_time | timestamptz | NOT NULL |
| is_current | boolean | DEFAULT false |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

Index : `season_uuid`, `is_current`.

#### Infrastructure transverse

- Extension `moddatetime` activee (`CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions`)
- Trigger `moddatetime` sur `BEFORE UPDATE` pour les 5 tables (`updated_at`)
- RLS active sur les 5 tables avec policy `SELECT` pour `anon` et `authenticated`
- Aucun INSERT/UPDATE/DELETE cote client

Note : `apply_migration` cree automatiquement un fichier physique dans
`supabase/migrations/` avec un timestamp dans le nom (format
`YYYYMMDDHHMMSS_create_valorant_data_tables.sql`). Ce fichier doit
etre inclus dans le commit 1 de l'etape 10 pour tracer la migration
dans git.

#### Criteres d'acceptation Etape 1
- Les 5 tables existent dans le schema `public`
- `list_tables` confirme la structure
- `get_advisors(security)` ne reporte aucun warning sur ces tables
- Un fichier de migration existe dans `supabase/migrations/` et est tracable dans git

---

### Etape 2 — Edge Function `sync-valorant-data` (par Claude via MCP)

**Outil** : `deploy_edge_function`

Fichier unique `index.ts`. Structure :

1. **Auth** : verifie le header `Authorization: Bearer <service_role_key>`
   via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`. Retourne 401 si invalide.
2. **Fetch parallele** : `Promise.allSettled` sur les 4 endpoints avec
   `AbortController` timeout 5s. Filtre `?isPlayableCharacter=true` sur agents.
3. **Upsert sequentiel** (ordre impose par FK) :
   - Seasons (entries sans `type` et sans `parentUuid`, excluant "Closed Beta")
   - Acts (entries avec `type === 'EAresSeasonType::Act'` et `parentUuid`)
   - Agents
   - Maps (calcul `is_playable` via colonne generee, pas dans le code)
   - Game modes
4. **Calcul is_current** : deux UPDATE avec WHERE clause pour ne toucher
   que les rows qui changent reellement :
   ```sql
   UPDATE valorant_seasons
   SET is_current = (start_time <= now() AND end_time >= now())
   WHERE is_current != (start_time <= now() AND end_time >= now());
   ```
   Idem pour `valorant_acts`.
5. **Reponse JSON** :
   ```json
   {
     "success": true|false,
     "timestamp": "ISO8601",
     "duration_ms": number,
     "results": {
       "agents":     { "status": "success"|"error", "fetched": N, "upserted": N },
       "maps":       { "status": "success"|"error", "fetched": N, "upserted": N },
       "game_modes": { "status": "success"|"error", "fetched": N, "upserted": N },
       "seasons":    { "status": "success"|"error", "fetched": N, "upserted": N },
       "acts":       { "status": "success"|"error", "fetched": N, "upserted": N }
     },
     "errors": ["string..."]
   }
   ```
6. **Logging structure** : `console.log(JSON.stringify({...}))` a chaque
   etape (sync_start, fetch_complete, upsert_complete, fetch_error,
   sync_complete).
7. **Gestion d'erreur** : jamais de throw. Chaque endpoint/table est
   independant. Si un echoue, les autres continuent. Retourne toujours 200
   avec le detail des erreurs dans le body.

#### Criteres d'acceptation Etape 2
- `list_edge_functions` montre `sync-valorant-data`
- L'Edge Function repond 401 sans auth

---

### Etape 3 — Premier sync manuel (par Aymen)

**Commande** :
```powershell
curl.exe -X POST `
  "https://nlmtbflnzykjuwqigctt.supabase.co/functions/v1/sync-valorant-data" `
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" `
  -H "Content-Type: application/json"
```

Note : utiliser `curl.exe` (pas `curl` qui est un alias PowerShell).
Ne pas exposer la service_role key dans la conversation.

#### Criteres d'acceptation Etape 3
- Reponse JSON avec `success: true`
- Toutes les tables `fetched > 0` et `upserted > 0`

---

### Etape 4 — Verification post-sync (par Claude via MCP)

**Outil** : `execute_sql`

Queries de validation :
```sql
SELECT 'agents' as tbl, count(*) FROM valorant_agents
UNION ALL SELECT 'maps', count(*) FROM valorant_maps
UNION ALL SELECT 'game_modes', count(*) FROM valorant_game_modes
UNION ALL SELECT 'seasons', count(*) FROM valorant_seasons
UNION ALL SELECT 'acts', count(*) FROM valorant_acts;
```

Valeurs attendues : agents ~29, maps ~23, game_modes ~15, seasons ~20, acts ~38.

```sql
SELECT display_name, is_current FROM valorant_seasons WHERE is_current = true;
-- Attendu : V26 (la season en cours en avril 2026)

SELECT display_name, season_uuid FROM valorant_acts WHERE is_current = true;
-- Attendu : ACT II de V26

SELECT display_name, is_playable FROM valorant_maps WHERE is_playable = true;
-- Attendu : ~12-14 maps jouables

SELECT display_name, jsonb_array_length(abilities) as num_abilities
FROM valorant_agents LIMIT 5;
-- Attendu : 4 abilities par agent
```

#### Criteres d'acceptation Etape 4
- Counts conformes aux attendus
- `is_current = true` sur V26 et ACT II
- `is_playable` correct (maps avec coordinates)
- 4 abilities par agent

---

### Etape 5 — Configuration cron pg_cron (par Claude via MCP)

**Outil** : `execute_sql`

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

SELECT cron.schedule(
  'sync-valorant-data-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nlmtbflnzykjuwqigctt.supabase.co/functions/v1/sync-valorant-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

Fichier `supabase/cron-jobs.sql` cree dans le repo comme reference documentaire.

**Verification** :
```sql
SELECT jobid, schedule, command FROM cron.job WHERE jobname = 'sync-valorant-data-daily';
```

#### Criteres d'acceptation Etape 5
- Le cron job existe dans `cron.job`
- Le schedule est `0 3 * * *`

---

### Etape 6 — Generation types TypeScript (par Claude via MCP)

**Outil** : `generate_typescript_types`

Ecrire le resultat dans `types/database.ts`. Commit separe.

#### Criteres d'acceptation Etape 6
- `types/database.ts` contient les definitions des 5 nouvelles tables
- Le projet compile sans erreur TypeScript

---

### Etape 7 — Verification advisors (par Claude via MCP)

**Outil** : `get_advisors` (security + performance)

#### Criteres d'acceptation Etape 7
- Aucun warning de securite sur les 5 nouvelles tables
- Aucun warning de performance critique

---

### Etape 8 — Verification logs (par Claude via MCP)

**Outil** : `get_logs` (service: edge-function)

Verifier que le logging structure du premier sync est visible et parseable.

#### Criteres d'acceptation Etape 8
- Logs visibles avec events sync_start, fetch_complete, upsert_complete, sync_complete
- Pas d'erreurs inattendues

---

### Etape 9 — Migration code mobile (par Claude, code local)

#### 9.0 Verification des dependances npm

Avant toute modification de code, verifier que `@tanstack/react-query`
est present dans `package.json`. Si absent, lancer `npm install
@tanstack/react-query`. Si deja present, aucune action.

Note pour le Jalon 1.6 : `@expo-google-fonts/inter` devra etre installe
pour le design system. Pas d'action pour ce jalon.

#### 9a. Creer `lib/game-assets-fallback.ts`

Snapshot statique des donnees apres le premier sync. Format identique
aux types des tables Supabase. Contient :
- `FALLBACK_AGENTS` : array des 29 agents
- `FALLBACK_MAPS` : array des ~23 maps
- `FALLBACK_GAME_MODES` : array des ~15 game modes

Genere par Claude via `execute_sql` puis mis en forme TypeScript.

#### 9b. Modifier `lib/game-assets.ts`

- Supprimer `VALORANT_AGENTS`, `VALORANT_MAPS`
- Supprimer `VALORANT_GAME_MODES`
- Conserver `VALORANT_RANKS` (pas d'endpoint API)
- Conserver types (`AgentRole`, `AgentMeta`, `MapMeta`, `RankMeta`)
- Renommer `GameModeMeta` en `GameModeScrimMeta` (metadonnees Scrim)
- Les types des tables Supabase sont generes dans `types/database.ts`
- Conserver utilitaires (`getAssetUrl`, `getGameLogoUrl`, `getRankLabel`, `getRankImage`)
- Ajouter `GAME_MODE_SCRIM_META` : mapping par `displayName` API vers
  metadonnees Scrim (`hasRank`, `hasRrPenalty`, `maxPlayers`, `teamBased`,
  `lastsOptions`)

#### 9c. Reecrire `hooks/useGameAssets.ts`

- Remplacer les imports de constantes par des hooks React Query
- `useValorantAgents()` : fetch `valorant_agents`, `staleTime: 24h`,
  `placeholderData: FALLBACK_AGENTS`
- `useValorantMaps()` : fetch `valorant_maps`, meme pattern
- `useValorantGameModes()` : fetch `valorant_game_modes`, enrichi avec
  `GAME_MODE_SCRIM_META` cote client
- `useValorantSeasons()` et `useValorantActs()` : exposes pour le Jalon 1.3
- Hook composite `useGameAssets()` conserve pour retrocompatibilite,
  delegue aux hooks individuels

#### 9d. Adapter `app/(auth)/onboarding.tsx`

Verifier et adapter les imports si necessaire. Si le fichier utilise
`useGameAssets()`, il s'adaptera automatiquement.

#### Criteres d'acceptation Etape 9
- Plus aucune constante hardcodee pour agents, maps, game modes
- `VALORANT_RANKS` toujours present
- `useGameAssets()` retourne les donnees depuis Supabase
- Fallback fonctionne sans connexion reseau
- Aucune erreur TypeScript

---

### Etape 10 — Commits git (par Aymen)

Messages de commit suggeres :
1. `feat: create valorant data tables migration (agents, maps, modes, seasons, acts)`
2. `feat: deploy sync-valorant-data edge function`
3. `feat: configure pg_cron daily sync at 3h UTC`
4. `chore: regenerate database types with valorant tables`
5. `feat: replace hardcoded game assets with Supabase queries + fallback`
6. `docs: add jalon 1.1 spec and cron-jobs.sql reference`

---

### Etape 11 — Tests UI mobile (par Aymen)

- Lancer `npm start`, ouvrir sur device/emulateur
- Naviguer vers les ecrans affichant agents et maps
- Verifier que les donnees s'affichent correctement
- Couper le reseau, relancer l'app, verifier les fallbacks
- Verifier qu'aucun loading state genere ne bloque l'UX

## 5. Decisions d'architecture

### Pas de gestion des rows orphelines en v1

On ne supprime jamais de rows des tables Valorant. Si Riot retirait un
agent ou une map de l'API, la row resterait en base indefiniment. On
ne filtre pas les agents/maps potentiellement orphelins cote client et
on ne gere pas de champ `is_active`.

**Pourquoi** : Riot n'a jamais retire d'agent depuis le lancement de
Valorant en 2020. Les maps sortent de la rotation competitive mais
restent dans l'API. Le risque est quasi-nul et la complexite ajoutee
n'est pas justifiee pour la v1.

**Si ce cas se presente** : ajouter un champ `is_active boolean DEFAULT
true` via une migration dediee, mettre a jour l'Edge Function pour
le calculer, et filtrer cote client. C'est un changement mineur qui
ne casse rien.

**Pour un futur dev** : si tu lis ce spec dans 6 mois et que tu te
demandes pourquoi on n'a pas traite les orphelins, c'est intentionnel.
Voir cette section.

## 6. Criteres d'acceptation globaux

- [ ] 5 tables creees et peuplees avec donnees reelles
- [ ] Edge Function deployee et fonctionnelle
- [ ] Cron configure et verifie
- [ ] Code mobile lit depuis Supabase avec fallback
- [ ] Zero erreur TypeScript
- [ ] Zero warning advisor de securite sur les nouvelles tables
- [ ] Logs de sync visibles et structures

## 7. Rollback plan

### Si la migration SQL echoue
- Corriger le SQL et relancer `apply_migration` avec un nouveau nom
- Si necessaire, `execute_sql` avec `DROP TABLE IF EXISTS` sur les
  tables creees partiellement (ordre inverse : acts, seasons, game_modes,
  maps, agents)

### Si l'Edge Function echoue au deploy
- Verifier les logs via `get_logs`
- Corriger le code et re-deployer via `deploy_edge_function`

### Si le cron ne fonctionne pas
- Verifier avec `SELECT * FROM cron.job`
- `SELECT cron.unschedule('sync-valorant-data-daily')` puis re-creer

### Si la migration mobile casse l'app
- Les fallbacks garantissent que l'app reste fonctionnelle meme si
  Supabase est injoignable
- En dernier recours, `git revert` du commit de migration mobile
  pour revenir au hardcode

### Rollback complet
Si le jalon doit etre abandonne :
1. `DROP TABLE` des 5 tables (ordre : acts, seasons, game_modes, maps, agents)
2. `SELECT cron.unschedule('sync-valorant-data-daily')`
3. Supprimer l'Edge Function via le dashboard Supabase
4. `git revert` des commits du jalon
5. Regenerer `types/database.ts`
