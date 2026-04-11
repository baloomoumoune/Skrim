# Jalon 1.3 — Gestion automatique des rank resets Valorant

> Spec d'implémentation pour la détection automatique des changements
> de Season Valorant, le reset des ranks utilisateurs, et la
> notification push associée.
>
> Date : 2026-04-09
> Statut : En attente de validation utilisateur

---

## 1. Résumé exécutif

Quand une nouvelle Season Valorant commence (2 fois par an), Scrim
doit automatiquement :

1. Détecter le basculement de Season via `sync-valorant-data`
2. Reset `current_rank` → `'unranked'` pour tous les utilisateurs
   rankés, en sauvegardant le rank précédent
3. Notifier tous les utilisateurs affectés via push
4. Afficher dans le profil "Last rank: X" tant que le rank est
   `unranked`
5. Afficher un banner d'incitation dans le Home

Le mécanisme s'appuie sur :
- Un flag `reset_processed` sur `valorant_seasons` (idempotence)
- Une fonction PL/pgSQL transactionnelle `process_rank_reset` (atomicité)
- Une nouvelle Edge Function `handle-rank-reset` (séparation des
  responsabilités)
- Une modification de `send-push` pour le batching Expo (contrainte
  API 100 messages max)

## 2. Pré-requis

- **Jalons livrés** : 1.1 (sync-valorant-data), 1.2 (valorant-rules.ts)
- **Documents lus** : `docs/north-star.md`, `docs/roadmap-q2-2026.md`,
  `docs/valorant-rules.md`, `docs/design-system.md`,
  `docs/supabase-discipline.md`, `docs/db-drift-report-2026-04-09.md`
- **Infra existante** : Edge Functions `sync-valorant-data`,
  `send-push`, `on-match-event` déployées. Cron quotidien 3h UTC actif.
  Push notifications opérationnelles (Expo)
- **Projet Supabase ref** : `nlmtbflnzykjuwqigctt`

## 3. Checklist des livrables

- [ ] Migration SQL : colonnes `profiles`, colonne `valorant_seasons`,
      fonction PL/pgSQL `process_rank_reset`
- [ ] Edge Function `handle-rank-reset` créée et déployée
- [ ] Edge Function `send-push` modifiée (batching par 100) et
      redéployée
- [ ] Edge Function `sync-valorant-data` modifiée (détection
      avant/après Season) et redéployée
- [ ] Types TypeScript régénérés (`types/database.ts`)
- [ ] UI profil : affichage "Last rank: X" conditionnel
- [ ] UI Home : banner dismissable post-reset avec CTA
- [ ] Écran profil : support du query param `?openRankEditor=true`
- [ ] Test complet avec utilisateur de test dédié
- [ ] Cleanup post-test
- [ ] Git : tous les fichiers versionnés et committés

## 4. Décisions d'architecture

### 4.1 Détection du basculement de Season

**Choix** : `sync-valorant-data` compare la Season `is_current = true`
avant et après l'appel `updateIsCurrent()`. Si l'UUID change ET que la
nouvelle Season a `reset_processed = false`, elle appelle
`handle-rank-reset` via `supabase.functions.invoke()`.

**Pourquoi pas un trigger Postgres** : Les triggers silencieux sont la
source #1 de bugs invisibles. Nécessiterait `pg_net`. Le flux doit
rester explicite et traçable dans les logs de sync-valorant-data.

**Pourquoi pas une table séparée + cron** : Le flag `reset_processed`
directement sur `valorant_seasons` est auto-documenté, ne nécessite
aucune table supplémentaire, et garantit l'idempotence (rejouer
sync-valorant-data N fois le même jour ne déclenche qu'un seul reset).

### 4.2 Atomicité du reset

**Choix** : Fonction PL/pgSQL `process_rank_reset` appelée via RPC
depuis l'Edge Function.

**Pourquoi** : Race condition identifiée — si l'UPDATE profiles réussit
mais le marquage `reset_processed = true` échoue, le lendemain
sync-valorant-data redéclenche le reset et écrase
`previous_rank_before_reset` avec `'unranked'`. La transaction
Postgres avec `FOR UPDATE` lock sur la Season élimine ce risque.

### 4.3 Batching des notifications push

**Choix** : Modifier `send-push` pour chunker par lots de 100 en
interne.

**Pourquoi** : L'API Expo Push accepte max 100 messages par requête.
C'est une contrainte dure documentée, pas une optimisation. Le reset
est one-shot par Season (2x/an) — si le batch est tronqué, on ne le
découvre que des jours plus tard. Le coût : ~10 lignes dans send-push,
bénéficie à tous les appelants existants.

### 4.4 Scope de test isolé

**Choix** : Paramètre optionnel `target_user_ids` sur la RPC et l'Edge
Function.

**Pourquoi** : Permet de tester le flux complet sans toucher aux vrais
profils. En production normale (appel depuis sync-valorant-data), le
paramètre n'est pas fourni et le reset s'applique à tous les profils
rankés.

## 5. Migration SQL

Fichier : `supabase/migrations/YYYYMMDDHHMMSS_jalon_1_3_rank_reset.sql`

### 5.1 Colonnes profiles

```sql
ALTER TABLE profiles
  ADD COLUMN previous_rank_before_reset text DEFAULT NULL,
  ADD COLUMN last_rank_reset_at timestamptz DEFAULT NULL;
```

- `previous_rank_before_reset` : `text`, nullable, `DEFAULT NULL`.
  `NULL` = jamais resetté. Contient le rank au format existant
  (`'diamond_2'`, `'ascendant_1'`, etc.). N'est jamais effacé — reste
  comme historique permanent. L'UI le montre uniquement quand
  `current_rank = 'unranked'`.
- `last_rank_reset_at` : `timestamptz`, nullable, `DEFAULT NULL`.
  `NULL` = jamais resetté. Mis à jour uniquement pour les profils qui
  avaient un vrai rank au moment du reset.

### 5.2 Colonne valorant_seasons

```sql
ALTER TABLE valorant_seasons
  ADD COLUMN reset_processed boolean NOT NULL DEFAULT false;
```

- Flag d'idempotence. `false` = cette Season n'a pas encore déclenché
  de reset. `true` = déjà traité. `sync-valorant-data` vérifie ce flag
  avant d'appeler `handle-rank-reset`.

### 5.3 Fonction PL/pgSQL `process_rank_reset`

```sql
CREATE OR REPLACE FUNCTION process_rank_reset(
  p_season_uuid text,
  p_target_user_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(affected_count int, user_ids uuid[])
LANGUAGE plpgsql AS $$
DECLARE
  v_season_ready boolean;
  v_user_ids uuid[];
  v_count int;
BEGIN
  -- Lock explicite sur la ligne de la Season
  -- Le SELECT ... FOR UPDATE pose le lock même si la condition est false
  -- Cela distingue "Season inexistante" de "Season déjà traitée"
  SELECT reset_processed = false INTO v_season_ready
  FROM valorant_seasons
  WHERE uuid = p_season_uuid
  FOR UPDATE;

  IF v_season_ready IS NULL THEN
    RAISE EXCEPTION 'Season % not found', p_season_uuid;
  END IF;

  IF v_season_ready = false THEN
    RAISE EXCEPTION 'Season % already processed', p_season_uuid;
  END IF;

  -- Update profiles : sauvegarder le rank et reset
  -- Si p_target_user_ids est fourni, scope limité (mode test)
  -- Si NULL, tous les profils rankés (mode production)
  WITH updated AS (
    UPDATE profiles
    SET previous_rank_before_reset = current_rank,
        current_rank = 'unranked',
        last_rank_reset_at = now()
    WHERE current_rank IS NOT NULL
      AND current_rank != 'unranked'
      AND (p_target_user_ids IS NULL OR id = ANY(p_target_user_ids))
    RETURNING id
  )
  SELECT array_agg(id), count(*)::int INTO v_user_ids, v_count FROM updated;

  -- Marquer la Season comme traitée
  UPDATE valorant_seasons
  SET reset_processed = true
  WHERE uuid = p_season_uuid;

  RETURN QUERY SELECT v_count, v_user_ids;
END;
$$;
```

**Points critiques** :
- `SELECT ... INTO ... FOR UPDATE` verrouille la ligne de la Season
  pendant toute la transaction — empêche un double reset concurrent.
  Distingue deux cas d'erreur : Season inexistante (`NULL`) vs déjà
  traitée (`false`), ce qui aide pour les logs et le debug
- Le `WHERE` sur profiles skip les unranked et les NULL
  (décision Q3 — Option A)
- `p_target_user_ids` optionnel : `NULL` = tous les profils (prod),
  fourni = scope limité (test)
- Retourne `(affected_count, user_ids[])` — l'EF utilise `user_ids`
  pour le push

## 6. Edge Function `handle-rank-reset`

Fichier : `supabase/functions/handle-rank-reset/index.ts`

### 6.1 Interface

```typescript
// Entrée (POST body)
interface RankResetRequest {
  season_uuid: string;
  dry_run?: boolean;          // default false
  target_user_ids?: string[]; // default null (tous les profils)
}

// Sortie (JSON response)
interface RankResetResponse {
  success: boolean;
  season_uuid: string;
  dry_run: boolean;
  affected_count: number;
  notified_count: number;
  errors: string[];
}
```

### 6.2 Flux

```
1. Auth : vérifier Bearer service_role_key (401 si invalide)
2. Valider season_uuid présent dans le body (400 si absent)
3. Vérifier que la Season existe et reset_processed = false (409 si déjà traitée)
4. Si dry_run :
   a. SELECT count(*) des profils qui seraient affectés
      (WHERE current_rank IS NOT NULL AND != 'unranked'
       AND (target_user_ids IS NULL OR id = ANY(target_user_ids)))
   b. Retourner { success: true, dry_run: true, affected_count, notified_count: 0 }
5. Appeler RPC process_rank_reset(season_uuid, target_user_ids)
   → Récupérer { affected_count, user_ids }
6. Si user_ids non vide :
   Appeler send-push via supabase.functions.invoke('send-push', {
     body: {
       user_ids,
       title: 'New Valorant Season',
       body: 'Ranks have been reset. Complete your placement matches and update your rank in Scrim.'
     }
   })
7. Retourner { success: true, affected_count, notified_count, season_uuid }
```

**Gestion d'erreur** :
- Si la RPC lève une exception (Season déjà traitée) → 409 Conflict
- Si send-push échoue → log l'erreur, retourner quand même
  `success: true` avec l'erreur dans `errors[]`. Les données DB sont
  propres (reset fait, flag mis). Le push peut être retry manuellement
- L'EF ne throw jamais — toujours 200/400/401/409 avec un body JSON

## 7. Modification de `send-push`

Fichier : `supabase/functions/send-push/index.ts`

### 7.1 Changement

Ajouter le chunking des messages Expo par lots de 100 avant l'envoi.
Le code actuel fait un seul `fetch` à Expo avec tous les messages.
Le code modifié boucle par chunks :

```typescript
const EXPO_BATCH_SIZE = 100;

// Remplacer le fetch unique par :
const results = [];
for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
  const chunk = messages.slice(i, i + EXPO_BATCH_SIZE);
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(chunk),
  });
  const data = await res.json();
  results.push(data);
}
```

### 7.2 Impact

- Rétrocompatible : pour < 100 messages (cas actuel de on-match-event),
  la boucle fait une seule itération
- Le response body change de `{ sent, result }` à `{ sent, results }`
  (tableau de réponses Expo). Aucun appelant actuel ne consomme ce
  champ de retour, donc pas de breaking change

## 8. Modification de `sync-valorant-data`

Fichier : `supabase/functions/sync-valorant-data/index.ts`

### 8.1 Changement

Ajouter la détection de changement de Season dans le handler principal.
**Important** : la lecture de `seasonBefore` se fait tout en haut du
handler, avant les fetchs et upserts, pour figer l'état de référence.
La lecture de `seasonAfter` se fait après `updateIsCurrent()`. Les
deux utilisent `.order('start_time', { ascending: false }).limit(1)`
pour gérer le cas transitoire où deux Seasons ont `is_current = true`
entre les deux UPDATE successifs de `updateIsCurrent()` :

```typescript
// Tout en HAUT du handler, AVANT les fetchs valorant-api.com
// On fige l'état de référence avant toute modification
const { data: seasonBefore } = await supabase
  .from('valorant_seasons')
  .select('uuid')
  .eq('is_current', true)
  .order('start_time', { ascending: false })
  .limit(1)
  .maybeSingle();

// ... tout le code existant de sync (fetch, upsert seasons, acts, etc.) ...
// ... updateIsCurrent() ...

// APRÈS updateIsCurrent : relire la Season courante
// .order() + .limit(1) pour éviter le crash si deux Seasons ont
// brièvement is_current=true entre les deux UPDATE de updateIsCurrent()
const { data: seasonAfter } = await supabase
  .from('valorant_seasons')
  .select('uuid, reset_processed')
  .eq('is_current', true)
  .order('start_time', { ascending: false })
  .limit(1)
  .maybeSingle();

// Détecter le basculement
if (
  seasonAfter &&
  seasonAfter.uuid !== seasonBefore?.uuid &&
  !seasonAfter.reset_processed
) {
  log('season_change_detected', {
    from: seasonBefore?.uuid ?? 'none',
    to: seasonAfter.uuid,
  });

  // Appeler handle-rank-reset
  const { error } = await supabase.functions.invoke('handle-rank-reset', {
    body: { season_uuid: seasonAfter.uuid },
  });

  if (error) {
    log('rank_reset_error', { error: error.message });
  } else {
    log('rank_reset_triggered', { season_uuid: seasonAfter.uuid });
  }
}
```

### 8.2 Idempotence

Si `sync-valorant-data` tourne plusieurs fois le même jour :
- 1er run : `seasonBefore.uuid !== seasonAfter.uuid` ET
  `reset_processed = false` → appelle handle-rank-reset → la RPC met
  `reset_processed = true`
- 2e run : soit les UUIDs sont identiques (pas de changement détecté),
  soit `reset_processed = true` → pas d'appel
- Double protection : la RPC vérifie aussi `reset_processed = false`
  avec `FOR UPDATE` lock

## 9. UI profil — Affichage post-reset

### 9.1 Logique d'affichage

```typescript
// Condition d'affichage du sous-texte "Last rank"
const showLastRank =
  profile.previous_rank_before_reset != null &&
  profile.current_rank === 'unranked';
```

- **Visible** : quand l'utilisateur est `unranked` suite à un reset
  (c'est-à-dire `previous_rank_before_reset` est non-null)
- **Disparaît automatiquement** : dès que l'utilisateur met à jour son
  rank post-placements (`current_rank !== 'unranked'`)
- **`previous_rank_before_reset` n'est jamais effacé** : il reste
  comme historique permanent en DB, mais n'est affiché que quand
  pertinent

### 9.2 Rendu visuel

```
┌─────────────────────────┐
│  [Unranked icon]        │
│  Unranked               │  ← text.primary, H3 (15px 500)
│  Last rank: Diamond 2   │  ← text.secondary, Caption (12px 400)
└─────────────────────────┘
```

- Le texte "Last rank: X" utilise le rank formaté lisiblement
  (pas `diamond_2` mais `Diamond 2`)
- Style : `text.secondary` (#A8A8A8), Caption size (12px, 400)
- Profil uniquement — pas dans les match cards ni le feed. Le
  north-star interdit de juger sur l'ancien rank

## 10. UI Home — Banner d'incitation

### 10.1 Logique d'affichage

```typescript
const showResetBanner =
  profile.current_rank === 'unranked' &&
  profile.previous_rank_before_reset != null &&
  !isBannerDismissed; // AsyncStorage key: `rank_reset_dismissed_${last_rank_reset_at}`
```

Trois conditions doivent être réunies. Le banner disparaît :
- **Automatiquement** quand l'utilisateur met à jour son rank
- **Manuellement** via le bouton dismiss (×)
- Le dismiss est persisté par `last_rank_reset_at` dans AsyncStorage
  (disponible directement depuis le profil, pas besoin de requêter
  `valorant_seasons` côté mobile)

### 10.2 Rendu visuel

```
┌──────────────────────────────────────────────────┐
│  ⚠  Ranks have been reset.                   ×  │
│     Update your rank now                    →    │
└──────────────────────────────────────────────────┘
```

- Position : sous le header, au-dessus du feed
- Couleur : fond subtil warning (`rgba(251, 191, 36, 0.12)`), texte
  `#FBBF24` pour l'icône warning, `text.primary` pour le texte
- Border : `0.5px #FBBF24` (StyleSheet.hairlineWidth)
- Border radius : 12px (md)
- CTA "Update your rank now →" : navigue vers le profil avec
  `?openRankEditor=true`
- Dismiss "×" : bouton ghost en haut à droite

### 10.3 Support `?openRankEditor=true` sur l'écran profil

L'écran profil doit lire le query parameter `openRankEditor` et, si
`true`, ouvrir automatiquement le bottom sheet/modal d'édition du rank
au montage. Modification dans le fichier de l'écran profil (tab
profile).

## 11. Workflow de test

### 11.1 Setup

1. Créer un utilisateur de test dans `auth.users` (email :
   `test-rank-reset@scrim.local`)
2. Le trigger `handle_new_user` crée automatiquement un profil associé
3. Set `current_rank = 'diamond_2'` sur le profil de test via UPDATE
   ciblé
4. Insérer une Season de test dans `valorant_seasons` :
   - UUID : `'00000000-0000-0000-0000-000000000001'`
   - `is_current = true`, `reset_processed = false`
   - `display_name = 'Test Season'`
   - `start_time = now()`, `end_time = now() + interval '6 months'`

### 11.2 Dry run

```
handle-rank-reset({
  season_uuid: '00000000-0000-0000-0000-000000000001',
  target_user_ids: ['<test_user_id>'],
  dry_run: true
})
```

Vérifier que `affected_count = 1`.

### 11.3 Test réel

```
handle-rank-reset({
  season_uuid: '00000000-0000-0000-0000-000000000001',
  target_user_ids: ['<test_user_id>']
})
```

**Assertions** :
- [ ] Profil de test : `current_rank = 'unranked'`
- [ ] Profil de test : `previous_rank_before_reset = 'diamond_2'`
- [ ] Profil de test : `last_rank_reset_at` rempli
- [ ] Season de test : `reset_processed = true`
- [ ] Logs send-push : push envoyé (ou "0 valid tokens" si pas de
      push_token sur le profil de test)
- [ ] Profil réel (Aymen) : **aucune modification**

### 11.4 Cleanup

```sql
DELETE FROM profiles WHERE id = '<test_user_id>';
DELETE FROM auth.users WHERE id = '<test_user_id>';
DELETE FROM valorant_seasons WHERE uuid = '00000000-0000-0000-0000-000000000001';
```

## 12. Fichiers impactés

| Fichier | Action |
|---------|--------|
| `supabase/migrations/YYYYMMDDHHMMSS_jalon_1_3_rank_reset.sql` | **Créer** — ALTER profiles, ALTER valorant_seasons, CREATE FUNCTION |
| `supabase/functions/handle-rank-reset/index.ts` | **Créer** — Nouvelle Edge Function |
| `supabase/functions/send-push/index.ts` | **Modifier** — Ajout batching par 100 |
| `supabase/functions/sync-valorant-data/index.ts` | **Modifier** — Détection changement Season + appel handle-rank-reset |
| `types/database.ts` | **Régénérer** — Nouveaux champs profiles + valorant_seasons |
| Écran profil (tab profile) | **Modifier** — Affichage "Last rank: X" + support `?openRankEditor=true` |
| Écran Home (tab home) | **Modifier** — Banner d'incitation post-reset |
| `supabase/cron-jobs.sql` | **Aucune modification** — Le cron existant appelle sync-valorant-data qui gère tout |

## 13. Checkpoints d'exécution

| CP | Étape | Validation humaine |
|----|-------|-------------------|
| **CP1** | Migration SQL écrite en local | Relire le SQL complet : ALTER TABLE, CREATE FUNCTION. Avant tout apply |
| **CP2** | Migration appliquée en prod | Vérifier via `execute_sql` que colonnes et fonction existent. Vérifier `git status` que le fichier local `supabase/migrations/` est en git. Règle supabase-discipline : local AVANT apply |
| **CP3** | `handle-rank-reset/index.ts` écrit en local | Relire le code complet de l'EF avant deploy |
| **CP4** | `send-push/index.ts` modifié (batching) | Relire le diff du chunking avant deploy |
| **CP5** | Les deux EF déployées | Vérifier logs de deploy. `ls supabase/functions/handle-rank-reset/` + `git status` confirment que le code local existe et est prêt à être commité. Règle supabase-discipline : local AVANT ou EN MÊME TEMPS que deploy |
| **CP6** | `sync-valorant-data/index.ts` modifié | Relire le diff (détection avant/après + appel handle-rank-reset) avant deploy |
| **CP7** | Test dry_run avec user de test | Valider le count retourné |
| **CP8** | Test réel avec user de test | Vérifier les 6 assertions (§11.3). Confirmer que le profil réel n'a pas bougé |
| **CP9** | Cleanup test + deploy sync-valorant-data | Valider que tout est propre |
| **CP10** | UI profil modifié | Vérifier le rendu "Unranked / Last rank: X" |
| **CP11** | Banner Home implémenté | Vérifier le rendu, le dismiss, le CTA avec `?openRankEditor=true` |
| **CP12** | `types/database.ts` régénéré | Vérifier que les nouveaux champs sont présents |
| **CP13** | Git final | Valider `git status`, commits, push. Vérifier `git log origin/master..HEAD` |

**Note CP5→CP6** : Entre ces deux checkpoints, `handle-rank-reset` est
déployée mais dormante. Elle n'est appelée par rien tant que
`sync-valorant-data` n'est pas mise à jour (CP6). Le cron existant
appelle l'ancienne version de sync-valorant-data. Zéro risque.

## 14. Hors scope

- Historique complet des ranks par Season (table `rank_history`) —
  prévu pour Phase B avec Riot RSO
- Notification personnalisée avec le rank précédent — le push est
  générique, le détail est dans le profil
- Affichage du previous rank dans les match cards/feed — interdit par
  le north-star (pas de jugement sur l'ancien rank)
- Reset automatique à mi-Season (mid-act reset) — même mécanisme,
  se déclenchera automatiquement quand valorant-api.com publiera la
  nouvelle Season mid-year
- Tests unitaires Jest pour l'EF — les Edge Functions sont testées
  end-to-end via le workflow §11

## 15. Rollback

Si le Jalon 1.3 doit être annulé :

1. Supprimer l'Edge Function `handle-rank-reset` du dashboard ou via
   CLI
2. Redéployer les versions précédentes de `sync-valorant-data` et
   `send-push` depuis git (les commits précédents sont la source de
   vérité)
3. Migration inverse :
   ```sql
   ALTER TABLE profiles
     DROP COLUMN previous_rank_before_reset,
     DROP COLUMN last_rank_reset_at;
   ALTER TABLE valorant_seasons
     DROP COLUMN reset_processed;
   DROP FUNCTION IF EXISTS process_rank_reset;
   ```
4. Régénérer `types/database.ts`
5. Revert les changements UI (profil + Home banner)
