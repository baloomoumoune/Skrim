# Supabase — Discipline de versioning

> Règles non négociables pour toute modification du backend Supabase de Scrim.
> Établies le 9 avril 2026 après la découverte et la réparation de la dette
> de versioning documentée dans `docs/db-drift-report-2026-04-09.md`.

## Le principe

**Git est la source de vérité du backend Supabase.** La production Supabase
est une instance qui exécute le code du repo, pas l'inverse. Si quelque chose
existe en prod mais pas en git, c'est un bug qu'il faut corriger immédiatement.

## Les règles

### 1. Toute modification de schéma passe par une migration en git

Avant toute modification de table, de colonne, de contrainte, d'index, d'enum,
de RLS policy ou de trigger :

1. Créer un fichier `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Écrire le SQL complet de la modification dans ce fichier
3. Appliquer la migration via `supabase db push` ou via `apply_migration` du MCP
4. Committer le fichier dans git **avant** de fermer la session

**Jamais** de modification directe via le SQL Editor de Supabase. Jamais de
`ALTER TABLE` one-shot. Si tu te retrouves à taper du SQL dans l'interface
web, tu es en train de créer de la dette invisible.

### 2. Toute Edge Function vit d'abord en git, puis en prod

Avant tout déploiement d'Edge Function :

1. Créer le dossier `supabase/functions/<nom>/`
2. Écrire le code complet dans `index.ts` (plus les fichiers auxiliaires si besoin)
3. Commiter le dossier dans git
4. Déployer via `supabase functions deploy <nom>` ou via `deploy_edge_function`
   du MCP

**Jamais** de modification directe du code via le dashboard Supabase. Si un
bug critique doit être corrigé en urgence, on modifie quand même en local
d'abord, on commit, puis on redéploie.

### 3. Toute fonction Postgres custom est définie dans une migration

Les fonctions PL/pgSQL, les triggers, et tout code procédural Postgres doivent
apparaître dans un fichier de migration en git, jamais être créés directement
via le SQL Editor.

Si tu dois créer une fonction `recalculate_team_rank` par exemple :
1. Fichier `supabase/migrations/YYYYMMDDHHMMSS_add_recalculate_team_rank.sql`
2. `CREATE OR REPLACE FUNCTION` dans ce fichier
3. Applique, commit, push

### 4. Les cron jobs sont dans `supabase/cron-jobs.sql`

Tout cron job actif en prod doit avoir sa définition dans `supabase/cron-jobs.sql`
en local. Le fichier est un mirror exact de la table `cron.job`. Si tu ajoutes
un cron, tu modifies ce fichier en même temps.

### 5. Checklist de fin de session

À la fin de chaque session qui touche au backend, avant de déclarer la session
terminée, vérifier :

- `git status` ne doit pas montrer de fichier `supabase/` non commité
- `ls supabase/migrations/` contient bien les migrations créées pendant la session
- `ls supabase/functions/` contient bien les nouvelles fonctions
- `git log origin/master..HEAD` ne doit pas montrer de commits locaux non poussés
- Après push : `git log origin/master..HEAD` doit être vide

Si une de ces vérifications échoue, la session n'est pas finie.

### 6. Audit périodique

Une fois par mois minimum (ou à chaque début de jalon qui touche au backend),
lancer un audit de divergence :

1. `supabase db dump --schema public -f /tmp/current.sql` pour dumper l'état actuel
2. Comparer avec `supabase/migrations/00000000000000_baseline.sql` et les migrations
   suivantes reconstituées
3. Toute divergence doit être investiguée et corrigée

Ce n'est pas paranoïaque, c'est la seule façon d'attraper les dérives avant
qu'elles ne deviennent un drame comme en avril 2026.

## Les outils de sécurité

### La CLI Supabase

Installée via `scoop install supabase`. Requiert Docker Desktop pour les dumps.
Commandes utiles :

```bash
supabase link --project-ref nlmtbflnzykjuwqigctt
supabase db dump --schema public -f supabase/migrations/XXXX_description.sql
supabase functions deploy <nom>
supabase db push
```

### Le MCP Supabase dans Claude Code

Quand on utilise le MCP dans une session Claude Code, les outils suivants sont
compatibles avec la discipline de versioning parce qu'ils permettent d'appliquer
ET de sauvegarder :

- `apply_migration` : applique un SQL et le nomme (mais il faut aussi créer le
  fichier local)
- `deploy_edge_function` : déploie (mais il faut aussi créer les fichiers locaux)
- `execute_sql` : read-only ou pour des ops ponctuelles, mais **jamais** pour
  des créations de schéma ou de fonctions

## Les 3 leçons qu'on a apprises

**Leçon 1** : "J'ai committé" et "j'ai pushé" sont deux choses différentes.
Toujours vérifier `git log origin/master..HEAD` après un push pour confirmer
que local et remote sont synchros.

**Leçon 2** : "C'est en prod donc ça marche" ne veut pas dire "c'est sécurisé".
La prod est un état volatile qui peut disparaître. Le code en git est un état
durable qui peut être recréé.

**Leçon 3** : Les outils de productivité comme le MCP Supabase sont puissants
mais pas neutres. Ils permettent de faire des choses très vite, mais "très vite"
inclut "très vite oublier de tout sauvegarder en code source". À chaque action
MCP qui modifie la prod, une action git qui sauvegarde l'équivalent en local.
