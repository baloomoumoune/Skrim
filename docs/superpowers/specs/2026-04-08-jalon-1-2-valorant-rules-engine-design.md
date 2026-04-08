# Jalon 1.2 — Moteur de regles Valorant

> Spec d'implementation pour le module de regles Valorant pur TypeScript,
> sans dependance React Native, teste exhaustivement.
>
> Date : 2026-04-08
> Statut : En attente de validation utilisateur
> Source de verite metier : `docs/valorant-rules.md` (Season V26 Act 2)

---

## 1. Resume executif

Creer `lib/valorant-rules.ts`, un module pur TypeScript exportant
5 fonctions publiques + 1 utilitaire de parsing qui encodent les regles
officielles Valorant (party size, rank disparity, restrictions Immortal,
penalites RR, joueurs unranked). Le module est zero-dependance (pas
d'import React Native, pas d'import d'autres fichiers du projet).
L'appelant injecte `isRanked: boolean` pour determiner si les regles
strictes s'appliquent. 30+ tests unitaires via Jest (`jest-expo`)
couvrent exhaustivement `docs/valorant-rules.md`.

## 2. Pre-requis

- Documents lus : `docs/north-star.md`, `docs/roadmap-q2-2026.md`,
  `docs/valorant-rules.md`, `docs/design-system.md`
- Jalon 1.1 complete (tables Supabase, sync Edge Function)
- Branche git : `master`
- Format rank en DB : `diamond_2`, `iron_1`, `unranked`, `radiant`
  (colonne `profiles.current_rank`, type `text | null`)

## 3. Checklist des livrables

- [ ] Setup Jest via `jest-expo` (install + config package.json)
- [ ] Module `lib/valorant-rules.ts` avec types, constantes, 6 fonctions exportees
- [ ] Tests `lib/__tests__/valorant-rules.test.ts` (30+ cas)
- [ ] Zero erreur TypeScript, tous les tests passent
- [ ] Verification manuelle des tables de donnees contre `docs/valorant-rules.md`

## 4. Decisions d'architecture (validees en brainstorming)

| Sujet | Decision | Justification |
|---|---|---|
| Representation ranks | `ParsedRank { id, tier, division, index }` + `parseRank()` | Expressif pour le metier, index pour l'arithmetique, parsing = validation |
| Game modes | Parametre `isRanked: boolean` injecte par l'appelant | Zero dependance, testable sans mock |
| getRRPenalty | Retourne `{ penalty: number, reason: PenaltyReason }` | Pedagogie North Star : le module sait pourquoi, l'UI sait comment le dire |
| canUnrankedJoin | Fonction specifique aux unranked | YAGNI : facade generalisee reportee au Jalon 2.1 |
| Framework tests | Jest via `jest-expo` preset | Setup unique, compatible composants RN pour jalons futurs |
| Arborescence | `lib/valorant-rules.ts` + `lib/__tests__/valorant-rules.test.ts` | Convention Jest standard, module petit et coherent |
| Validation ranks DB | `parseRank()` seul, pas de migration | Le champ n'est ecrit que par l'app, risque quasi nul |

## 5. Types exportes

```typescript
// ── Rank types ──────────────────────────────────────

type RankTier =
  | 'unranked'
  | 'iron'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'ascendant'
  | 'immortal'
  | 'radiant';

interface ParsedRank {
  id: string;            // valeur DB originale : 'diamond_2', 'unranked', 'radiant'
  tier: RankTier;        // tier extrait : 'diamond', 'unranked', 'radiant'
  division: 0 | 1 | 2 | 3;  // 1-3 pour les ranks a tiers, 0 pour unranked et radiant
  index: number;         // 0-25, ordinal pour arithmetique et comparaisons
}

// ── RR Penalty types ────────────────────────────────

type PenaltyReason =
  | 'none'
  | 'outside_rank_window'
  | 'diamond3_plus_present'
  | 'radiant_present';

interface RRPenaltyResult {
  penalty: number;       // 0, 0.25, ou 0.75
  reason: PenaltyReason; // cle machine pour l'UI
}
```

## 6. Constantes internes

### RANK_TIERS (ordre des tiers)

```typescript
const RANK_TIERS: RankTier[] = [
  'unranked', 'iron', 'bronze', 'silver', 'gold',
  'platinum', 'diamond', 'ascendant', 'immortal', 'radiant',
];
```

### RANK_ORDER (mapping rank ID → index ordinal)

26 entrees, de `unranked` (0) a `radiant` (25).

```
unranked    → 0
iron_1      → 1
iron_2      → 2
iron_3      → 3
bronze_1    → 4
bronze_2    → 5
bronze_3    → 6
silver_1    → 7
silver_2    → 8
silver_3    → 9
gold_1      → 10
gold_2      → 11
gold_3      → 12
platinum_1  → 13
platinum_2  → 14
platinum_3  → 15
diamond_1   → 16
diamond_2   → 17
diamond_3   → 18
ascendant_1 → 19
ascendant_2 → 20
ascendant_3 → 21
immortal_1  → 22
immortal_2  → 23
immortal_3  → 24
radiant     → 25
```

### RANK_DISPARITY_TABLE (disparite duo/trio)

Mapping : rank ID du joueur le plus bas → rank ID maximum autorise.

Transcrit ligne par ligne depuis `docs/valorant-rules.md` section 3.

```
iron_1      → silver_3
iron_2      → silver_3
iron_3      → silver_3
bronze_1    → silver_3
bronze_2    → silver_3
bronze_3    → silver_3
silver_1    → gold_3
silver_2    → gold_3
silver_3    → gold_3
gold_1      → platinum_3
gold_2      → platinum_3
gold_3      → platinum_3
platinum_1  → diamond_1
platinum_2  → diamond_2
platinum_3  → diamond_3
diamond_1   → ascendant_1
diamond_2   → ascendant_2
diamond_3   → ascendant_3
ascendant_1 → immortal_1
ascendant_2 → immortal_2
ascendant_3 → immortal_3
immortal_1  → radiant
immortal_2  → radiant
immortal_3  → radiant
radiant     → radiant
```

Note : `unranked` n'apparait pas dans cette table. Les unranked ont
leur propre regle (voir `canUnrankedJoin`).

### RANK_DISPARITY_MIN_TABLE (minimum autorise duo/trio)

Table pre-calculee inverse : pour un rank donne, quel est le rank
**le plus bas** autorise dans le groupe en duo/trio.

Derivee de RANK_DISPARITY_TABLE : pour un rank X, le min est le rank
le plus bas Y tel que RANK_DISPARITY_TABLE[Y] >= X.

```
iron_1      → iron_1
iron_2      → iron_1
iron_3      → iron_1
bronze_1    → iron_1
bronze_2    → iron_1
bronze_3    → iron_1
silver_1    → iron_1
silver_2    → iron_1
silver_3    → iron_1
gold_1      → silver_1
gold_2      → silver_1
gold_3      → silver_1
platinum_1  → gold_1
platinum_2  → gold_1
platinum_3  → gold_1
diamond_1   → platinum_1
diamond_2   → platinum_2
diamond_3   → platinum_3
ascendant_1 → diamond_1
ascendant_2 → diamond_2
ascendant_3 → diamond_3
immortal_1  → ascendant_1
immortal_2  → ascendant_2
immortal_3  → ascendant_3
radiant     → immortal_1
```

**Cas Radiant** : la table Riot (docs/valorant-rules.md section 3) dit
que Immortal 1, 2 et 3 ont tous "Radiant maximum" comme plus haut
autorise. Donc quand un Radiant est dans un duo, si le plus bas est
Immortal 1, la ligne "Immortal 1 → Radiant" autorise le groupe.
Par consequent le min d'un Radiant est `immortal_1` (pas `radiant`).
Un Radiant peut jouer en duo avec n'importe quel Immortal.

### FIVE_STACK_PENALTY_RULES

Regles evaluees dans l'ordre de priorite (la premiere qui matche gagne) :

1. Si un joueur est Radiant (`index >= 25`) → `{ penalty: 0.75, reason: 'radiant_present' }`
2. Si un joueur est Diamond 3+ (`index >= 18`) → `{ penalty: 0.25, reason: 'diamond3_plus_present' }`
3. Si l'ecart entre le rank le plus bas et le plus haut depasse 3 ranks complets (9 index) → `{ penalty: 0.25, reason: 'outside_rank_window' }`
4. Sinon → `{ penalty: 0, reason: 'none' }`

Note sur la regle 3 : "fenetre de 3 ranks" = 9 positions d'index
(un rank complet = 3 tiers = 3 index). Ex: Iron 1 (1) a Gold 1 (10)
= ecart de 9 = exactement 3 ranks = OK. Iron 1 (1) a Gold 2 (11)
= ecart de 10 = hors fenetre = penalite.

## 7. Fonctions exportees

### parseRank(value: string): ParsedRank | null

- Prend une valeur brute de la DB (`'diamond_2'`, `'unranked'`, `'radiant'`)
- Retourne un `ParsedRank` si la valeur est un rank valide, `null` sinon
- Logique : split sur `_`, verifie que le tier est dans `RANK_TIERS`,
  verifie la division (0 pour unranked/radiant, 1-3 pour les autres),
  lookup dans `RANK_ORDER` pour l'index

### isValidPartySize(size: number, isRanked: boolean): boolean

- Si `isRanked === false` → toujours `true`
- Si `isRanked === true` → `true` pour 1, 2, 3, 5. `false` pour 4 et tout autre nombre
- Regle : les 4-stacks sont interdits en Competitive/Premier

### getAllowedRankRange(rank: ParsedRank, isRanked: boolean): { min: ParsedRank, max: ParsedRank } | null

- Si `isRanked === false` → retourne `null` (pas de restriction)
- Si `rank.tier === 'unranked'` → retourne `null` (les unranked ont
  leur propre regle via `canUnrankedJoin`, pas de fenetre duo/trio)
- Sinon : lookup dans `RANK_DISPARITY_TABLE[rank.id]` pour le max autorise,
  et dans `RANK_DISPARITY_MIN_TABLE[rank.id]` pour le min autorise.
  Les deux tables sont pre-calculees, pas de logique dynamique.
- Retourne `{ min, max }` sous forme de `ParsedRank`
- Usage : "Ton groupe ranked peut accueillir des joueurs entre [min] et [max]"

### isTrioAllowed(highestRank: ParsedRank, isRanked: boolean): boolean

- Si `isRanked === false` → toujours `true`
- Si `highestRank.tier === 'immortal' || highestRank.tier === 'radiant'` → `false`
- Sinon → `true`
- Regle : les trios sont interdits a partir d'Immortal 1

### getRRPenalty(members: ParsedRank[], isRanked: boolean): RRPenaltyResult

- Si `isRanked === false` → `{ penalty: 0, reason: 'none' }`
- Si `members.length !== 5` → `{ penalty: 0, reason: 'none' }`
  (les penalites RR ne s'appliquent qu'aux 5-stacks)
- Evalue les regles de `FIVE_STACK_PENALTY_RULES` dans l'ordre de
  priorite : radiant > diamond3+ > hors fenetre > aucune
- Retourne `{ penalty, reason }`

### canUnrankedJoin(highestRank: ParsedRank, isRanked: boolean): boolean

- Si `isRanked === false` → toujours `true`
- Si `highestRank.index <= RANK_ORDER['gold_3']` (index 12) → `true`
- Sinon → `false`
- Regle : les unranked ne peuvent jouer qu'avec des joueurs Iron a Gold

## 8. Plan d'execution

### Etape 1 — Setup Jest (par Claude)

Installer les dependances :
```bash
npx expo install -- --save-dev jest-expo jest @types/jest
```

Ajouter dans `package.json` :
```json
{
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo"
  }
}
```

#### Criteres d'acceptation Etape 1
- `npm test` execute sans erreur (0 test, 0 failure)
- `jest-expo`, `jest`, `@types/jest` dans devDependencies

---

### Etape 2 — Ecrire les constantes et `parseRank` (par Claude)

Creer `lib/valorant-rules.ts` avec :
1. Types : `RankTier`, `ParsedRank`, `PenaltyReason`, `RRPenaltyResult`
2. Constantes : `RANK_TIERS`, `RANK_ORDER`, `RANK_DISPARITY_TABLE`,
   `RANK_DISPARITY_MIN_TABLE`, `FIVE_STACK_PENALTY_RULES`
3. Fonction : `parseRank()`

**CHECKPOINT 1** : s'arreter ici. L'utilisateur verifie ligne par ligne
les constantes `RANK_ORDER`, `RANK_DISPARITY_TABLE`,
`RANK_DISPARITY_MIN_TABLE` et `FIVE_STACK_PENALTY_RULES` contre
`docs/valorant-rules.md`. Les DEUX tables de disparite doivent etre
verifiees independamment. Aucune typo silencieuse ne doit passer — une
erreur dans ces tables corromprait toute la logique de matching sans
qu'aucun test ne le detecte.

#### Criteres d'acceptation Etape 2
- Le fichier compile sans erreur TypeScript
- `parseRank('diamond_2')` retourne `{ id: 'diamond_2', tier: 'diamond', division: 2, index: 17 }`
- `parseRank('invalid')` retourne `null`
- Validation utilisateur des tables

---

### Etape 3 — Ecrire les 5 fonctions publiques (par Claude)

Ajouter dans `lib/valorant-rules.ts` :
1. `isValidPartySize()`
2. `getAllowedRankRange()`
3. `isTrioAllowed()`
4. `getRRPenalty()`
5. `canUnrankedJoin()`

**CHECKPOINT 2** : s'arreter ici. L'utilisateur relit les signatures
et la logique de chaque fonction. On corrige avant d'ecrire les tests.

#### Criteres d'acceptation Etape 3
- Le fichier compile sans erreur TypeScript
- Chaque fonction suit la spec de la section 7
- Validation utilisateur de la logique

---

### Etape 4 — Ecrire les tests (par Claude)

Creer `lib/__tests__/valorant-rules.test.ts` avec 30+ cas organises
par fonction :

#### parseRank (5+ cas)
- `parseRank('iron_1')` → `{ id: 'iron_1', tier: 'iron', division: 1, index: 1 }`
- `parseRank('radiant')` → `{ id: 'radiant', tier: 'radiant', division: 0, index: 25 }`
- `parseRank('unranked')` → `{ id: 'unranked', tier: 'unranked', division: 0, index: 0 }`
- `parseRank('diamond_4')` → `null` (division invalide)
- `parseRank('master_1')` → `null` (tier inexistant)
- `parseRank('')` → `null`

#### isValidPartySize (6+ cas)
- `isValidPartySize(1, true)` → `true`
- `isValidPartySize(2, true)` → `true`
- `isValidPartySize(3, true)` → `true`
- `isValidPartySize(4, true)` → `false` (regle absolue)
- `isValidPartySize(5, true)` → `true`
- `isValidPartySize(4, false)` → `true` (pas de restriction hors ranked)

#### getAllowedRankRange (10+ cas)
- Iron 1 → min Iron 1, max Silver 3
- Gold 1 → min Silver 1, max Platinum 3
- Gold 3 → min Silver 1, max Platinum 3
- Platinum 1 → min Gold 1, max Diamond 1
- Platinum 3 → min Gold 1, max Diamond 3
- Diamond 2 → min Platinum 2, max Ascendant 2
- Immortal 1 → min Ascendant 1, max Radiant
- Radiant → min Immortal 1, max Radiant (Radiant peut duo avec Immortal+)
- Non-ranked → `null`
- Unranked → `null`

#### isTrioAllowed (5+ cas)
- `isTrioAllowed(parse('diamond_3'), true)` → `true`
- `isTrioAllowed(parse('immortal_1'), true)` → `false`
- `isTrioAllowed(parse('radiant'), true)` → `false`
- `isTrioAllowed(parse('immortal_1'), false)` → `true` (hors ranked)
- `isTrioAllowed(parse('ascendant_3'), true)` → `true` (limite basse)

#### getRRPenalty (8+ cas)
- 5 joueurs Iron 1 a Gold 3 (dans fenetre) → `{ penalty: 0, reason: 'none' }`
- 5 joueurs avec ecart > 3 ranks, tous sous Diamond 2 → `{ penalty: 0.25, reason: 'outside_rank_window' }`
- 5 joueurs dont un Diamond 3 → `{ penalty: 0.25, reason: 'diamond3_plus_present' }`
- 5 joueurs dont un Radiant → `{ penalty: 0.75, reason: 'radiant_present' }`
- 5 joueurs tous Radiant → `{ penalty: 0.75, reason: 'radiant_present' }`
- 3 joueurs (pas un 5-stack) → `{ penalty: 0, reason: 'none' }`
- 5 joueurs, non-ranked → `{ penalty: 0, reason: 'none' }`
- Cas limite : Iron 1 + Gold 1 (ecart = 9 = exactement 3 ranks) → `{ penalty: 0, reason: 'none' }`

#### canUnrankedJoin (4+ cas)
- `canUnrankedJoin(parse('gold_3'), true)` → `true`
- `canUnrankedJoin(parse('platinum_1'), true)` → `false`
- `canUnrankedJoin(parse('iron_1'), true)` → `true`
- `canUnrankedJoin(parse('gold_3'), false)` → `true` (hors ranked)

**CHECKPOINT 3** : s'arreter ici. L'utilisateur verifie la couverture
des cas de bord. On execute `npm test` et on verifie que tout passe
avant de committer.

#### Criteres d'acceptation Etape 4
- 30+ tests, tous passent
- Couverture des limites de la table de disparite
- Couverture Radiant, Unranked, modes non-ranked
- Validation utilisateur des cas de bord

---

### Etape 5 — Commits git (par Aymen)

Messages de commit suggeres :
1. `chore: setup jest via jest-expo for unit testing`
2. `feat: add valorant rules engine with rank parsing, disparity, penalties`
3. `test: add 30+ exhaustive tests for valorant rules engine`

---

### Etape 6 — Verification finale (par Aymen)

- `npm test` passe (0 failures)
- `npx tsc --noEmit` compile sans erreur
- Relecture rapide des constantes contre `docs/valorant-rules.md`

## 9. Decisions d'architecture

### Pas de facade validateJoinRequest en v1

Le module exporte les 5 fonctions atomiques + `parseRank`. Une fonction
facade qui orchestre toutes les regles d'un coup (`validateJoinRequest`)
sera ajoutee au Jalon 2.1 quand le feed bidirectionnel definira
precisement le contexte dont l'UI a besoin.

**Pourquoi** : YAGNI. On ne sait pas encore si l'UI appellera les
fonctions une par une ou en batch. Les briques atomiques suffisent.

### Le module ne connait pas les game modes

Le module recoit `isRanked: boolean` en parametre. Il ne sait pas ce
qu'est "competitive" ou "unrated". La resolution `gameMode → isRanked`
reste dans la couche UI via `GAME_MODE_SCRIM_META[mode].hasRank`.

**Pourquoi** : zero dependance, testabilite maximale, separation des
responsabilites (le module sait les regles, l'UI sait le contexte).

### parseRank comme seule validation des ranks DB

La colonne `profiles.current_rank` est `text` libre. Le module ne
propose pas de migration DB (enum ou CHECK constraint). `parseRank()`
retourne `null` pour les valeurs invalides, et c'est l'appelant qui
decide quoi faire (ignorer, afficher un fallback, logger).

**Pourquoi** : le champ n'est ecrit que par l'app elle-meme. Le risque
de valeur invalide est quasi nul. Si l'integration Riot API RSO arrive
(Jalon 3.4), on reevaluera.

### Convention de test

- Framework : Jest via `jest-expo` preset (multi-plateforme, pas /ios)
- Fichier : `lib/__tests__/valorant-rules.test.ts`
- Convention : `.test.ts` (pas `.spec.ts`)
- Organisation : un `describe` par fonction exportee

## 10. Criteres d'acceptation globaux

- [ ] `jest-expo`, `jest`, `@types/jest` dans devDependencies
- [ ] `npm test` passe sans erreur
- [ ] `lib/valorant-rules.ts` exporte : `parseRank`, `isValidPartySize`,
      `getAllowedRankRange`, `isTrioAllowed`, `getRRPenalty`, `canUnrankedJoin`
- [ ] `lib/valorant-rules.ts` exporte les types : `ParsedRank`, `RankTier`,
      `PenaltyReason`, `RRPenaltyResult`
- [ ] 30+ tests passent dans `lib/__tests__/valorant-rules.test.ts`
- [ ] Zero erreur TypeScript (`npx tsc --noEmit`)
- [ ] Tables de constantes verifiees manuellement contre `docs/valorant-rules.md`
- [ ] Aucun import d'autres fichiers du projet dans `valorant-rules.ts`

## 11. Rollback plan

### Si le setup Jest casse le build Expo
- `npm uninstall jest-expo jest @types/jest`
- Supprimer la section `jest` de `package.json`
- Supprimer le script `test`
- Le projet revient a l'etat pre-jalon

### Si le module a des erreurs TypeScript
- Le module est isole (`lib/valorant-rules.ts`), aucun autre fichier
  ne l'importe encore. Supprimer le fichier suffit.

### Rollback complet
1. `git revert` des commits du jalon
2. `npm uninstall jest-expo jest @types/jest` si necessaire
3. Le projet revient exactement a l'etat post-Jalon 1.1
